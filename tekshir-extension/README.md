# Tekshir — brauzer kengaytmasi (Chrome, Edge, Yandex Browser)

Kompyuterda firibgarlardan himoya. **Hammasi kompyuterning o'zida** tekshiriladi — kengaytma internetga hech narsa yubormaydi.

## Nima qiladi
| | Imkoniyat |
|---|---|
| 🔴 | **Soxta sayt ochilsa — butun ekranli ogohlantirish** (soxta Click, Payme, bank saytlari, `c1ick-uz.com`, `paymee.uz`…). «Orqaga» yoki ikki bosqichli «Baribir ochish». |
| 🟡 | **Shubhali sayt** (IP manzil, yashirin harflar…) — yuqorida sariq chiziq, «Bu saytda ko'rsatmaslik» tugmasi bilan. |
| ✈️ | **Telegram Web va WhatsApp Web** — xabardagi soxta havola yonida 🔴/🟡 belgi; xavfli havola bosilsa — so'raydi. |
| 🔍 | **Oyna (ikonka bosilganda)** — shu sayt natijasi, xabar yoki havolani qo'yib tekshirish, sozlamalar, til (o'zbek/rus). |
| 🖱 | **O'ng tugma** → «🛡 Tekshir: havolani tekshirish» / «matnni tekshirish». |
| ❗ | Ikonkada belgi: `!` (qizil) — xavfli sayt, `?` (sariq) — shubhali. |

Tekshiruv mexanizmi **Telegram botning o'zi** (`tekshir-bot/src`) — `build.js` uni o'zgartirmasdan `engine.js` ga yig'adi. Bot va kengaytma doim bir xil javob beradi (testda tekshiriladi).

## Kompyuterga o'rnatish (sinov uchun)
1. `tekshir-extension.zip` ni oching — `tekshir-extension` papkasi chiqadi.
2. Chrome'da manzil qatoriga yozing: `chrome://extensions` (Edge: `edge://extensions`, Yandex: `browser://extensions`).
3. O'ng yuqorida **Developer mode** (Режим разработчика) ni yoqing.
4. **Load unpacked** (Загрузить распакованное) → `tekshir-extension` papkasini tanlang.
5. Yuqoridagi 🧩 belgisi → Tekshir yonidagi 📌 — ikonka doim ko'rinib tursin.

## Sinab ko'rish
- `https://c1ick-uz.com` yoki `https://paymee.uz` ni oching → 🔴 ogohlantirish (sayt bo'lmasa ham ogohlantirish chiqadi — manzilning o'zi tekshiriladi).
- `https://click.uz` → hech narsa chiqmasligi kerak.
- Ikonkani bosing → `Bank xodimi: kartangiz bloklandi, SMS kodni ayting` → 🔴.
- Istalgan havolada o'ng tugma → «🛡 Tekshir: havolani tekshirish».

## Dasturchi uchun
```bash
npm run build   # bot kodi o'zgarsa — engine.js ni qayta yig'ish
npm test        # bot bilan bir xillik testlari (6 ta)
npm run e2e     # haqiqiy Chromium'da sinov (Playwright kerak)
npm run zip     # do'konga yuklash uchun zip
```

## Maxfiylik
- Faqat ochilgan sahifaning **manzili** tekshiriladi — sahifa ichi, parollar, yozganlaringiz o'qilmaydi.
- Internetga murojaat yo'q (Google/VirusTotal tekshiruvi faqat bot va ilovada).
- Ruxsatlar: `storage` (sozlamalar), `contextMenus` (o'ng tugma), `activeTab` (oynada shu sayt manzili).
- Ogohlantirishni sayt skripti yopolmaydi: yopiq Shadow DOM va faqat haqiqiy (odam) bosishi qabul qilinadi.

## Do'konga chiqarish (keyinroq, ota-ona bilan)
- **Chrome Web Store:** dasturchi hisobi bir martalik **$5** — ota-ona nomidan ochiladi va to'lanadi.
- **Microsoft Edge Add-ons:** bepul.
- Kerak bo'ladi: `npm run zip`, 1280×800 skrinshotlar, maxfiylik siyosati havolasi: `https://tekshir.ah-digital.uz/maxfiylik.html` (kengaytma bo'limi qo'shilgan).
- Ruxsat sababi (do'kon so'raydi): «Content script on all sites checks only the page URL locally to warn about phishing sites impersonating Uzbek banks and payment services. No data leaves the browser.»
