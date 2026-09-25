# context

notes for picking this project back up. the stuff you can't work out by reading the files.

## what this is

a next.js port of a claude artifact — a long interactive playbook about hooks and short-form video. the original was a single self-contained html file. the brief was a 1:1 copy: same look, same behaviour, running as a real app.

live repo: github.com/loshanparajuli/stopthethumb

## the one thing to understand before changing anything

**the page is raw html injected with `dangerouslySetInnerHTML`, and every interactive widget is vanilla dom code inside a `useEffect`.** see `app/page.js`, `content/body.html` and `app/InteractiveScript.js`.

this looks like bad react. it is deliberate. the artifact was ~1,100 lines of markup plus a slot machine, a quiz, a scorecard, a gauge, a hero animation and a checklist, all written in plain dom js. converting all of that to jsx and react state would have risked visual and behavioural drift from the original, which was the one thing the port could not afford. copying it verbatim guaranteed fidelity.

**do not "fix" this into idiomatic react without asking first.** three things follow from the decision:

- `reactStrictMode` is **off** in `next.config.mjs`. strict mode double-invokes effects in dev, which would register every event listener twice (double timers on the hero, doubled quiz clicks).
- the fresh-finds section is spliced into the html as a **string** at the `<!--FRESH_FINDS-->` marker, not rendered as a react component. splitting the html across two `dangerouslySetInnerHTML` divs would orphan the `<main>` tag and break nesting.
- styles live in one big `app/globals.css` copied from the artifact, not css modules.

## the fresh finds feed

the "fresh finds" section near the top researches itself on a schedule.

- `scripts/discover.mjs` → posts to openrouter with its web search plugin, asks for json matching a schema, sanitises, dedupes, writes `content/finds.json`
- `lib/finds.js` → shared sanitise + render, used by both the script and the page
- `.github/workflows/discover.yml` → runs it **every monday 06:15 utc**, commits any new findings, pushes

**zero runtime dependencies.** it's plain `fetch`. the anthropic sdk and zod were both removed once it moved to openrouter — don't reintroduce them for this.

why openrouter and not anthropic directly: anthropic's `web_search` is a server-side tool that can't be proxied through openrouter, and openrouter is the key that was already on hand. openrouter's own web plugin does the retrieval instead.

keys:
- ci: repo secret `OPENROUTER_API_KEY`
- local: `.env.local` at the repo root (gitignored). run with `set -a && . ./.env.local && set +a && npm run discover`
- optional repo *variable* `OPENROUTER_MODEL` to change model. default `anthropic/claude-sonnet-4.5`, verified working.

`npm run discover:dry` replays `scripts/fixture.json` with no api calls, for testing layout.

## rules that matter

**never fabricate a statistic or a url.** the guide's entire credibility rests on "every number says where it came from" and a three-dot trust rating. this is why `content/finds.json` shipped **empty** rather than pre-filled with plausible-looking examples — inventing a stat for a demo would have undermined the thing the site is about.

auto-researched entries stay visually separate from the hand-written chapters, with a standing callout telling the reader the source link is the receipt. don't merge them into the numbered chapters.

the trust rubric, enforced by prompt in `discover.mjs`:
- **3** only if the url is on the platform's own domain, or a named researcher's dataset with its method stated
- **2** a large vendor dataset with the sample size disclosed
- **1** everything else — rough benchmarks, undisclosed samples, second-hand reporting

compliance is imperfect. two earlier runs had to be thrown away: one rated a personal blog as trust 3, another returned bare numbers like `0.0` in the `stat` field. if output quality drifts, the prompt in `discover.mjs` is the lever.

**treat everything in `finds.json` as untrusted.** it originates from web pages by way of a model. sanitised on write and escaped on render — `escapeHtml` for every interpolated field, `safeUrl` rejects anything that isn't http/https. never interpolate a find field into html without escaping it.

## conventions

- commit messages: short, lowercase, human. no ai co-authorship or attribution trailers.
- no `CLAUDE.md` or `AGENTS.md` in the repo — they were removed on purpose.
- the readme is deliberately all lowercase.
- screenshots in `screenshots/` were taken with a throwaway `npm install --no-save playwright`, uninstalled afterwards. playwright is not a dependency; reinstall it temporarily if you need new ones.

## known open items

- no deployment yet. the app is static (`next build` prerenders everything) so anywhere works, but if it goes on vercel the weekly commit will trigger a rebuild, which is the intended flow.
- `app/layout.js` throws one eslint warning about custom fonts (`no-page-custom-font`). it's a false positive for the app router — the fonts are in the root layout so they load everywhere. left alone deliberately.
- dates render absolute on the server and get upgraded client-side to "3 days ago" for the first 10 days. that split exists so relative dates don't go stale between rebuilds.
