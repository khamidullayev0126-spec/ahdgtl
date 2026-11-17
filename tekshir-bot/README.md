# Tekshir — firibgarlikka qarshi Telegram bot

Shubhali havola, xabar yoki faylni botga yuborasiz — bot bir necha soniyada xavf darajasini (✅ / 🟡 / 🔴) aytadi va sodda tilda tushuntiradi.

## Holat
- [x] **1-bosqich:** /start, til tanlash (O'zbek lotin / kirill / Rus), /til, /yordam
- [x] **2-bosqich:** havola tekshiruvi (qoidalar: soxta domen, qisqartirilgan havola, punycode, IP, shubhali oxir)
- [x] **3-bosqich:** Google Safe Browsing va VirusTotal (24 soatlik kesh, limit nazorati, ishlamasa ham bot javob beradi)
- [x] **4-bosqich:** matn tekshiruvi (9 ta firibgarlik guruhi, 3 til, inkor va birikmalar)
- [x] **5-bosqich:** fayl tekshiruvi (APK, .exe, ikki kengaytma, SHA-256 → VirusTotal)
- [x] **6-bosqich:** SQLite baza (til, natijalar, domenlar, kesh), admin uchun /stats va /export
- [x] **7-bosqich:** shikoyatlar (tasdiqlash bilan, 1 odam — 1 shikoyat, kuniga 20 ta) va telefon/karta raqamlarini tekshirish
- [ ] 8. Guruh rejimi · [ ] 9. AI · [ ] 10. Server

## Kompyuterda ishga tushirish

### 1. Bot tokenini olish (BotFather)
1. Telegram'da **@BotFather** ni oching → `/newbot`.
2. Bot nomini yozing, masalan: `Tekshir`.
3. Username yozing — oxiri `bot` bilan tugashi shart, masalan: `tekshir_uz_bot` (band bo'lsa boshqasini o'ylang).
4. BotFather token beradi: `1234567890:AAH...` — **bu parol kabi**, hech kimga bermang, GitHub'ga yuklamang.

### 2. Loyihani sozlash
```bash
cd tekshir-bot
npm install
cp .env.example .env
```
`.env` faylini oching va `BOT_TOKEN=` dan keyin tokenni yozing.

### 3. Ishga tushirish
```bash
npm start
```
Terminalda `✅ @sizning_bot ishga tushdi` chiqadi. Telegram'da botingizni oching → `/start`.

### Tashqi xizmat kalitlari (ixtiyoriy, lekin tavsiya etiladi)
Kalitlarni faqat `.env` ga yozing. Kalit bo'lmasa, bot qoidalar bilan ishlayveradi.

**VirusTotal** (bepul: daqiqasiga 4, kuniga 500 so'rov)
1. virustotal.com → **Sign up** → emailni tasdiqlang.
2. O'ng yuqorida profil → **API key** → nusxalang.
3. `.env`: `VIRUSTOTAL_KEY=...`

**Google Safe Browsing** (bepul)
1. console.cloud.google.com → yangi loyiha yarating (masalan `tekshir-bot`).
2. **APIs & Services → Library** → «Safe Browsing API» → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key** → nusxalang.
4. Kalitni cheklang: **Edit API key → API restrictions → Safe Browsing API**.
5. `.env`: `SAFE_BROWSING_KEY=...`

Eslatma: Safe Browsing Lookup API notijorat foydalanish uchun. Loyiha tijoriy bo'lsa — Google **Web Risk API** ga o'tish kerak.

### Admin buyruqlari (/stats, /export)
1. O'z Telegram ID'ingizni biling: Telegram'da **@userinfobot** ga `/start` yozing — `Id: 123456789` chiqadi.
2. `.env`: `ADMIN_IDS=123456789` (bir nechta bo'lsa vergul bilan).
3. Botni qayta ishga tushiring. Endi:
   - `/stats` — foydalanuvchilar, tekshiruvlar, xavfli domenlar
   - `/export` — oxirgi 30 kunlik natijalar CSV faylda (Excel'da ochiladi); `/export 7` — 7 kunlik

Boshqa foydalanuvchilar bu buyruqlarni yozsa, bot javob bermaydi.

### Baza va maxfiylik
Baza fayli: `data/tekshir.db` (GitHub'ga yuklanmaydi). Unda saqlanadi: Telegram ID, til, tekshiruv natijasi (daraja, ball, sabab kodlari) va faqat **domen** nomi.
**Saqlanmaydi:** xabar matni, to'liq havola, fayl, telefon va karta raqamlari (ular 7-bosqichda faqat SHA-256 hash ko'rinishida saqlanadi).

### Raqamlar va shikoyatlar (HASH_SALT)
Telefon va karta raqamlari bazada **ochiq saqlanmaydi** — faqat SHA-256 + maxfiy "tuz" (salt) ko'rinishida.
1. Terminalda tasodifiy tuz yarating: `openssl rand -hex 32`
2. `.env`: `HASH_SALT=...` (chiqqan uzun qatorni qo'ying)
3. **Muhim:** HASH_SALT ni keyin O'ZGARTIRMANG va yo'qotmang — aks holda eski shikoyatlar topilmay qoladi. Uni parol kabi saqlang.

HASH_SALT bo'lmasa, bot ishlayveradi, faqat raqam tekshiruvi va shikoyatlar o'chiq bo'ladi.

Bot hech qachon "bu odam firibgar" demaydi — faqat **shikoyatlar sonini** ko'rsatadi. Shikoyatning o'zi hech qachon 🔴 bermaydi (eng ko'pi 🟡).

### Testlar
```bash
npm test
```
Testlar internetga ulanmaydi va token talab qilmaydi.

## Tuzilishi
```
src/bot.js     — asosiy fayl, buyruqlar
src/i18n.js    — tarjimalar (locales/ dan o'qiydi)
src/db.js      — SQLite baza (6-bosqich)
src/admin.js   — /stats matni, adminni tekshirish
src/checkers/  — havola, tashqi API, matn, fayl tekshiruvlari
locales/       — uz-latn.json, uz-cyrl.json, ru.json
tests/         — avtomatik testlar
```
