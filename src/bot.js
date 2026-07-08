import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { TOPICS, pickQuestions, getByTopic } from "./data.js";
import {
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
const EXAM_SIZE = 40; // haqiqiy JSA ~40 savol
const QUIZ_SIZE = 10;
const PASS_PERCENT = 70; // JSA o'tish balli
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const bot = new Telegraf(TOKEN);

// ---------- Matn formatlash (Telegram HTML) ----------
function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Markdown-ko'rinishdagi savolni Telegram HTML ga o'giradi (```kod``` bloklarini <pre> qiladi)
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

function isMulti(q) {
  return q.correct.length > 1;
}

// Savol matnini variantlar bilan tuzadi
function questionBody(session) {
  const q = currentQuestion(session);
  const num = session.index + 1;
  const total = session.questions.length;
  const header = `<b>Savol ${num}/${total}</b>${
    isMulti(q) ? "  <i>(bir nechta to'g'ri javob)</i>" : ""
  }\n\n`;
  const body = renderText(q.question);
  const opts = q.options
    .map((o, i) => `${LETTERS[i]}) ${renderText(o)}`)
    .join("\n");
  return `${header}${body}\n\n${opts}`;
}

// Variant tugmalari
function optionKeyboard(session) {
  const q = currentQuestion(session);
  const multi = isMulti(q);
  const rows = q.options.map((_, i) => {
    const label =
      multi && session.selected.has(i) ? `☑️ ${LETTERS[i]}` : LETTERS[i];
    const action = multi ? `toggle:${i}` : `pick:${i}`;
    return [Markup.button.callback(label, action)];
  });
  if (multi) {
    rows.push([Markup.button.callback("✅ Javobni tasdiqlash", "done")]);
  }
  return Markup.inlineKeyboard(rows);
}

async function sendQuestion(ctx, session) {
  await ctx.reply(questionBody(session), {
    parse_mode: "HTML",
    ...optionKeyboard(session),
  });
}

// Javobdan keyingi natija matni (to'g'ri/xato + tushuntirish)
function feedbackText(q, picked, isCorrect) {
  const correctLetters = q.correct.map((i) => LETTERS[i]).join(", ");
  const pickedLetters = picked.length
    ? picked.map((i) => LETTERS[i]).join(", ")
    : "—";
  const head = isCorrect
    ? "✅ <b>To'g'ri!</b>"
    : `❌ <b>Xato.</b> Siz: ${pickedLetters}`;
  return (
    `${head}\n` +
    `To'g'ri javob: <b>${correctLetters}</b>\n\n` +
    `💡 <b>Izoh:</b> ${esc(q.explanation)}`
  );
}

async function afterAnswer(ctx, session, q, picked, isCorrect) {
  // Savolni bosib bo'lgach, tugmalarni olib, natijani ko'rsatamiz
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  const finished = isFinished(session);
  const btn = finished
    ? Markup.button.callback("🏁 Natijani ko'rish", "result")
    : Markup.button.callback("➡️ Keyingi savol", "next");
  await ctx.reply(feedbackText(q, picked, isCorrect), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[btn]]),
  });
}

// ---------- Natija ----------
function resultText(session) {
  const { total, correct, percent } = score(session);
  const passed = percent >= PASS_PERCENT;
  const minutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
  const verdict = passed
    ? "🎉 <b>TABRIKLAYMAN — O'TDINGIZ!</b>"
    : "📚 <b>Hali tayyor emassiz — mashq davom etsin!</b>";
  return (
    `🏁 <b>Natija</b>\n\n` +
    `To'g'ri javoblar: <b>${correct}/${total}</b>\n` +
    `Foiz: <b>${percent}%</b>  (o'tish uchun: ${PASS_PERCENT}%)\n` +
    `Vaqt: ~${minutes} daqiqa\n\n` +
    `${verdict}\n\n` +
    `Qaytadan urinish: /exam yoki /quiz`
  );
}

