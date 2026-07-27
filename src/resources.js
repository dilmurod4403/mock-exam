// Sohaga doir foydali manbalar (rasmiy hujjatlar va maqolalar) — /resources rejimi uchun.
// Ikki qatlam: umumiy/daraja (getResources) va MAVZU darajasidagi (getTopicResources).

const MDN = "https://developer.mozilla.org/en-US/docs/Web/JavaScript";
const SQLREF = "https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/index.html";
const PLSREF = "https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/index.html";
const CNCPT = "https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/index.html";
const TGDBA = "https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/index.html";
const TGSQL = "https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/index.html";
const ADMIN = "https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/index.html";
const W3 = "https://www.w3schools.com/sql";
const TP = "https://www.tutorialspoint.com/plsql";

// ---------- Umumiy / daraja bo'yicha ----------
const RESOURCES = {
  javascript: {
    common: [
      { title: "MDN — JavaScript Guide", url: `${MDN}/Guide` },
      { title: "The Modern JavaScript Tutorial (javascript.info)", url: "https://javascript.info/" },
      { title: "Eloquent JavaScript (bepul kitob)", url: "https://eloquentjavascript.net/" },
    ],
    JSP: [{ title: "MDN — JavaScript Reference", url: `${MDN}/Reference` }],
  },
  plsql: {
    common: [
      { title: "Oracle Live SQL — o'rgan va sinab ko'r", url: "https://livesql.oracle.com/" },
      { title: "oracle-base.com — maqolalar (Tim Hall)", url: "https://oracle-base.com/articles/articles" },
      { title: "Ask TOM (Oracle savol-javob)", url: "https://asktom.oracle.com/" },
    ],
    "1Z0-071": [{ title: "Oracle SQL Language Reference (19c)", url: SQLREF }],
    "1Z0-149": [{ title: "Oracle PL/SQL Language Reference (19c)", url: PLSREF }],
    "ORA-DBA": [
      { title: "Oracle Database Concepts (19c)", url: CNCPT },
      { title: "Oracle Performance Tuning Guide (19c)", url: TGDBA },
    ],
  },
};

