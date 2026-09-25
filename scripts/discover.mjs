import fs from "node:fs";
import path from "node:path";
import { sanitizeFind, slugify } from "../lib/finds.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
const FINDS_PATH = path.join(process.cwd(), "content", "finds.json");
const MAX_STORED = 60;
const MAX_PER_RUN = 4;

const dryRun = process.argv.includes("--dry-run");
const today = new Date().toISOString().slice(0, 10);

const SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "url"],
  properties: {
    title: { type: "string", description: "Short name of the publication" },
    url: { type: "string", description: "A real, live URL. Never invent one." },
  },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["finds"],
  properties: {
    finds: {
      type: "array",
      description: `At most ${MAX_PER_RUN} findings. Return an empty array rather than padding.`,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "headline", "platform", "lane", "stat", "statContext",
          "obvious", "why", "move", "trust", "sources",
        ],
        properties: {
          headline: { type: "string", description: "What changed, under 15 words, no hype" },
          platform: { type: "string", description: "e.g. YouTube Shorts, X, Instagram Reels, TikTok, LinkedIn" },
          lane: { type: "string", enum: ["Receipts", "Clips", "Build", "Platform"] },
          stat: { type: "string", description: "The single hard number that proves this. Empty string if there genuinely is none." },
          statContext: { type: "string", description: "What the number measures, over what sample, in one clause" },
          obvious: {
            type: "string",
            enum: ["surprising", "semi", "known"],
            description: "Was this already obvious to a working creator? 'surprising' contradicts common advice.",
          },
          why: { type: "string", description: "The mechanism: why the platform did this or why the pattern works. Two or three sentences. Most important field." },
          move: { type: "string", description: "What to concretely do about it this week" },
          trust: {
            type: "integer",
            minimum: 1,
            maximum: 3,
            description: "3 = the platform said it officially or the dataset is large and careful. 2 = a big dataset from a vendor. 1 = a rough benchmark or one creator's numbers.",
          },
          sources: { type: "array", items: SOURCE_SCHEMA },
        },
      },
    },
  },
};

function brief(existing) {
  const seen = existing.slice(0, 25).map((f) => `- ${f.headline}`).join("\n");

  return `You are researching for "Stop the Thumb", a playbook about hooks and short-form video written for Losh, who runs fromSilicon (documentary-style videos about startups and VC for founder and investor clients) and is building autoBlade (an app that auto-edits multi-camera podcasts).

Today is ${today}. Find what has genuinely CHANGED or been newly MEASURED in the last two weeks across short-form video and social distribution. Priority order:

1. The X (Twitter) algorithm and its engagement statistics. Highest priority. X open-sourced its ranking code and its weights keep shifting. Find concrete numbers: what one action is worth relative to another, reach caps, how link posts are treated, what the most recent update changed, and crucially WHY it was changed and whether anyone predicted it.
2. YouTube Shorts ranking, monetisation and measurement changes.
3. Instagram Reels and TikTok ranking or product changes that affect reach.
4. New public datasets or studies measuring hooks, retention, posting cadence or watch time.
5. LinkedIn video and reach changes, since Losh's buyers are there.

Hard rules:
- Only report things you can point to a real, live URL for. Never invent a statistic or a link.
- Prefer primary sources: the platform's own blog, help pages, engineering posts, or a named researcher's published dataset.
- Ignore generic "10 tips to grow" content farms entirely.
- A rumour or single creator's anecdote is allowed, but mark trust as 1 and say so plainly in "why".
- For every item answer three things explicitly: the number, whether this was already obvious, and the mechanism behind it.

Already covered. Do not repeat these or a lightly reworded version of them:
${seen || "- (nothing yet)"}

Return at most ${MAX_PER_RUN} findings. If nothing genuinely new has happened, return an empty array rather than filling space.`;
}

function loadFinds() {
  if (!fs.existsSync(FINDS_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FINDS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Models don't always honour response_format, so pull the first JSON object out.
function parseJson(raw) {
  const text = String(raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function ask(existing) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "Stop the Thumb",
    },
    body: JSON.stringify({
      model: MODEL,
      plugins: [{ id: "web", max_results: 8 }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "finds", strict: true, schema: SCHEMA },
      },
      messages: [{ role: "user", content: brief(existing) }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 400 && /model/i.test(detail)) {
      throw new Error(
        `OpenRouter rejected the model "${MODEL}". Pick a slug from https://openrouter.ai/models and set OPENROUTER_MODEL.\n${detail}`
      );
    }
    throw new Error(`OpenRouter ${response.status}: ${detail}`);
  }

  const payload = await response.json();
  const parsed = parseJson(payload.choices?.[0]?.message?.content);
  if (!parsed) throw new Error("Could not parse a JSON object from the reply.");
  return Array.isArray(parsed.finds) ? parsed.finds : [];
}

function merge(existing, incoming) {
  const ids = new Set(existing.map((f) => f.id));
  const headlines = new Set(existing.map((f) => slugify(f.headline).slice(0, 40)));
  const added = [];

  for (const raw of incoming.slice(0, MAX_PER_RUN)) {
    const find = sanitizeFind({ ...raw, discovered: today }, today);
    if (!find) continue;

    const key = slugify(find.headline).slice(0, 40);
    if (ids.has(find.id) || headlines.has(key)) continue;

    ids.add(find.id);
    headlines.add(key);
    added.push(find);
  }

  return { merged: [...added, ...existing].slice(0, MAX_STORED), added };
}

async function main() {
  const existing = loadFinds();
  let incoming;

  if (dryRun) {
    const fixture = path.join(process.cwd(), "scripts", "fixture.json");
    incoming = JSON.parse(fs.readFileSync(fixture, "utf8"));
    console.log(`dry run: ${incoming.length} fixture findings`);
  } else {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set.");
      process.exit(1);
    }
    console.log(`asking ${MODEL}...`);
    incoming = await ask(existing);
  }

  const { merged, added } = merge(existing, incoming);

  if (!added.length) {
    console.log("nothing new. finds.json untouched.");
    return;
  }

  fs.writeFileSync(FINDS_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`added ${added.length}:`);
  for (const find of added) console.log(`  - ${find.headline}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
