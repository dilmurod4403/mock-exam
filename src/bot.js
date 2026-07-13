import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import {
  PROG_LANGS,
  ALL_QUESTIONS,
  shuffle,
  pickQuestions,
  getPool,
  topicCounts,
  levelPass,
} from "./data.js";
import { t, LANGS } from "./i18n.js";
import {
  GRADE_TARGET,
  initGradingState,
  pickGradeQuestion,
  markAsked,
  applyGradeAnswer,
  gradeFor,
  nextGrade,
} from "./grading.js";
import {
  getPrefs,
  setPref,
  getLang,
  recordAnswer,
  getWrongQuestionIds,
  flush,
} from "./store.js";
import {
  startSession,
  getSession,
  endSession,
  currentQuestion,
  toggleSelection,
  submitAnswer,
  isFinished,
  score,
  sweepSessions,
} from "./session.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error(
    "❌ TELEGRAM_BOT_TOKEN topilmadi. .env fayliga tokenni qo'shing (.env.example ga qarang)."
  );
  process.exit(1);
}

// Imtihon sozlamalari
const EXAM_SIZE = 40;
const QUIZ_SIZE = 10;
const REVIEW_SIZE = 20;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

// Tashlab ketilgan sessiyalarni tozalash
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 soat
const SWEEP_EVERY = 30 * 60 * 1000; // 30 daqiqada bir

const bot = new Telegraf(TOKEN);

const langOf = (ctx) => getLang(ctx.from.id);

// ---------- Matn formatlash (Telegram HTML) ----------
function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ```kod``` bloklarini <pre> ga o'giradi, qolganini escape qiladi
function renderText(md) {
  const segments = md.split("```");
  let out = "";
  segments.forEach((seg, i) => {
    if (i % 2 === 1) {
      const code = seg.replace(/^(js|javascript|sql|plsql)\n/, "").replace(/\n$/, "");
      out += `<pre><code>${esc(code)}</code></pre>`;
    } else {
      out += esc(seg);
    }
  });
  return out;
}

const isMulti = (q) => q.correct.length > 1;

function explanationOf(q, lang) {
  const e = q.explanation;
  if (typeof e === "string") return e;
  return e?.[lang] || e?.uz || "";
}

// ---------- Onboarding klaviaturalar ----------
const languageKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback(LANGS.uz, "lang:uz")],
    [Markup.button.callback(LANGS.en, "lang:en")],
  ]);

const proglangKeyboard = () =>
  Markup.inlineKeyboard(
    Object.entries(PROG_LANGS).map(([code, cfg]) => [
      Markup.button.callback(cfg.comingSoon ? `${cfg.label} 🔜` : cfg.label, `plang:${code}`),
    ])
  );

const levelKeyboard = (plang) =>
  Markup.inlineKeyboard(
    Object.entries(PROG_LANGS[plang].levels).map(([code, { label }]) => [
      Markup.button.callback(label, `level:${code}`),
    ])
  );

function menuKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, "btn_exam"), "mode:exam")],
    [Markup.button.callback(t(lang, "btn_quiz"), "mode:quiz")],
    [Markup.button.callback(t(lang, "btn_topic"), "mode:topic")],
    [Markup.button.callback(t(lang, "btn_review"), "mode:review")],
    [Markup.button.callback(t(lang, "btn_grade"), "mode:grade")],
    [Markup.button.callback(t(lang, "btn_change"), "settings")],
  ]);
}

// ---------- Savol ko'rsatish ----------
function questionBody(session, lang) {
  const q = currentQuestion(session);
  const total = session.target ?? session.questions.length;
  const header = t(lang, "question_header", session.index + 1, total, isMulti(q));
  const body = renderText(q.question);
  const opts = q.options.map((o, i) => `${LETTERS[i]}) ${renderText(o)}`).join("\n");
  return `${header}\n\n${body}\n\n${opts}`;
}

function optionKeyboard(session, lang) {
  const q = currentQuestion(session);
  const multi = isMulti(q);
  const qi = session.index; // tugma qaysi savolga tegishli — eskirganini aniqlash uchun
  const rows = q.options.map((_o, i) => {
    const label = multi && session.selected.has(i) ? `☑️ ${LETTERS[i]}` : LETTERS[i];
    return [Markup.button.callback(label, multi ? `toggle:${qi}:${i}` : `pick:${qi}:${i}`)];
  });
  if (multi) rows.push([Markup.button.callback(t(lang, "confirm_btn"), `done:${qi}`)]);
  return Markup.inlineKeyboard(rows);
}

