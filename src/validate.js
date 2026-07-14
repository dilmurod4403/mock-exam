// Savol bankini tekshiradi: id, mavzu (til ichida), variant/javob indekslari, ikki tilli izoh, darajalar
import { ALL_QUESTIONS, PROG_LANGS, getPool } from "./data.js";

let errors = 0;
const ids = new Set();

for (const q of ALL_QUESTIONS) {
  const where = `[${q.plang}/${q.id ?? "NO-ID"}]`;
  if (!q.id) err(`${where} id yo'q`);
  if (ids.has(q.id)) err(`${where} id takrorlangan`);
  ids.add(q.id);

  const cfg = PROG_LANGS[q.plang];
  if (!cfg) {
    err(`${where} noma'lum dasturlash tili`);
    continue;
  }
  if (!cfg.topics[q.topic]) err(`${where} bu tilda noma'lum mavzu: "${q.topic}"`);
  if (typeof q.question !== "string" || !q.question.trim())
    err(`${where} savol matni bo'sh`);
  if (!Array.isArray(q.options) || q.options.length < 2)
    err(`${where} kamida 2 ta variant bo'lishi kerak`);
  if (!Array.isArray(q.correct) || q.correct.length < 1)
    err(`${where} to'g'ri javob (correct) massiv va bo'sh bo'lmasligi kerak`);

  for (const c of q.correct || []) {
    if (typeof c !== "number" || c < 0 || c >= (q.options?.length ?? 0))
      err(`${where} correct indeks noto'g'ri: ${c}`);
  }
  if (new Set(q.correct).size !== (q.correct?.length ?? 0))
    err(`${where} correct ichida takror indeks bor`);

  const e = q.explanation;
  if (!e || typeof e !== "object") {
    err(`${where} izoh (explanation) { uz, en } obyekt bo'lishi kerak`);
  } else {
    if (!e.uz || !e.uz.trim()) err(`${where} o'zbekcha izoh bo'sh`);
    if (!e.en || !e.en.trim()) err(`${where} inglizcha izoh bo'sh`);
  }

  // `levels` bo'lsa — shu tilning darajalaridan bo'lishi kerak
  for (const lvl of q.levels || []) {
    if (!cfg.levels[lvl]) err(`${where} noma'lum daraja: "${lvl}"`);
  }

  // O'zbekcha matn lotin yozuvda bo'lishi kerak — kirill harflar aralashmasin
  const cyr = JSON.stringify(q).match(/[Ѐ-ӿ]/g);
  if (cyr) err(`${where} kirill harf(lar) aralashgan: ${[...new Set(cyr)].join(" ")}`);
}

function err(msg) {
  console.error("  ✗ " + msg);
  errors++;
}

console.log(`\nJami savollar: ${ALL_QUESTIONS.length}\n`);
for (const [plang, cfg] of Object.entries(PROG_LANGS)) {
  const total = ALL_QUESTIONS.filter((q) => q.plang === plang).length;
  console.log(`${cfg.label}  —  ${total} ta savol`);
  for (const level of Object.keys(cfg.levels)) {
    console.log(`    ${level}: ${getPool({ plang, level }).length}`);
  }
}

if (errors === 0) {
  console.log("\n✅ Savol banki toza — xato yo'q.\n");
  process.exit(0);
} else {
  console.error(`\n❌ ${errors} ta xato topildi.\n`);
  process.exit(1);
}
