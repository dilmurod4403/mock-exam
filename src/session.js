// Har bir foydalanuvchi uchun imtihon holatini xotirada saqlaydi
const sessions = new Map();

export function startSession(userId, { mode, questions }) {
  const session = {
    mode, // 'exam' | 'quiz' | 'topic'
    questions, // tanlangan savollar ro'yxati
    index: 0, // joriy savol raqami
    selected: new Set(), // joriy savolda belgilangan variantlar (multi uchun)
    answers: [], // har savol uchun: { picked:[...], correct:bool }
    startTime: Date.now(),
  };
  sessions.set(userId, session);
  return session;
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

// Variantni belgilash/olib tashlash (multi-answer savollar uchun)
export function toggleSelection(session, optionIndex) {
  if (session.selected.has(optionIndex)) {
    session.selected.delete(optionIndex);
  } else {
    session.selected.add(optionIndex);
  }
}

// Javobni baholaydi va navbatdagi savolga o'tadi. To'g'ri bo'lsa true qaytaradi.
export function submitAnswer(session) {
  const q = currentQuestion(session);
  const picked = [...session.selected].sort((a, b) => a - b);
  const correct = [...q.correct].sort((a, b) => a - b);
  const isCorrect =
    picked.length === correct.length &&
    picked.every((v, i) => v === correct[i]);

  session.answers.push({ questionId: q.id, picked, isCorrect });
  session.selected = new Set();
  session.index += 1;
  return isCorrect;
}

export function isFinished(session) {
  return session.index >= session.questions.length;
}

export function score(session) {
  const total = session.questions.length;
  const correct = session.answers.filter((a) => a.isCorrect).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent };
}
