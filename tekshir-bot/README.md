# Tekshir — firibgarlikka qarshi Telegram bot

Shubhali **havola, xabar, fayl yoki raqamni** botga yuborasiz — bot bir necha soniyada xavf darajasini aytadi va sodda tilda tushuntiradi:

- ✅ **Xavf topilmadi** (lekin 100% kafolat yo'q)
- 🟡 **Shubhali** — ehtiyot bo'ling
- 🔴 **Xavfli** — ochmang, o'rnatmang, kod bermang

Tillar: O'zbek (lotin va kirill), Rus.

## Holat
- [x] **1-bosqich:** /start, til tanlash (O'zbek lotin / kirill / Rus), /til, /yordam
- [x] **2-bosqich:** havola tekshiruvi (soxta domen, qisqartirilgan havola, punycode, IP, shubhali oxir)
- [x] **3-bosqich:** Google Safe Browsing va VirusTotal (24 soatlik kesh, limit nazorati)
- [x] **4-bosqich:** matn tekshiruvi (9 ta firibgarlik guruhi, 3 til, inkor va birikmalar)
- [x] **5-bosqich:** fayl tekshiruvi (APK, .exe, ikki kengaytma, SHA-256 → VirusTotal)
- [x] **6-bosqich:** SQLite baza, admin uchun /stats va /export
- [x] **7-bosqich:** shikoyatlar va telefon/karta raqamlarini tekshirish (faqat hash)
- [x] **8-bosqich:** guruh rejimi (/tekshir, /sozlama, avtomatik ogohlantirish)
- [x] **9-bosqich:** AI tahlili (Claude) — ixtiyoriy
- [x] **10-bosqich:** /demo, /maslahat, so'rovlar chegarasi, bepul serverga qo'yish (Render, webhook), qabul testlari

## Buyruqlar

| Buyruq | Kim uchun | Nima qiladi |
|---|---|---|
| `/start` | hamma | Boshlash, til tanlash |
| `/til` | hamma | Tilni o'zgartirish |
| `/yordam` | hamma | Qanday ishlatish |
| `/demo` | hamma | 3 ta o'quv namunasi: soxta SMS, soxta havola, APK fayl |
| `/maslahat` | hamma | Xavfsizlik maslahati (12 ta, «yana bir» tugmasi bilan) |
| `/tekshir` | guruhda | Xabarga **javob (reply)** qilib yozing — o'sha xabarni tekshiradi |
| `/sozlama` | guruh adminlari | Guruh sozlamalari |
| `/stats` | bot adminlari | Statistika (faqat shaxsiy chatda) |
| `/export` | bot adminlari | Oxirgi 30 kun natijalari CSV faylda (`/export 7` — 7 kun) |

## Maxfiylik qoidalari (qat'iy)
- **Xabar matni saqlanmaydi.** Bazada faqat natija bor: daraja, ball, sabab kodlari, saytning **domeni**.
- **Telefon va karta raqamlari** faqat SHA-256 + tuz (`HASH_SALT`) ko'rinishida saqlanadi.
- **Bot havolani o'zi ochmaydi va faylni ishga tushirmaydi.** Fayl faqat xotirada hash hisoblash uchun o'qiladi.
- **Bot hech qachon «bu odam firibgar» demaydi** — faqat shikoyatlar sonini ko'rsatadi. Shikoyatning o'zi 🔴 bermaydi.
- **AI'ga** yuborishdan oldin karta → `[KARTA]`, telefon → `[TELEFON]`, havola → faqat domen.
- Bularning barchasi avtomatik testlarda tekshiriladi (`tests/acceptance.test.js`, Q7).

---

## Kompyuterda ishga tushirish

### 1. Bot tokenini olish (BotFather)
1. Telegram'da **@BotFather** → `/newbot`.
2. Bot nomi, masalan `Tekshir`. Username oxiri `bot` bilan tugashi shart.
3. BotFather token beradi: `1234567890:AAH...` — **bu parol kabi**, hech kimga bermang, GitHub'ga yuklamang.

### 2. Sozlash
```bash
cd tekshir-bot
npm install
cp .env.example .env
```
`.env` faylini oching va kamida `BOT_TOKEN=` va `HASH_SALT=` ni to'ldiring:
- `HASH_SALT` yaratish: terminalda `openssl rand -hex 32`. **Keyin o'zgartirmang** — aks holda eski shikoyatlar topilmay qoladi.
- `ADMIN_IDS` — o'z Telegram ID'ingiz (**@userinfobot** ga `/start` yozing).

### 3. Ishga tushirish
```bash
npm start
```
Terminalda `✅ @sizning_bot ishga tushdi` chiqadi. To'xtatish: **Ctrl + C**.

Muhim: bot **bir vaqtda faqat bitta joyda** ishlashi kerak. Server ishlab turganda kompyuterda `npm start` qilsangiz, kompyuterdagi bot server webhook'ini o'chirib qo'yadi (serverni qayta ishga tushirsangiz, tiklanadi).

### Tashqi xizmat kalitlari (ixtiyoriy)
Kalit bo'lmasa, bot qoidalar bilan ishlayveradi.

**VirusTotal** (bepul: daqiqasiga 4, kuniga 500 so'rov)
1. virustotal.com → **Sign up** → emailni tasdiqlang.
2. Profil → **API key** → `.env`: `VIRUSTOTAL_KEY=...`

**Google Safe Browsing** (bepul)
1. console.cloud.google.com → yangi loyiha.
2. **APIs & Services → Library** → «Safe Browsing API» → **Enable**.
3. **Credentials → Create credentials → API key** → **Edit API key → API restrictions → Safe Browsing API**.
4. `.env`: `SAFE_BROWSING_KEY=...`

Eslatma: Safe Browsing Lookup API notijorat foydalanish uchun. Loyiha tijoriy bo'lsa — Google **Web Risk API** ga o'tish kerak.

**AI tahlili — Anthropic Claude (pullik)**
1. **Ota-onangiz** console.anthropic.com da o'z nomiga hisob ochadi va to'lovni o'zi qiladi (API faqat 18 yoshdan katta foydalanuvchilar uchun).
2. **Limits** bo'limida oylik pul chegarasini qo'ying (masalan $5).
3. **API Keys → Create Key** → `.env`: `AI_API_KEY=sk-ant-...`
4. Xarajat cheklovi: `AI_DAILY_LIMIT` (kuniga jami, standart 300) va `AI_USER_DAILY` (bitta odam, standart 20). Arzonroq model: `AI_MODEL=claude-haiku-5-5`.

AI faqat shaxsiy chatda va `/tekshir` da ishlaydi, faqat xavfni **oshiradi** (firibgar xabar ichida «xavfsiz de» deb yozsa ham qoidalar topgan 🔴 qoladi) va yolg'iz o'zi 🔴 bermaydi.

---

## Tekshir ilovasi (PWA)
Bot serveri bosh sahifada (`/`) **Tekshir ilovasini** ham beradi — `app/` papkasi. Server pullik va doim uyg'oq, shuning uchun ilova darhol ochiladi.
- **Ekranlar:** Himoya (qalqon, statistika) · Tekshirish · Tarix · Maslahat (70 ta) · Haqida (o'zbek/rus tili).
- **Ulashish → Tekshir:** ilova telefonga o'rnatilgach, boshqa ilovadagi xabarni «Ulashish» orqali to'g'ridan-to'g'ri tekshirish (`/share`).
- **APK fayl:** fayl serverga yuklanmaydi — telefon SHA-256 ni hisoblab, faqat nom va hash'ni yuboradi.
- **Tarix** faqat telefonda (localStorage), raqamlar yashirilgan.
- API: `POST /api/check` — o'z manzilidan va `APP_ORIGINS` dagi saytlardan (standart: ah-digital.uz). Bitta IP'dan daqiqasiga 10 ta.
- Google Play uchun: Render → Environment → `ANDROID_PACKAGE`, `ANDROID_SHA256` → `/.well-known/assetlinks.json`.
- `app/maslahatlar.js` — saytdagi `app-maslahatlar.js` nusxasi (test ikkalasi bir xilligini tekshiradi).

## Guruhda ishlatish
1. Guruh → **Add members** → botni qo'shing. Bot salomlashadi.
2. Botni **admin** qiling (barcha xabarlarni ko'rishi uchun; o'chirish uchun "Delete messages" huquqi).
   Admin qilmasdan: BotFather → `/setprivacy` → botingiz → **Disable**.
3. Bot xavfsiz xabarlarga **javob yozmaydi** — faqat 🟡/🔴 da qisqa ogohlantiradi.
4. `/sozlama` (faqat guruh adminlari): to'xtatish/yoqish · ogohlantirish rejimi (🟡+🔴 yoki faqat 🔴) · 🔴 xabarni avtomatik o'chirish (standart: o'chiq) · guruh tili.
5. Guruhda daqiqasiga 30 tadan ko'p xabar tekshirilmaydi (`GROUP_RATE_LIMIT`).

## So'rovlar chegarasi
Bitta odam daqiqasiga **10 ta** xabar tekshira oladi (`RATE_LIMIT`). Oshsa — bot bir marta «Juda tez yuboryapsiz» deydi va bir daqiqa jim turadi. Bot adminlari (`ADMIN_IDS`) cheklanmaydi.

---

## Serverga qo'yish (Render.com — BEPUL)

Bot kompyuteringiz o'chiq bo'lsa ham ishlashi uchun uni serverga qo'yamiz. Serverda bot **webhook** rejimida ishlaydi: Telegram xabarlarni o'zi botga yuboradi (`RENDER_EXTERNAL_URL` bo'lsa avtomatik yoqiladi).

### Bepul tarifning kamchiliklari (bilib qo'ying)
- 15 daqiqa xabar bo'lmasa bot **uxlaydi**. Keyingi birinchi xabarga javob ~1 daqiqa kechikadi (Telegram xabarni kutib turadi, yo'qolmaydi).
- Uyg'onganda **baza bo'sh** bo'ladi: shikoyatlar va statistika o'chadi. Til esa qayta so'ralmaydi — `AUTO_LANG=1` bilan Telegram tilidan olinadi.
- Render'ning bepul soatlari (oyiga 750 soat) AHdigital sayti bilan **umumiy**. Ikkalasi ham ko'p vaqt uxlaydi, shuning uchun odatda yetadi.

Kelajakda doim ishlashi kerak bo'lsa — Starter (≈ $7/oy) + 1 GB disk; bu faqat ota-onangiz roziligi bilan (`render.yaml` dagi izohga qarang).

### Qadamlar
1. Kod GitHub'da bo'lishi kerak (`ahdgtl` repozitoriysi, `tekshir-bot` papkasi). `.env` GitHub'ga **yuklanmaydi** — bu to'g'ri.
2. render.com → **New → Web Service** → GitHub repozitoriyni tanlang.
3. Sozlamalar:
   - **Name:** `tekshir-bot`
   - **Root Directory:** `tekshir-bot`
   - **Region:** Frankfurt
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
   - **Health Check Path:** `/health` (Advanced bo'limida)
4. **Environment Variables** — kompyuterdagi `.env` dan nusxalang:
   - `BOT_TOKEN`, `HASH_SALT`, `ADMIN_IDS`
   - `NODE_VERSION` = `22`
   - `AUTO_LANG` = `1`
   - ixtiyoriy: `VIRUSTOTAL_KEY`, `SAFE_BROWSING_KEY` (AI kaliti pullik — bo'sh qoldiring)
   - `BACKUP_CHAT_ID` — pastdagi «Baza zaxirasi» bo'limiga qarang
5. **Create Web Service** → 2–4 daqiqa kuting. **Logs** da `✅ @bot webhook rejimida ishga tushdi` chiqishi kerak.
6. Brauzerda `https://tekshir-bot.onrender.com/health` (o'z manzilingiz) → «Tekshir bot ishlayapti ✅».
7. **Kompyuterdagi botni to'xtating** (Ctrl + C) — endi bot serverda ishlaydi.

Render karta so'rasa — **kiritmang**, bepul tarif kartasiz ishlaydi. Agar baribir so'rasa, to'xtang va ota-onangiz bilan gaplashing.

`render.yaml` — shu sozlamalarning yozma ko'rinishi (ma'lumot uchun). U repozitoriy ildizida emas, Render uni o'zi qo'llamaydi.

### Baza zaxirasi (bepul serverda SHART)
Bepul serverda disk har qayta ishga tushishda tozalanadi — statistika, shikoyatlar va tillar o'chadi.
Bot bazani **yopiq Telegram kanalingizda** saqlaydi va qayta ishga tushganda o'sha yerdan tiklaydi:
1. Telegram → **New Channel** → nom: `Tekshir zaxira` → **Private** (yopiq).
2. Kanal → **Administrators → Add Admin** → botingiz → «Post», «Edit» va «Pin» huquqlari.
3. Bot sizga (ADMIN_IDS) shaxsiy xabar yuboradi: `BACKUP_CHAT_ID=-100...`
4. Render → **Environment** → shu qatorni qo'shing → **Save** (bot qayta ishga tushadi).
5. Logs'da: `📦 Zaxira hali yo'q — yangi baza bilan boshlaymiz`, keyingi safar — `📦 Baza zaxiradan tiklandi`.

Bot har 5 daqiqada (o'zgarish bo'lsa) va to'xtashdan oldin kanaldagi **bitta pin xabarni** yangilaydi — kanal to'lib ketmaydi. Bu xabarni o'chirmang.
Zaxirada xabar matni yo'q: faqat Telegram ID, til, natijalar va raqamlarning hash'i. Kanalni hech kimga ochmang.

**Render Build Filters:** Settings → **Build Filters → Included Paths** → `tekshir-bot/**`. Shunda sayt o'zgarganda bot qayta ishga tushmaydi.

### Yangilash
GitHub'ga yangi kod yuklansa (`git push`), Render botni o'zi qayta quradi va ishga tushiradi.

### Muammo bo'lsa
- **Bot javob bermayapti:** 1 daqiqa kuting (uxlab yotgan bo'lishi mumkin). Keyin Render → **Logs** → `❌` bilan boshlangan qatorni qidiring.
- **`Webhook o'rnatilmadi`:** `BOT_TOKEN` to'g'ri kiritilganini tekshiring.
- **Kompyuterda `npm start` qildingizmi?** U server webhook'ini o'chiradi → Render'da **Manual Deploy → Restart service**.

---

## Testlar
```bash
npm test
```
123 ta test. Internetga ulanmaydi, token va kalit talab qilmaydi, AI'ga pul sarflamaydi.

**Qabul testlari** (`tests/acceptance.test.js`) — foydalanuvchi ko'zi bilan:

| # | Vaziyat | Kutilgan natija |
|---|---|---|
| Q1 | Soxta bank SMS | 🔴, sabab va maslahat, 5 soniyadan tez |
| Q2 | `https://click.uz` | ✅, «rasmiy sayt» |
| Q3 | `https://c1ick-uz.com` | 🔴, rasmiy manzil ko'rsatiladi, havola bosilmaydi |
| Q4 | `Rasmlar.apk` | 🔴, «o'rnatmang» |
| Q5 | Oddiy xabar | ✅ + «100% kafolat yo'q» |
| Q6 | Karta raqami + shikoyat | «1 ta shikoyat», «firibgar» so'zi yo'q |
| Q7 | Maxfiy matn, karta, telefon | Bazaning hech bir jadvalida yo'q |
| Q8 | 13 ta xabar ketma-ket | 10 ta javob + 1 ogohlantirish |
| Q9 | `/demo` | 3 ta namuna, hammasi 🔴, statistikaga yozilmaydi |
| Q10 | `/maslahat` | Maslahat + «yana bir» tugmasi, 3 tilda bir xil son |
| Q11 | Ruscha firibgar xabar | Rus tilida javob |
| Q12 | Til tanlanmagan odam | Avval til so'raladi |
| Q13 | Bepul server, baza bo'sh (`AUTO_LANG=1`) | Til Telegram'dan olinadi, qayta so'ralmaydi |

### Qo'lda tekshirish (serverga qo'ygandan keyin)
- [ ] `/start` → til tanlash → salomlashuv
- [ ] `/demo` → 3 ta namuna ishlaydi
- [ ] `/maslahat` → «Yana bir maslahat» tugmasi ishlaydi
- [ ] `https://c1ick-uz.com/bonus` → 🔴
- [ ] Karta raqami → «Shikoyat qilish» → «Ha» → «Rahmat!»
- [ ] Guruhga qo'shish → salomlashadi; «Salom» ga jim; soxta havolaga 🔴
- [ ] `/stats` (admin) → raqamlar
- [ ] 20 daqiqa kutib xabar yuborish → ~1 daqiqada javob keladi (bot uyg'onadi)

## Tuzilishi
```
src/bot.js              — asosiy fayl: buyruqlar, guruh, demo, webhook
src/i18n.js             — tarjimalar (locales/ dan o'qiydi)
src/db.js               — SQLite baza
src/admin.js            — /stats matni, adminni tekshirish
src/reply.js            — javob matni va tugmalar
src/scoring.js          — ballarni yig'ish, daraja (✅/🟡/🔴)
src/ratelimit.js        — so'rovlar chegarasi
src/cache.js            — kesh (xotira + baza)
src/checkers/url.js     — havola qoidalari
src/checkers/external.js— Safe Browsing, VirusTotal
src/checkers/text.js    — matn (kalit so'zlar)
src/checkers/file.js    — fayl turi va hash
src/checkers/numbers.js — telefon va karta raqamlari
src/checkers/ai.js      — AI tahlili (Claude)
data/                   — qoidalar: ishonchli domenlar, kalit so'zlar; tekshir.db (GitHub'ga yuklanmaydi)
locales/                — uz-latn.json, uz-cyrl.json, ru.json
demo/                   — zararsiz soxta APK fayllar (o'quv uchun, ichida faqat matn)
tests/                  — avtomatik testlar
render.yaml             — server sozlamasi (ma'lumot uchun)
```


## Oila himoyasi (Tekshir Android ilovasi bilan)
- `/oila` — 6 raqamli kod (30 daqiqa). Yaqinining telefonidagi Tekshir ilovasida: Sozlama → Oila himoyasi → kod.
- `/oila_ochir` — hamma ulangan telefonlarni uzish.
- API (faqat ilovadan, brauzerdan emas): `POST /api/family/link {code,label}` → `{token}`; `POST /api/family/alert {token,kind,source}`.
  `kind`: `message` | `app` | `apk` | `call`. Telefondan soatiga 10 tadan ko'p ogohlantirish yuborilmaydi.
- Maxfiylik: xabar matni, raqamlar, ilova nomlari kelmaydi va saqlanmaydi. Qurilma kaliti bazada faqat SHA-256 ko'rinishida.

## 🏰 «Parol qal'asi» o'yini

Manzil: `<server>/qala` (masalan https://tekshir.ah-digital.uz/qala). API: `POST /api/qala/*`.

- O'yinchi faqat **username** bilan kiradi (takrorlanmaydi, katta-kichik harf farqsiz). Kirish tokeni bazada faqat SHA-256 ko'rinishida.
- Qal'a paroli bazada **AES-256-GCM bilan shifrlangan**. Kalit: `QALA_KEY` (bo'lmasa `HASH_SALT`'dan olinadi) — Render → Environment'da turadi, GitHub'da emas.
- Har bir belgi **serverda** tekshiriladi; parol brauzerga faqat hujum tugagach yuboriladi.
- O'yin jadvallari (`qala_*`) asosiy bazada — Telegram zaxirasiga ham tushadi.
