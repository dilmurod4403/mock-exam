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
  gradeRank,
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
  recordGrade,
  getLastGrade,
  touchUser,
  getUsersOverview,
  getGlobalStats,
  isBlocked,
  blockUser,
  unblockUser,
  removeUser,
  getUserDetail,
  getOnboardedUsers,
  getReminderData,
  remindersEnabled,
  wasRemindedToday,
  markReminded,
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

// Kunlik eslatma: Toshkent vaqti bilan shu soatda, kuniga ko'pi bilan 1 marta.
// REMIND_HOUR env orqali sozlanadi (0-23), standart 19:00.
const TZ_OFFSET_MS = 5 * 3600 * 1000; // UTC+5
const REMIND_HOUR = Math.min(23, Math.max(0, Number(process.env.REMIND_HOUR ?? 19) || 0));
const REMIND_CHECK_EVERY = 15 * 60 * 1000; // 15 daqiqada bir tekshiramiz

const bot = new Telegraf(TOKEN);

const langOf = (ctx) => getLang(ctx.from.id);

// ---------- Admin (boshqaruv) ----------
// ADMIN_IDS — vergul bilan ajratilgan Telegram ID'lar (env). /myid bilan ID olinadi.
const ADMIN_IDS = new Set(
  (process.env.ADMIN_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const isAdmin = (id) => ADMIN_IDS.has(String(id));

// Har interaksiyada foydalanuvchi kimligini (ism/username/oxirgi faollik) yozib boramiz
bot.use((ctx, next) => {
  const f = ctx.from;
  if (f && !f.is_bot) {
    touchUser(f.id, {
      name: [f.first_name, f.last_name].filter(Boolean).join(" ") || null,
      username: f.username || null,
    });
    // Bloklangan foydalanuvchi (adminlardan tashqari) — jimgina e'tiborsiz qoldiriladi
    if (isBlocked(f.id) && !isAdmin(f.id)) return;
  }
  return next();
});

function fmtAgo(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "hozir";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

// Uzun matnni Telegram limitiga bo'lib yuboradi
async function sendChunked(ctx, text) {
  const LIMIT = 3800;
  for (let i = 0; i < text.length; i += LIMIT) {
    await ctx.reply(text.slice(i, i + LIMIT), { parse_mode: "HTML" });
  }
}

// Har kim o'z Telegram ID'sini bilib olishi uchun (admin sozlash uchun kerak)
bot.command("myid", (ctx) =>
  ctx.reply(`🆔 Telegram ID: <code>${ctx.from.id}</code>`, { parse_mode: "HTML" })
);

const ADMIN_LIST_SIZE = 20; // panelda ko'rsatiladigan (va tugmali) foydalanuvchilar soni
const adminGuard = (ctx) => {
  if (isAdmin(ctx.from.id)) return true;
  ctx.answerCbQuery && ctx.answerCbQuery().catch(() => {});
  return false;
};

// Admin panel matni + boshqaruv tugmalari (har foydalanuvchi uchun bitta tugma)
function adminPanel() {
  const g = getGlobalStats();
  const users = getUsersOverview();
  let out =
    `👑 <b>Admin panel</b>\n\n` +
    `👥 Jami: <b>${g.totalUsers}</b> · 🟢 24s: <b>${g.active24}</b> · 📅 7k: <b>${g.active7}</b>\n` +
    `📝 Javoblar: <b>${g.totalAnswers}</b> · 🚫 Bloklangan: <b>${g.blocked}</b>\n\n` +
    `<b>Foydalanuvchilar</b> (oxirgi faollik):\n`;
  const shown = users.slice(0, ADMIN_LIST_SIZE);
  shown.forEach((u, i) => {
    const who = u.name ? esc(u.name) : `id${u.id}`;
    const uname = u.username ? ` @${esc(u.username)}` : "";
    const track = u.plang ? `${u.plang}/${u.level || "?"}` : "—";
    const acc = u.accuracy === null ? "—" : `${u.accuracy}%`;
    out += `${i + 1}. ${u.blocked ? "🚫 " : ""}${who}${uname} · ${track} · ${u.answers}j · ${acc} · ${fmtAgo(u.lastSeen)}\n`;
  });
  if (users.length > ADMIN_LIST_SIZE)
    out += `\n… va yana ${users.length - ADMIN_LIST_SIZE} ta. Boshqarish: /user &lt;id&gt;`;
  const rows = shown.map((u, i) => [
    Markup.button.callback(
      `${i + 1}. ${u.blocked ? "🚫 " : ""}${(u.name || "id" + u.id).slice(0, 48)}`,
      `adm:u:${u.id}`
    ),
  ]);
  return { text: out, kb: Markup.inlineKeyboard(rows) };
}

async function showAdmin(ctx) {
  const { text, kb } = adminPanel();
  await sendChunked(ctx, text);
  await ctx.reply("👇 Boshqarish uchun foydalanuvchini tanlang:", kb);
}

// Bitta foydalanuvchi kartasi (batafsil) + tugmalari
function userCard(d) {
  const who = d.name ? esc(d.name) : `id${d.id}`;
  const uname = d.username ? ` @${esc(d.username)}` : "";
  let out =
    `👤 <b>${who}</b>${uname}\n` +
    `🆔 <code>${d.id}</code>${d.blocked ? "  🚫 <b>BLOKLANGAN</b>" : ""}\n` +
    `🌐 ${d.lang || "—"} · 🎯 ${d.plang ? `${d.plang}/${d.level || "?"}` : "—"}\n` +
    `📅 Ro'yxatdan: ${fmtAgo(d.firstSeen)} · Oxirgi: ${fmtAgo(d.lastSeen)}\n\n` +
    `📝 Jami javob: <b>${d.total}</b> · Aniqlik: <b>${d.accuracy === null ? "—" : d.accuracy + "%"}</b>`;
  const levels = Object.entries(d.byLevel);
  if (levels.length) {
    out += `\n\n📊 <b>Daraja bo'yicha:</b>\n`;
    out += levels
      .map(([lk, s]) => `• ${lk}: ${s.c}/${s.t} (${Math.round((s.c / s.t) * 100)}%)`)
      .join("\n");
  }
  if (d.grades.length) {
    out += `\n\n🎓 <b>Baholar:</b>\n`;
    out += d.grades
      .map((g) => `• ${g.bandEmoji || "🎓"} ${esc(g.bandName)} (${g.plang}, ${fmtAgo(g.t)})`)
      .join("\n");
  }
  return out;
}

function userCardKb(d) {
  return Markup.inlineKeyboard([
    [
      d.blocked
        ? Markup.button.callback("✅ Blokdan chiqarish", `adm:unblock:${d.id}`)
        : Markup.button.callback("🚫 Bloklash", `adm:block:${d.id}`),
      Markup.button.callback("🗑 O'chirish", `adm:rm:${d.id}`),
    ],
    [Markup.button.callback("⬅️ Admin", "adm:back")],
  ]);
}

async function showUserCard(ctx, id, edit = false) {
  const d = getUserDetail(id);
  const opts = { parse_mode: "HTML", ...userCardKb(d) };
  if (edit) await ctx.editMessageText(userCard(d), opts).catch(() => ctx.reply(userCard(d), opts));
  else await ctx.reply(userCard(d), opts);
}

// Admin panel — faqat ADMIN_IDS dagilar uchun
bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return; // admin bo'lmasa — jimgina e'tiborsiz
  await showAdmin(ctx);
});

// Batafsil ko'rish / bloklash — to'g'ridan id bo'yicha (ro'yxatda yo'q bo'lsa ham)
bot.command("user", (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Foydalanish: /user &lt;id&gt;", { parse_mode: "HTML" });
  return showUserCard(ctx, id);
});
bot.command("block", (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Foydalanish: /block &lt;id&gt;", { parse_mode: "HTML" });
  blockUser(id);
  endSession(Number(id));
  return ctx.reply(`🚫 <code>${esc(id)}</code> bloklandi.`, { parse_mode: "HTML" });
});
bot.command("unblock", (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Foydalanish: /unblock &lt;id&gt;", { parse_mode: "HTML" });
  unblockUser(id);
  return ctx.reply(`✅ <code>${esc(id)}</code> blokdan chiqarildi.`, { parse_mode: "HTML" });
});

// ---------- Admin panel callbacklar ----------
bot.action(/^adm:u:(\d+)$/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  await showUserCard(ctx, ctx.match[1]);
});
bot.action(/^adm:block:(\d+)$/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  blockUser(ctx.match[1]);
  endSession(Number(ctx.match[1]));
  await ctx.answerCbQuery("Bloklandi 🚫");
  await showUserCard(ctx, ctx.match[1], true);
});
bot.action(/^adm:unblock:(\d+)$/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  unblockUser(ctx.match[1]);
  await ctx.answerCbQuery("Blokdan chiqarildi ✅");
  await showUserCard(ctx, ctx.match[1], true);
});
bot.action(/^adm:rm:(\d+)$/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const id = ctx.match[1];
  await ctx.reply(
    `⚠️ <code>${esc(id)}</code> — BARCHA ma'lumotini o'chirasizmi? Qaytarib bo'lmaydi.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Ha, o'chir", `adm:rmyes:${id}`),
          Markup.button.callback("❌ Yo'q", `adm:u:${id}`),
        ],
      ]),
    }
  );
});
bot.action(/^adm:rmyes:(\d+)$/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  const id = ctx.match[1];
  removeUser(id);
  endSession(Number(id));
  await ctx.answerCbQuery("O'chirildi 🗑");
  await ctx.editMessageText(`🗑 <code>${esc(id)}</code> — ma'lumotlari o'chirildi.`, {
    parse_mode: "HTML",
  }).catch(() => {});
});
bot.action("adm:back", async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await showAdmin(ctx);
});

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
// menuLang berilsa (sozlamalar konteksti) — "asosiy menyu" tugmasi qo'shiladi
const languageKeyboard = (menuLang) => {
  const rows = [
    [Markup.button.callback(LANGS.uz, "lang:uz")],
    [Markup.button.callback(LANGS.en, "lang:en")],
  ];
  if (menuLang) rows.push([Markup.button.callback(t(menuLang, "btn_menu"), "menu")]);
  return Markup.inlineKeyboard(rows);
};

const proglangKeyboard = (lang) =>
  Markup.inlineKeyboard([
    ...Object.entries(PROG_LANGS).map(([code, cfg]) => [
      Markup.button.callback(cfg.comingSoon ? `${cfg.label} 🔜` : cfg.label, `plang:${code}`),
    ]),
    [Markup.button.callback(t(lang, "btn_back"), "back:lang")],
  ]);

const levelKeyboard = (plang, lang) =>
  Markup.inlineKeyboard([
    ...Object.entries(PROG_LANGS[plang].levels).map(([code, { label }]) => [
      Markup.button.callback(label, `level:${code}`),
    ]),
    [Markup.button.callback(t(lang, "btn_back"), "back:plang")],
  ]);

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
    [
      Markup.button.callback(t(lang, "btn_back"), "back:level"),
      Markup.button.callback(t(lang, "btn_change"), "settings"),
    ],
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
  // Bitta bo'lak limitdan uzun bo'lsa ham — mayda qismlarga bo'lib yuboramiz
  // (Telegram 4096 limitidan oshmasligi uchun; limit < 4096).
  const send = async (text) => {
    for (let i = 0; i < text.length; i += limit) {
      await ctx.reply(text.slice(i, i + limit), { parse_mode: "HTML" });
    }
  };
  let buf = "";
  for (const b of blocks) {
    if (buf && buf.length + sep.length + b.length > limit) {
      await send(buf);
      buf = "";
    }
    buf = buf ? buf + sep + b : b;
  }
  if (buf) await send(buf);
}

// grade rejimi natija kartasi: daraja + qiyinlik/mavzu tahlili + keyingi qadam
function gradeCardText(session, lang, prev) {
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

  // Oldingi baho bilan taqqoslash (o'sishni ko'rsatadi)
  if (prev && prev.plang === session.plang) {
    const cur = gradeRank(band.key);
    const was = gradeRank(prev.bandKey);
    const arrow = cur > was ? "⬆️" : cur < was ? "⬇️" : "➡️";
    const days = Math.max(0, Math.floor((Date.now() - prev.t) / 86400000));
    out += `\n\n${t(lang, "grade_progress", prev.bandName, days, arrow)}`;
  }

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

  const lastGrade = getLastGrade(userId, plang);
  if (lastGrade) {
    out += `\n${t(lang, "stats_lastgrade", lastGrade.bandEmoji || "🎓", lastGrade.bandName)}`;
  }

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
  return ctx.reply(statsText(ctx.from.id, lang), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[Markup.button.callback(t(lang, "btn_menu"), "menu")]]),
  });
}

bot.command("stats", (ctx) => sendStats(ctx));

// Kunlik eslatmani yoqish/o'chirish
bot.command("reminders", (ctx) => {
  const lang = langOf(ctx);
  const turnOn = !remindersEnabled(ctx.from.id);
  setPref(ctx.from.id, "reminders", turnOn);
  return ctx.reply(t(lang, turnOn ? "remind_on" : "remind_off"), { parse_mode: "HTML" });
});

bot.action("remind:off", async (ctx) => {
  const lang = langOf(ctx);
  setPref(ctx.from.id, "reminders", false);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "remind_off"), { parse_mode: "HTML" });
});

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
  rows.push([Markup.button.callback(t(lang, "btn_menu"), "menu")]);
  return ctx.reply(t(lang, "choose_topic"), Markup.inlineKeyboard(rows));
}

bot.command("topic", (ctx) => sendTopicMenu(ctx));

// O'rganish: darsli mavzular menyusi
function sendLearnMenu(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  const { plang, level } = prefs;
  // faqat joriy darajada savoli bor mavzular darsini ko'rsatamiz
  const counts = topicCounts({ plang, level });
  const topics = lessonTopics(plang, level).filter((code) => (counts[code] || 0) > 0);
  if (topics.length === 0) return ctx.reply(t(lang, "no_lessons"));
  const rows = topics.map((code) => [
    Markup.button.callback(PROG_LANGS[plang].topics[code][lang], `learn:${code}`),
  ]);
  rows.push([Markup.button.callback(t(lang, "btn_menu"), "menu")]);
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
  await ctx.reply(t(lang, "choose_proglang"), proglangKeyboard(lang));
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
  await ctx.reply(t(lang, "choose_level"), levelKeyboard(code, lang));
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
  const lang = langOf(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_language"), languageKeyboard(lang));
});

// Asosiy menyuga qaytish (istalgan bo'limdan)
function mainMenu(ctx) {
  const lang = langOf(ctx);
  const prefs = getPrefs(ctx.from.id);
  if (!prefs?.plang || !prefs?.level) return ctx.reply(t(lang, "need_start"));
  return ctx.reply(t(lang, "menu_title", PROG_LANGS[prefs.plang].levels[prefs.level].label), {
    parse_mode: "HTML",
    ...menuKeyboard(lang),
  });
}

bot.action("menu", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await mainMenu(ctx);
});

// Onboarding'da bir qadam ortga
bot.action("back:lang", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(langOf(ctx), "choose_language"), languageKeyboard());
});
bot.action("back:plang", async (ctx) => {
  const lang = langOf(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_proglang"), proglangKeyboard(lang));
});
bot.action("back:level", async (ctx) => {
  const lang = langOf(ctx);
  const plang = getPrefs(ctx.from.id)?.plang;
  if (!plang) return ctx.answerCbQuery(t(lang, "need_start"), { show_alert: true });
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(t(lang, "choose_level"), levelKeyboard(plang, lang));
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
  const lesson = getLesson(prefs.plang, topic, prefs.level);
  if (!lesson) return ctx.answerCbQuery(t(lang, "no_lessons"), { show_alert: true });
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  const title = lesson.title[lang] || lesson.title.uz;
  const body = renderText(lesson.body[lang] || lesson.body.uz);
  await ctx.reply(`📖 <b>${esc(title)}</b>\n\n${body}`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, "btn_practice_topic"), `learntopic:${topic}`)],
      [
        Markup.button.callback(t(lang, "btn_more_lessons"), "mode:learn"),
        Markup.button.callback(t(lang, "btn_menu"), "menu"),
      ],
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

  let headline;
  if (session.mode === "grade" && session.grading) {
    const band = gradeFor(session.grading.theta);
    const prev = getLastGrade(ctx.from.id, session.plang); // yangi yozuvdan oldin
    recordGrade(ctx.from.id, {
      plang: session.plang,
      bandKey: band.key,
      bandName: band.name,
      bandEmoji: band.emoji,
      theta: Math.round(session.grading.theta),
    });
    headline = gradeCardText(session, lang, prev);
  } else {
    headline = resultText(session, lang);
  }
  await ctx.reply(headline, { parse_mode: "HTML" });

  // Xato-tahlilini yuborish (uzun bo'lsa xato berishi mumkin) — menyuni bloklamasin
  try {
    const blocks = mistakeBlocks(session, lang);
    if (blocks.length) {
      await ctx.reply(t(lang, "mistakes_title", blocks.length), { parse_mode: "HTML" });
      await sendBlocks(ctx, blocks);
    }
  } catch (err) {
    console.error("⚠️ Xatolar tahlilini yuborib bo'lmadi:", err.message);
  }

  // Har doim ko'rsatiladi: keyingi qadam + orqaga/menyu
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
    { command: "reminders", description: "Kunlik eslatmani yoqish/o'chirish" },
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
    { command: "reminders", description: "Turn daily reminders on/off" },
    { command: "stop", description: "Stop the current exam" },
  ],
};

async function registerCommands() {
  await bot.telegram.setMyCommands(COMMANDS.uz);
  await bot.telegram.setMyCommands(COMMANDS.en, { language_code: "en" });
}

// ---------- Kunlik eslatmalar ----------
const tashkentHour = () => new Date(Date.now() + TZ_OFFSET_MS).getUTCHours();

// Bugun mashq qilmagan, lekin sababi bor (streak xavfda / takrorlash kutyapti)
// foydalanuvchilarga kuniga bir marta turtki yuboradi.
async function sendReminders({ force = false } = {}) {
  const stat = { sent: 0, blocked: 0, off: 0, alreadySent: 0, activeToday: 0, noReason: 0 };
  if (!force && tashkentHour() !== REMIND_HOUR) return stat;
  let sent = 0;
  for (const u of getOnboardedUsers()) {
    try {
      if (isBlocked(u.id)) { stat.blocked += 1; continue; }
      if (!remindersEnabled(u.id)) { stat.off += 1; continue; }
      if (wasRemindedToday(u.id)) { stat.alreadySent += 1; continue; }
      const d = getReminderData(u.id, { plang: u.plang, level: u.level });
      if (d.activeToday) { stat.activeToday += 1; continue; } // bugun mashq qilgan
      if (d.due === 0 && d.streak === 0) { stat.noReason += 1; continue; } // sabab yo'q

      const lines = [];
      if (d.streak > 0) lines.push(t(u.lang, "remind_streak", d.streak));
      if (d.due > 0) lines.push(t(u.lang, "remind_due", d.due));
      const text = `${t(u.lang, "remind_title")}\n\n${lines.join("\n")}\n\n${t(u.lang, "remind_cta")}`;

      await bot.telegram.sendMessage(u.id, text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t(u.lang, "btn_practice"), "mode:practice")],
          [Markup.button.callback(t(u.lang, "btn_reminders_off"), "remind:off")],
        ]),
      });
      markReminded(u.id);
      sent += 1;
      await new Promise((r) => setTimeout(r, 60)); // Telegram rate limitiga hurmat
    } catch (err) {
      // 403 — foydalanuvchi botni bloklagan/o'chirgan: qayta urinmaymiz
      if (err?.response?.error_code === 403) setPref(u.id, "reminders", false);
      else console.error(`⚠️ Eslatma yuborilmadi (${u.id}):`, err.message);
    }
  }
  stat.sent = sent;
  if (sent) console.log(`🔔 ${sent} ta eslatma yuborildi.`);
  return stat;
}

// Admin: eslatmani darhol sinash (soatni kutmasdan)
bot.command("testremind", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const s = await sendReminders({ force: true });
  await ctx.reply(
    `🔔 <b>Test natijasi</b>\n\n` +
      `Yuborildi: <b>${s.sent}</b>\n` +
      `O'tkazildi — bugun mashq qilgan: ${s.activeToday} · sabab yo'q: ${s.noReason} · ` +
      `bugun yuborilgan: ${s.alreadySent} · o'chirgan: ${s.off} · bloklangan: ${s.blocked}\n\n` +
      `<i>Eslatma soati: ${REMIND_HOUR}:00 (Toshkent)</i>`,
    { parse_mode: "HTML" }
  );
});

