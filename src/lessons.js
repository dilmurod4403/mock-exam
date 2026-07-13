// Mini-darslar katalogi (dasturlash tili bo'yicha).
// Hozircha JavaScript; boshqa tarmoqlar keyin qo'shiladi (mexanizm tayyor).
import javascript from "./lessons/javascript.js";

const LESSONS = { javascript };

// Berilgan til uchun darsli mavzular ro'yxati (topic kalitlari)
export function lessonTopics(plang) {
  return LESSONS[plang] ? Object.keys(LESSONS[plang]) : [];
}

// Bitta mavzu darsi: { title: {uz,en}, body: {uz,en} } yoki null
export function getLesson(plang, topic) {
  return LESSONS[plang]?.[topic] || null;
}
