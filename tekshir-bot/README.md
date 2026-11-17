# Tekshir — firibgarlikka qarshi Telegram bot

Shubhali havola, xabar yoki faylni botga yuborasiz — bot bir necha soniyada xavf darajasini (✅ / 🟡 / 🔴) aytadi va sodda tilda tushuntiradi.

## Holat
- [x] **1-bosqich:** /start, til tanlash (O'zbek lotin / kirill / Rus), /til, /yordam
- [x] **2-bosqich:** havola tekshiruvi (qoidalar: soxta domen, qisqartirilgan havola, punycode, IP, shubhali oxir)
- [x] **3-bosqich:** Google Safe Browsing va VirusTotal (24 soatlik kesh, limit nazorati, ishlamasa ham bot javob beradi)
- [x] **4-bosqich:** matn tekshiruvi (9 ta firibgarlik guruhi, 3 til, inkor va birikmalar)
- [x] **5-bosqich:** fayl tekshiruvi (APK, .exe, ikki kengaytma, SHA-256 → VirusTotal)
- [ ] 6. Baza va /stats · [ ] 7. Shikoyatlar · [ ] 8. Guruh rejimi · [ ] 9. AI · [ ] 10. Server

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

### Testlar
```bash
npm test
```
Testlar internetga ulanmaydi va token talab qilmaydi.

## Tuzilishi
```
src/bot.js     — asosiy fayl, buyruqlar
src/i18n.js    — tarjimalar (locales/ dan o'qiydi)
locales/       — uz-latn.json, uz-cyrl.json, ru.json
tests/         — avtomatik testlar
```
