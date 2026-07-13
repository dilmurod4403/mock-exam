import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import {
  PROG_LANGS,
  ALL_QUESTIONS,
  shuffle,
  shuffleOptions,
  pickQuestions,
  getPool,
  topicCounts,
  levelPass,
} from "./data.js";
import { t, LANGS } from "./i18n.js";
import { getLesson, lessonTopics } from "./lessons.js";
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
  getStats,
  recordSrs,
  getDueQuestionIds,
  getSeenIds,
  getDueCount,
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
const PRACTICE_SIZE = 10;
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
    [Markup.button.callback(t(lang, "btn_learn"), "mode:learn")],
    [Markup.button.callback(t(lang, "btn_topic"), "mode:topic")],
    [Markup.button.callback(t(lang, "btn_review"), "mode:review")],
    [Markup.button.callback(t(lang, "btn_practice"), "mode:practice")],
    [Markup.button.callback(t(lang, "btn_grade"), "mode:grade")],
    [Markup.button.callback(t(lang, "btn_stats"), "mode:stats")],
    [Markup.button.callback(t(lang, "btn_change"), "settings")],
  ]);
}

// ---------- Savol ko'rsatish ----------
function questionBody(session, lang) {
  const q = currentQuestion(session);
  const total = session.target ?? session.questions.length;
  const answered = session.index;
  const correct = session.answers.filter((a) => a.isCorrect).length;
  const header = t(lang, "question_header", answered + 1, total, isMulti(q));
  const progress = t(
    lang,
    "progress_line",
    progressBar(Math.round((answered / total) * 100)),
    correct,
    answered - correct
  );
  const body = renderText(q.question);
  const opts = q.options.map((o, i) => `${LETTERS[i]}) ${renderText(o)}`).join("\n");
  return `${header}\n${progress}\n\n${body}\n\n${opts}`;
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
  rows.push([
    Markup.button.callback(t(lang, "btn_skip"), `skip:${qi}`),
    Markup.button.callback(t(lang, "btn_stop"), "stop"),
  ]);
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

// Matnli progress bar: ▰▰▰▱▱▱▱▱
function progressBar(pct, width = 8) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

// /stats natijasi: umumiy aniqlik + tayyorlik + streak + mavzu bo'yicha
function statsText(userId, lang) {
  const prefs = getPrefs(userId);
  const { plang, level } = prefs;
  const stats = getStats(userId, { plang, level });
  if (stats.total === 0) return t(lang, "stats_none");

  const trackLabel = PROG_LANGS[plang]?.label || plang;
  const pass = levelPass(plang, level);
  const ready = stats.percent >= pass;

  let out =
    `${t(lang, "stats_title")}\n\n` +
    `${t(lang, "stats_track", trackLabel, level)}\n` +
    `${t(lang, "stats_total", stats.total)}\n` +
    `${t(lang, "stats_overall", progressBar(stats.percent), stats.percent, pass)}\n` +
    `${ready ? t(lang, "stats_ready") : t(lang, "stats_notready", pass - stats.percent)}\n` +
    `${t(lang, "stats_streak", stats.streak)}`;

  const due = getDueCount(userId, { plang, level });
  if (due > 0) out += `\n${t(lang, "stats_due", due)}`;

  const topics = PROG_LANGS[plang]?.topics || {};
  const rows = Object.entries(stats.byTopic)
    .map(([code, s]) => ({
      name: topics[code]?.[lang] || code,
      c: s.correct,
      total: s.total,
      pct: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct); // zaif mavzular tepada
  if (rows.length) {
    out += `\n\n${t(lang, "stats_by_topic")}\n`;
    out += rows
      .map((r) => t(lang, "stats_topic_line", progressBar(r.pct, 6), r.name, r.c, r.total, r.pct))
      .join("\n");
  }
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

  const questions = pickQuestions(size, { plang, level, topic }).map(shuffleOptions);
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

  const questions = shuffle(pool).slice(0, REVIEW_SIZE).map(shuffleOptions);
  const session = startSession(ctx.from.id, { mode: "review", questions, plang, level });
  await ctx.reply(t(lang, "started", t(lang, "review_label"), questions.length), {
    parse_mode: "HTML",
  });
  await sendQuestion(ctx, session, lang);
}

bot.command("review", (ctx) => beginReview(ctx));

// Kunlik mashq (SRS): muddati kelgan savollar + navbat to'lmasa yangi savollar
async function beginPractice(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;

  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
  const questions = getDueQuestionIds(ctx.from.id, { plang, level })
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, PRACTICE_SIZE);

  // navbat to'lmasa — hali ko'rilmagan yangi savollar bilan to'ldiramiz
  if (questions.length < PRACTICE_SIZE) {
    const seen = getSeenIds(ctx.from.id);
    const chosen = new Set(questions.map((q) => q.id));
    const fresh = shuffle(
      getPool({ plang, level }).filter((q) => !seen.has(q.id) && !chosen.has(q.id))
    );
    questions.push(...fresh.slice(0, PRACTICE_SIZE - questions.length));
  }

  if (questions.length === 0) return ctx.reply(t(lang, "practice_done"));

  const session = startSession(ctx.from.id, {
    mode: "practice",
    questions: questions.map(shuffleOptions),
    plang,
    level,
  });
  await ctx.reply(t(lang, "started", t(lang, "practice_label"), questions.length), {
    parse_mode: "HTML",
  });
  await sendQuestion(ctx, session, lang);
}

bot.command("practice", (ctx) => beginPractice(ctx));

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

  const first = shuffleOptions(pickGradeQuestion(pool, grading));
  markAsked(grading, first);
  session.questions.push(first);

  await ctx.reply(t(lang, "grade_intro", target), { parse_mode: "HTML" });
  await sendQuestion(ctx, session, lang);
}

bot.command("grade", (ctx) => beginGrade(ctx));

function sendStats(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  return ctx.reply(statsText(ctx.from.id, lang), { parse_mode: "HTML" });
}

bot.command("stats", (ctx) => sendStats(ctx));

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

// O'rganish: darsli mavzular menyusi
function sendLearnMenu(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang } = prefs;
  const topics = lessonTopics(plang);
  if (topics.length === 0) return ctx.reply(t(lang, "no_lessons"));
  const rows = topics.map((code) => [
    Markup.button.callback(PROG_LANGS[plang].topics[code][lang], `learn:${code}`),
  ]);
  return ctx.reply(t(lang, "choose_lesson"), Markup.inlineKeyboard(rows));
}