async function sendQuestion(ctx, session, lang) {
  await ctx.reply(questionBody(session, lang), {
    parse_mode: "HTML",
    ...optionKeyboard(session, lang),
  });
}

function feedbackText(q, picked, isCorrect, lang) {
  const correctLetters = q.correct.map((i) => LETTERS[i]).join(", ");
  const pickedLetters = picked.length ? picked.map((i) => LETTERS[i]).join(", ") : "—";
  const head = isCorrect ? t(lang, "correct_head") : t(lang, "wrong_head", pickedLetters);
  return (
    `${head}\n` +
    `${t(lang, "correct_answer", correctLetters)}\n\n` +
    `${t(lang, "explanation_label")} ${esc(explanationOf(q, lang))}`
  );
}

async function afterAnswer(ctx, session, q, picked, isCorrect, lang) {
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  const finished = isFinished(session);
  const btn = finished
    ? Markup.button.callback(t(lang, "result_btn"), "result")
    : Markup.button.callback(t(lang, "next_btn"), "next");
  await ctx.reply(feedbackText(q, picked, isCorrect, lang), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[btn]]),
  });
}

// Joriy sessiya bo'yicha mavzu aniqligi: { topic: { c, total } }
function sessionTopicBreakdown(session) {
  const map = {};
  session.questions.forEach((q, i) => {
    const a = session.answers[i];
    if (!a) return;
    const s = map[q.topic] || { c: 0, total: 0 };
    s.total += 1;
    if (a.isCorrect) s.c += 1;
    map[q.topic] = s;
  });
  return map;
}

function resultText(session, lang) {
  const { total, correct, percent } = score(session);
  const pass = levelPass(session.plang, session.level);
  const passed = percent >= pass;
  const minutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
  let out =
    `${t(lang, "result_title")}\n\n` +
    `${t(lang, "result_correct", correct, total)}\n` +
    `${t(lang, "result_percent", percent, pass)}\n` +
    `${t(lang, "result_time", minutes)}\n\n` +
    `${passed ? t(lang, "passed") : t(lang, "failed")}`;

  const breakdown = sessionTopicBreakdown(session);
  const topics = PROG_LANGS[session.plang]?.topics || {};
  const lines = Object.entries(breakdown).map(([code, s]) => {
    const name = topics[code]?.[lang] || code;
    const pct = Math.round((s.c / s.total) * 100);
    return t(lang, "topic_line", name, s.c, s.total, pct);
  });
  if (lines.length) out += `\n\n${t(lang, "by_topic")}\n${lines.join("\n")}`;
  return out;
}

// Xato javob berilgan har savol uchun tahlil bloki (savol + to'g'ri javob + izoh)
function mistakeBlocks(session, lang) {
  const blocks = [];
  session.questions.forEach((q, i) => {
    const a = session.answers[i];
    if (!a || a.isCorrect) return;
    const correctLetters = q.correct.map((idx) => LETTERS[idx]).join(", ");
    const correctText = q.correct
      .map((idx) => `${LETTERS[idx]}) ${renderText(q.options[idx])}`)
      .join("\n");
    const yourLetters = a.picked.length ? a.picked.map((idx) => LETTERS[idx]).join(", ") : "—";
    blocks.push(
      `${t(lang, "mistake_head", i + 1)}\n` +
        `${renderText(q.question)}\n\n` +
        `${t(lang, "your_answer", yourLetters)}\n` +
        `${t(lang, "correct_answer", correctLetters)}\n${correctText}\n\n` +
        `${t(lang, "explanation_label")} ${esc(explanationOf(q, lang))}`
    );
  });
  return blocks;
}

// HTML bloklarni Telegram limitiga sig'diradigan qismlarga bo'lib yuboradi
async function sendBlocks(ctx, blocks, sep = "\n\n──────────\n\n", limit = 3500) {
  let buf = "";
  for (const b of blocks) {
    if (buf && buf.length + sep.length + b.length > limit) {
      await ctx.reply(buf, { parse_mode: "HTML" });
      buf = "";
    }
    buf = buf ? buf + sep + b : b;
  }
  if (buf) await ctx.reply(buf, { parse_mode: "HTML" });
}

