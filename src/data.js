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
    label: "🗄️ Oracle SQL & PL/SQL",
    topics: {
      // 1Z0-071 (SQL) mavzulari
      queries: { uz: "So'rovlar (SELECT, WHERE, ORDER BY)", en: "Queries (SELECT, WHERE, ORDER BY)" },
      functions: { uz: "Bir qatorli funksiyalar", en: "Single-row functions" },
      aggregates: { uz: "Guruh funksiyalari (GROUP BY)", en: "Group functions (GROUP BY)" },
      joins: { uz: "Jadvallarni birlashtirish (JOIN)", en: "Joins" },
      subqueries: { uz: "Ichki so'rovlar, to'plam operatorlari", en: "Subqueries & set operators" },
      dml: { uz: "Ma'lumot o'zgartirish (DML)", en: "Data manipulation (DML)" },
      ddl: { uz: "DDL, cheklovlar, view", en: "DDL, constraints, views" },
      // 1Z0-149 (PL/SQL) mavzulari
      blocks: { uz: "Blok tuzilishi va o'zgaruvchilar", en: "Block structure & variables" },
      control: { uz: "Boshqaruv (IF/CASE/LOOP)", en: "Control (IF/CASE/LOOP)" },
      cursors: { uz: "Kursorlar", en: "Cursors" },
      exceptions: { uz: "Istisnolar (exceptions)", en: "Exceptions" },
      subprograms: { uz: "Procedure / Function / Package", en: "Procedure / Function / Package" },
      triggers: { uz: "Triggerlar", en: "Triggers" },
      collections: { uz: "Records va kolleksiyalar", en: "Records & collections" },
      // Oracle DBA / Interview mavzulari (ORA-DBA darajasi)
      transactions: { uz: "Tranzaksiyalar (commit/rollback/isolation)", en: "Transactions (commit/rollback/isolation)" },
      concurrency: { uz: "Konkurentlik (lock, deadlock)", en: "Concurrency (locks, deadlock)" },
      architecture: { uz: "Arxitektura va xotira (SGA/PGA)", en: "Architecture & memory (SGA/PGA)" },
      performance: { uz: "Optimizatsiya (optimizer, parse, plan)", en: "Performance (optimizer, parse, plan)" },
      indexes: { uz: "Indekslar (turlari, rebuild)", en: "Indexes (types, rebuild)" },
      redoundo: { uz: "Redo/Undo va recovery", en: "Redo/Undo & recovery" },
      jobs: { uz: "Job va Scheduler", en: "Jobs & Scheduler" },
      bulk: { uz: "Bulk va dinamik SQL", en: "Bulk & dynamic SQL" },
      datatypes: { uz: "Ma'lumot tiplari (LOB, rowid, rownum)", en: "Data types (LOB, rowid, rownum)" },
      modeling: { uz: "Modellashtirish (normal form, OLAP/OLTP)", en: "Data modeling (normal forms, OLAP/OLTP)" },
    },
    levels: {
      "1Z0-071": { label: "1Z0-071 — Oracle SQL", pass: 63, filter: (q) => q.levels?.includes("1Z0-071") },
      "1Z0-149": { label: "1Z0-149 — PL/SQL Developer", pass: 65, filter: (q) => q.levels?.includes("1Z0-149") },
      "ORA-DBA": { label: "🔥 Oracle DBA / Interview", pass: 60, filter: (q) => q.levels?.includes("ORA-DBA") },
    },
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

// Tartibga bog'liq variantlar (masalan "All of the above") — aralashtirmaymiz
const ORDER_DEPENDENT =
  /\b(of the above|of the following|the above|the following|all of these|none of these)\b/i;

// Savol variantlarini aralashtiradi va to'g'ri javob indekslarini qayta moslaydi.
// Asl obyektni o'zgartirmaydi (nusxa qaytaradi); id va boshqa maydonlar saqlanadi.
export function shuffleOptions(q) {
  if (q.options.some((o) => ORDER_DEPENDENT.test(o))) return q; // xavfsiz — tegmaymiz
  const order = shuffle(q.options.map((_, i) => i)); // yangi tartib (eski indekslar)
  const options = order.map((i) => q.options[i]);
  const pos = new Map(order.map((oldIdx, newIdx) => [oldIdx, newIdx]));
  const correct = q.correct.map((c) => pos.get(c)).sort((a, b) => a - b);
  return { ...q, options, correct };
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
