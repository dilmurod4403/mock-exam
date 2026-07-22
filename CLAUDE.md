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

Runtime flow: `/start` → language → programming language (`plang`) → certification level → mode. Modes: `/exam`, `/quiz`, `/topic`, `/learn`, `/review`, `/practice`, `/grade`, `/stats`, `/path`. Admin-only (hidden from the command menu, gated on `ADMIN_IDS`): `/admin`, `/user`, `/block`, `/unblock`, `/metrics`, `/reports`, `/testremind`.

Module responsibilities (all in `src/`):

- **bot.js** — all Telegraf handlers, message rendering, and mode orchestration. The single entry point; wires every other module together.
- **data.js** — loads the question bank and defines `PROG_LANGS` (the catalog of tracks → topics → levels). Exports selection helpers (`getPool`, `pickQuestions`, `topicCounts`) and `shuffleOptions`.
- **session.js** — the **in-memory** active-exam state only (a `Map` of `userId → session`). Ephemeral; a `sweepSessions` timer in bot.js evicts idle sessions.
- **store.js** — **persistent** state as a JSON file: user prefs, answer history, SRS (Leitner) state, grade history, user identities, the block list, reminder bookkeeping, and issue reports. Atomic debounced writes.
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

## Product decisions worth preserving

These were deliberate calls, not accidents — changing them changes the product.

**Derive from existing data before adding tracking.** The onboarding funnel, retention cohorts, stage progress and the "what should I do today?" suggestion were all built out of `users` + `prefs` + `answers`, which already existed. Only mode-per-answer needed a new field. Prefer this: it makes existing users appear correctly with no migration.

**Recency over lifetime for anything gating the user.** Stage completion measures the user's *last 20* answers in that stage's topics, not their lifetime average, so a bad start never locks someone out permanently — improving reopens progress. Apply the same instinct to any future gate.

**Locking gates content, never self-knowledge.** `/topic`, `/learn`, `/exam` and `/quiz` respect the staged path (locked topics show 🔒 and explain what to finish). `/review`, `/practice`, `/grade` and `/stats` are *never* locked — blocking someone from their own mistakes or from measuring their level would be actively harmful.

**`/grade` pools the whole `plang`, ignoring the level filter**, so hard questions are always in scope and Senior stays reachable. Adding hard questions to a track improves assessment; don't "fix" this to respect the level.

**Adaptive grading is calibrated, not guessed.** Question ratings (easy 1100 / medium 1500 / hard 1900), the K schedule, and the seven band thresholds were tuned together against persona simulations so that all-wrong lands on Trainee and all-correct reaches Lead. Re-tune the thresholds if you touch the ratings or K — they are one system.

**Reminders are opt-out, once a day, and only with a reason.** They fire in a single hour (`REMIND_HOUR`, Tashkent time), skip anyone who already practised today or has nothing due, and a 403 (user blocked the bot) permanently disables reminders for that user. Don't turn this into a broadcast channel.

**Persistence is JSON on purpose.** Zero native dependencies, no build risk, swappable later — `store.js` is a clean API boundary, so moving to SQLite is a drop-in when answer volume demands it.

## Conventions & gotchas

- **Write Uzbek in Latin script**, matching the existing bank. Cyrillic characters creeping into `uz` text (usually a suffix like `-да`, `-ган`, `-ли` from a paste) is a recurring error — `validate.js` now flags any Cyrillic in a question object, so `npm run check` catches it. Source files outside the bank aren't checked, so watch comments too.
- **Any user-facing label used for routing must come from `t()`.** The reply keyboard sends button labels as plain text, and `BUTTON_ROUTE` is built from the same `t()` calls — that's what keeps labels and routing from drifting. Changing a label invalidates keyboards users already hold; the catch-all `bot.on("text")` handler exists to recover them by re-sending the current keyboard, and it must stay registered **after** every command and `hears`.
- **Never let an optional step block the essential one.** A long mistake analysis once threw and skipped the menu that followed, stranding the user; it's now wrapped so the menu always sends. Order side-effectful sends so the navigation affordance is last and guarded.
- **`bot.stop()` throws if launch never completed** (e.g. while retrying a 409). `shutdown()` guards it — otherwise a SIGTERM on redeploy crashes the process instead of exiting cleanly.
- Any user-facing string goes through `i18n.js` in **both** languages; add the key to both `uz` and `en` tables.
- Messages are sent with `parse_mode: "HTML"`. `renderText` (in bot.js) converts ```` ```lang ... ``` ```` fences to `<pre>` and escapes the rest; use it for anything containing question/lesson code. Telegram's 4096-char limit applies — long content (e.g. mistake analysis) is chunked.
- Answer-button callbacks embed the question index (`pick:<qi>:<oi>`) and are rejected if they don't match the current `session.index`, so stale taps on old messages can't answer the wrong question — preserve this when adding question controls.
- To add a **new level**: add an entry to `PROG_LANGS[plang].levels` with a `filter`, add any new `topics`, and tag questions with the matching `levels` value. No other wiring is needed — all modes pick it up.
- To add a **stage**: edit `stages` on the level in `PROG_LANGS` (ordered groups of topic keys). Progress and locking follow automatically — no other wiring.
- Never hardcode the bot token; it comes from `TELEGRAM_BOT_TOKEN` (`.env` locally, Railway Variables in prod). `.env` is gitignored; `.env.example` is the committed template and must never hold real values. Other env vars: `ADMIN_IDS`, `DATA_DIR`, `REMIND_HOUR`.

## Diagnosing "the bot is dead"

Because only one poller may hold a token, starting the bot locally is itself the test:

- Local start hits **409 Conflict** → some other instance (usually the deploy) *is* polling, so the deploy is alive and the fault is elsewhere (often a stale keyboard — tell the user to send `/start` as text).
- Local start **connects cleanly** → nothing else is polling, so the deployed container is not running. Build logs succeeding proves nothing here; the container can fail to start afterwards (exhausted plan credit, crashed or removed service). Ask for *Deploy* logs, not *Build* logs.

A `401` means the token is wrong; `❌ TELEGRAM_BOT_TOKEN topilmadi` means the variable never reached the process.
