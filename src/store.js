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
// users:   { [userId]: { name, username, firstSeen, lastSeen } }  (admin uchun kimlik)
// blocked: { [userId]: { at } }  (bloklangan foydalanuvchilar)
// reminders: { [userId]: { lastDay } }  (kuniga bir marta eslatma uchun)
let db = { prefs: {}, answers: [], srs: {}, grades: {}, users: {}, blocked: {}, reminders: {}, reports: [] };
try {
  const loaded = JSON.parse(readFileSync(FILE, "utf8"));
  db.prefs = loaded.prefs || {};
  db.answers = loaded.answers || [];
  db.srs = loaded.srs || {};
  db.grades = loaded.grades || {};
  db.users = loaded.users || {};
  db.blocked = loaded.blocked || {};
  db.reminders = loaded.reminders || {};
  db.reports = loaded.reports || [];
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
export function recordAnswer(userId, { questionId, plang, level, topic, isCorrect, mode }) {
  db.answers.push({
    u: userId,
    q: questionId,
    plang,
    level,
    topic,
    m: mode || null, // qaysi rejimda javob berilgan (metrikalar uchun)
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

// ---------- Foydalanuvchi kimligi (admin uchun) ----------
// Har interaksiyada chaqiriladi: ism/username/oxirgi faollikni yangilaydi.
export function touchUser(userId, { name, username } = {}) {
  const u = db.users[userId] || { firstSeen: Date.now() };
  if (name) u.name = name;
  if (username !== undefined) u.username = username || null;
  u.lastSeen = Date.now();
  db.users[userId] = u;
  schedule();
}

// Har foydalanuvchi bo'yicha umumlashtirilgan ma'lumot (oxirgi faollik bo'yicha saralangan)
export function getUsersOverview() {
  const agg = {}; // userId -> { total, correct, last }
  for (const a of db.answers) {
    const s = agg[a.u] || { total: 0, correct: 0, last: 0 };
    s.total += 1;
    if (a.c) s.correct += 1;
    if (a.t > s.last) s.last = a.t;
    agg[a.u] = s;
  }
  const ids = new Set([
    ...Object.keys(db.users),
    ...Object.keys(db.prefs),
    ...Object.keys(agg),
  ]);
  const list = [];
  for (const id of ids) {
    const u = db.users[id] || {};
    const p = db.prefs[id] || {};
    const a = agg[id] || { total: 0, correct: 0, last: 0 };
    list.push({
      id,
      name: u.name || null,
      username: u.username || null,
      lang: p.lang || null,
      plang: p.plang || null,
      level: p.level || null,
      answers: a.total,
      accuracy: a.total ? Math.round((a.correct / a.total) * 100) : null,
      lastSeen: u.lastSeen || a.last || null,
      firstSeen: u.firstSeen || null,
      blocked: !!db.blocked[id],
    });
  }
  list.sort((x, y) => (y.lastSeen || 0) - (x.lastSeen || 0));
  return list;
}

// Umumiy statistika (admin paneli sarlavhasi uchun)
export function getGlobalStats() {
  const users = getUsersOverview();
  const now = Date.now();
  const DAY = 86400000;
  return {
    totalUsers: users.length,
    active24: users.filter((u) => u.lastSeen && now - u.lastSeen < DAY).length,
    active7: users.filter((u) => u.lastSeen && now - u.lastSeen < 7 * DAY).length,
    totalAnswers: db.answers.length,
    blocked: Object.keys(db.blocked).length,
  };
}

// ---------- Kunlik eslatmalar ----------
// Onboarding'ni tugatgan (tarmoq+daraja tanlagan) foydalanuvchilar
export function getOnboardedUsers() {
  const out = [];
  for (const [id, p] of Object.entries(db.prefs)) {
    if (p.plang && p.level) out.push({ id, plang: p.plang, level: p.level, lang: p.lang || "uz" });
  }
  return out;
}

// Eslatma qarori uchun kerakli ma'lumot: takrorlash navbati, streak, bugun faolmi
export function getReminderData(userId, { plang, level } = {}) {
  const key = String(userId);
  const days = new Set();
  for (const a of db.answers) {
    if (String(a.u) !== key) continue;
    if (plang && a.plang !== plang) continue;
    if (level && a.level !== level) continue;
    days.add(dayKey(a.t));
  }
  return {
    due: getDueCount(userId, { plang, level }),
    streak: currentStreak(days),
    activeToday: days.has(dayKey(Date.now())),
  };
}

// Eslatma yoqilganmi (standart — yoqilgan)
export function remindersEnabled(userId) {
  return db.prefs[String(userId)]?.reminders !== false;
}

// Kuniga bir martadan ko'p yubormaslik uchun
export function wasRemindedToday(userId) {
  return db.reminders[String(userId)]?.lastDay === dayKey(Date.now());
}
export function markReminded(userId) {
  db.reminders[String(userId)] = { lastDay: dayKey(Date.now()) };
  schedule();
}

// ---------- Etap (o'quv yo'li) progressi ----------
// Aniqlik OXIRGI `window` javob bo'yicha hisoblanadi — yomon boshlagan odam
// keyin yaxshilansa, etapni ocha oladi (umr bo'yi past foizga qamalib qolmaydi).
export function getStageStats(userId, { plang, level, topics, window = 20 }) {
  const set = new Set(topics);
  const key = String(userId);
  const mine = [];
  for (const a of db.answers) {
    if (String(a.u) !== key) continue;
    if (plang && a.plang !== plang) continue;
    if (level && a.level !== level) continue;
    if (set.has(a.topic)) mine.push(a);
  }
  const recent = mine.slice(-window);
  const correct = recent.reduce((s, a) => s + (a.c ? 1 : 0), 0);
  return {
    total: mine.length,
    recent: recent.length,
    correct,
    pct: recent.length ? Math.round((correct / recent.length) * 100) : 0,
  };
}

// ---------- Metrikalar (admin) ----------
// Onboarding funnel: qaysi bosqichda necha kishi qolgan
export function getFunnel() {
  const ids = new Set([...Object.keys(db.users), ...Object.keys(db.prefs)]);
  const answered = new Set(db.answers.map((a) => String(a.u)));
  const f = { started: 0, lang: 0, plang: 0, level: 0, activated: 0 };
  for (const id of ids) {
    f.started += 1;
    const p = db.prefs[id] || {};
    if (p.lang) f.lang += 1;
    if (p.plang) f.plang += 1;
    if (p.level) f.level += 1;
    if (answered.has(id)) f.activated += 1;
  }
  return f;
}

// Ushlab qolish: DAU/WAU/MAU, qaytganlar va D1/D7/D30 kogortalari
export function getRetention() {
  const today = dayKey(Date.now());
  const byUser = {};
  for (const a of db.answers) (byUser[String(a.u)] ||= new Set()).add(dayKey(a.t));
  const users = Object.values(byUser).map((set) => [...set].sort((x, y) => x - y));

  const cohort = (window) => {
    // Faqat kamida `window` kun oldin boshlaganlar hisobga olinadi
    const eligible = users.filter((days) => today - days[0] >= window);
    if (!eligible.length) return null;
    const kept = eligible.filter((days) =>
      days.some((d) => d > days[0] && d <= days[0] + window)
    ).length;
    return { size: eligible.length, kept, pct: Math.round((kept / eligible.length) * 100) };
  };

  return {
    total: users.length,
    dau: users.filter((d) => d.includes(today)).length,
    wau: users.filter((d) => d.some((x) => today - x < 7)).length,
    mau: users.filter((d) => d.some((x) => today - x < 30)).length,
    returning: users.filter((d) => d.length >= 2).length,
    d1: cohort(1),
    d7: cohort(7),
    d30: cohort(30),
  };
}

// Qaysi rejimda qancha javob berilgan
export function getModeUsage() {
  const by = {};
  for (const a of db.answers) {
    const m = a.m || "—";
    by[m] = (by[m] || 0) + 1;
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

// ---------- Savol haqida shikoyat (foydalanuvchi xabari) ----------
export function addReport(userId, questionId) {
  db.reports.push({ u: String(userId), q: questionId, t: Date.now() });
  schedule();
}

// Savol bo'yicha guruhlangan shikoyatlar (ko'p shikoyat qilingani birinchi)
export function getReports() {
  const by = {};
  for (const r of db.reports) {
    const s = by[r.q] || { q: r.q, count: 0, last: 0 };
    s.count += 1;
    if (r.t > s.last) s.last = r.t;
    by[r.q] = s;
  }
  return Object.values(by).sort((a, b) => b.count - a.count || b.last - a.last);
}

// ---------- Foydalanuvchini boshqarish (admin) ----------
export function isBlocked(userId) {
  return !!db.blocked[String(userId)];
}
export function blockUser(userId) {
  db.blocked[String(userId)] = { at: Date.now() };
  schedule();
}
export function unblockUser(userId) {
  delete db.blocked[String(userId)];
  schedule();
}

// Foydalanuvchining barcha ma'lumotini o'chiradi (prefs, javob, SRS, baho, kimlik, blok)
export function removeUser(userId) {
  const key = String(userId);
  delete db.prefs[key];
  delete db.srs[key];
  delete db.grades[key];
  delete db.users[key];
  delete db.blocked[key];
  delete db.reminders[key];
  db.answers = db.answers.filter((a) => String(a.u) !== key);
  schedule();
}

// Bitta foydalanuvchi bo'yicha batafsil ma'lumot (admin ko'rishi uchun)
export function getUserDetail(userId) {
  const key = String(userId);
  const u = db.users[key] || {};
  const p = db.prefs[key] || {};
  let total = 0;
  let correct = 0;
  let lastAnswer = 0;
  const byLevel = {}; // "plang/level" -> {c,t}
  const byTopic = {}; // topic -> {c,t}
  for (const a of db.answers) {
    if (String(a.u) !== key) continue;
    total += 1;
    if (a.c) correct += 1;
    if (a.t > lastAnswer) lastAnswer = a.t;
    const lk = `${a.plang}/${a.level}`;
    const bl = byLevel[lk] || { c: 0, t: 0 };
    bl.t += 1;
    if (a.c) bl.c += 1;
    byLevel[lk] = bl;
    const bt = byTopic[a.topic] || { c: 0, t: 0 };
    bt.t += 1;
    if (a.c) bt.c += 1;
    byTopic[a.topic] = bt;
  }
  return {
    id: key,
    name: u.name || null,
    username: u.username || null,
    lang: p.lang || null,
    plang: p.plang || null,
    level: p.level || null,
    firstSeen: u.firstSeen || null,
    lastSeen: u.lastSeen || null,
    lastAnswer,
    blocked: !!db.blocked[key],
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : null,
    byLevel,
    byTopic,
    grades: (db.grades[key] || []).slice(-5),
  };
}