// grade rejimi natija kartasi: daraja + qiyinlik/mavzu tahlili + keyingi qadam
function gradeCardText(session, lang) {
  const st = session.grading;
  const band = gradeFor(st.theta);
  const trackLabel = PROG_LANGS[session.plang]?.label || session.plang;

  let out =
    `${t(lang, "grade_title")}\n\n` +
    `${t(lang, "grade_level", band.emoji, band.name)}\n` +
    `${t(lang, "grade_track", trackLabel)}\n\n` +
    `${t(lang, "grade_by_diff")}\n`;
  for (const d of ["easy", "medium", "hard"]) {
    const s = st.byDifficulty[d];
    if (s) out += `• ${t(lang, "diff_label", d)}: ${s.c}/${s.t}\n`;
  }

  const topics = PROG_LANGS[session.plang]?.topics || {};
  const entries = Object.entries(st.byTopic).map(([code, s]) => ({
    name: topics[code]?.[lang] || code,
    pct: Math.round((s.c / s.t) * 100),
  }));
  const strong = entries.filter((e) => e.pct >= 70).map((e) => e.name);
  const weak = entries.filter((e) => e.pct < 50).map((e) => e.name);
  if (strong.length) out += `\n${t(lang, "grade_strong", strong.join(", "))}`;
  if (weak.length) out += `\n${t(lang, "grade_weak", weak.join(", "))}`;

  const next = nextGrade(band);
  const focusList = weak.length
    ? weak
    : [...entries].sort((a, b) => a.pct - b.pct).slice(0, 2).map((e) => e.name);
  const focus = focusList.slice(0, 3).join(", ");
  out += `\n\n${next ? t(lang, "grade_next", next.name, focus) : t(lang, "grade_top", band.name)}`;
  out += `\n\n${t(lang, "grade_note")}`;
  return out;
}

// ---------- Buyruqlar ----------
bot.start((ctx) =>
  ctx.reply(t(langOf(ctx), "welcome", ctx.from.first_name), {
    parse_mode: "HTML",
    ...languageKeyboard(),
  })
);

bot.help((ctx) => ctx.reply(t(langOf(ctx), "help"), { parse_mode: "HTML" }));

// Imtihon boshlash
async function beginExam(ctx, { mode, size, topic }) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;

  const questions = pickQuestions(size, { plang, level, topic });
  if (questions.length === 0) return ctx.reply(t(lang, "no_questions"));

  const session = startSession(ctx.from.id, { mode, questions, plang, level });
  const label =
    mode === "exam"
      ? t(lang, "exam_label")
      : topic
      ? t(lang, "topic_label", PROG_LANGS[plang].topics[topic][lang])
      : t(lang, "quiz_label");
  await ctx.reply(t(lang, "started", label, questions.length), { parse_mode: "HTML" });
  await sendQuestion(ctx, session, lang);
}

bot.command("exam", (ctx) => beginExam(ctx, { mode: "exam", size: EXAM_SIZE, topic: null }));
bot.command("quiz", (ctx) => beginExam(ctx, { mode: "quiz", size: QUIZ_SIZE, topic: null }));

// Xatolar ustida ishlash: avval noto'g'ri javob berilgan savollarni qayta beradi
async function beginReview(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;

  const wrongIds = getWrongQuestionIds(ctx.from.id, { plang, level });
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
  const pool = wrongIds.map((id) => byId.get(id)).filter(Boolean);
  if (pool.length === 0) return ctx.reply(t(lang, "no_review"));

  const questions = shuffle(pool).slice(0, REVIEW_SIZE);
  const session = startSession(ctx.from.id, { mode: "review", questions, plang, level });
  await ctx.reply(t(lang, "started", t(lang, "review_label"), questions.length), {
    parse_mode: "HTML",
  });
  await sendQuestion(ctx, session, lang);
}

bot.command("review", (ctx) => beginReview(ctx));

