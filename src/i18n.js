// Ikki til uchun interfeys matnlari (uz / en)
export const LANGS = {
  uz: "🇺🇿 O'zbek",
  en: "🇬🇧 English",
};

const S = {
  uz: {
    choose_language: "🌐 Tilni tanlang / Choose your language:",
    language_set: "Til tanlandi: O'zbek ✅",
    choose_proglang: "💻 Qaysi dasturlash tili bo'yicha mashq qilamiz?",
    coming_soon: "Bu til uchun savollar tez orada qo'shiladi 🔜",
    choose_level: "🎯 Sertifikat darajasini tanlang:",
    level_soon: "Bu daraja uchun savollar tez orada qo'shiladi 🔜",
    menu_title: (level) =>
      `✅ Tayyor! Daraja: <b>${level}</b>\n\nQuyidagilardan birini tanlang:`,
    btn_exam: "📝 To'liq imtihon",
    btn_quiz: "⚡ Tezkor test",
    btn_topic: "📚 Mavzu bo'yicha",
    btn_change: "⚙️ Sozlamalar (til/daraja)",
    welcome: (name) =>
      `👋 Salom, ${name}!\n\nBu — dasturlash sertifikatlariga tayyorgarlik uchun mock imtihon boti.\n\nBoshlash uchun quyidan tanlang 👇`,
    help: "ℹ️ Har savolda variant tugmasini bosing. Ba'zi savollarda bir nechta to'g'ri javob bo'ladi — ularni belgilab, tasdiqlang.\n\n/start — qaytadan sozlash\n/exam, /quiz, /topic",
    exam_label: "To'liq imtihon",
    quiz_label: "Tezkor test",
    topic_label: (t) => `Mavzu: ${t}`,
    started: (label, n) => `📝 <b>${label}</b> boshlandi — ${n} ta savol. Omad!`,
    no_questions: "Bu tanlov bo'yicha hozircha savol yo'q.",
    choose_topic: "Qaysi mavzu bo'yicha mashq qilamiz?",
    question_header: (num, total, multi) =>
      `<b>Savol ${num}/${total}</b>${multi ? "  <i>(bir nechta to'g'ri javob)</i>" : ""}`,
    confirm_btn: "✅ Javobni tasdiqlash",
    correct_toast: "To'g'ri ✅",
    wrong_toast: "Xato ❌",
    correct_head: "✅ <b>To'g'ri!</b>",
    wrong_head: (picked) => `❌ <b>Xato.</b> Siz: ${picked}`,
    correct_answer: (letters) => `To'g'ri javob: <b>${letters}</b>`,
    explanation_label: "💡 <b>Izoh:</b>",
    next_btn: "➡️ Keyingi savol",
    result_btn: "🏁 Natijani ko'rish",
    result_title: "🏁 <b>Natija</b>",
    result_correct: (c, t) => `To'g'ri javoblar: <b>${c}/${t}</b>`,
    result_percent: (p, pass) => `Foiz: <b>${p}%</b>  (o'tish uchun: ${pass}%)`,
    result_time: (m) => `Vaqt: ~${m} daqiqa`,
    passed: "🎉 <b>TABRIKLAYMAN — O'TDINGIZ!</b>",
    failed: "📚 <b>Hali tayyor emassiz — mashq davom etsin!</b>",
    retry: "Keyingi qadamni tanlang 👇",
    session_not_found: "Sessiya topilmadi. /start ni bosing.",
    need_start: "Avval /start bilan sozlang.",
    stopped: "⏹ Imtihon to'xtatildi. Yangisi uchun /exam yoki /quiz.",
    select_one: "Avval kamida bitta variant belgilang.",
  },
  en: {
    choose_language: "🌐 Choose your language / Tilni tanlang:",
    language_set: "Language set: English ✅",
    choose_proglang: "💻 Which programming language do you want to practice?",
    coming_soon: "Questions for this language are coming soon 🔜",
    choose_level: "🎯 Choose a certification level:",
    level_soon: "Questions for this level are coming soon 🔜",
    menu_title: (level) =>
      `✅ Ready! Level: <b>${level}</b>\n\nPick one of the following:`,
    btn_exam: "📝 Full exam",
    btn_quiz: "⚡ Quick quiz",
    btn_topic: "📚 By topic",
    btn_change: "⚙️ Settings (language/level)",
    welcome: (name) =>
      `👋 Hi, ${name}!\n\nThis is a mock exam bot to prepare for programming certifications.\n\nChoose below to get started 👇`,
    help: "ℹ️ Tap an option button for each question. Some questions have multiple correct answers — select them and confirm.\n\n/start — reconfigure\n/exam, /quiz, /topic",
    exam_label: "Full exam",
    quiz_label: "Quick quiz",
    topic_label: (t) => `Topic: ${t}`,
    started: (label, n) => `📝 <b>${label}</b> started — ${n} questions. Good luck!`,
    no_questions: "No questions available for this selection yet.",
    choose_topic: "Which topic do you want to practice?",
    question_header: (num, total, multi) =>
      `<b>Question ${num}/${total}</b>${multi ? "  <i>(multiple correct answers)</i>" : ""}`,
    confirm_btn: "✅ Confirm answer",
    correct_toast: "Correct ✅",
    wrong_toast: "Wrong ❌",
    correct_head: "✅ <b>Correct!</b>",
    wrong_head: (picked) => `❌ <b>Wrong.</b> You: ${picked}`,
    correct_answer: (letters) => `Correct answer: <b>${letters}</b>`,
    explanation_label: "💡 <b>Explanation:</b>",
    next_btn: "➡️ Next question",
    result_btn: "🏁 See result",
    result_title: "🏁 <b>Result</b>",
    result_correct: (c, t) => `Correct answers: <b>${c}/${t}</b>`,
    result_percent: (p, pass) => `Score: <b>${p}%</b>  (to pass: ${pass}%)`,
    result_time: (m) => `Time: ~${m} min`,
    passed: "🎉 <b>CONGRATULATIONS — YOU PASSED!</b>",
    failed: "📚 <b>Not ready yet — keep practicing!</b>",
    retry: "Choose your next step 👇",
    session_not_found: "Session not found. Tap /start.",
    need_start: "Please set up first with /start.",
    stopped: "⏹ Exam stopped. Start a new one with /exam or /quiz.",
    select_one: "Select at least one option first.",
  },
};

// t(lang, key, ...args) — string yoki funksiya bo'lsa chaqiradi
export function t(lang, key, ...args) {
  const table = S[lang] || S.uz;
  const val = table[key] ?? S.uz[key] ?? key;
  return typeof val === "function" ? val(...args) : val;
}
