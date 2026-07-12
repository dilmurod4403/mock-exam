# JSA Mock Exam Bot 🤖

OpenEDG **JS Institute** sertifikatlariga tayyorgarlik uchun Telegram bot.
Savol matni ingliz tilida (haqiqiy imtihon kabi), tushuntirishlar **o'zbekcha yoki inglizcha** (foydalanuvchi tanlaydi).

## Oqim (foydalanuvchi tajribasi)

`/start` → **til** (🇺🇿 O'zbek / 🇬🇧 English) → **dasturlash tili** (JavaScript / PL/SQL; Python tez orada) → **sertifikat darajasi** → **rejim** (imtihon / test / mavzu) → savollar.

## Imkoniyatlar

- Ikki tilli interfeys va tushuntirishlar (uz / en)
- Ko'p dasturlash tili — har biri o'z mavzulari va sertifikat darajalariga ega:
  - **JavaScript:** JSE (Entry) · JSA (Associate) · JSP (Professional — OOP, async, closure/ES6+)
  - **PL/SQL:** 1Z0-149 (PL/SQL Developer, to'liq) · 1Z0-071 (Oracle SQL — tez orada)
  - **Python:** tez orada
- `/exam` — to'liq mock imtihon (40 savolgacha, 70% o'tish balli)
- `/quiz` — tezkor mashq (10 savol)
- `/topic` — mavzu bo'yicha mashq
- Har javobdan keyin tanlangan tildagi izoh
- Yakunda natija: ball, foiz, o'tdi/o'tmadi, sarflangan vaqt
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

### Muhim eslatmalar

- Bu bot **long-polling** ishlatadi — web-port kerak emas, shuning uchun Railway'da
  domen/port sozlamasi shart emas.
- **Faqat bitta nusxa** ishlashi kerak. Telegram bir vaqtda bitta poller'ga ruxsat
  beradi — shuning uchun lokalda `npm start` ni to'xtatgach Railway'ga qo'ying
  (ikkalasi birga ishlasa `409 Conflict` xatosi chiqadi).
- Tokenni hech qachon kodga yozmang — faqat Railway Variables yoki `.env` da saqlang
  (`.env` git'ga kirmaydi).
```