// ---------- Buyruqlar ----------
bot.start((ctx) =>
  ctx.reply(
    `👋 Salom, ${ctx.from.first_name}!\n\n` +
      `Bu — <b>JSA (JavaScript Associate)</b> sertifikatiga tayyorgarlik uchun mock imtihon boti.\n\n` +
      `<b>Buyruqlar:</b>\n` +
      `/exam — to'liq imtihon (${EXAM_SIZE} savolgacha, ${PASS_PERCENT}% o'tish)\n` +
      `/quiz — tezkor mashq (${QUIZ_SIZE} savol)\n` +
      `/topic — mavzu bo'yicha mashq\n` +
      `/stop — joriy imtihonni to'xtatish\n` +
      `/help — yordam\n\n` +
      `Savollar ingliz tilida, izohlar o'zbekcha. Omad! 🚀`,
    { parse_mode: "HTML" }
  )
);

bot.help((ctx) =>
  ctx.reply(
    `ℹ️ Har savolda variant tugmasini bosing.\n` +
      `Ba'zi savollarda bir nechta to'g'ri javob bo'ladi — ularni belgilab, "✅ Tasdiqlash" ni bosing.\n` +
      `Har javobdan keyin o'zbekcha izoh chiqadi.\n\n` +
      `/exam, /quiz, /topic, /stop`,
    { parse_mode: "HTML" }
  )
);

async function beginExam(ctx, { mode, size, topic }) {
  const questions = pickQuestions(size, topic);
  if (questions.length === 0) {
    return ctx.reply("Bu mavzu bo'yicha hozircha savol yo'q.");
  }
  const session = startSession(ctx.from.id, { mode, questions });
  const label =
    mode === "exam"
      ? "To'liq imtihon"
      : topic
      ? `Mavzu: ${TOPICS[topic]}`
      : "Tezkor mashq";
  await ctx.reply(
    `📝 <b>${label}</b> boshlandi — ${questions.length} ta savol. Omad!`,
    { parse_mode: "HTML" }
  );
  await sendQuestion(ctx, session);
}

bot.command("exam", (ctx) =>
  beginExam(ctx, { mode: "exam", size: EXAM_SIZE, topic: null })
);

bot.command("quiz", (ctx) =>
  beginExam(ctx, { mode: "quiz", size: QUIZ_SIZE, topic: null })
);

bot.command("topic", (ctx) => {
  const rows = Object.entries(TOPICS).map(([code, name]) => {
    const count = getByTopic(code).length;
    return [Markup.button.callback(`${name} (${count})`, `topic:${code}`)];
  });
  return ctx.reply("Qaysi mavzu bo'yicha mashq qilamiz?", {
    ...Markup.inlineKeyboard(rows),
  });
});

bot.command("stop", (ctx) => {
  endSession(ctx.from.id);
  return ctx.reply("⏹ Imtihon to'xtatildi. Yangisi uchun /exam yoki /quiz.");
});

// ---------- Callback tugmalar ----------
bot.action(/^topic:(.+)$/, async (ctx) => {
  const topic = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await beginExam(ctx, { mode: "topic", size: QUIZ_SIZE, topic });
});

bot.action(/^toggle:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  toggleSelection(session, Number(ctx.match[1]));
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(optionKeyboard(session).reply_markup).catch(() => {});
});

async function handleSubmit(ctx) {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  const q = currentQuestion(session);
  const picked = [...session.selected].sort((a, b) => a - b);
  const isCorrect = submitAnswer(session);
  await ctx.answerCbQuery(isCorrect ? "To'g'ri ✅" : "Xato ❌");
  await afterAnswer(ctx, session, q, picked, isCorrect);
}

bot.action(/^pick:(\d+)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  session.selected = new Set([Number(ctx.match[1])]);
  await handleSubmit(ctx);
});

bot.action("done", async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  if (session.selected.size === 0) {
    return ctx.answerCbQuery("Avval kamida bitta variant belgilang.");
  }
  await handleSubmit(ctx);
});

bot.action("next", async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendQuestion(ctx, session);
});

bot.action("result", async (ctx) => {
  const session = getSession(ctx.from.id);
  if (!session) return ctx.answerCbQuery("Sessiya topilmadi. /exam ni bosing.");
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(resultText(session), { parse_mode: "HTML" });
  endSession(ctx.from.id);
});

// ---------- Ishga tushirish ----------
console.log("⏳ Bot ishga tushmoqda...");
bot
  .launch({ dropPendingUpdates: true })
  .catch((err) => {
    console.error("❌ Bot ishga tushmadi:", err);
    process.exit(1);
  });
console.log("✅ Bot ishladi. Telegram'da /start bosing.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