// ---------- Xatoliklarni ushlash ----------
bot.catch((err, ctx) => {
  console.error(`⚠️ Handler xatosi (${ctx?.updateType}):`, err);
});

// ---------- Ishga tushirish ----------
// 409 Conflict (redeploy paytida eski nusxa hali token'ni polling qilyapti) — crash
// o'rniga biroz kutib qayta uramiz. Boshqa xatolar jarayonni to'xtatadi (Railway restart qiladi).
const LAUNCH_RETRY_MS = 6000;
const LAUNCH_MAX_RETRIES = 20;
async function launchWithRetry() {
  for (let attempt = 1; ; attempt++) {
    try {
      await bot.launch({ dropPendingUpdates: true });
      return; // faqat bot to'xtaganda (normal shutdown) shu yerga yetadi
    } catch (err) {
      if (err?.response?.error_code === 409 && attempt <= LAUNCH_MAX_RETRIES) {
        console.warn(
          `⚠️ 409 Conflict — boshqa nusxa hali polling qilyapti. ` +
            `${LAUNCH_RETRY_MS / 1000}s kutib qayta uraman [${attempt}/${LAUNCH_MAX_RETRIES}]...`
        );
        try {
          bot.stop();
        } catch {
          /* polling hali boshlanmagan bo'lishi mumkin — e'tiborsiz */
        }
        await new Promise((r) => setTimeout(r, LAUNCH_RETRY_MS));
        continue;
      }
      console.error("❌ Bot ishga tushmadi:", err);
      process.exit(1);
    }
  }
}

console.log("⏳ Bot ishga tushmoqda...");
launchWithRetry();
registerCommands().catch((err) =>
  console.error("⚠️ Buyruqlar menyusini o'rnatib bo'lmadi:", err.message)
);

// Eskirgan sessiyalarni davriy tozalash (xotira oqishiga qarshi)
const sweepTimer = setInterval(() => {
  const n = sweepSessions(SESSION_TTL);
  if (n) console.log(`🧹 ${n} ta eskirgan sessiya tozalandi.`);
}, SWEEP_EVERY);
sweepTimer.unref(); // process yopilishiga to'sqinlik qilmasin

// Kunlik eslatma tekshiruvi (faqat REMIND_HOUR da ish bajaradi)
const remindTimer = setInterval(() => {
  sendReminders().catch((err) => console.error("⚠️ Eslatma svipi:", err.message));
}, REMIND_CHECK_EVERY);
remindTimer.unref();

console.log("✅ Bot ishladi. Telegram'da /start bosing.");

function shutdown(signal) {
  flush();
  bot.stop(signal);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