// Daraja baholash: butun til bo'yicha (sertifikat darajasidan qat'iy nazar) adaptiv test
async function beginGrade(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;

  const pool = getPool({ plang }); // butun til — barcha qiyinliklar
  if (pool.length < 5) return ctx.reply(t(lang, "no_questions"));

  const target = Math.min(GRADE_TARGET, pool.length);
  const grading = initGradingState();
  const session = startSession(ctx.from.id, {
    mode: "grade",
    questions: [],
    plang,
    level,
    target,
    pool,
    grading,
  });

  const first = pickGradeQuestion(pool, grading);
  markAsked(grading, first);
  session.questions.push(first);

  await ctx.reply(t(lang, "grade_intro", target), { parse_mode: "HTML" });
  await sendQuestion(ctx, session, lang);
}

bot.command("grade", (ctx) => beginGrade(ctx));

function sendTopicMenu(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;
  const counts = topicCounts({ plang, level });
  const rows = Object.entries(PROG_LANGS[plang].topics)
    .filter(([code]) => (counts[code] || 0) > 0)
    .map(([code, names]) => [
      Markup.button.callback(`${names[lang]} (${counts[code]})`, `topic:${code}`),
    ]);
  if (rows.length === 0) return ctx.reply(t(lang, "no_questions"));
  return ctx.reply(t(lang, "choose_topic"), Markup.inlineKeyboard(rows));
}

bot.command("topic", (ctx) => sendTopicMenu(ctx));

bot.command("stop", (ctx) => {
  endSession(ctx.from.id);
  return ctx.reply(t(langOf(ctx), "stopped"));
});

// ---------- Onboarding callbacklar ----------
bot.action(/^lang:(uz|en)$/, async (ctx) => {
  const lang = ctx.match[1];
  setPref(ctx.from.id, "lang", lang);
  await ctx.answerCbQuery(t(lang, "language_set"));
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_proglang"), proglangKeyboard());
});

bot.action(/^plang:(.+)$/, async (ctx) => {
  const lang = langOf(ctx);
  const code = ctx.match[1];
  const cfg = PROG_LANGS[code];
  if (!cfg || cfg.comingSoon || Object.keys(cfg.levels).length === 0) {
    return ctx.answerCbQuery(t(lang, "coming_soon"), { show_alert: true });
  }
  setPref(ctx.from.id, "plang", code);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_level"), levelKeyboard(code));
});

bot.action(/^level:(.+)$/, async (ctx) => {
  const lang = langOf(ctx);
  const code = ctx.match[1];
  const plang = getPrefs(ctx.from.id)?.plang;
  if (!plang) return ctx.answerCbQuery(t(lang, "need_start"), { show_alert: true });
  // Bu darajada savol bormi?
  if (getPool({ plang, level: code }).length === 0) {
    return ctx.answerCbQuery(t(lang, "level_soon"), { show_alert: true });
  }
  setPref(ctx.from.id, "level", code);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "menu_title", PROG_LANGS[plang].levels[code].label), {
    parse_mode: "HTML",
    ...menuKeyboard(lang),
  });
});

bot.action("settings", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(langOf(ctx), "choose_language"), languageKeyboard());
});

// ---------- Rejim tanlash ----------
bot.action("mode:exam", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "exam", size: EXAM_SIZE, topic: null });
});
bot.action("mode:quiz", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "quiz", size: QUIZ_SIZE, topic: null });
});
bot.action("mode:topic", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendTopicMenu(ctx);
});
bot.action("mode:review", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginReview(ctx);
});
bot.action("mode:grade", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginGrade(ctx);
});

bot.action(/^topic:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "topic", size: QUIZ_SIZE, topic: ctx.match[1] });
});

// ---------- Savol-javob callbacklar ----------
// Tugma joriy savolga tegishlimi? (eski xabar tugmasidan himoya)
function isStale(ctx, session) {
  return Number(ctx.match[1]) !== session.index;
}

bot.action(/^toggle:(\d+):(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  if (isStale(ctx, session)) return ctx.answerCbQuery(t(lang, "stale_answer"));
  toggleSelection(session, Number(ctx.match[2]));
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(optionKeyboard(session, lang).reply_markup).catch(() => {});
});

