// Faol imtihon holatini xotirada saqlaydi (o'tkinchi — sozlamalar/tarix store.js da).
const sessions = new Map(); // userId -> faol imtihon

// ---------- Imtihon sessiyasi ----------
export function startSession(userId, { mode, questions, plang, level, target, pool, grading }) {
  const session = {
    mode, // 'exam' | 'quiz' | 'topic' | 'review' | 'grade'
    questions,
    plang, // dasturlash tili (javascript / plsql ...)
    level, // sertifikat darajasi
    target: target ?? null, // grade uchun mo'ljallangan savollar soni (adaptiv)
    pool: pool ?? null, // grade uchun tanlanadigan savollar to'plami
    grading: grading ?? null, // grade holati (theta, statistika)
    index: 0,
    selected: new Set(),
    answers: [],
    startTime: Date.now(),
    lastActive: Date.now(), // eskirgan sessiyalarni tozalash uchun
  };
  sessions.set(userId, session);
  return session;
}

// Tashlab ketilgan sessiyalarni tozalaydi (xotira oqishining oldini oladi).
// Tozalangan sessiyalar sonini qaytaradi.
export function sweepSessions(ttlMs) {
  const now = Date.now();
  let removed = 0;
  for (const [userId, s] of sessions) {
    if (now - (s.lastActive ?? s.startTime) > ttlMs) {
      sessions.delete(userId);
      removed += 1;
    }
  }
  return removed;
}

export function getSession(userId) {
  return sessions.get(userId);
}

export function endSession(userId) {
  sessions.delete(userId);
}

export function currentQuestion(session) {
  return session.questions[session.index];
}

export function toggleSelection(session, optionIndex) {
  if (session.selected.has(optionIndex)) session.selected.delete(optionIndex);
  else session.selected.add(optionIndex);
  session.lastActive = Date.now();
}

// Javobni baholaydi va navbatdagi savolga o'tadi. To'g'ri bo'lsa true qaytaradi.
export function submitAnswer(session) {
  const q = currentQuestion(session);
  const picked = [...session.selected].sort((a, b) => a - b);
  const correct = [...q.correct].sort((a, b) => a - b);
  const isCorrect =
    picked.length === correct.length && picked.every((v, i) => v === correct[i]);

  session.answers.push({ questionId: q.id, picked, isCorrect });
  session.selected = new Set();
  session.index += 1;
  session.lastActive = Date.now();
  return isCorrect;
}

// grade rejimida savollar dinamik qo'shiladi — target bo'yicha tugaydi
export function isFinished(session) {
  const total = session.target ?? session.questions.length;
  return session.index >= total;
}

export function score(session) {
  const total = session.questions.length;
  const correct = session.answers.filter((a) => a.isCorrect).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent };
}