bot.command("learn", (ctx) => sendLearnMenu(ctx));

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
bot.action("mode:learn", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendLearnMenu(ctx);
});

// Mavzu darsini ko'rsatadi + "shu mavzuni mashq qilish" tugmasi
bot.action(/^learn:(.+)$/, async (ctx) => {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang) return ctx.answerCbQuery(t(lang, "need_start"), { show_alert: true });
  const topic = ctx.match[1];
  const lesson = getLesson(prefs.plang, topic);
  if (!lesson) return ctx.answerCbQuery(t(lang, "no_lessons"), { show_alert: true });
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  const title = lesson.title[lang] || lesson.title.uz;
  const body = renderText(lesson.body[lang] || lesson.body.uz);
  await ctx.reply(`📖 <b>${esc(title)}</b>\n\n${body}`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, "btn_practice_topic"), `learntopic:${topic}`)],
      [Markup.button.callback(t(lang, "btn_more_lessons"), "mode:learn")],
    ]),
  });
});

// Darsdan so'ng shu mavzuni mashq qilish (mavjud topic-testga ulanadi)
bot.action(/^learntopic:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "topic", size: QUIZ_SIZE, topic: ctx.match[1] });
});
bot.action("mode:review", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginReview(ctx);
});
bot.action("mode:practice", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginPractice(ctx);
});
bot.action("mode:grade", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginGrade(ctx);
});
bot.action("mode:stats", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendStats(ctx);
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
  const skipped = picked.length === 0; // bo'sh javob = o'tkazildi
  const isCorrect = submitAnswer(session);
  const answerInfo = {
    questionId: q.id,
    plang: session.plang,
    level: session.level,
    topic: q.topic,
    isCorrect,
  };
  recordAnswer(ctx.from.id, answerInfo);
  recordSrs(ctx.from.id, answerInfo); // Leitner holatini yangilaydi (barcha rejimlar)

  // grade: θ ni yangilab, keyingi savolni adaptiv tanlaymiz
  if (session.mode === "grade" && session.grading) {
    applyGradeAnswer(session.grading, q, isCorrect);
    if (!isFinished(session)) {
      const nextQ = pickGradeQuestion(session.pool, session.grading);
      if (nextQ) {
        const shown = shuffleOptions(nextQ);
        markAsked(session.grading, shown);
        session.questions.push(shown);
      } else {
        session.target = session.index; // savollar tugadi — hozir yakunlaymiz
      }
    }
  }

  await ctx.answerCbQuery(
    skipped ? t(lang, "skipped_toast") : isCorrect ? t(lang, "correct_toast") : t(lang, "wrong_toast")
  );
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

// Savolni o'tkazish: bo'sh javob (xato deb yoziladi, izoh ko'rsatiladi)
bot.action(/^skip:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  const lang = langOf(ctx);
  if (!session) return ctx.answerCbQuery(t(lang, "session_not_found"));
  if (isStale(ctx, session)) return ctx.answerCbQuery(t(lang, "stale_answer"));
  session.selected = new Set();
  await handleSubmit(ctx);
});

// Imtihonni to'xtatish (tugma orqali) — sessiyani yopadi va menyuni ko'rsatadi
bot.action("stop", async (ctx) => {
  const lang = langOf(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  endSession(ctx.from.id);
  await ctx.reply(t(lang, "stopped"), { parse_mode: "HTML", ...menuKeyboard(lang) });
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
    { command: "learn", description: "Mini-dars (avval o'rgan)" },
    { command: "topic", description: "Mavzu bo'yicha mashq" },
    { command: "review", description: "Xatolar ustida ishlash" },
    { command: "practice", description: "Kunlik mashq (spaced repetition)" },
    { command: "grade", description: "Darajamni aniqlash (adaptiv test)" },
    { command: "stats", description: "Statistikam va rivojim" },
    { command: "stop", description: "Joriy imtihonni to'xtatish" },
  ],
  en: [
    { command: "start", description: "Reconfigure (language/level)" },
    { command: "exam", description: "Full mock exam" },
    { command: "quiz", description: "Quick quiz (10 questions)" },
    { command: "learn", description: "Mini-lesson (learn first)" },
    { command: "topic", description: "Practice by topic" },
    { command: "review", description: "Review your mistakes" },
    { command: "practice", description: "Daily practice (spaced repetition)" },
    { command: "grade", description: "Assess my level (adaptive test)" },
    { command: "stats", description: "My stats and progress" },
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
