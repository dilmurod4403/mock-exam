// Oracle SQL & PL/SQL mavzulari uchun mini-darslar (ikki tilli).
// Kalit — PROG_LANGS.plsql.topics kalitlari bilan bir xil.
// body ichida ```sql ... ``` / ```plsql ... ``` bloklari kod sifatida ko'rsatiladi.
export default {
  // ---------- 1Z0-071 (SQL) ----------
  queries: {
    title: { uz: "So'rovlar (SELECT, WHERE, ORDER BY)", en: "Queries (SELECT, WHERE, ORDER BY)" },
    body: {
      uz: `SELECT — ma'lumot o'qiydi. FROM — qaysi jadval. WHERE — qatorlarni filtrlaydi. ORDER BY — saralaydi (ASC/DESC).

Mantiqiy tartib: FROM → WHERE → SELECT → ORDER BY. Shuning uchun ustun aliasini WHERE'da ishlatib bo'lmaydi, ORDER BY'da mumkin.

\`\`\`sql
SELECT ename, sal
FROM   emp
WHERE  sal > 2000
ORDER  BY sal DESC;
\`\`\`

💡 Yodda tut: NULL bilan taqqoslashda \`= NULL\` emas, \`IS NULL\` ishlating.`,
      en: `SELECT reads data. FROM is the table. WHERE filters rows. ORDER BY sorts (ASC/DESC).

Logical order: FROM → WHERE → SELECT → ORDER BY. That's why a column alias can't be used in WHERE but can in ORDER BY.

\`\`\`sql
SELECT ename, sal
FROM   emp
WHERE  sal > 2000
ORDER  BY sal DESC;
\`\`\`

💡 Remember: compare with NULL using \`IS NULL\`, never \`= NULL\`.`,
    },
  },
  functions: {
    title: { uz: "Bir qatorli funksiyalar", en: "Single-row functions" },
    body: {
      uz: `Bir qatorli funksiya har qatorga alohida qo'llanadi. Matn: UPPER, LOWER, SUBSTR, LENGTH. Son: ROUND, MOD. Sana: SYSDATE, TO_CHAR. NULL: NVL(x, y).

\`\`\`sql
SELECT UPPER(ename), ROUND(sal/30, 2), NVL(comm, 0)
FROM   emp;
\`\`\`

💡 Yodda tut: NVL(x, y) — x NULL bo'lsa y ni qaytaradi.`,
      en: `A single-row function applies to each row separately. Text: UPPER, LOWER, SUBSTR, LENGTH. Number: ROUND, MOD. Date: SYSDATE, TO_CHAR. NULL: NVL(x, y).

\`\`\`sql
SELECT UPPER(ename), ROUND(sal/30, 2), NVL(comm, 0)
FROM   emp;
\`\`\`

💡 Remember: NVL(x, y) returns y when x is NULL.`,
    },
  },
  aggregates: {
    title: { uz: "Guruh funksiyalari (GROUP BY)", en: "Group functions (GROUP BY)" },
    body: {
      uz: `Guruh funksiyalari ko'p qatordan bitta natija beradi: COUNT, SUM, AVG, MIN, MAX. GROUP BY — guruhlarga bo'ladi. HAVING — guruhlarni filtrlaydi (WHERE emas).

\`\`\`sql
SELECT deptno, COUNT(*), AVG(sal)
FROM   emp
GROUP  BY deptno
HAVING COUNT(*) > 3;
\`\`\`

💡 Yodda tut: SELECT'dagi guruhlanmagan ustun GROUP BY'da bo'lishi shart.`,
      en: `Group functions turn many rows into one result: COUNT, SUM, AVG, MIN, MAX. GROUP BY forms the groups. HAVING filters groups (not WHERE).

\`\`\`sql
SELECT deptno, COUNT(*), AVG(sal)
FROM   emp
GROUP  BY deptno
HAVING COUNT(*) > 3;
\`\`\`

💡 Remember: any non-aggregated column in SELECT must appear in GROUP BY.`,
    },
  },
  joins: {
    title: { uz: "Jadvallarni birlashtirish (JOIN)", en: "Joins" },
    body: {
      uz: `JOIN ikki jadvalni bog'laydi. INNER JOIN — faqat mos qatorlar. LEFT OUTER JOIN — chapdagi barcha qator + o'ngdan mos (mos yo'q bo'lsa NULL).

\`\`\`sql
SELECT e.ename, d.dname
FROM   emp e
JOIN   dept d ON e.deptno = d.deptno;
\`\`\`

💡 Yodda tut: ON sharti bog'lanish ustunini ko'rsatadi.`,
      en: `A JOIN links two tables. INNER JOIN keeps only matching rows. LEFT OUTER JOIN keeps every left row + matches from the right (NULL where none).

\`\`\`sql
SELECT e.ename, d.dname
FROM   emp e
JOIN   dept d ON e.deptno = d.deptno;
\`\`\`

💡 Remember: the ON clause names the join column.`,
    },
  },
  subqueries: {
    title: { uz: "Ichki so'rovlar, to'plam operatorlari", en: "Subqueries & set operators" },
    body: {
      uz: `Ichki so'rov (subquery) — so'rov ichidagi so'rov. To'plam operatorlari: UNION (takrorsiz), UNION ALL (takror bilan), INTERSECT (umumiy), MINUS (farq).

\`\`\`sql
SELECT ename FROM emp
WHERE  sal > (SELECT AVG(sal) FROM emp);
\`\`\`

💡 Yodda tut: UNION natijani saralaydi va takrorlarni o'chiradi; UNION ALL tezroq.`,
      en: `A subquery is a query inside a query. Set operators: UNION (no duplicates), UNION ALL (with duplicates), INTERSECT (common), MINUS (difference).

\`\`\`sql
SELECT ename FROM emp
WHERE  sal > (SELECT AVG(sal) FROM emp);
\`\`\`

💡 Remember: UNION sorts and removes duplicates; UNION ALL is faster.`,
    },
  },
  dml: {
    title: { uz: "Ma'lumot o'zgartirish (DML)", en: "Data manipulation (DML)" },
    body: {
      uz: `DML: INSERT (qo'shish), UPDATE (o'zgartirish), DELETE (o'chirish). O'zgarishlar COMMIT bilan saqlanadi, ROLLBACK bilan bekor qilinadi.

\`\`\`sql
UPDATE emp SET sal = sal * 1.1 WHERE deptno = 10;
COMMIT;
\`\`\`

💡 Yodda tut: WHERE'siz UPDATE/DELETE barcha qatorga ta'sir qiladi!`,
      en: `DML: INSERT (add), UPDATE (change), DELETE (remove). Changes are saved with COMMIT and undone with ROLLBACK.

\`\`\`sql
UPDATE emp SET sal = sal * 1.1 WHERE deptno = 10;
COMMIT;
\`\`\`

💡 Remember: an UPDATE/DELETE without WHERE affects every row!`,
    },
  },
  ddl: {
    title: { uz: "DDL, cheklovlar, view", en: "DDL, constraints, views" },
    body: {
      uz: `DDL tuzilmani yaratadi/o'zgartiradi: CREATE, ALTER, DROP. Cheklovlar: PRIMARY KEY, NOT NULL, UNIQUE, FOREIGN KEY, CHECK. VIEW — saqlangan so'rov.

\`\`\`sql
CREATE TABLE dept (
  deptno NUMBER PRIMARY KEY,
  dname  VARCHAR2(20) NOT NULL
);
\`\`\`

💡 Yodda tut: DDL avtomatik COMMIT qiladi — keyin ROLLBACK ishlamaydi.`,
      en: `DDL creates/changes structure: CREATE, ALTER, DROP. Constraints: PRIMARY KEY, NOT NULL, UNIQUE, FOREIGN KEY, CHECK. A VIEW is a stored query.

\`\`\`sql
CREATE TABLE dept (
  deptno NUMBER PRIMARY KEY,
  dname  VARCHAR2(20) NOT NULL
);
\`\`\`

💡 Remember: DDL auto-commits — ROLLBACK won't undo it afterwards.`,
    },
  },
  // ---------- 1Z0-149 (PL/SQL) ----------
  blocks: {
    title: { uz: "Blok tuzilishi va o'zgaruvchilar", en: "Block structure & variables" },
    body: {
      uz: `PL/SQL blok uch qismdan iborat: DECLARE (e'lonlar, ixtiyoriy), BEGIN...END (bajariluvchi, majburiy), EXCEPTION (istisnolar, ixtiyoriy). Qiymat berish := bilan.

\`\`\`plsql
DECLARE
  v_ism VARCHAR2(20) := 'Ali';
BEGIN
  DBMS_OUTPUT.PUT_LINE(v_ism);
END;
\`\`\`

💡 Yodda tut: faqat BEGIN...END majburiy, qolgan ikkisi ixtiyoriy.`,
      en: `A PL/SQL block has three parts: DECLARE (declarations, optional), BEGIN...END (executable, mandatory), EXCEPTION (handlers, optional). Assign with :=.

\`\`\`plsql
DECLARE
  v_name VARCHAR2(20) := 'Ali';
BEGIN
  DBMS_OUTPUT.PUT_LINE(v_name);
END;
\`\`\`

💡 Remember: only BEGIN...END is mandatory; the other two are optional.`,
    },
  },
  control: {
    title: { uz: "Boshqaruv (IF/CASE/LOOP)", en: "Control (IF/CASE/LOOP)" },
    body: {
      uz: `Shart: IF ... THEN ... ELSIF ... ELSE ... END IF. CASE — ko'p tarmoq uchun. Sikllar: LOOP, WHILE, FOR.

\`\`\`plsql
FOR i IN 1..3 LOOP
  DBMS_OUTPUT.PUT_LINE(i);
END LOOP;
\`\`\`

💡 Yodda tut: FOR sikl o'zgaruvchisini alohida e'lon qilish shart emas.`,
      en: `Condition: IF ... THEN ... ELSIF ... ELSE ... END IF. CASE for many branches. Loops: LOOP, WHILE, FOR.

\`\`\`plsql
FOR i IN 1..3 LOOP
  DBMS_OUTPUT.PUT_LINE(i);
END LOOP;
\`\`\`

💡 Remember: a FOR loop's counter variable is declared automatically.`,
    },
  },
  cursors: {
    title: { uz: "Kursorlar", en: "Cursors" },
    body: {
      uz: `Kursor — so'rov natijasi ustidan qator-qator yurish uchun. Aniq kursor: DECLARE → OPEN → FETCH → CLOSE. Atributlar: %FOUND, %NOTFOUND, %ROWCOUNT, %ISOPEN.

\`\`\`plsql
FOR r IN (SELECT ename FROM emp) LOOP
  DBMS_OUTPUT.PUT_LINE(r.ename);
END LOOP;
\`\`\`

💡 Yodda tut: cursor FOR loop OPEN/FETCH/CLOSE ni o'zi bajaradi.`,
      en: `A cursor walks over a query result row by row. Explicit cursor: DECLARE → OPEN → FETCH → CLOSE. Attributes: %FOUND, %NOTFOUND, %ROWCOUNT, %ISOPEN.

\`\`\`plsql
FOR r IN (SELECT ename FROM emp) LOOP
  DBMS_OUTPUT.PUT_LINE(r.ename);
END LOOP;
\`\`\`

💡 Remember: a cursor FOR loop handles OPEN/FETCH/CLOSE for you.`,
    },
  },
  exceptions: {
    title: { uz: "Istisnolar (exceptions)", en: "Exceptions" },
    body: {
      uz: `Istisno — ish vaqti xatosi. EXCEPTION bo'limida ushlanadi. Oldindan belgilangan: NO_DATA_FOUND, TOO_MANY_ROWS, ZERO_DIVIDE.

\`\`\`plsql
BEGIN
  SELECT sal INTO v FROM emp WHERE empno = 999;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    DBMS_OUTPUT.PUT_LINE('Topilmadi');
END;
\`\`\`

💡 Yodda tut: SELECT INTO qator qaytarmasa NO_DATA_FOUND ko'tariladi.`,
      en: `An exception is a run-time error, caught in the EXCEPTION section. Predefined: NO_DATA_FOUND, TOO_MANY_ROWS, ZERO_DIVIDE.

\`\`\`plsql
BEGIN
  SELECT sal INTO v FROM emp WHERE empno = 999;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    DBMS_OUTPUT.PUT_LINE('Not found');
END;
\`\`\`

💡 Remember: a SELECT INTO returning no rows raises NO_DATA_FOUND.`,
    },
  },
  subprograms: {
    title: { uz: "Procedure / Function / Package", en: "Procedure / Function / Package" },
    body: {
      uz: `Procedure — amal bajaradi (qiymat qaytarishi shart emas). Function — qiymat qaytaradi (RETURN). Package — ularni guruhlaydi. Parametr rejimlari: IN, OUT, IN OUT.

\`\`\`plsql
CREATE FUNCTION kvadrat(n NUMBER) RETURN NUMBER IS
BEGIN
  RETURN n * n;
END;
\`\`\`

💡 Yodda tut: funksiya albatta qiymat RETURN qilishi kerak, procedure — shart emas.`,
      en: `A procedure performs an action (need not return a value). A function returns a value (RETURN). A package groups them. Parameter modes: IN, OUT, IN OUT.

\`\`\`plsql
CREATE FUNCTION square(n NUMBER) RETURN NUMBER IS
BEGIN
  RETURN n * n;
END;
\`\`\`

💡 Remember: a function must RETURN a value; a procedure need not.`,
    },
  },
  triggers: {
    title: { uz: "Triggerlar", en: "Triggers" },
    body: {
      uz: `Trigger — jadvalda hodisa (INSERT/UPDATE/DELETE) sodir bo'lganda avtomatik ishlaydi. :NEW — yangi qiymat, :OLD — eski qiymat.

\`\`\`plsql
CREATE TRIGGER trg BEFORE INSERT ON emp
FOR EACH ROW
BEGIN
  :NEW.ename := UPPER(:NEW.ename);
END;
\`\`\`

💡 Yodda tut: BEFORE triggerda :NEW qiymatini o'zgartirsa bo'ladi.`,
      en: `A trigger runs automatically when an event (INSERT/UPDATE/DELETE) happens on a table. :NEW is the new value, :OLD is the old value.

\`\`\`plsql
CREATE TRIGGER trg BEFORE INSERT ON emp
FOR EACH ROW
BEGIN
  :NEW.ename := UPPER(:NEW.ename);
END;
\`\`\`

💡 Remember: in a BEFORE trigger you can modify :NEW values.`,
    },
  },
  collections: {
    title: { uz: "Records va kolleksiyalar", en: "Records & collections" },
    body: {
      uz: `Record — turli tipdagi maydonlar guruhi (ko'pincha %ROWTYPE). Kolleksiya — bir tipdagi elementlar to'plami: assotsiativ massiv, nested table, VARRAY.

\`\`\`plsql
DECLARE
  TYPE t_nom IS TABLE OF VARCHAR2(20) INDEX BY PLS_INTEGER;
  nomlar t_nom;
BEGIN
  nomlar(1) := 'Ali';
END;
\`\`\`

💡 Yodda tut: assotsiativ massiv (INDEX BY) siyrak va chegarasiz.`,
      en: `A record groups fields of different types (often %ROWTYPE). A collection is a set of same-type elements: associative array, nested table, VARRAY.

\`\`\`plsql
DECLARE
  TYPE t_name IS TABLE OF VARCHAR2(20) INDEX BY PLS_INTEGER;
  names t_name;
BEGIN
  names(1) := 'Ali';
END;
\`\`\`

💡 Remember: an associative array (INDEX BY) is sparse and unbounded.`,
    },
  },
};
