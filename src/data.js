// Savol bankini yuklaydi, mavzu/daraja bo'yicha tanlash funksiyalarini beradi
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = join(__dirname, "questions");

// Mavzu kodlari va ikki tildagi nomlari
export const TOPICS = {
  intro: { uz: "Kirish", en: "Introduction" },
  variables: { uz: "O'zgaruvchilar va tiplar", en: "Variables & types" },
  operators: { uz: "Operatorlar", en: "Operators" },
  "control-flow": { uz: "Boshqaruv (if / loops)", en: "Control flow (if / loops)" },
  collections: { uz: "Massiv va obyektlar", en: "Arrays & objects" },
  functions: { uz: "Funksiyalar", en: "Functions" },
  errors: { uz: "Xatoliklar (try/catch)", en: "Errors (try/catch)" },
};

// Sertifikat darajalari. filter — savol shu darajaga kiradimi.
// JSE = boshlang'ich (easy/medium), JSA = to'liq bank, JSP = advanced (hozircha bo'sh).
export const LEVELS = {
  JSE: {
    label: "JSE — Entry-Level",
    filter: (q) => q.difficulty === "easy" || q.difficulty === "medium",
  },
  JSA: {
    label: "JSA — Associate",
    filter: () => true,
  },
  JSP: {
    label: "JSP — Professional",
    filter: (q) => Array.isArray(q.levels) && q.levels.includes("JSP"),
  },
};

// Barcha savollarni JSON fayllardan yuklaymiz
function loadAll() {
  const files = readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".json"));
  const all = [];
  for (const file of files) {
    const items = JSON.parse(readFileSync(join(QUESTIONS_DIR, file), "utf8"));
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

// Daraja + (ixtiyoriy) mavzu bo'yicha savollar to'plami
export function getPool({ level, topic } = {}) {
  let pool = ALL_QUESTIONS;
  const lv = LEVELS[level];
  if (lv) pool = pool.filter(lv.filter);
  if (topic) pool = pool.filter((q) => q.topic === topic);
  return pool;
}

// n ta tasodifiy savol tanlaydi
export function pickQuestions(n, opts = {}) {
  const pool = getPool(opts);
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

// Berilgan darajada har mavzuda nechta savol borligi (menyu uchun)
export function topicCounts(level) {
  const pool = getPool({ level });
  const counts = {};
  for (const q of pool) counts[q.topic] = (counts[q.topic] || 0) + 1;
  return counts;
}
