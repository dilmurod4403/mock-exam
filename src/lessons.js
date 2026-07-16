// Mini-darslar katalogi (dasturlash tili bo'yicha).
import javascript from "./lessons/javascript.js";
import plsql from "./lessons/plsql.js";
import plsqlDba from "./lessons/plsql-dba.js";

// plsql tarmog'i: asosiy (SQL/PL-SQL) + DBA/Interview darslari birga
const LESSONS = { javascript, plsql: { ...plsql, ...plsqlDba } };

// Berilgan til uchun darsli mavzular ro'yxati (topic kalitlari)
export function lessonTopics(plang) {
  return LESSONS[plang] ? Object.keys(LESSONS[plang]) : [];
}

// Bitta mavzu darsi: { title: {uz,en}, body: {uz,en} } yoki null
export function getLesson(plang, topic) {
  return LESSONS[plang]?.[topic] || null;
}
