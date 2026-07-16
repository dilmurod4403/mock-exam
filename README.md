# JSA Mock Exam Bot 🤖

OpenEDG **JS Institute** sertifikatlariga tayyorgarlik uchun Telegram bot.
Savol matni ingliz tilida (haqiqiy imtihon kabi), tushuntirishlar **o'zbekcha yoki inglizcha** (foydalanuvchi tanlaydi).

## Oqim (foydalanuvchi tajribasi)

`/start` → **til** (🇺🇿 O'zbek / 🇬🇧 English) → **dasturlash tili** (JavaScript / Oracle SQL & PL/SQL) → **sertifikat darajasi** → **rejim** (imtihon / test / mavzu / xatolar ustida ishlash / daraja baholash) → savollar.

## Imkoniyatlar

- Ikki tilli interfeys va tushuntirishlar (uz / en)
- Ko'p dasturlash tili — har biri o'z mavzulari va sertifikat darajalariga ega:
  - **JavaScript:** JSE (Entry) · JSA (Associate) · JSP (Professional — OOP, async, closure/ES6+)
  - **Oracle SQL & PL/SQL:** 1Z0-071 (Oracle SQL) · 1Z0-149 (PL/SQL Developer) · 🔥 Oracle DBA / Interview (tranzaksiya, lock/deadlock, arxitektura/xotira, optimizatsiya)
- `/exam` — to'liq mock imtihon (40 savolgacha, 70% o'tish balli)
- `/quiz` — tezkor mashq (10 savol)
- `/learn` — **mini-dars** ("avval o'rgan"): tanlangan darajaga mos mavzular bo'yicha
  ikki tilli konspekt + kod misoli, so'ng "shu mavzuni mashq qilish" tugmasi.
  Oracle DBA / Interview darajasida — batafsil DBA tayyorgarlik darslari
