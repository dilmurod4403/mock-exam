// Sohaga doir foydali manbalar (rasmiy hujjatlar va maqolalar) — /resources rejimi uchun.
// Har til uchun umumiy (common) + darajaга xos havolalar.
const RESOURCES = {
  javascript: {
    common: [
      { title: "MDN — JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
      { title: "MDN — JavaScript Reference", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference" },
      { title: "The Modern JavaScript Tutorial (javascript.info)", url: "https://javascript.info/" },
      { title: "Eloquent JavaScript (bepul kitob)", url: "https://eloquentjavascript.net/" },
    ],
    JSE: [
      { title: "MDN — Grammar and types", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types" },
    ],
    JSA: [
      { title: "MDN — Working with objects", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects" },
    ],
    JSP: [
      { title: "MDN — Promise", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise" },
      { title: "MDN — Classes", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes" },
      { title: "MDN — Closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures" },
      { title: "MDN — Iterators and generators", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators" },
    ],
  },
  plsql: {
    common: [
      { title: "Oracle Live SQL — o'rgan va sinab ko'r", url: "https://livesql.oracle.com/" },
      { title: "oracle-base.com — maqolalar (Tim Hall)", url: "https://oracle-base.com/articles/articles" },
      { title: "Ask TOM (Oracle savol-javob)", url: "https://asktom.oracle.com/" },
    ],
    "1Z0-071": [
      { title: "Oracle SQL Language Reference (19c)", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/index.html" },
      { title: "Oracle — Get Started with SQL", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/sqintro/index.html" },
    ],
    "1Z0-149": [
      { title: "Oracle PL/SQL Language Reference (19c)", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/index.html" },
    ],
    "ORA-DBA": [
      { title: "Oracle Database Concepts (19c)", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/index.html" },
      { title: "Oracle Database Performance Tuning Guide (19c)", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/index.html" },
      { title: "Oracle Database SQL Tuning Guide (19c)", url: "https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/index.html" },
    ],
  },
};

// Berilgan til + daraja uchun manbalar (umumiy + darajaга xos)
export function getResources(plang, level) {
  const cfg = RESOURCES[plang] || {};
  return [...(cfg.common || []), ...(cfg[level] || [])];
}
