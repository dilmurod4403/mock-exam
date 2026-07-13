// Mini-darslar katalogi (dasturlash tili bo'yicha).
import javascript from "./lessons/javascript.js";
import plsql from "./lessons/plsql.js";

const LESSONS = { javascript, plsql };

// Berilgan til uchun darsli mavzular ro'yxati (topic kalitlari)
export function lessonTopics(plang) {
  return LESSONS[plang] ? Object.keys(LESSONS[plang]) : [];
}

// Bitta mavzu darsi: { title: {uz,en}, body: {uz,en} } yoki null
export function getLesson(plang, topic) {
  return LESSONS[plang]?.[topic] || null;
}