- `/topic` — mavzu bo'yicha mashq
- `/review` — **xatolar ustida ishlash**: avval noto'g'ri yechilgan savollarni qayta beradi
  (to'g'ri qayta yechilgan savol ro'yxatdan chiqadi)
- `/grade` — **daraja baholash** (adaptiv): savol qiyinligi javobingizga moslashadi va
  sizni kompetensiya narvoniga joylashtiradi — 🌱 Trainee → 🟢 Junior → Strong Junior →
  🔵 Middle → Middle+ → 🟣 Senior → Senior+/Lead. Yakunda daraja kartasi: daraja,
  qiyinlik bo'yicha natija, kuchli/zaif mavzular va keyingi darajaga yo'l
- Har javobdan keyin tanlangan tildagi izoh
- Yakunda natija: ball, foiz, o'tdi/o'tmadi, vaqt, **mavzu bo'yicha aniqlik** va
  **xatolar tahlili** (har xato savol + to'g'ri javob + izoh)
- Foydalanuvchi sozlamalari va javob tarixi **saqlanadi** (deploy'dan keyin ham) —
  `DATA_DIR` papkasidagi JSON faylda
- Bir nechta to'g'ri javobli savollarni qo'llab-quvvatlaydi

## O'rnatish

```bash
npm install
```

## Bot token olish

1. Telegram'da [@BotFather](https://t.me/BotFather) ni oching
2. `/newbot` yozing, bot nomi va username bering
3. U bergan **tokenni** nusxalang
4. `.env` fayl yarating:

```bash
cp .env.example .env
# .env ichiga tokenni qo'ying
```

## Ishga tushirish

```bash
npm start        # botni ishga tushiradi
npm run dev      # o'zgarishlarni avtomatik kuzatib turadi
npm run check    # savol bankini xatolarga tekshiradi
```

Bot ishga tushgach, Telegram'da botingizga `/start` yozing.

## Yangi savol qo'shish

Savollar dasturlash tili bo'yicha papkalarga ajratilgan: `src/questions/<til>/*.json`
(masalan `src/questions/javascript/`, `src/questions/plsql/`). Papka nomi savolning
dasturlash tilini bildiradi. Format:

```json
{
  "id": "vars-24",
  "topic": "variables",
  "difficulty": "medium",
  "question": "What is the output?\n\n```js\nconsole.log(...);\n```",
  "options": ["A variant", "B variant", "C variant", "D variant"],
  "correct": [0],
  "explanation": {
    "uz": "O'zbekcha tushuntirish.",
    "en": "English explanation."
  }
}
```

- `topic` — mavzu kodi (til katalogiga qarab). JS: `intro`, `variables`, ...; PL/SQL: `blocks`, `control`, `cursors`, `exceptions`, `subprograms`, `triggers`, `collections`. Ro'yxat: `src/data.js` → `PROG_LANGS`
- `difficulty` — `easy` / `medium` / `hard`. JS'da JSE darajasi `easy`+`medium` savollardan iborat
- `correct` — to'g'ri variant(lar) indeksi (0 dan boshlanadi). Bir nechta bo'lsa: `[0, 2]`
- `explanation` — **ikki tilda**: `{ "uz": "...", "en": "..." }` (ikkalasi ham majburiy)
- `levels` — savol qaysi sertifikat darajalariga tegishli (masalan `["1Z0-149"]` yoki JS uchun `["JSP"]`). Darajalar `PROG_LANGS` da belgilangan
- Savol matnida kod bloklarini <code>```js ... ```</code> yoki <code>```sql ... ```</code> ichiga oling

Qo'shgach `npm run check` bilan tekshiring.

## Railway'ga deploy qilish 🚂

Bot doim onlayn turishi uchun Railway'ga joylashtiramiz. Ikki yo'l bor:

### A yo'li — GitHub orqali (tavsiya etiladi)

1. Loyihani GitHub'ga yuklang (repozitoriy yarating va push qiling)
2. [railway.app](https://railway.app) ga kiring → **New Project** → **Deploy from GitHub repo**
3. Repozitoriyni tanlang. Railway `railway.json` va `package.json` ni o'zi topib build qiladi
4. **Variables** bo'limiga o'ting va o'zgaruvchi qo'shing:
   - `TELEGRAM_BOT_TOKEN` = @BotFather bergan token
5. Deploy avtomatik boshlanadi. **Deploy Logs** da `✅ Bot ishladi` ni ko'rasiz

### B yo'li — Railway CLI orqali

```bash
npm i -g @railway/cli
railway login
railway init            # yangi proyekt yaratadi
railway variables set TELEGRAM_BOT_TOKEN=SIZNING_TOKEN
railway up              # kodni yuklaydi va deploy qiladi
```

### Ma'lumot saqlash (Volume) 💾

Sozlamalar va javob tarixi `DATA_DIR` (standart `./data`) ichidagi `store.json` da saqlanadi.
Railway konteyner fayl tizimi **o'tkinchi** — har deploy'da o'chadi. Saqlanib qolishi uchun:

1. Railway'da xizmatga **Volume** ulang (masalan mount yo'li `/data`)
2. **Variables** ga qo'shing: `DATA_DIR=/data`

Volumesiz ham bot ishlaydi, lekin har deploy'da foydalanuvchilar qaytadan sozlanadi va
xatolar tarixi yo'qoladi.

### Muhim eslatmalar

- Bu bot **long-polling** ishlatadi — web-port kerak emas, shuning uchun Railway'da
  domen/port sozlamasi shart emas.
- **Faqat bitta nusxa** ishlashi kerak. Telegram bir vaqtda bitta poller'ga ruxsat
  beradi — shuning uchun lokalda `npm start` ni to'xtatgach Railway'ga qo'ying
  (ikkalasi birga ishlasa `409 Conflict` xatosi chiqadi).
- Tokenni hech qachon kodga yozmang — faqat Railway Variables yoki `.env` da saqlang
  (`.env` git'ga kirmaydi).
```
