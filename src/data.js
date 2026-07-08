// Savol bankini yuklaydi va tanlash funksiyalarini beradi
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = join(__dirname, "questions");

// Mavzu kodlari va o'zbekcha nomlari
export const TOPICS = {
  intro: "Kirish (Introduction to JS)",
  variables: "O'zgaruvchilar va tiplar",
  operators: "Operatorlar",
  "control-flow": "Boshqaruv (if / loops)",
  collections: "Massiv va obyektlar",
  functions: "Funksiyalar",
  errors: "Xatoliklar (try/catch)",
};

// Barcha savollarni JSON fayllardan yuklaymiz
function loadAll() {
  const files = readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".json"));
  const all = [];
  for (const file of files) {
    const raw = readFileSync(join(QUESTIONS_DIR, file), "utf8");
    const items = JSON.parse(raw);
    all.push(...items);
  }
  return all;
}

export const ALL_QUESTIONS = loadAll();

// Fisher–Yates aralashtirish (asl massivni o'zgartirmaydi)
export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Berilgan mavzu bo'yicha savollar (mavzu bo'lmasa — hammasi)
export function getByTopic(topic) {
  if (!topic) return ALL_QUESTIONS;
  return ALL_QUESTIONS.filter((q) => q.topic === topic);
}

// n ta tasodifiy savol tanlaydi. Iloji bo'lsa mavzular bo'yicha teng taqsimlaydi.
export function pickQuestions(n, topic = null) {
  const pool = getByTopic(topic);
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

export function statsByTopic() {
  const counts = {};
  for (const q of ALL_QUESTIONS) {
    counts[q.topic] = (counts[q.topic] || 0) + 1;
  }
  return counts;
}
