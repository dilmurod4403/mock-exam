// Doimiy saqlash: foydalanuvchi sozlamalari (til/daraja) va javob tarixi.
// JSON fayl — bog'liqliksiz. Yozishlar debounce bilan atomik (temp + rename).
// Railway'da fayl saqlanishi uchun Volume kerak (DATA_DIR ni volume yo'liga qo'ying).
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const FILE = join(DATA_DIR, "store.json");

// { prefs: { [userId]: { lang, plang, level } }, answers: [ {u,q,plang,level,topic,c,t} ] }
let db = { prefs: {}, answers: [] };
try {
  const loaded = JSON.parse(readFileSync(FILE, "utf8"));
  db.prefs = loaded.prefs || {};
  db.answers = loaded.answers || [];
} catch {
  // fayl yo'q yoki buzuq — bo'sh baza bilan boshlaymiz
}

// ---------- Yozish (debounce + atomik) ----------
let dirty = false;
let timer = null;

function schedule() {
  dirty = true;
  if (!timer) timer = setTimeout(flush, 1000);
}

export function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!dirty) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify(db));
    renameSync(tmp, FILE);
    dirty = false;
  } catch (err) {
    console.error("⚠️ Store yozib bo'lmadi:", err.message);
  }
}

// ---------- Sozlamalar ----------
export function getPrefs(userId) {
  return db.prefs[userId];
}

export function setPref(userId, key, value) {
  const p = db.prefs[userId] || {};
  p[key] = value;
  db.prefs[userId] = p;
  schedule();
  return p;
}

export function getLang(userId) {
  return db.prefs[userId]?.lang || "uz";
}

// ---------- Javob tarixi ----------
export function recordAnswer(userId, { questionId, plang, level, topic, isCorrect }) {
  db.answers.push({
    u: userId,
    q: questionId,
    plang,
    level,
    topic,
    c: isCorrect ? 1 : 0,
    t: Date.now(),
  });
  schedule();
}

// Bir foydalanuvchi + tarmoq bo'yicha javoblarni yig'adi (eng oxirgi holat)
function latestByQuestion(userId, { plang, level } = {}) {
  const latest = new Map(); // questionId -> { c, t }
  for (const a of db.answers) {
    if (a.u !== userId) continue;
    if (plang && a.plang !== plang) continue;
    if (level && a.level !== level) continue;
    latest.set(a.q, { c: a.c, t: a.t }); // keyingi yozuv oldingisini almashtiradi
  }
  return latest;
}

// Oxirgi javobi noto'g'ri bo'lgan savol id-lari, eng yangisi birinchi.
// (To'g'ri qayta yechilgan savol ro'yxatdan chiqadi.)
export function getWrongQuestionIds(userId, opts = {}) {
  const latest = latestByQuestion(userId, opts);
  const wrong = [];
  for (const [q, { c, t }] of latest) if (c === 0) wrong.push({ q, t });
  wrong.sort((a, b) => b.t - a.t);
  return wrong.map((w) => w.q);
}

// Mavzu bo'yicha aniqlik: { topic: { correct, total } }
export function getTopicStats(userId, opts = {}) {
  const stats = {};
  for (const a of db.answers) {
    if (a.u !== userId) continue;
    if (opts.plang && a.plang !== opts.plang) continue;
    if (opts.level && a.level !== opts.level) continue;
    const s = stats[a.topic] || { correct: 0, total: 0 };
    s.total += 1;
    if (a.c) s.correct += 1;
    stats[a.topic] = s;
  }
  return stats;
}
