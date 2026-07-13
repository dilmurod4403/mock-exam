// Adaptiv daraja baholash (CAT — Elo uslubi).
// Har savolga qiyinligiga qarab reyting beriladi; foydalanuvchining θ (theta)
// qobiliyati javobga qarab yangilanadi va keyingi savol θ ga yaqinidan tanlanadi.
// Yuqori darajaga faqat qiyin savollarni yechib chiqiladi (gate mantiqi tabiiy).
import { shuffle } from "./data.js";

// Reyting oralig'i keng (1100–1900) — 7 darajani ajrata olish uchun.
export const QUESTION_RATING = { easy: 1100, medium: 1500, hard: 1900 };
export const GRADE_TARGET = 18; // baholash uchun savollar soni

// Kompetensiya narvoni (past → yuqori). `min` — theta ning pastki chegarasi.
// Chegaralar persona simulyatsiyalari bilan kalibrlangan (θ ≈ 1080–1920).
// Nomlar sanoat atamalari — ikkala tilda ham bir xil ishlatiladi.
export const GRADES = [
  { key: "trainee", name: "Trainee", emoji: "🌱", min: -Infinity },
  { key: "junior", name: "Junior", emoji: "🟢", min: 1200 },
  { key: "strong_junior", name: "Strong Junior", emoji: "🟢", min: 1350 },
  { key: "middle", name: "Middle", emoji: "🔵", min: 1520 },
  { key: "middle_plus", name: "Middle+", emoji: "🔵", min: 1680 },
  { key: "senior", name: "Senior", emoji: "🟣", min: 1800 },
  { key: "lead", name: "Senior+ / Lead", emoji: "🟣", min: 1900 },
];

export function initGradingState() {
  return {
    theta: 1500, // Middle markazidan boshlanadi
    K: 100, // qadam kattaligi (asta kamayadi)
    count: 0,
    asked: new Set(),
    coveredTopics: new Set(),
    byDifficulty: {}, // { easy: {c,t}, ... }
    byTopic: {}, // { topic: {c,t} }
  };
}

// Keyingi savol: θ ga eng yaqin qiyinlik guruhidan, imkon qadar yangi mavzudan.
// (Mutatsiya qilmaydi — chaqiruvchi markAsked bilan belgilaydi.)
export function pickGradeQuestion(pool, state) {
  const avail = pool.filter((q) => !state.asked.has(q.id));
  if (!avail.length) return null;

  const diffs = [...new Set(avail.map((q) => q.difficulty))];
  const bestDiff = diffs.sort(
    (a, b) =>
      Math.abs(QUESTION_RATING[a] - state.theta) -
      Math.abs(QUESTION_RATING[b] - state.theta)
  )[0];

  let bucket = avail.filter((q) => q.difficulty === bestDiff);
  const uncovered = bucket.filter((q) => !state.coveredTopics.has(q.topic));
  if (uncovered.length) bucket = uncovered; // mavzu kengligini ta'minlash
  return shuffle(bucket)[0];
}

export function markAsked(state, q) {
  state.asked.add(q.id);
  state.coveredTopics.add(q.topic);
}

// Javobdan keyin θ ni Elo formulasi bilan yangilaydi va statistikani yig'adi.
export function applyGradeAnswer(state, q, isCorrect) {
  const r = QUESTION_RATING[q.difficulty] ?? 1500;
  const expected = 1 / (1 + Math.pow(10, (r - state.theta) / 400));
  state.theta += state.K * ((isCorrect ? 1 : 0) - expected);
  state.K = Math.max(32, state.K * 0.9); // ishonch oshgani sari qadam kichrayadi
  state.count += 1;

  const d = (state.byDifficulty[q.difficulty] ||= { c: 0, t: 0 });
  d.t += 1;
  if (isCorrect) d.c += 1;

  const tp = (state.byTopic[q.topic] ||= { c: 0, t: 0 });
  tp.t += 1;
  if (isCorrect) tp.c += 1;
}

export function gradeFor(theta) {
  let g = GRADES[0];
  for (const band of GRADES) if (theta >= band.min) g = band;
  return g;
}

export function nextGrade(band) {
  const i = GRADES.findIndex((g) => g.key === band.key);
  return i >= 0 && i < GRADES.length - 1 ? GRADES[i + 1] : null;
}

// Daraja tartib raqami (past → yuqori taqqoslash uchun)
export function gradeRank(key) {
  return GRADES.findIndex((g) => g.key === key);
}
