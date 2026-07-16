// Mini-darslar katalogi (dasturlash tili + daraja bo'yicha).
import javascript from "./lessons/javascript.js";
import plsql from "./lessons/plsql.js";
import plsqlDba from "./lessons/plsql-dba.js";

// Tarmoq bo'yicha asosiy darslar
const BASE = { javascript, plsql };
// Darajaga xos darslar (bir xil topic uchun asosiyni ustunlaydi)
const BY_LEVEL = { "ORA-DBA": plsqlDba };

// Berilgan til+daraja uchun darsli mavzular (asosiy + darajaga xos)
export function lessonTopics(plang, level) {
  const base = BASE[plang] ? Object.keys(BASE[plang]) : [];
  const extra = level && BY_LEVEL[level] ? Object.keys(BY_LEVEL[level]) : [];
  return [...new Set([...base, ...extra])];
}

// Bitta mavzu darsi: avval darajaga xos, keyin asosiy (yoki null)
export function getLesson(plang, topic, level) {
  return BY_LEVEL[level]?.[topic] || BASE[plang]?.[topic] || null;
}
