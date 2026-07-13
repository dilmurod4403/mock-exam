// Doimiy saqlash: foydalanuvchi sozlamalari (til/daraja) va javob tarixi.
// JSON fayl — bog'liqliksiz. Yozishlar debounce bilan atomik (temp + rename).
// Railway'da fayl saqlanishi uchun Volume kerak (DATA_DIR ni volume yo'liga qo'ying).
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const FILE = join(DATA_DIR, "store.json");

// prefs:   { [userId]: { lang, plang, level } }
// answers: [ {u,q,plang,level,topic,c,t} ]
// srs:     { [userId]: { [questionId]: { box, due, plang, level, topic } } }  (Leitner)
// grades:  { [userId]: [ {plang, bandKey, bandName, theta, t} ] }  (baholash tarixi)
let db = { prefs: {}, answers: [], srs: {}, grades: {} };
try {
  const loaded = JSON.parse(readFileSync(FILE, "utf8"));
  db.prefs = loaded.prefs || {};
  db.answers = loaded.answers || [];
  db.srs = loaded.srs || {};
  db.grades = loaded.grades || {};
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

// Kun raqami (O'zbekiston vaqti, UTC+5 taxminiy) — streak hisoblash uchun
const TZ_OFFSET = 5 * 3600 * 1000;
const dayKey = (t) => Math.floor((t + TZ_OFFSET) / 86400000);

// Bugungacha uzluksiz faol kunlar soni (streak)
function currentStreak(daySet) {
  if (!daySet.size) return 0;
  const today = dayKey(Date.now());
  let d = daySet.has(today) ? today : daySet.has(today - 1) ? today - 1 : null;
  if (d === null) return 0; // oxirgi faollik kechadan oldin — streak uzilgan
  let streak = 0;
  while (daySet.has(d)) {
    streak += 1;
    d -= 1;
  }
  return streak;
}

// To'liq statistika: umumiy aniqlik, mavzu bo'yicha va streak
export function getStats(userId, opts = {}) {
  let total = 0;
  let correct = 0;
  const byTopic = {};
  const days = new Set();
  for (const a of db.answers) {
    if (a.u !== userId) continue;
    if (opts.plang && a.plang !== opts.plang) continue;
    if (opts.level && a.level !== opts.level) continue;
    total += 1;
    if (a.c) correct += 1;
    const s = byTopic[a.topic] || { correct: 0, total: 0 };
    s.total += 1;
    if (a.c) s.correct += 1;
    byTopic[a.topic] = s;
    days.add(dayKey(a.t));
  }
  return {
    total,
    correct,
    percent: total ? Math.round((correct / total) * 100) : 0,
    byTopic,
    streak: currentStreak(days),
  };
}

// ---------- Spaced repetition (Leitner) ----------
const DAY_MS = 86400000;
// box (1–5) → keyingi takrorlashgacha interval. To'g'ri javob box'ni oshiradi,
// xato box'ni 1 ga tushiradi (savol tez qaytadi).
const SRS_INTERVALS = {
  1: 8 * 3600 * 1000, // ~8 soat (o'sha kuni qaytadi, lekin darhol emas)
  2: 1 * DAY_MS,
  3: 3 * DAY_MS,
  4: 7 * DAY_MS,
  5: 14 * DAY_MS,
};

export function recordSrs(userId, { questionId, plang, level, topic, isCorrect }) {
  const userSrs = (db.srs[userId] ||= {});
  const prevBox = userSrs[questionId]?.box || 1;
  const box = isCorrect ? Math.min(5, prevBox + 1) : 1;
  userSrs[questionId] = {
    box,
    due: Date.now() + SRS_INTERVALS[box],
    plang,
    level,
    topic,
  };
  schedule();
}

// Muddati kelgan (due) savol id-lari — eng kechikkani birinchi
export function getDueQuestionIds(userId, { plang, level } = {}) {
  const userSrs = db.srs[userId] || {};
  const now = Date.now();
  const due = [];
  for (const [qid, s] of Object.entries(userSrs)) {
    if (plang && s.plang !== plang) continue;
    if (level && s.level !== level) continue;
    if (s.due <= now) due.push({ qid, due: s.due });
  }
  due.sort((a, b) => a.due - b.due);
  return due.map((d) => d.qid);
}

export function getDueCount(userId, opts = {}) {
  return getDueQuestionIds(userId, opts).length;
}

// Foydalanuvchi allaqachon ko'rgan (SRS holati bor) barcha savol id-lari
export function getSeenIds(userId) {
  return new Set(Object.keys(db.srs[userId] || {}));
}

// ---------- Baholash tarixi ----------
export function recordGrade(userId, { plang, bandKey, bandName, bandEmoji, theta }) {
  const list = (db.grades[userId] ||= []);
  list.push({ plang, bandKey, bandName, bandEmoji, theta, t: Date.now() });
  schedule();
}

// Shu tarmoq bo'yicha oxirgi baho (yoki null)
export function getLastGrade(userId, plang) {
  const list = db.grades[userId] || [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].plang === plang) return list[i];
  }
  return null;
}
