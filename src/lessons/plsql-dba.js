// Oracle DBA / Interview darajasi uchun batafsil tayyorgarlik darslari (ikki tilli).
// Kalitlar — ORA-DBA mavzulari bilan bir xil (transactions, concurrency, ...).
// Har dars o'sha mavzudagi savollar tekshiradigan tushunchalarni to'liq ochadi.
export default {
  subprograms: {
    title: { uz: "Subprogramlar (chuqur): param, NOCOPY, huquqlar", en: "Subprograms (deep): params, NOCOPY, rights" },
    body: {
      uz: `PROCEDURE vs FUNCTION vs PACKAGE:
• Procedure — amal bajaradi, qiymat qaytarishi shart emas (natijani OUT parametr orqali beradi).
• Function — RETURN bilan albatta qiymat qaytaradi; SQL ifodalarida ishlatilishi mumkin.
• Package — bog'liq procedure/function/tiplarni guruhlaydi (spec + body).

PARAMETR REJIMLARI:
• IN — qiymatni ichkariga uzatadi (ichida faqat o'qiladi). Standart.
• OUT — natijani qaytaradi (ichida boshda NULL).
• IN OUT — qiymatni uzatib, o'zgartirilganini qaytaradi.

NOCOPY: odatda OUT/IN OUT qiymat nusxasi bilan uzatiladi (copy-in/copy-out). NOCOPY havola (by reference) orqali uzatishni so'raydi — katta kolleksiya/record uchun tez. Kamchiligi: ushlanmagan istisnoda haqiqiy parametr qisman o'zgargan qolishi mumkin.
\`\`\`plsql
PROCEDURE load(p_data IN OUT NOCOPY t_big_table) IS ...
\`\`\`

DEFINER vs INVOKER RIGHTS:
• Definer's (standart) — subprogram EGASINING huquqlari/sxemasi bilan ishlaydi.
• Invoker's (AUTHID CURRENT_USER) — CHAQIRUVCHINING huquqlari/sxemasi bilan (masalan har foydalanuvchi o'z jadvaliga).

TRANZAKSIYA NAZORATI: chaqirilgan subprogram ichidagi COMMIT chaqiruvchining ATOMARLIGINI buzadi — endi butun ishni bitta tranzaksiya sifatida rollback qilib bo'lmaydi. Commit/rollback yuqori (chaqiruvchi) darajada boshqarilsin; chinakam mustaqil bo'lsa — autonomous transaction.

XATOLARNI ANIQLASH: 4 ta funksiya chaqirilgan va ichida commit/rollback borligini bilmasangiz — xatolarni WHEN OTHERS THEN NULL bilan "yutmang"; ular yuqoriga ko'tarilsin (RAISE) va SQLERRM'ni loglang.

💡 Yodda tut: function RETURN qiladi, procedure — shart emas; katta parametrga NOCOPY; commit'ni chaqiruvchida ushlang.`,
      en: `PROCEDURE vs FUNCTION vs PACKAGE:
• Procedure — performs an action, need not return a value (returns results via OUT params).
• Function — must return a value with RETURN; usable in SQL expressions.
• Package — groups related procedures/functions/types (spec + body).

PARAMETER MODES:
• IN — passes a value in (read-only inside). Default.
• OUT — returns a value out (NULL inside at first).
• IN OUT — passes in and returns a modified value.

NOCOPY: normally OUT/IN OUT are passed by value (copy-in/copy-out). NOCOPY asks to pass by reference — faster for large collections/records. Downside: on an unhandled exception the actual parameter may be left partially modified.
\`\`\`plsql
PROCEDURE load(p_data IN OUT NOCOPY t_big_table) IS ...
\`\`\`

DEFINER vs INVOKER RIGHTS:
• Definer's (default) — runs with the OWNER's privileges/schema.
• Invoker's (AUTHID CURRENT_USER) — runs with the CALLER's privileges/schema (e.g. each user against their own tables).

TRANSACTION CONTROL: a COMMIT inside a called subprogram breaks the caller's ATOMICITY — the whole unit of work can no longer be rolled back as one transaction. Control commit/rollback at the top level; if truly independent, use an autonomous transaction.

DETECTING ERRORS: if 4 functions are called and you don't know whether they commit/rollback inside — don't "swallow" errors with WHEN OTHERS THEN NULL; let them propagate (RAISE) and log SQLERRM.

💡 Remember: a function RETURNs, a procedure need not; use NOCOPY for large params; control commit in the caller.`,
    },
  },
  transactions: {
    title: { uz: "Tranzaksiyalar — to'liq tayyorgarlik", en: "Transactions — full prep" },
    body: {
      uz: `Tranzaksiya — bir butun sifatida bajariladigan amallar to'plami: hammasi bajariladi yoki hech biri (atomarlik).

• BOSHLANISHI: oshkormas — ulanishdan yoki oldingi COMMIT/ROLLBACK'dan keyingi birinchi DML bilan. Alohida BEGIN kerak emas.
• TUGASHI: COMMIT (saqlaydi) yoki ROLLBACK (bekor qiladi). Har qanday DDL (CREATE/ALTER/DROP/TRUNCATE) oshkormas COMMIT qiladi!
• UNDO: o'zgarishdan oldingi qiymatlar undo segmentlarida saqlanadi — ROLLBACK va o'qish izchilligi uchun.
• DIRTY READ YO'Q: COMMIT qilinmagan o'zgarishni boshqa sessiya ko'rmaydi — u undo orqali oxirgi commit qilingan versiyani oladi.

SAVEPOINT — tranzaksiya ichida nuqta:
\`\`\`sql
SAVEPOINT sp1;
-- ...o'zgarishlar...
ROLLBACK TO sp1;  -- faqat sp1 dan keyingisini bekor qiladi, tranzaksiya ochiq qoladi
\`\`\`

IZOLYATSIYA DARAJALARI:
• READ COMMITTED (standart) — har SELECT o'sha paytdagi commit qilingan ma'lumotni ko'radi.
• SERIALIZABLE — tranzaksiya boshidagi izchil snapshot butun davomida; non-repeatable read va phantom bo'lmaydi.

AUTONOMOUS transaction (PRAGMA AUTONOMOUS_TRANSACTION) — mustaqil bola tranzaksiya, asosiy'dan alohida COMMIT/ROLLBACK qiladi (masalan xatoni ham logga yozib qoldirish uchun).

SESSIYA vs TRANZAKSIYA: bitta sessiya umri davomida ko'p tranzaksiya bajaradi (ketma-ket, bir vaqtda bittasi faol). Sessiya g'ayritabiiy uzilsa, commit qilinmagan tranzaksiya ROLLBACK qilinadi (PMON tozalaydi).

💡 Yodda tut: Oracle'da avtomatik commit yo'q — COMMIT'ni o'zingiz yozasiz (DDL bundan mustasno).`,
      en: `A transaction is a set of operations executed as one unit: all or nothing (atomicity).

• BEGINS implicitly — with the first DML after connect or after a prior COMMIT/ROLLBACK. No explicit BEGIN.
• ENDS with COMMIT (saves) or ROLLBACK (undoes). Any DDL (CREATE/ALTER/DROP/TRUNCATE) issues an implicit COMMIT!
• UNDO: pre-change values are kept in undo segments — for ROLLBACK and read consistency.
• NO DIRTY READ: other sessions can't see your uncommitted changes — they get the last committed version via undo.

SAVEPOINT — a marker inside a transaction:
\`\`\`sql
SAVEPOINT sp1;
-- ...changes...
ROLLBACK TO sp1;  -- undoes only work after sp1; the transaction stays open
\`\`\`

ISOLATION LEVELS:
• READ COMMITTED (default) — each query sees data committed as of when it started.
• SERIALIZABLE — a consistent snapshot as of the transaction start, for its whole duration; no non-repeatable reads or phantoms.

AUTONOMOUS transaction (PRAGMA AUTONOMOUS_TRANSACTION) — an independent child transaction that commits/rolls back separately from the main one (e.g. to keep a log even if the caller rolls back).

SESSION vs TRANSACTION: one session runs many transactions over its life (sequentially, one active at a time). If a session dies abnormally, its uncommitted transaction is rolled back (PMON cleans up).

💡 Remember: Oracle has no autocommit — you write COMMIT yourself (except DDL).`,
    },
  },
  concurrency: {
    title: { uz: "Konkurentlik: lock, blocking, deadlock", en: "Concurrency: locks, blocking, deadlock" },
    body: {
      uz: `Oracle ko'p foydalanuvchini bir vaqtda ishlashini loklar orqali boshqaradi.

LOCK TURLARI:
• DML qatorga EXCLUSIVE (X) row lock oladi + jadvalga shared (TM) lock. Shu sabab boshqa sessiya o'sha qatorni o'zgartira olmaydi, lekin boshqa qatorlar erkin.
• Shared (S) lock — bir vaqtda ko'p o'qishga ruxsat. Exclusive (X) — faqat bitta egaga.

ASOSIY TAMOYIL: o'quvchi yozuvchini, yozuvchi o'quvchini BLOKLAMAYDI. O'quvchi undo orqali oxirgi izchil versiyani ko'radi (multiversion read consistency).

BLOCKING — bir sessiya boshqasi ushlagan lockni kutishi. Bloklovchi COMMIT/ROLLBACK qilsa, kutuvchi davom etadi.
\`\`\`sql
-- S1: UPDATE emp SET sal=sal+1 WHERE id=100;  (commit yo'q)
-- S2: UPDATE emp SET sal=sal+2 WHERE id=100;  -- KUTADI (bloklandi)
\`\`\`

DEADLOCK — ikki sessiya bir-biri kutayotgan lockni ushlaydi; hech biri davom eta olmaydi. Oracle buni avtomatik aniqlaydi va bittasining statement'ini rollback qiladi (ORA-00060). Oldini olish: barcha sessiyalarda jadval/qatorlarga BIR XIL tartibda murojaat qilish.

SELECT ... FOR UPDATE — tanlangan qatorlarni oldindan lock qiladi ("o'qib, keyin yangilash" uchun) — COMMIT/ROLLBACK gacha boshqalar o'zgartira olmaydi.

💡 Yodda tut: 2-sessiya o'sha qatorni yangilamoqchi bo'lsa, 1-sessiya commit qilguncha kutadi (cheksiz ham bo'lishi mumkin — NOWAIT yoki WAIT n bilan chegaralasa bo'ladi).`,
      en: `Oracle manages many concurrent users with locks.

LOCK TYPES:
• DML takes an EXCLUSIVE (X) row lock + a shared (TM) table lock. So another session can't change that row, while other rows stay free.
• Shared (S) lock — allows concurrent reads. Exclusive (X) — one owner only.

CORE PRINCIPLE: readers don't block writers and writers don't block readers. A reader sees the last consistent version via undo (multiversion read consistency).

BLOCKING — one session waits for a lock held by another. When the blocker commits/rolls back, the waiter proceeds.
\`\`\`sql
-- S1: UPDATE emp SET sal=sal+1 WHERE id=100;  (no commit)
-- S2: UPDATE emp SET sal=sal+2 WHERE id=100;  -- WAITS (blocked)
\`\`\`

DEADLOCK — two sessions each hold a lock the other waits for; neither can proceed. Oracle detects it automatically and rolls back one statement (ORA-00060). Prevent it by accessing tables/rows in the SAME order in every session.

SELECT ... FOR UPDATE — pre-locks the selected rows (for read-then-update) so others can't change them until you commit/rollback.

💡 Remember: if session 2 wants to update the same row, it waits until session 1 commits (possibly forever — bound it with NOWAIT or WAIT n).`,
    },
  },
  architecture: {
    title: { uz: "Arxitektura: instance, SGA/PGA, jarayonlar", en: "Architecture: instance, SGA/PGA, processes" },
    body: {
      uz: `INSTANCE vs DATABASE:
• Instance — xotira (SGA) + background jarayonlar (o'tkinchi; o'chirsa yo'qoladi).
• Database — diskdagi fayllar: datafile, control file, redo log.
Instance database'ni mount qilib ochadi. (RAC'da bitta database'ga bir nechta instance.)

SGA (System Global Area) — umumiy xotira:
• Database buffer cache — diskdan o'qilgan bloklarni keshlaydi.
• Shared pool (library cache) — tahlil qilingan SQL + bajarish rejalarini saqlaydi (soft parse shu yerdan).
• Redo log buffer — redo yozuvlarini vaqtincha ushlaydi.

PGA — bitta server jarayonining XUSUSIY xotirasi (sort maydoni, sessiya o'zgaruvchilari). UGA — sessiya holati: dedicated server'da PGA'da, shared server'da SGA'da.

BACKGROUND JARAYONLAR:
• SMON — instance recovery (startupda), temp segment tozalash.
• PMON — muvaffaqiyatsiz jarayonni tozalash (lock bo'shatish, rollback).
• DBWn — 'dirty' bloklarni diskka yozadi.
• LGWR — redo log buffer'ni online redo loglarga yozadi (COMMIT'da).
• CKPT, ARCn (arxivlash).

LISTENER — instance'dan ALOHIDA tarmoq jarayoni; klient ulanishlarini qabul qilib server jarayoniga topshiradi.

XOTIRA IYERARXIYASI (kattadan kichikka): Tablespace > Segment (obyekt, masalan jadval) > Extent (uzluksiz bloklar) > Oracle block (eng kichik I/O birligi).

TABLESPACE TURLARI: SYSTEM (data dictionary), SYSAUX (yordamchi), UNDO, TEMP (sort/hash disk'ga to'kilsa), USERS (foydalanuvchi ma'lumoti).

SPFILE (yoki eski PFILE init.ora) — instance parametrlari (SGA o'lchamlari, processes, control_files...).

💡 Yodda tut: DEDICATED server — har klientga alohida jarayon; SHARED server — dispatcher orqali jarayonlar to'plami ko'p klientga.`,
      en: `INSTANCE vs DATABASE:
• Instance — memory (SGA) + background processes (transient; gone on shutdown).
• Database — files on disk: datafiles, control files, redo logs.
An instance mounts and opens a database. (In RAC, several instances serve one database.)

SGA (System Global Area) — shared memory:
• Database buffer cache — caches data blocks read from disk.
• Shared pool (library cache) — stores parsed SQL + execution plans (soft parse comes from here).
• Redo log buffer — holds redo entries briefly.

PGA — the PRIVATE memory of one server process (sort area, session variables). UGA — session state: in the PGA for a dedicated server, in the SGA for a shared server.

BACKGROUND PROCESSES:
• SMON — instance recovery (at startup), temp-segment cleanup.
• PMON — cleans up failed processes (release locks, rollback).
• DBWn — writes dirty blocks to disk.
• LGWR — writes the redo log buffer to the online redo logs (at COMMIT).
• CKPT, ARCn (archiving).

LISTENER — a SEPARATE network process; it accepts client connections and hands them to a server process.

STORAGE HIERARCHY (largest to smallest): Tablespace > Segment (an object, e.g. a table) > Extent (contiguous blocks) > Oracle block (smallest I/O unit).

TABLESPACES: SYSTEM (data dictionary), SYSAUX (auxiliary), UNDO, TEMP (spilled sorts/hashes), USERS (user data).

SPFILE (or older PFILE init.ora) — instance parameters (SGA sizes, processes, control_files, ...).

💡 Remember: DEDICATED server — one process per client; SHARED server — a pool of processes serves many clients via dispatchers.`,
    },
  },
  performance: {
    title: { uz: "Optimizatsiya: parse, CBO, plan, join", en: "Performance: parse, CBO, plans, joins" },
    body: {
      uz: `PARSE:
• Hard parse — SQL noldan tahlil qilinadi, optimizer reja tuzadi (qimmat).
• Soft parse — shared pool'dagi tayyor reja qayta ishlatiladi (arzon).
Hard parse'ni kamaytirish: BIND o'zgaruvchilar (:id) — SQL matni bir xil qoladi. Literal qiymatlar har safar yangi SQL yaratadi.

COST-BASED OPTIMIZER (CBO): rejani STATISTIKA asosida tanlaydi (qatorlar soni, qiymatlar taqsimoti, indeks selektivligi). Eskirgan statistika → yomon reja → sekin so'rov. DBMS_STATS bilan yangilanadi. Yangimi/eskimi — DBA_TAB_STATISTICS / *_TABLES.LAST_ANALYZED.

EXECUTION PLAN — so'rov qanday bajarilishini ko'rsatadi (EXPLAIN PLAN, DBMS_XPLAN.DISPLAY, autotrace): full scan yoki indeks, join usuli, tartib, xarajat.

JOIN USULLARI:
• Nested loop — bitta tomon kichik + ikkinchisining join ustuni indekslangan.
• Hash join — katta to'plamlar, tenglik (=) sharti bilan (equijoin).
• Sort-merge — saralangan katta to'plamlar, diapazon shartlari uchun ham.

INDEKS QACHON YORDAM BERMAYDI: so'rov jadvalning katta qismini (>~5-10%) qaytarsa, full scan arzonroq. Predikat 'sargable' bo'lishi kerak — ustunga funksiya qo'llasa (WHERE UPPER(name)=...) oddiy indeks ishlamaydi.

HWM (high-water mark): ko'p DELETE'dan keyin bloklar bo'shab qoladi, lekin HWM baland — full scan bo'sh bloklarni ham o'qiydi. ALTER TABLE ... SHRINK SPACE yoki MOVE tushiradi.

💡 Yodda tut: prod'da katta jadvalni qayta tashkil qilishda MOVE ONLINE / DBMS_REDEFINITION — parallel DML davom etadi.`,
      en: `PARSE:
• Hard parse — the SQL is analyzed from scratch and the optimizer builds a plan (expensive).
• Soft parse — a ready plan in the shared pool is reused (cheap).
Reduce hard parsing with BIND variables (:id) — the SQL text stays identical. Literals create new SQL each time.

COST-BASED OPTIMIZER (CBO): chooses the plan from STATISTICS (row counts, value distribution, index selectivity). Stale stats → bad plan → slow query. Refresh with DBMS_STATS. Check freshness in DBA_TAB_STATISTICS / *_TABLES.LAST_ANALYZED.

EXECUTION PLAN — shows how a query runs (EXPLAIN PLAN, DBMS_XPLAN.DISPLAY, autotrace): full scan vs index, join method, order, cost.

JOIN METHODS:
• Nested loop — one side small + the other's join column indexed.
• Hash join — large sets, on an equality (=) condition (equijoin).
• Sort-merge — large sorted sets, also for range conditions.

WHEN AN INDEX DOESN'T HELP: if a query returns a large fraction of the table (>~5-10%), a full scan is cheaper. Predicates must be 'sargable' — applying a function to the column (WHERE UPPER(name)=...) defeats a plain index.

HWM (high-water mark): after many deletes, blocks empty but the HWM stays high — a full scan reads those empty blocks. ALTER TABLE ... SHRINK SPACE or MOVE lowers it.

💡 Remember: to reorganize a big table on production, use MOVE ONLINE / DBMS_REDEFINITION — concurrent DML keeps working.`,
    },
  },
  indexes: {
    title: { uz: "Indekslar: turlari va mexanikasi", en: "Indexes: types and mechanics" },
    body: {
      uz: `Indeks — kerakli qatorni tez topish uchun (full scan o'rniga). DML'ni sekinlashtiradi (indeks ham yangilanadi).

TURLARI:
• B-tree (standart) — keng ko'lamli, yuqori kardinallik (ko'p turli qiymat), OLTP uchun.
• Bitmap — past kardinallik (masalan jins, holat), o'qishga mo'ljallangan/DWH. OLTP'da YOMON: bitta DML butun bitmap bo'lagini (ko'p qator) bloklaydi.
• Function-based — WHERE UPPER(name)=... kabi ifodalarga indeks.
• Reverse key — kalit baytlarini teskari qiladi: ketma-ket qiymatlar (sequence) turli leaf bloklarga tarqaladi, 'issiq blok' konkurentligini kamaytiradi.

UNIQUE indeks — takror qiymatga yo'l qo'ymaydi (PK/UNIQUE shu orqali). Composite indeks — bir necha ustun; faqat YETAKCHI (leading) ustun bo'yicha ham ishlatilishi mumkin.

LOCAL vs GLOBAL (partitsiyalangan jadvalda): LOCAL — jadval bilan bir xil bo'linadi (har bo'lakka bitta indeks bo'lak). GLOBAL — barcha bo'laklarni qamraydigan yagona struktura.

REORG TA'SIRI:
• ALTER TABLE ... MOVE — rowid'lar o'zgaradi → indekslar UNUSABLE, REBUILD kerak.
• RENAME — ma'lumot ko'chmaydi, indekslar amal qilaveradi.
• PK yaratganda o'sha ustunlarda mos indeks bo'lsa — yangi yaratmaydi, o'shani ishlatadi.

PROD'da: CREATE INDEX ... ONLINE / ALTER INDEX ... REBUILD ONLINE — parallel DML bilan.

💡 Yodda tut: har indeks SELECT'ni tezlashtiradi, lekin INSERT/UPDATE/DELETE'ni sekinlashtiradi va joy egallaydi — kerakligini ishlating.`,
      en: `An index finds rows fast (instead of a full scan). It slows down DML (the index must be maintained).

TYPES:
• B-tree (default) — general-purpose, for high cardinality (many distinct values), OLTP.
• Bitmap — low cardinality (e.g. gender, status), read-mostly/DWH. BAD in OLTP: one DML locks a whole bitmap segment (many rows).
• Function-based — indexes an expression like WHERE UPPER(name)=...
• Reverse key — reverses the key bytes: sequential values (a sequence) scatter across leaf blocks, reducing 'hot block' contention.

UNIQUE index — disallows duplicates (PK/UNIQUE use one). Composite index — several columns; can be used even by the LEADING column alone.

LOCAL vs GLOBAL (on a partitioned table): LOCAL — partitioned like the table (one index partition per table partition). GLOBAL — one structure spanning all partitions.

REORG EFFECTS:
• ALTER TABLE ... MOVE — rowids change → indexes go UNUSABLE, need REBUILD.
• RENAME — no data moves, indexes stay valid.
• Adding a PK reuses a suitable existing index on those columns instead of creating a new one.

ON PRODUCTION: CREATE INDEX ... ONLINE / ALTER INDEX ... REBUILD ONLINE — with concurrent DML.

💡 Remember: every index speeds up SELECTs but slows INSERT/UPDATE/DELETE and uses space — add only the ones you need.`,
    },
  },
  redoundo: {
    title: { uz: "Redo/Undo va recovery", en: "Redo/Undo & recovery" },
    body: {
      uz: `REDO vs UNDO — ikki xil maqsad:
• REDO — o'zgarishni QAYTA qo'llash uchun (crash/media recovery). LGWR redo log buffer'ni online redo log fayllarga yozadi (COMMIT'da) — bardoshlilik (durability).
• UNDO — o'zgarishni BEKOR qilish (ROLLBACK) va o'qish izchilligi (boshqa sessiyalarga eski versiya) uchun. Undo tablespace'da saqlanadi.

UNDO_RETENTION (sekund) — undo qancha saqlanadi (uzoq so'rov/flashback uchun). Agar kerakli undo qayta yozib yuborilsa, uzoq so'rov 'ORA-01555: snapshot too old' beradi — undo tablespace/retention'ni oshirish yoki so'rovni tezlashtirish kerak.

ARCHIVELOG vs NOARCHIVELOG:
• ARCHIVELOG — to'lgan online redo loglar ARXIVLANADI (nusxalanadi). Bu vaqt bo'yicha (point-in-time) tiklash va ishlab turgan (hot) backup imkonini beradi. Prod tizimlar ARCHIVELOG'da bo'ladi.
• NOARCHIVELOG — arxiv yo'q, faqat oxirgi cold backup'gacha tiklash.
Arxiv qayerga yoziladi: LOG_ARCHIVE_DEST_n (yoki DB_RECOVERY_FILE_DEST — FRA).

DATA GUARD (standby) — asosiy bazaning sinxron nusxasini redo'ni uzatib qo'llash orqali saqlaydi. Ofat/nosozlikda standby'ga failover — uzluksizlik va falokatdan tiklanish.

💡 Yodda tut: redo = "qanday qaytadan bajarish", undo = "qanday orqaga qaytarish". Ikkalasi birga ma'lumot bardoshliligi va izchilligini ta'minlaydi.`,
      en: `REDO vs UNDO — two different purposes:
• REDO — to RE-APPLY changes (crash/media recovery). LGWR writes the redo log buffer to the online redo log files (at COMMIT) — durability.
• UNDO — to REVERSE changes (ROLLBACK) and provide read consistency (old versions to other sessions). Stored in the undo tablespace.

UNDO_RETENTION (seconds) — how long undo is kept (for long queries/flashback). If the needed undo is overwritten, a long query gets 'ORA-01555: snapshot too old' — increase the undo tablespace/retention or speed up the query.

ARCHIVELOG vs NOARCHIVELOG:
• ARCHIVELOG — filled online redo logs are ARCHIVED (copied). This enables point-in-time recovery and hot (online) backups. Production systems run in ARCHIVELOG.
• NOARCHIVELOG — no archiving, restore only to the last cold backup.
Where archives go: LOG_ARCHIVE_DEST_n (or DB_RECOVERY_FILE_DEST — the FRA).

DATA GUARD (standby) — keeps a synchronized copy of the primary by shipping and applying redo. On disaster/failure you fail over to the standby — high availability and disaster recovery.

💡 Remember: redo = "how to re-apply", undo = "how to reverse". Together they give durability and consistency.`,
    },
  },
  jobs: {
    title: { uz: "Job va Scheduler", en: "Jobs & Scheduler" },
    body: {
      uz: `Job — bazada avtomatik, belgilangan vaqt/intervalda ishlaydigan vazifa (tunda statistika, hisobot, tozalash). Zamonaviy Oracle'da DBMS_SCHEDULER bilan boshqariladi (eski DBMS_JOB o'rniga — u kuchliroq: kalendar, chains, windows, resurs rejalari, log).

USTMA-UST BO'LMASLIK: bir xil job o'zi bilan parallel ishlamaydi. Masalan har 5 daqiqada rejalashtirilgan job 10 daqiqa ishlasa — oradagi 5-daqiqalik nuqta o'tkazib yuboriladi; keyingi ishga tushish joriysi tugagach rejalashtiriladi.

PARALLEL: TURLI joblar bir vaqtda ishlashi mumkin. Nechta parallel — JOB_QUEUE_PROCESSES parametri va resurs rejalari bilan cheklanadi (0 bo'lsa joblar umuman ishlamaydi).

IKKINCHI NUSXANI TO'XTATISH: takrorlanuvchi job o'zi bilan ustma-ust ishlamaydi — bu tabiiy himoya. Agar mantiq turli joblardan yoki qo'lda ham chaqirilishi mumkin bo'lsa, DBMS_LOCK bilan qo'shimcha 'lock' qo'yib, ikkinchi nusxa boshlanmasligini kafolatlaysiz.

\`\`\`plsql
DBMS_SCHEDULER.CREATE_JOB(
  job_name   => 'nightly_stats',
  job_type   => 'PLSQL_BLOCK',
  job_action => 'BEGIN gather_stats; END;',
  repeat_interval => 'FREQ=DAILY; BYHOUR=2',
  enabled    => TRUE);
\`\`\`

💡 Yodda tut: "1 job ishlab tursa 2-sini qanday to'xtataman?" — takrorlanuvchi job o'zi ustma-ust ishlamaydi; kafolat kerak bo'lsa DBMS_LOCK.`,
      en: `A job is a task that runs automatically at defined times/intervals in the database (nightly stats, reports, cleanup). In modern Oracle it's managed by DBMS_SCHEDULER (replacing the older DBMS_JOB — it's richer: calendars, chains, windows, resource plans, logging).

NO SELF-OVERLAP: the same job never runs concurrently with itself. E.g. a job scheduled every 5 minutes that runs for 10 minutes — the intervening 5-minute mark is skipped; the next run is scheduled after the current one finishes.

PARALLEL: DIFFERENT jobs can run at the same time. How many is limited by JOB_QUEUE_PROCESSES and resource plans (0 means jobs don't run at all).

STOPPING A SECOND INSTANCE: a repeating job doesn't overlap itself — that's built-in protection. If the same logic can also be triggered from other jobs or manually, add an application lock (DBMS_LOCK) so a second instance can't start.

\`\`\`plsql
DBMS_SCHEDULER.CREATE_JOB(
  job_name   => 'nightly_stats',
  job_type   => 'PLSQL_BLOCK',
  job_action => 'BEGIN gather_stats; END;',
  repeat_interval => 'FREQ=DAILY; BYHOUR=2',
  enabled    => TRUE);
\`\`\`

💡 Remember: "how do I stop a 2nd run while one is running?" — a repeating job never overlaps itself; for a hard guarantee use DBMS_LOCK.`,
    },
  },
  bulk: {
    title: { uz: "Bulk va dinamik SQL", en: "Bulk & dynamic SQL" },
    body: {
      uz: `Qator-ba-qator ishlashning asosiy narxi — PL/SQL va SQL dvigatellari orasidagi KONTEKST ALMASHINUVLARI. Bulk amallar ularni kamaytiradi.

BULK COLLECT — ko'p qatorni bitta amalda kolleksiyaga o'qiydi (har qatorni alohida FETCH o'rniga):
\`\`\`plsql
SELECT * BULK COLLECT INTO l_data FROM employees;
\`\`\`
Katta natija PGA'ni to'ldirishi mumkin — LIMIT bilan porsiyalab o'qing:
\`\`\`plsql
LOOP
  FETCH c BULK COLLECT INTO l_data LIMIT 1000;
  EXIT WHEN l_data.COUNT = 0;
  -- ...
END LOOP;
\`\`\`

FORALL — kolleksiyadagi barcha DML'ni bitta bulk amalda SQL'ga uzatadi (sikl EMAS, faqat DML):
\`\`\`plsql
FORALL i IN 1 .. l_data.COUNT
  INSERT INTO target VALUES (l_data(i).id, l_data(i).name);
\`\`\`
FOR sikl har qatorda kontekst almashtiradi (sekin); FORALL bitta almashinuvda (tez).

DINAMIK SQL — EXECUTE IMMEDIATE ish vaqtida satr sifatidagi SQL/DDL'ni bajaradi (masalan PL/SQL ichida DDL, yoki matni oldindan noma'lum so'rov). Xavf: qiymatlarni ULAB yozish → SQL injection + har safar hard parse. Yechim: BIND o'zgaruvchilar (USING):
\`\`\`plsql
EXECUTE IMMEDIATE 'UPDATE emp SET sal=:1 WHERE id=:2' USING v_sal, v_id;
\`\`\`

💡 Yodda tut: bulk = kam kontekst almashinuvi = tez; dinamik SQL = moslashuvchan, lekin doim bind ishlating.`,
      en: `The main cost of row-by-row processing is the CONTEXT SWITCHES between the PL/SQL and SQL engines. Bulk operations reduce them.

BULK COLLECT — fetches many rows into a collection in one operation (instead of fetching each row):
\`\`\`plsql
SELECT * BULK COLLECT INTO l_data FROM employees;
\`\`\`
A huge result can exhaust the PGA — fetch in batches with LIMIT:
\`\`\`plsql
LOOP
  FETCH c BULK COLLECT INTO l_data LIMIT 1000;
  EXIT WHEN l_data.COUNT = 0;
  -- ...
END LOOP;
\`\`\`

FORALL — sends all DML in a collection to SQL as one bulk operation (NOT a loop, DML only):
\`\`\`plsql
FORALL i IN 1 .. l_data.COUNT
  INSERT INTO target VALUES (l_data(i).id, l_data(i).name);
\`\`\`
A FOR loop switches context per row (slow); FORALL does it in one switch (fast).

DYNAMIC SQL — EXECUTE IMMEDIATE runs SQL/DDL built as a string at run time (e.g. DDL inside PL/SQL, or a query unknown until run time). Risk: concatenating values → SQL injection + a hard parse each time. Fix: BIND variables (USING):
\`\`\`plsql
EXECUTE IMMEDIATE 'UPDATE emp SET sal=:1 WHERE id=:2' USING v_sal, v_id;
\`\`\`

💡 Remember: bulk = fewer context switches = fast; dynamic SQL = flexible, but always bind.`,
    },
  },
  datatypes: {
    title: { uz: "Ma'lumot tiplari", en: "Data types" },
    body: {
      uz: `MATN:
• VARCHAR2 — o'zgaruvchan uzunlik; HAR DOIM shuni ishlating. VARCHAR — hozircha sinonim, lekin Oracle ma'nosini o'zgartirishi mumkin.
• CHAR — qat'iy uzunlik (bo'sh joy bilan to'ldiradi).
• NVARCHAR2 — milliy belgilar to'plami (Unicode/NLS).

KATTA OBYEKTLAR (LOB):
• CLOB — katta MATN (character).
• BLOB — katta IKKILIK (binary): rasm, fayl, PDF.

UZUNLIK: LENGTH — belgilar soni; LENGTHB — baytlar soni. Ko'p baytli charset'da (UTF-8) farq qiladi (bitta belgi bir necha bayt).

ROWID — qatorning JISMONIY manzili (datafile, blok, blokdagi qator). Qatorni topishning eng tez yo'li; indeks aslida rowid saqlaydi. (MOVE'da rowid o'zgaradi.)

ROWNUM vs ROW_NUMBER():
• ROWNUM — psevdo-ustun, qatorlar hosil bo'lgani sari (ORDER BY dan OLDIN) beriladi → saralangan sahifalashda chalkash.
• ROW_NUMBER() — analitik funksiya, ORDER BY dan KEYIN (partition ichida) → reyting/sahifalash uchun ishonchli.
TUZOQ: \`WHERE ROWNUM > 1\` hech qachon qator qaytarmaydi — birinchi qatorga ROWNUM=1 tegishi kerak, u >1 dan o'tmaydi, shuning uchun hech biri raqamlanmaydi.

RAW — ikkilik baytlar (charset o'zgarishisiz). BASE64 (UTL_ENCODE) — ikkilikni ASCII matnga o'girib, matnli kanalda (XML/JSON/email) uzatish uchun.

💡 Yodda tut: satr uchun VARCHAR2, matn LOB uchun CLOB, fayl uchun BLOB; sahifalash uchun ROW_NUMBER().`,
      en: `TEXT:
• VARCHAR2 — variable length; ALWAYS use this. VARCHAR is currently a synonym, but Oracle may change its meaning.
• CHAR — fixed length (space-padded).
• NVARCHAR2 — national character set (Unicode/NLS).

LARGE OBJECTS (LOB):
• CLOB — large TEXT (character).
• BLOB — large BINARY: images, files, PDFs.

LENGTH: LENGTH — number of characters; LENGTHB — number of bytes. They differ in multi-byte charsets (UTF-8), where one character is several bytes.

ROWID — the PHYSICAL address of a row (datafile, block, row in block). The fastest way to find a row; an index stores rowids. (MOVE changes rowids.)

ROWNUM vs ROW_NUMBER():
• ROWNUM — a pseudocolumn assigned as rows are produced (BEFORE ORDER BY) → confusing for sorted paging.
• ROW_NUMBER() — an analytic function applied AFTER ORDER BY (within partitions) → reliable for ranking/paging.
GOTCHA: \`WHERE ROWNUM > 1\` never returns rows — the first row would need ROWNUM=1, which fails > 1, so none ever get numbered.

RAW — binary bytes (no charset conversion). BASE64 (UTL_ENCODE) — encodes binary as ASCII text to travel over text channels (XML/JSON/email).

💡 Remember: VARCHAR2 for strings, CLOB for text LOBs, BLOB for files; ROW_NUMBER() for paging.`,
    },
  },
  modeling: {
    title: { uz: "Modellashtirish: normal form, OLTP/OLAP", en: "Data modeling: normal forms, OLTP/OLAP" },
    body: {
      uz: `NORMALIZATSIYA — ma'lumotni bog'langan jadvallarga bo'lib, takrorlanishni kamaytirish va anomaliyalarni (update/insert/delete) oldini olish. Har fakt bir joyda.

NORMAL FORMALAR (tartib bilan):
• 1NF — ustun qiymatlari ATOMAR (bo'linmas), takror guruh yo'q.
• 2NF — kompozit kalitning BIR QISMIGA qisman bog'liqlik yo'q.
• 3NF — TRANZITIV bog'liqlik yo'q (kalit bo'lmagan ustun boshqa kalit bo'lmaganga bog'liq emas).
Amalda ko'p sxema 3NF gacha normallashtiriladi.

DENORMALIZATSIYA — ataylab takror qo'shib, o'qishni tezlashtirish (join'lar kamayadi) — asosan analitikada.

OLTP vs OLAP:
• OLTP — ko'p kichik tranzaksiya (insert/update), NORMALLASHTIRILGAN sxema, kundalik ilova (buyurtma, mijoz). Biz odatda shu turda ishlaymiz.
• OLAP — katta tarixiy ma'lumot ustidan analitik so'rov, ko'pincha DENORMALLASHTIRILGAN, data warehouse.

DATA WAREHOUSE / STAR SCHEMA — analitika uchun optimallashtirilgan tizim; markazda FAKT jadval (o'lchanadigan qiymatlar), atrofida DIMENSION jadvallar (vaqt, mahsulot, mijoz).

FOREIGN KEY: bola jadval ota'ga FK qiladi. OTA jadvalni o'chirish — bog'langan qator bo'lsa — xato. DROP TABLE parent CASCADE CONSTRAINTS majburan o'chiradi (FK cheklovi olib tashlanadi, bola qatorlar qoladi).

💡 Yodda tut: OLTP = normallashtirilgan, tez yozuv; OLAP = denormallashtirilgan, tez analitika. Star schema = fakt + dimension.`,
      en: `NORMALIZATION — splitting data into related tables to cut redundancy and avoid anomalies (update/insert/delete). Each fact in one place.

NORMAL FORMS (in order):
• 1NF — ATOMIC column values (indivisible), no repeating groups.
• 2NF — no PARTIAL dependency on part of a composite key.
• 3NF — no TRANSITIVE dependency (a non-key column depending on another non-key column).
In practice most schemas are normalized to 3NF.

DENORMALIZATION — deliberately adding redundancy to speed up reads (fewer joins) — mainly in analytics.

OLTP vs OLAP:
• OLTP — many small transactions (insert/update), NORMALIZED schema, day-to-day apps (orders, customers). This is usually what we build.
• OLAP — analytical queries over large historical data, often DENORMALIZED, data warehouses.

DATA WAREHOUSE / STAR SCHEMA — a system optimized for analytics; a central FACT table (measured values) surrounded by DIMENSION tables (time, product, customer).

FOREIGN KEY: a child references a parent via FK. Dropping the PARENT while referenced rows exist → error. DROP TABLE parent CASCADE CONSTRAINTS forces it (removes the FK constraint; child rows remain).

💡 Remember: OLTP = normalized, fast writes; OLAP = denormalized, fast analytics. Star schema = fact + dimensions.`,
    },
  },
};
