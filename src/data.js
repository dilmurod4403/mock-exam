// Savol bankini yuklaydi (dasturlash tili bo'yicha papkalardan) va tanlash funksiyalarini beradi
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = join(__dirname, "questions");

// ---------- Dasturlash tillari katalogi ----------
// Har til: label (menyu uchun), topics (mavzular, ikki tilda), levels (sertifikat darajalari).
// level.filter — savol shu darajaga kiradimi. level.pass — o'tish foizi.
export const PROG_LANGS = {
  javascript: {
    label: "🟨 JavaScript",
    topics: {
      intro: { uz: "Kirish", en: "Introduction" },
      variables: { uz: "O'zgaruvchilar va tiplar", en: "Variables & types" },
      operators: { uz: "Operatorlar", en: "Operators" },
      "control-flow": { uz: "Boshqaruv (if / loops)", en: "Control flow (if / loops)" },
      collections: { uz: "Massiv va obyektlar", en: "Arrays & objects" },
      functions: { uz: "Funksiyalar", en: "Functions" },
      errors: { uz: "Xatoliklar (try/catch)", en: "Errors (try/catch)" },
      oop: { uz: "Obyektlar va OOP (this, class)", en: "Objects & OOP (this, class)" },
      async: { uz: "Asinxron (Promise, async/await)", en: "Asynchronous (Promise, async/await)" },
      advanced: { uz: "Ilg'or (closure, ES6+, generator)", en: "Advanced (closures, ES6+, generators)" },
    },
    // JSE/JSA — asosiy bank (JSP-teglilardan tashqari); JSP — faqat ilg'or (levels: ["JSP"]) savollar
    levels: {
      JSE: {
        label: "JSE — Entry-Level",
        pass: 70,
        filter: (q) => (q.difficulty === "easy" || q.difficulty === "medium") && !q.levels?.includes("JSP"),
      },
      JSA: { label: "JSA — Associate", pass: 70, filter: (q) => !q.levels?.includes("JSP") },
      JSP: { label: "JSP — Professional", pass: 70, filter: (q) => q.levels?.includes("JSP") },
    },
  },
  plsql: {
    label: "🗄️ PL/SQL",
    topics: {
      blocks: { uz: "Blok tuzilishi va o'zgaruvchilar", en: "Block structure & variables" },
      control: { uz: "Boshqaruv (IF/CASE/LOOP)", en: "Control (IF/CASE/LOOP)" },
      cursors: { uz: "Kursorlar", en: "Cursors" },
      exceptions: { uz: "Istisnolar (exceptions)", en: "Exceptions" },
      subprograms: { uz: "Procedure / Function / Package", en: "Procedure / Function / Package" },
      triggers: { uz: "Triggerlar", en: "Triggers" },
      collections: { uz: "Records va kolleksiyalar", en: "Records & collections" },
    },
    levels: {
      "1Z0-071": { label: "1Z0-071 — Oracle SQL", pass: 63, filter: (q) => q.levels?.includes("1Z0-071") },
      "1Z0-149": { label: "1Z0-149 — PL/SQL Developer", pass: 65, filter: (q) => q.levels?.includes("1Z0-149") },
    },
  },
  python: {
    label: "🐍 Python",
    comingSoon: true,
    topics: {},
    levels: {},
  },
};

// ---------- Yuklash ----------
// questions/<plang>/*.json fayllardan yuklaydi, har savolga plang teg qo'yadi
function loadAll() {
  const all = [];
  for (const plang of readdirSync(QUESTIONS_DIR)) {
    const dir = join(QUESTIONS_DIR, plang);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const items = JSON.parse(readFileSync(join(dir, file), "utf8"));
      for (const q of items) {
        q.plang = plang;
        all.push(q);
      }
    }
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

// ---------- Tanlash ----------
// plang + (ixtiyoriy) level + topic bo'yicha savollar to'plami
export function getPool({ plang, level, topic } = {}) {
  const cfg = PROG_LANGS[plang];
  let pool = ALL_QUESTIONS.filter((q) => q.plang === plang);
  const lv = cfg?.levels?.[level];
  if (lv) pool = pool.filter(lv.filter);
  if (topic) pool = pool.filter((q) => q.topic === topic);
  return pool;
}

export function pickQuestions(n, opts = {}) {
  const pool = getPool(opts);
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

// Berilgan til+darajada har mavzuda nechta savol borligi (menyu uchun)
export function topicCounts({ plang, level }) {
  const pool = getPool({ plang, level });
  const counts = {};
  for (const q of pool) counts[q.topic] = (counts[q.topic] || 0) + 1;
  return counts;
}

export function levelPass(plang, level) {
  return PROG_LANGS[plang]?.levels?.[level]?.pass ?? 70;
}
