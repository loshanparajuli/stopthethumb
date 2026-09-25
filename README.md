# stop the thumb

a long, visual playbook on how to hook viewers on shorts before they swipe away. built by losh at fromsilicon.

this is a next.js app version of the original claude artifact, live and interactive.

## screenshots

![hero](screenshots/hero.png)

![hook bank](screenshots/hook-bank.png)

![swipe or stay quiz](screenshots/quiz.png)

![30 day checklist](screenshots/sprint-checklist.png)

## fresh finds (the part that updates itself)

there's a "fresh finds" section near the top that fills itself in. a github action runs every monday morning, asks a model to search the web for what actually changed across shorts, reels, tiktok, x and linkedin, and files each thing it finds with:

- the number behind it
- whether it was already obvious or nobody saw it coming
- why it happened (the mechanism, not just the headline)
- what to do about it this week
- a real source link and a trust rating

dates show up as "today", "yesterday", "3 days ago" and so on for the first 10 days, then switch to a plain date.

these entries are clearly marked as auto-researched and kept separate from the hand-written chapters, so the source link is always the receipt. check it before you put a number on screen.

### setting it up

add your openrouter key as a repo secret named `OPENROUTER_API_KEY` (settings → secrets and variables → actions).

optionally add a repo *variable* named `OPENROUTER_MODEL` to pick the model. it defaults to `anthropic/claude-sonnet-4.5`. any slug from [openrouter.ai/models](https://openrouter.ai/models) works — pick a cheaper one if you want, the script will tell you if the slug is wrong.

run it yourself any time:

```bash
OPENROUTER_API_KEY=sk-or-... npm run discover
npm run discover:dry      # sample data, no api calls, for testing the layout
```

the script talks to openrouter over plain `fetch` with openrouter's web search plugin, so it adds no dependencies to the project.

the action also runs on demand from the actions tab. findings land in `content/finds.json` as a normal commit, so every update is a diff you can read and revert. note that github disables scheduled workflows on repos with no activity for 60 days.

## what's inside

- the receipt hook: a 3-part formula for the first 3 seconds
- charts from real studies on shorts, reels and tiktok
- a hook bank with 12 patterns and a slot machine to spin for ideas
- a swipe or stay quiz
- a hook scorecard
- a 30 day checklist that saves your progress in the browser
- long-form, x and linkedin playbooks

## running it locally

```bash
npm install
npm run dev
```

then open http://localhost:3000

## stack

next.js (app router), plain css, vanilla js for the interactive bits. no extra frameworks.
