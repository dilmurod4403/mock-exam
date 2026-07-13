# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Telegram bot (Node.js ESM + Telegraf) that runs mock certification exams and a developer-level assessment for JavaScript (JSE/JSA/JSP) and Oracle SQL & PL/SQL (1Z0-071, 1Z0-149, Oracle DBA/Interview). UI and explanations are bilingual (Uzbek `uz` / English `en`).

## Commands

```bash
npm install          # deps: telegraf, dotenv
npm start            # run the bot (node src/bot.js) — needs TELEGRAM_BOT_TOKEN
npm run dev          # same with --watch (auto-restart on change)
npm run check        # validate the question bank (node src/validate.js)
```

There is **no unit-test framework** — `npm run check` is the test. Run it after any change to `src/questions/**` or `src/data.js`; it exits non-zero on any bank error. The bot uses **long-polling** (no HTTP port). Only **one instance** may poll a token at a time, or Telegram returns `409 Conflict`.

## Architecture

Runtime flow: `/start` → language → programming language (`plang`) → certification level → mode. Modes: `/exam`, `/quiz`, `/topic`, `/learn`, `/review`, `/practice`, `/grade`, `/stats`.

Module responsibilities (all in `src/`):

- **bot.js** — all Telegraf handlers, message rendering, and mode orchestration. The single entry point; wires every other module together.
- **data.js** — loads the question bank and defines `PROG_LANGS` (the catalog of tracks → topics → levels). Exports selection helpers (`getPool`, `pickQuestions`, `topicCounts`) and `shuffleOptions`.
- **session.js** — the **in-memory** active-exam state only (a `Map` of `userId → session`). Ephemeral; a `sweepSessions` timer in bot.js evicts idle sessions.
- **store.js** — **persistent** state as a JSON file: user prefs, answer history, SRS (Leitner) state, and grade history. Atomic debounced writes.
- **grading.js** — the adaptive `/grade` engine (Elo-style CAT) and the competency ladder.
- **i18n.js** — `t(lang, key, ...args)`; a value may be a string or a function called with args.
- **lessons.js** + **lessons/** — per-topic bilingual mini-lessons for `/learn`.
- **validate.js** — the bank checker run by `npm run check`.

### Two kinds of state (important)

- **Persistent** (survives restart) lives in `store.js` → a JSON file at `DATA_DIR` (default `./data`). On Railway the filesystem is **ephemeral**, so a Volume must be mounted and `DATA_DIR` pointed at it, or prefs/history are wiped every deploy.
- **Transient** (the current exam in progress) lives in `session.js` and is intentionally lost on restart.

### The bank / catalog model (the non-obvious part)

Questions are JSON arrays in `src/questions/<plang>/*.json`. **The folder name IS the `plang`** (e.g. `javascript`, `plsql`) — the loader tags every question with it. Files are otherwise merged; filenames don't matter to the loader.

A question does **not** belong to a level by folder. Instead:
- `PROG_LANGS[plang].levels[code].filter(q)` is a predicate deciding membership. Most levels check `q.levels?.includes("<code>")` (e.g. `["1Z0-149"]`, `["JSP"]`, `["ORA-DBA"]`); JS's JSE/JSA additionally key off `q.difficulty`.
- `q.topic` must be a key in `PROG_LANGS[plang].topics` (validate enforces this).
- `topicCounts` filters topics to those with >0 questions, so an empty topic simply doesn't appear in menus.

`/grade` deliberately pools the **whole `plang`** (`getPool({plang})`, ignoring the level filter) so all difficulties are in scope — adding hard questions to a track improves Senior-level assessment.

Question object shape (see README for full docs):
```json
{ "id": "unique-id", "topic": "<topic key>", "difficulty": "easy|medium|hard",
  "levels": ["ORA-DBA"], "question": "... ```js code``` ...",
  "options": ["A","B","C","D"], "correct": [1],
  "explanation": { "uz": "...", "en": "..." } }
```
`correct` is an array of 0-based indices (multiple → multi-answer). Both `explanation.uz` and `.en` are required. Question stems are in English; only explanations are bilingual.

## Conventions & gotchas

- **Write Uzbek in Latin script**, matching the existing bank. Mixing Cyrillic characters into `uz` text is a recurring copy-paste error that `validate.js` does not catch — grep for the `Ѐ–ӿ` range when authoring content.
- Any user-facing string goes through `i18n.js` in **both** languages; add the key to both `uz` and `en` tables.
- Messages are sent with `parse_mode: "HTML"`. `renderText` (in bot.js) converts ```` ```lang ... ``` ```` fences to `<pre>` and escapes the rest; use it for anything containing question/lesson code. Telegram's 4096-char limit applies — long content (e.g. mistake analysis) is chunked.
- Answer-button callbacks embed the question index (`pick:<qi>:<oi>`) and are rejected if they don't match the current `session.index`, so stale taps on old messages can't answer the wrong question — preserve this when adding question controls.
- To add a **new level**: add an entry to `PROG_LANGS[plang].levels` with a `filter`, add any new `topics`, and tag questions with the matching `levels` value. No other wiring is needed — all modes pick it up.
- Never hardcode the bot token; it comes from `TELEGRAM_BOT_TOKEN` (`.env` locally, Railway Variables in prod).