// ---------- Mavzu bo'yicha (chuqur) ----------
const TOPIC_RESOURCES = {
  javascript: {
    intro: [{ title: "MDN — Introduction", url: `${MDN}/Guide/Introduction` }],
    variables: [{ title: "MDN — Grammar and types", url: `${MDN}/Guide/Grammar_and_types` }],
    operators: [{ title: "MDN — Expressions and operators", url: `${MDN}/Guide/Expressions_and_operators` }],
    "control-flow": [
      { title: "MDN — Control flow", url: `${MDN}/Guide/Control_flow_and_error_handling` },
      { title: "MDN — Loops and iteration", url: `${MDN}/Guide/Loops_and_iteration` },
    ],
    collections: [
      { title: "MDN — Indexed collections (arrays)", url: `${MDN}/Guide/Indexed_collections` },
      { title: "MDN — Working with objects", url: `${MDN}/Guide/Working_with_objects` },
    ],
    functions: [{ title: "MDN — Functions", url: `${MDN}/Guide/Functions` }],
    errors: [{ title: "MDN — try...catch", url: `${MDN}/Reference/Statements/try...catch` }],
    oop: [
      { title: "MDN — Classes", url: `${MDN}/Reference/Classes` },
      { title: "MDN — Inheritance & prototype chain", url: `${MDN}/Guide/Inheritance_and_the_prototype_chain` },
    ],
    async: [
      { title: "MDN — Using promises", url: `${MDN}/Guide/Using_promises` },
      { title: "MDN — async function", url: `${MDN}/Reference/Statements/async_function` },
    ],
    advanced: [
      { title: "MDN — Closures", url: `${MDN}/Closures` },
      { title: "MDN — Iterators and generators", url: `${MDN}/Guide/Iterators_and_generators` },
    ],
    // JS-INT (interview) tarmoqlari
    coredeep: [
      { title: "MDN — Closures", url: `${MDN}/Closures` },
      { title: "MDN — The event loop (concurrency model)", url: `${MDN}/Event_loop` },
    ],
    webnet: [
      { title: "MDN — HTTP overview", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" },
      { title: "MDN — Using the Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" },
    ],
    nodejs: [
      { title: "Node.js — Official API docs", url: "https://nodejs.org/docs/latest/api/" },
      { title: "Node.js — Learn (guides)", url: "https://nodejs.org/en/learn" },
    ],
    typescript: [
      { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    ],
  },
  plsql: {
    // 1Z0-071 (SQL)
    queries: [
      { title: "W3Schools — SQL SELECT / WHERE / ORDER BY", url: `${W3}/sql_select.asp` },
      { title: "Oracle SQL Language Reference", url: SQLREF },
    ],
    functions: [
      { title: "W3Schools — SQL NULL functions (NVL, COALESCE)", url: `${W3}/sql_isnull.asp` },
      { title: "Oracle — Single-Row Functions (SQL Ref)", url: SQLREF },
    ],
    aggregates: [
      { title: "W3Schools — GROUP BY / HAVING / aggregate functions", url: `${W3}/sql_groupby.asp` },
    ],
    joins: [
      { title: "W3Schools — SQL JOINs", url: `${W3}/sql_join.asp` },
    ],
    subqueries: [
      { title: "W3Schools — EXISTS / ANY / ALL", url: `${W3}/sql_exists.asp` },
      { title: "Oracle — Subqueries (SQL Ref)", url: SQLREF },
    ],
    dml: [
      { title: "W3Schools — INSERT / UPDATE / DELETE", url: `${W3}/sql_insert.asp` },
    ],
    ddl: [
      { title: "W3Schools — CREATE TABLE / constraints / views", url: `${W3}/sql_create_table.asp` },
    ],
    // 1Z0-149 (PL/SQL)
    blocks: [
      { title: "TutorialsPoint — PL/SQL Basic Syntax", url: `${TP}/plsql_basic_syntax.htm` },
      { title: "Oracle PL/SQL Language Reference", url: PLSREF },
    ],
    control: [
      { title: "TutorialsPoint — PL/SQL Conditions", url: `${TP}/plsql_conditions.htm` },
      { title: "TutorialsPoint — PL/SQL Loops", url: `${TP}/plsql_loops.htm` },
    ],
    cursors: [{ title: "TutorialsPoint — PL/SQL Cursors", url: `${TP}/plsql_cursors.htm` }],
    exceptions: [{ title: "TutorialsPoint — PL/SQL Exceptions", url: `${TP}/plsql_exceptions.htm` }],
    subprograms: [
      { title: "TutorialsPoint — PL/SQL Procedures", url: `${TP}/plsql_procedures.htm` },
      { title: "TutorialsPoint — PL/SQL Functions", url: `${TP}/plsql_functions.htm` },
    ],
    triggers: [{ title: "TutorialsPoint — PL/SQL Triggers", url: `${TP}/plsql_triggers.htm` }],
    collections: [{ title: "TutorialsPoint — PL/SQL Collections", url: `${TP}/plsql_collections.htm` }],
    // ORA-DBA
    transactions: [{ title: "Oracle — Transactions (Concepts)", url: CNCPT }],
    concurrency: [{ title: "Oracle — Data Concurrency & Consistency (Concepts)", url: CNCPT }],
    architecture: [{ title: "Oracle — Memory & Process Architecture (Concepts)", url: CNCPT }],
    performance: [
      { title: "Oracle — Performance Tuning Guide", url: TGDBA },
      { title: "Oracle — SQL Tuning Guide", url: TGSQL },
    ],
    indexes: [
      { title: "Oracle — SQL Tuning Guide (Indexes)", url: TGSQL },
      { title: "Oracle — CREATE INDEX (SQL Ref)", url: SQLREF },
    ],
    redoundo: [{ title: "Oracle — Redo/Undo & consistency (Concepts)", url: CNCPT }],
    jobs: [
      { title: "Oracle — Scheduler (Administrator's Guide)", url: ADMIN },
      { title: "Oracle PL/SQL Language Reference (DBMS_SCHEDULER)", url: PLSREF },
    ],
    bulk: [
      { title: "Oracle — BULK COLLECT / FORALL / dynamic SQL (PL/SQL Ref)", url: PLSREF },
    ],
    datatypes: [
      { title: "Oracle — Data Types (SQL Ref)", url: SQLREF },
      { title: "TutorialsPoint — PL/SQL Data Types", url: `${TP}/plsql_data_types.htm` },
    ],
    modeling: [{ title: "Oracle — Schema objects & data design (Concepts)", url: CNCPT }],
  },
};

// Umumiy (daraja) manbalar: umumiy + darajaга xos
export function getResources(plang, level) {
  const cfg = RESOURCES[plang] || {};
  return [...(cfg.common || []), ...(cfg[level] || [])];
}

// Mavzu bo'yicha manbalar
export function getTopicResources(plang, topic) {
  return TOPIC_RESOURCES[plang]?.[topic] || [];
}
