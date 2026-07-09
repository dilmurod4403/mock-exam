import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { TOPICS, LEVELS, pickQuestions, getPool, topicCounts } from "./data.js";
import { t, LANGS } from "./i18n.js";
import {
  getPrefs,
  setPref,
  getLang,
  startSession,
  getSession,
  endSession,
  currentQuestion,
  toggleSelection,
  submitAnswer,
  isFinished,
  score,
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
const PASS_PERCENT = 70;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
      const code = seg.replace(/^(js|javascript)\n/, "").replace(/\n$/, "");
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
  Markup.inlineKeyboard([
    [Markup.button.callback("🟨 JavaScript", "plang:js")],
    [Markup.button.callback("🐍 Python 🔜", "plang:py")],
  ]);

const levelKeyboard = () =>
  Markup.inlineKeyboard(
    Object.entries(LEVELS).map(([code, { label }]) => [
      Markup.button.callback(label, `level:${code}`),
    ])
  );

function menuKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, "btn_exam"), "mode:exam")],
    [Markup.button.callback(t(lang, "btn_quiz"), "mode:quiz")],
    [Markup.button.callback(t(lang, "btn_topic"), "mode:topic")],
    [Markup.button.callback(t(lang, "btn_change"), "settings")],
  ]);
}

// ---------- Savol ko'rsatish ----------
function questionBody(session, lang) {
  const q = currentQuestion(session);
  const header = t(lang, "question_header", session.index + 1, session.questions.length, isMulti(q));
  const body = renderText(q.question);
  const opts = q.options.map((o, i) => `${LETTERS[i]}) ${renderText(o)}`).join("\n");
  return `${header}\n\n${body}\n\n${opts}`;
}

function optionKeyboard(session, lang) {
  const q = currentQuestion(session);
  const multi = isMulti(q);
  const rows = q.options.map((_o, i) => {
    const label = multi && session.selected.has(i) ? `☑️ ${LETTERS[i]}` : LETTERS[i];
    return [Markup.button.callback(label, multi ? `toggle:${i}` : `pick:${i}`)];
  });
  if (multi) rows.push([Markup.button.callback(t(lang, "confirm_btn"), "done")]);
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

function resultText(session, lang) {
  const { total, correct, percent } = score(session);
  const passed = percent >= PASS_PERCENT;
  const minutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
  return (
    `${t(lang, "result_title")}\n\n` +
    `${t(lang, "result_correct", correct, total)}\n` +
    `${t(lang, "result_percent", percent, PASS_PERCENT)}\n` +
    `${t(lang, "result_time", minutes)}\n\n` +
    `${passed ? t(lang, "passed") : t(lang, "failed")}\n\n` +
    `${t(lang, "retry")}`
  );
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
  const level = getPrefs(ctx.from.id)?.level;
  if (!level) return ctx.reply(t(lang, "need_start"));

  const questions = pickQuestions(size, { level, topic });
  if (questions.length === 0) return ctx.reply(t(lang, "no_questions"));

  const session = startSession(ctx.from.id, { mode, questions });
  const label =
    mode === "exam"
      ? t(lang, "exam_label")
      : topic
      ? t(lang, "topic_label", TOPICS[topic][lang])
      : t(lang, "quiz_label");
  await ctx.reply(t(lang, "started", label, questions.length), { parse_mode: "HTML" });
  await sendQuestion(ctx, session, lang);
}

bot.command("exam", (ctx) => beginExam(ctx, { mode: "exam", size: EXAM_SIZE, topic: null }));
bot.command("quiz", (ctx) => beginExam(ctx, { mode: "quiz", size: QUIZ_SIZE, topic: null }));

function sendTopicMenu(ctx) {
  const lang = langOf(ctx);
  const level = getPrefs(ctx.from.id)?.level;
  if (!level) return ctx.reply(t(lang, "need_start"));
  const counts = topicCounts(level);
  const rows = Object.entries(TOPICS)
    .filter(([code]) => (counts[code] || 0) > 0)
    .map(([code, names]) => [
      Markup.button.callback(`${names[lang]} (${counts[code]})`, `topic:${code}`),
    ]);
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

bot.action("plang:py", (ctx) => ctx.answerCbQuery(t(langOf(ctx), "python_soon"), { show_alert: true }));

bot.action("plang:js", async (ctx) => {
  const lang = langOf(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_level"), levelKeyboard());
});

bot.action(/^level:(JSE|JSA|JSP)$/, async (ctx) => {
  const lang = langOf(ctx);
  const code = ctx.match[1];
  // Bu darajada savol bormi?
  if (getPool({ level: code }).length === 0) {
    return ctx.answerCbQuery(t(lang, "level_soon"), { show_alert: true });
  }
  setPref(ctx.from.id, "level", code);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "menu_title", LEVELS[code].label), {
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

bot.action(/^topic:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "topic", size: QUIZ_SIZE, topic: ctx.match[1] });
});

// ---------- Savol-javob callbacklar ----------
bot.action(/^toggle:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  toggleSelection(session, Number(ctx.match[1]));
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(optionKeyboard(session, lang).reply_markup).catch(() => {});
});

async function handleSubmit(ctx) {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  const q = currentQuestion(session);
  const picked = [...session.selected].sort((a, b) => a - b);
  const isCorrect = submitAnswer(session);
  await ctx.answerCbQuery(isCorrect ? t(lang, "correct_toast") : t(lang, "wrong_toast"));
  await afterAnswer(ctx, session, q, picked, isCorrect, lang);
}

bot.action(/^pick:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery(t(langOf(ctx), "session_not_found"));
  session.selected = new Set([Number(ctx.match[1])]);
  await handleSubmit(ctx);
});

bot.action("done", async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
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
  await ctx.reply(resultText(session, lang), { parse_mode: "HTML" });
  endSession(ctx.from.id);
});

// ---------- Ishga tushirish ----------
console.log("⏳ Bot ishga tushmoqda...");
bot.launch({ dropPendingUpdates: true }).catch((err) => {
  console.error("❌ Bot ishga tushmadi:", err);
  process.exit(1);
});
console.log("✅ Bot ishladi. Telegram'da /start bosing.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
