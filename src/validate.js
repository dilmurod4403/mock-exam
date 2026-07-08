// Savol bankini tekshiradi: id takrorlanmasligi, variantlar va to'g'ri javob indekslari to'g'riligi
import { ALL_QUESTIONS, TOPICS, statsByTopic } from "./data.js";

let errors = 0;
const ids = new Set();

for (const q of ALL_QUESTIONS) {
  const where = `[${q.id ?? "NO-ID"}]`;
  if (!q.id) err(`${where} id yo'q`);
  if (ids.has(q.id)) err(`${where} id takrorlangan`);
  ids.add(q.id);

  if (!TOPICS[q.topic]) err(`${where} noma'lum mavzu: "${q.topic}"`);
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
  if (!q.explanation || !q.explanation.trim())
    err(`${where} izoh (explanation) bo'sh`);
}

function err(msg) {
  console.error("  ✗ " + msg);
  errors++;
}

console.log(`\nJami savollar: ${ALL_QUESTIONS.length}`);
console.log("Mavzular bo'yicha:");
for (const [topic, count] of Object.entries(statsByTopic())) {
  console.log(`  • ${TOPICS[topic] ?? topic}: ${count}`);
}

if (errors === 0) {
  console.log("\n✅ Savol banki toza — xato yo'q.\n");
  process.exit(0);
} else {
  console.error(`\n❌ ${errors} ta xato topildi.\n`);
  process.exit(1);
}