async function handleSubmit(ctx) {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  const q = currentQuestion(session);
  const picked = [...session.selected].sort((a, b) => a - b);
  const isCorrect = submitAnswer(session);
  recordAnswer(ctx.from.id, {
    questionId: q.id,
    plang: session.plang,
    level: session.level,
    topic: q.topic,
    isCorrect,
  });

  // grade: θ ni yangilab, keyingi savolni adaptiv tanlaymiz
  if (session.mode === "grade" && session.grading) {
    applyGradeAnswer(session.grading, q, isCorrect);
    if (!isFinished(session)) {
      const nextQ = pickGradeQuestion(session.pool, session.grading);
      if (nextQ) {
        markAsked(session.grading, nextQ);
        session.questions.push(nextQ);
      } else {
        session.target = session.index; // savollar tugadi — hozir yakunlaymiz
      }
    }
  }

  await ctx.answerCbQuery(isCorrect ? t(lang, "correct_toast") : t(lang, "wrong_toast"));
  await afterAnswer(ctx, session, q, picked, isCorrect, lang);
}

bot.action(/^pick:(\d+):(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  if (isStale(ctx, session)) return ctx.answerCbQuery(t(lang, "stale_answer"));
  session.selected = new Set([Number(ctx.match[2])]);
  await handleSubmit(ctx);
});

bot.action(/^done:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  if (isStale(ctx, session)) return ctx.answerCbQuery(t(lang, "stale_answer"));
  if (session.selected.size === 0) return ctx.answerCbQuery(t(lang, "select_one"));
  await handleSubmit(ctx);
});

bot.action("next", async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendQuestion(ctx, session, lang);
});

bot.action("result", async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});

  const headline =
    session.mode === "grade" && session.grading
      ? gradeCardText(session, lang)
      : resultText(session, lang);
  await ctx.reply(headline, { parse_mode: "HTML" });

  const blocks = mistakeBlocks(session, lang);
  if (blocks.length) {
    await ctx.reply(t(lang, "mistakes_title", blocks.length), { parse_mode: "HTML" });
    await sendBlocks(ctx, blocks);
  }

  await ctx.reply(t(lang, "retry"), { parse_mode: "HTML", ...menuKeyboard(lang) });
  endSession(ctx.from.id);
});

// ---------- Telegram buyruqlar menyusi ----------
const COMMANDS = {
  uz: [
    { command: "start", description: "Qaytadan sozlash (til/daraja)" },
    { command: "exam", description: "To'liq mock imtihon" },
    { command: "quiz", description: "Tezkor test (10 savol)" },
    { command: "topic", description: "Mavzu bo'yicha mashq" },
    { command: "review", description: "Xatolar ustida ishlash" },
    { command: "grade", description: "Darajamni aniqlash (adaptiv test)" },
    { command: "stop", description: "Joriy imtihonni to'xtatish" },
  ],
  en: [
    { command: "start", description: "Reconfigure (language/level)" },
    { command: "exam", description: "Full mock exam" },
    { command: "quiz", description: "Quick quiz (10 questions)" },
    { command: "topic", description: "Practice by topic" },
    { command: "review", description: "Review your mistakes" },
    { command: "grade", description: "Assess my level (adaptive test)" },
    { command: "stop", description: "Stop the current exam" },
  ],
};

async function registerCommands() {
  await bot.telegram.setMyCommands(COMMANDS.uz);
  await bot.telegram.setMyCommands(COMMANDS.en, { language_code: "en" });
}

// ---------- Xatoliklarni ushlash ----------
bot.catch((err, ctx) => {
  console.error(`⚠️ Handler xatosi (${ctx?.updateType}):`, err);
});

// ---------- Ishga tushirish ----------
console.log("⏳ Bot ishga tushmoqda...");
bot.launch({ dropPendingUpdates: true }).catch((err) => {
  console.error("❌ Bot ishga tushmadi:", err);
  process.exit(1);
});
registerCommands().catch((err) =>
  console.error("⚠️ Buyruqlar menyusini o'rnatib bo'lmadi:", err.message)
);

// Eskirgan sessiyalarni davriy tozalash (xotira oqishiga qarshi)
const sweepTimer = setInterval(() => {
  const n = sweepSessions(SESSION_TTL);
  if (n) console.log(`🧹 ${n} ta eskirgan sessiya tozalandi.`);
}, SWEEP_EVERY);
sweepTimer.unref(); // process yopilishiga to'sqinlik qilmasin

console.log("✅ Bot ishladi. Telegram'da /start bosing.");

function shutdown(signal) {
  flush();
  bot.stop(signal);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
