# Tekshir — firibgarlikka qarshi Telegram bot

Shubhali havola, xabar yoki faylni botga yuborasiz — bot bir necha soniyada xavf darajasini (✅ / 🟡 / 🔴) aytadi va sodda tilda tushuntiradi.

## Holat
- [x] **1-bosqich:** /start, til tanlash (O'zbek lotin / kirill / Rus), /til, /yordam
- [ ] 2. Havola tekshiruvi (qoidalar) · [ ] 3. VirusTotal / Safe Browsing · [ ] 4. Matn · [ ] 5. Fayl
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
