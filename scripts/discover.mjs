import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { sanitizeFind, slugify } from "../lib/finds.js";

const MODEL = "claude-opus-5";
const FINDS_PATH = path.join(process.cwd(), "content", "finds.json");
const MAX_STORED = 60;
const MAX_PER_RUN = 4;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const today = new Date().toISOString().slice(0, 10);

const FindSchema = z.object({
  headline: z
    .string()
    .describe("What changed, in one sentence under 15 words. No hype."),
  platform: z
    .string()
    .describe("The platform this concerns, e.g. 'YouTube Shorts', 'X', 'Instagram Reels', 'TikTok', 'LinkedIn'."),
  lane: z
    .enum(["Receipts", "Clips", "Build", "Platform"])
    .describe("Which of Losh's three content lanes this feeds, or 'Platform' for an algorithm or product change."),
  stat: z
    .string()
    .describe("The single hard number that proves this, e.g. '10x weight on bookmarks'. Empty string if there genuinely is no number."),
  statContext: z
    .string()
    .describe("What the number is measuring and over what sample, in one short clause."),
  obvious: z
    .enum(["surprising", "semi", "known"])
    .describe("Was this already obvious to a working creator? 'surprising' means it contradicts common advice."),
  why: z
    .string()
    .describe("The mechanism: why the platform did this, or why the pattern works. Two or three sentences. This is the most important field."),
  move: z
    .string()
    .describe("What Losh should concretely do about it this week, in one or two sentences."),
  trust: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe("3 = the platform said it officially or the dataset is large and careful. 2 = a big dataset from a company that sells a tool. 1 = a rough benchmark or a single creator's numbers."),
  sources: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .min(1)
    .describe("Where this came from. Real URLs only, never invented ones."),
});

const ResultSchema = z.object({
  finds: z.array(FindSchema),
});

const RESEARCH_BRIEF = `You are researching for "Stop the Thumb", a playbook about hooks and short-form video written for Losh, who runs fromSilicon (a studio making documentary-style videos about startups and VC for founder and investor clients) and is building autoBlade (an app that auto-edits multi-camera podcasts).

Find what has genuinely CHANGED or been newly MEASURED in the last two weeks across short-form video and social distribution. Prioritise, in this order:

1. The X (Twitter) algorithm and its engagement statistics. This is the highest priority. X open-sourced its ranking code, and its weights and behaviour keep shifting. Find concrete numbers: what an action is worth relative to another, reach caps, how link posts are treated, what changed in the most recent update, and crucially WHY the change was made and whether anyone predicted it.
2. YouTube Shorts ranking, monetisation and measurement changes.
3. Instagram Reels and TikTok ranking or product changes that affect reach.
4. New public datasets or studies measuring hooks, retention, posting cadence or watch time.
5. LinkedIn video and reach changes, since Losh's buyers are there.

Hard rules:
- Only report things you can point to a real, live URL for. Never invent a statistic or a link.
- Prefer primary sources: the platform's own blog, help pages, engineering posts, or a named researcher's published dataset.
- Ignore generic "10 tips to grow" content farms entirely.
- If something is a rumour or a single creator's anecdote, you may still report it, but mark its trust as 1 and say so plainly in the 'why'.
- For every item, answer three things explicitly: what the number is, whether this was already obvious to a working creator, and the mechanism behind why it happened.`;

function loadFinds() {
  if (!fs.existsSync(FINDS_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FINDS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFinds(finds) {
  fs.mkdirSync(path.dirname(FINDS_PATH), { recursive: true });
  fs.writeFileSync(FINDS_PATH, `${JSON.stringify(finds, null, 2)}\n`, "utf8");
}

async function research(client, existing) {
  const seen = existing
    .slice(0, 25)
    .map((find) => `- ${find.headline}`)
    .join("\n");

  const messages = [
    {
      role: "user",
      content: `${RESEARCH_BRIEF}

Today is ${today}.

The guide already covers the items below. Do not report these again, and do not report a lightly reworded version of them. Find things that are genuinely new since these:
${seen || "- (nothing yet)"}

Search the web now, then write up at most ${MAX_PER_RUN} findings. Fewer is better than padded. If nothing genuinely new has happened, say so plainly and write up nothing rather than filling space.`,
    },
  ];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 12 }],
    messages,
  });

  // A server-tool turn can stop early with pause_turn; resume by handing the
  // partial assistant turn back until it finishes on its own.
  let guard = 0;
  while (response.stop_reason === "pause_turn" && guard < 6) {
    guard += 1;
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 12 }],
      messages,
    });
  }

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Research call refused: ${response.stop_details?.category ?? "unknown"}`
    );
  }

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function extract(client, notes) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `Here are research notes about recent changes in short-form video and social distribution.

Turn them into structured findings. Keep only items that have a real source URL present in the notes. Do not invent a URL, a number, or a finding that is not in the notes. If the notes say nothing genuinely new was found, return an empty array.

Notes:
${notes}`,
      },
    ],
    output_config: { format: zodOutputFormat(ResultSchema) },
  });

  return response.parsed_output?.finds ?? [];
}

function merge(existing, incoming) {
  const seenIds = new Set(existing.map((find) => find.id));
  const seenHeadlines = new Set(
    existing.map((find) => slugify(find.headline).slice(0, 40))
  );

  const added = [];
  for (const raw of incoming) {
    const find = sanitizeFind({ ...raw, discovered: today }, today);
    if (!find) continue;

    const headlineKey = slugify(find.headline).slice(0, 40);
    if (seenIds.has(find.id) || seenHeadlines.has(headlineKey)) continue;

    seenIds.add(find.id);
    seenHeadlines.add(headlineKey);
    added.push(find);
  }

  return { merged: [...added, ...existing].slice(0, MAX_STORED), added };
}

async function main() {
  const existing = loadFinds();

  let incoming;
  if (dryRun) {
    const fixturePath = path.join(process.cwd(), "scripts", "fixture.json");
    incoming = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    console.log(`dry run: loaded ${incoming.length} fixture findings`);
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set. Nothing to do.");
      process.exit(1);
    }
    const client = new Anthropic({ timeout: 15 * 60 * 1000 });

    console.log("researching...");
    const notes = await research(client, existing);
    if (!notes) {
      console.log("no research output. Leaving finds.json untouched.");
      return;
    }

    console.log("extracting...");
    incoming = await extract(client, notes);
  }

  const { merged, added } = merge(existing, incoming);

  if (!added.length) {
    console.log("nothing new. Leaving finds.json untouched.");
    return;
  }

  writeFinds(merged);
  console.log(`added ${added.length} finding(s):`);
  for (const find of added) console.log(`  - ${find.headline}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
