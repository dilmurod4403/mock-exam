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
    btn_learn: "📖 O'rganish (mini-dars)",
    btn_topic: "📚 Mavzu bo'yicha",
    btn_review: "🔁 Xatolarim ustida ishlash",
    btn_practice: "🧠 Bugungi takrorlash",
    btn_grade: "🎓 Darajamni aniqlash",
    btn_stats: "🏆 Statistikam",
    btn_change: "⚙️ Sozlamalar (til/daraja)",
    welcome: (name) =>
      `👋 Salom, ${name}!\n\n` +
      `Bu bot sizni sertifikat va ish intervyusiga tayyorlaydi:\n` +
      `📖 <b>O'rgatadi</b> — mavzu bo'yicha qisqa darslar\n` +
      `📝 <b>Mashq qildiradi</b> — imtihon, test, mavzu bo'yicha\n` +
      `🧠 <b>Takrorlatadi</b> — xatolaringizni aqlli navbat bilan\n` +
      `🎓 <b>Darajangizni aniqlaydi</b> — Junior? Middle? Senior?\n\n` +
      `Boshlash uchun tilni tanlang 👇`,
    help:
      `ℹ️ <b>Bot nima qila oladi</b>\n\n` +
      `📖 <b>O'rganish</b>\n/learn — mavzu bo'yicha mini-dars\n\n` +
      `📝 <b>Mashq</b>\n/exam — to'liq imtihon\n/quiz — tezkor test (10 savol)\n/topic — mavzu bo'yicha\n\n` +
      `🔁 <b>Takrorlash</b>\n/review — xato qilgan savollaringiz\n/practice — bugun takrorlash vaqti kelganlari\n\n` +
      `🎓 <b>Baholash</b>\n/grade — darajangizni aniqlash (adaptiv test)\n\n` +
      `📊 <b>Kuzatish</b>\n/stats — natijalaringiz va streak\n/reminders — kunlik eslatmani yoqish/o'chirish\n\n` +
      `⚙️ /start — qaytadan sozlash · /stop — imtihonni to'xtatish\n\n` +
      `<i>Savolda variant tugmasini bosing. Ba'zi savollarda bir nechta to'g'ri javob bo'ladi — belgilab, tasdiqlang.</i>`,
    level_hint_grade: "💡 Qaysi biri sizga mosligini bilmasangiz — keyin /grade bilan darajangizni aniqlang.",
    suggest_title: "💡 <b>Bugun nima qilsam?</b>",
    suggest_practice: (n) => `🧠 <b>${n}</b> ta savolni takrorlash vaqti keldi → /practice`,
    suggest_review: (n) => `🔁 <b>${n}</b> ta xatoyingiz ustida ishlash mumkin → /review`,
    suggest_start: "📖 Yangi boshlayapsizmi? Avval mini-dars: /learn, keyin /quiz",
    suggest_weak: (topic) => `📚 Eng zaif mavzu: <b>${topic}</b> — shuni mashq qiling → /topic`,
    suggest_grade: "🎓 Darajangizni hali bilmaysiz — /grade bilan aniqlang",
    suggest_quiz: "⚡ Formani saqlash uchun tezkor test → /quiz",
    exam_label: "To'liq imtihon",
    quiz_label: "Tezkor test",
    review_label: "Xatolar takrori",
    practice_label: "Bugungi takrorlash",
    topic_label: (t) => `Mavzu: ${t}`,
    no_review:
      "🎉 Ajoyib — takrorlash uchun xato yo'q! Avval /exam yoki /quiz bilan mashq qiling.",
    practice_done:
      "🎉 Bugun uchun hammasi takrorlandi! Ertaga qaytib keling yoki /quiz bilan davom eting.",
    grade_intro: (n) =>
      `🎓 <b>Daraja baholash</b> boshlandi — ${n} ta savol.\nHar savol javobingizga qarab qiyinlashadi yoki osonlashadi. Rostini yeching — natija shunga bog'liq. Omad!`,
    grade_title: "🎓 <b>Baholash yakunlandi</b>",
    grade_level: (emoji, name) => `Sizning darajangiz: <b>${emoji} ${name}</b>`,
    grade_track: (label) => `Yo'nalish: ${label}`,
    grade_by_diff: "📈 <b>Qiyinlik bo'yicha:</b>",
    diff_label: (d) => ({ easy: "Oson", medium: "O'rta", hard: "Qiyin" }[d] || d),
    grade_strong: (topics) => `✅ Kuchli: ${topics}`,
    grade_weak: (topics) => `⚠️ Ustida ishlash: ${topics}`,
    grade_next: (name, topics) =>
      `➡️ <b>${name}</b> darajasiga chiqish uchun: ${topics} ustida ishlang va qiyinroq savollarni yeching. /review yordam beradi.`,
    grade_top: (name) => `🏆 Siz eng yuqori darajadasiz: <b>${name}</b>! Zo'r natija.`,
    grade_note: "ℹ️ Baho taxminiy — ko'proq yechsangiz, aniqroq bo'ladi.",
    grade_progress: (prevName, days, arrow) =>
      `📈 Oldingi baho: <b>${prevName}</b> (${days} kun oldin) ${arrow}`,
    stats_lastgrade: (emoji, name) => `🎓 Oxirgi baho: <b>${emoji} ${name}</b>`,
    stats_none: "📭 Hali statistika yo'q. /exam yoki /quiz bilan boshlang!",
    stats_title: "🏆 <b>Sizning statistikangiz</b>",
    stats_track: (label, level) => `Yo'nalish: ${label} · ${level}`,
    stats_total: (n) => `Jami javoblar: <b>${n}</b>`,
    stats_overall: (bar, pct, pass) => `Umumiy aniqlik: ${bar} <b>${pct}%</b> (o'tish: ${pass}%)`,
    stats_ready: "✅ Tayyor ko'rinasiz — imtihonni sinab ko'ring!",
    stats_notready: (gap) => `📚 O'tish balliga <b>${gap}%</b> qoldi — davom eting!`,
    stats_streak: (d) => `🔥 Streak: <b>${d}</b> kun`,
    stats_due: (n) => `🧠 Bugun takrorlash: <b>${n}</b> ta (/practice)`,
    remind_title: "🔔 <b>Eslatma</b>",
    remind_streak: (n) => `🔥 Streak: <b>${n}</b> kun — bugun mashq qilmasangiz uziladi!`,
    remind_due: (n) => `🧠 Takrorlash uchun <b>${n}</b> ta savol kutyapti.`,
    remind_cta: "Bir necha daqiqa yetadi 👇",
    btn_reminders_off: "🔕 Eslatmani o'chirish",
    remind_on: "🔔 Eslatmalar yoqildi. O'chirish: /reminders",
    remind_off: "🔕 Eslatmalar o'chirildi. Qayta yoqish: /reminders",
    stats_by_topic: "📊 <b>Mavzu bo'yicha</b> (zaifdan kuchligacha):",
    stats_topic_line: (bar, name, c, total, pct) => `${bar} ${name} — ${c}/${total} (${pct}%)`,
    started: (label, n) => `📝 <b>${label}</b> boshlandi — ${n} ta savol. Omad!`,
    no_questions: "Bu tanlov bo'yicha hozircha savol yo'q.",
    no_lessons: "Bu tarmoq uchun darslar tez orada qo'shiladi 📖",
    choose_lesson: "📖 Qaysi mavzuni o'rganamiz?",
    btn_practice_topic: "📝 Shu mavzuni mashq qilish",
    btn_more_lessons: "📖 Boshqa mavzu",
    btn_menu: "⬅️ Asosiy menyu",
    btn_back: "⬅️ Orqaga",
    choose_topic: "Qaysi mavzu bo'yicha mashq qilamiz?",
    question_header: (num, total, multi) =>
      `<b>Savol ${num}/${total}</b>${multi ? "  <i>(bir nechta to'g'ri javob)</i>" : ""}`,
    progress_line: (bar, correct, wrong) => `${bar}  ✅ ${correct} · ❌ ${wrong}`,
    btn_skip: "⏭ O'tkazish",
    btn_stop: "⏹ To'xtatish",
    skipped_toast: "O'tkazildi ⏭",
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
    by_topic: "📊 <b>Mavzu bo'yicha:</b>",
    topic_line: (name, c, total, pct) => `• ${name}: ${c}/${total} (${pct}%)`,
    mistakes_title: (n) => `❌ <b>Xatolar tahlili</b> — ${n} ta savol`,
    mistake_head: (num) => `❌ <b>Savol ${num}</b>`,
    your_answer: (letters) => `Sizning javobingiz: ${letters}`,
    retry: "Keyingi qadamni tanlang 👇",
    btn_show_mistakes: (n) => `❌ Xatolarni ko'rish (${n})`,
    mistakes_prompt: (n) => `Bu testda <b>${n}</b> ta xato bor — ko'rib chiqasizmi?`,
    settings_title: "⚙️ <b>Sozlamalar</b> — nimani o'zgartiramiz?",
    btn_set_lang: "🌐 Til",
    btn_set_plang: "💻 Yo'nalish",
    btn_set_level: "🎯 Daraja",
    btn_report: "⚠️ Savolda xato",
    report_thanks: "Rahmat! Xabaringiz qayd etildi ✅",
    session_not_found: "Sessiya topilmadi. /start ni bosing.",
    stale_answer: "Bu savolga allaqachon javob berilgan ⏭",
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
    btn_learn: "📖 Learn (mini-lessons)",
    btn_topic: "📚 By topic",
    btn_review: "🔁 My past mistakes",
    btn_practice: "🧠 Today's review queue",
    btn_grade: "🎓 Assess my level",
    btn_stats: "🏆 My stats",
    btn_change: "⚙️ Settings (language/level)",
    welcome: (name) =>
      `👋 Hi, ${name}!\n\n` +
      `This bot prepares you for certifications and job interviews:\n` +
      `📖 <b>Teaches</b> — short lessons per topic\n` +
      `📝 <b>Drills</b> — full exams, quick quizzes, by topic\n` +
      `🧠 <b>Repeats</b> — your mistakes, on a smart schedule\n` +
      `🎓 <b>Rates you</b> — Junior? Middle? Senior?\n\n` +
      `Pick your language to start 👇`,
    help:
      `ℹ️ <b>What this bot can do</b>\n\n` +
      `📖 <b>Learn</b>\n/learn — mini-lesson per topic\n\n` +
      `📝 <b>Practice</b>\n/exam — full mock exam\n/quiz — quick quiz (10 questions)\n/topic — by topic\n\n` +
      `🔁 <b>Repeat</b>\n/review — questions you got wrong\n/practice — the ones due for review today\n\n` +
      `🎓 <b>Assess</b>\n/grade — find your level (adaptive test)\n\n` +
      `📊 <b>Track</b>\n/stats — your results and streak\n/reminders — turn daily reminders on/off\n\n` +
      `⚙️ /start — reconfigure · /stop — stop the current exam\n\n` +
      `<i>Tap an option button for each question. Some have multiple correct answers — select them and confirm.</i>`,
    level_hint_grade: "💡 Not sure which fits you? Find your level later with /grade.",
    suggest_title: "💡 <b>What should I do today?</b>",
    suggest_practice: (n) => `🧠 <b>${n}</b> question(s) are due for review → /practice`,
    suggest_review: (n) => `🔁 You can work on <b>${n}</b> past mistake(s) → /review`,
    suggest_start: "📖 New here? Start with a mini-lesson: /learn, then /quiz",
    suggest_weak: (topic) => `📚 Weakest topic: <b>${topic}</b> — drill it → /topic`,
    suggest_grade: "🎓 You don't know your level yet — find it with /grade",
    suggest_quiz: "⚡ Keep your edge with a quick quiz → /quiz",
    exam_label: "Full exam",
    quiz_label: "Quick quiz",
    review_label: "Mistake review",
    practice_label: "Today's review",
    topic_label: (t) => `Topic: ${t}`,
    no_review:
      "🎉 Nice — no mistakes to review! Practice with /exam or /quiz first.",
    practice_done:
      "🎉 All caught up for today! Come back tomorrow or continue with /quiz.",
    grade_intro: (n) =>
      `🎓 <b>Level assessment</b> started — ${n} questions.\nEach question adapts to your answers (harder or easier). Answer honestly — your result depends on it. Good luck!`,
    grade_title: "🎓 <b>Assessment complete</b>",
    grade_level: (emoji, name) => `Your level: <b>${emoji} ${name}</b>`,
    grade_track: (label) => `Track: ${label}`,
    grade_by_diff: "📈 <b>By difficulty:</b>",
    diff_label: (d) => ({ easy: "Easy", medium: "Medium", hard: "Hard" }[d] || d),
    grade_strong: (topics) => `✅ Strong: ${topics}`,
    grade_weak: (topics) => `⚠️ Needs work: ${topics}`,
    grade_next: (name, topics) =>
      `➡️ To reach <b>${name}</b>: work on ${topics} and tackle harder questions. /review will help.`,
    grade_top: (name) => `🏆 You're at the top level: <b>${name}</b>! Excellent.`,
    grade_note: "ℹ️ This is an estimate — the more you answer, the more accurate it gets.",
    grade_progress: (prevName, days, arrow) =>
      `📈 Previous: <b>${prevName}</b> (${days} day(s) ago) ${arrow}`,
    stats_lastgrade: (emoji, name) => `🎓 Last assessment: <b>${emoji} ${name}</b>`,
    stats_none: "📭 No stats yet. Start with /exam or /quiz!",
    stats_title: "🏆 <b>Your stats</b>",
    stats_track: (label, level) => `Track: ${label} · ${level}`,
    stats_total: (n) => `Total answers: <b>${n}</b>`,
    stats_overall: (bar, pct, pass) => `Overall accuracy: ${bar} <b>${pct}%</b> (pass: ${pass}%)`,
    stats_ready: "✅ You look ready — try a full exam!",
    stats_notready: (gap) => `📚 <b>${gap}%</b> to go until the pass mark — keep going!`,
    stats_streak: (d) => `🔥 Streak: <b>${d}</b> day(s)`,
    stats_due: (n) => `🧠 Due today: <b>${n}</b> (/practice)`,
    remind_title: "🔔 <b>Reminder</b>",
    remind_streak: (n) => `🔥 Streak: <b>${n}</b> day(s) — it breaks unless you practice today!`,
    remind_due: (n) => `🧠 <b>${n}</b> question(s) are due for review.`,
    remind_cta: "A few minutes is enough 👇",
    btn_reminders_off: "🔕 Turn off reminders",
    remind_on: "🔔 Reminders enabled. Turn off: /reminders",
    remind_off: "🔕 Reminders turned off. Turn on again: /reminders",
    stats_by_topic: "📊 <b>By topic</b> (weakest first):",
    stats_topic_line: (bar, name, c, total, pct) => `${bar} ${name} — ${c}/${total} (${pct}%)`,
    started: (label, n) => `📝 <b>${label}</b> started — ${n} questions. Good luck!`,
    no_questions: "No questions available for this selection yet.",
    no_lessons: "Lessons for this track are coming soon 📖",
    choose_lesson: "📖 Which topic do you want to learn?",
    btn_practice_topic: "📝 Practice this topic",
    btn_more_lessons: "📖 Another topic",
    btn_menu: "⬅️ Main menu",
    btn_back: "⬅️ Back",
    choose_topic: "Which topic do you want to practice?",
    question_header: (num, total, multi) =>
      `<b>Question ${num}/${total}</b>${multi ? "  <i>(multiple correct answers)</i>" : ""}`,
    progress_line: (bar, correct, wrong) => `${bar}  ✅ ${correct} · ❌ ${wrong}`,
    btn_skip: "⏭ Skip",
    btn_stop: "⏹ Stop",
    skipped_toast: "Skipped ⏭",
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
    by_topic: "📊 <b>By topic:</b>",
    topic_line: (name, c, total, pct) => `• ${name}: ${c}/${total} (${pct}%)`,
    mistakes_title: (n) => `❌ <b>Mistake review</b> — ${n} question(s)`,
    mistake_head: (num) => `❌ <b>Question ${num}</b>`,
    your_answer: (letters) => `Your answer: ${letters}`,
    retry: "Choose your next step 👇",
    btn_show_mistakes: (n) => `❌ Show mistakes (${n})`,
    mistakes_prompt: (n) => `You made <b>${n}</b> mistake(s) — want to review them?`,
    settings_title: "⚙️ <b>Settings</b> — what would you like to change?",
    btn_set_lang: "🌐 Language",
    btn_set_plang: "💻 Track",
    btn_set_level: "🎯 Level",
    btn_report: "⚠️ Report an issue",
    report_thanks: "Thanks! Your report was recorded ✅",
    session_not_found: "Session not found. Tap /start.",
    stale_answer: "This question was already answered ⏭",
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
