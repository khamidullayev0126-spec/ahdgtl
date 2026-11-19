# 🎁 Dadamga syurpriz — nimalar qo'shildi (hozircha SIR!)

> Abdulhamid dadasiga aytgan: «Tekshir bot va AHdigital ilovaga yangiliklar kiritayapman — bular sirli bo'lsin, oxirida aytaman».
> Bu fayl — shu yangiliklar ro'yxati. Har yangi ish qo'shilganda shu yerga yoziladi. Oxirida dadamga shu ro'yxat bilan ko'rsataman.
> (Fayl saytda ko'rinmaydi — `kontent/` papkasi yashirin.)

## Dadam allaqachon biladi (sir emas)
- Tekshir bot serverini pullik tarifga o'tkazdik ($7/oy + disk) — dadam to'lagan.
- Google Play dasturchi hisobi ($25) — dadam nomiga ochiladi.

## 🤫 Sirli yangiliklar

### Tekshir bot
- [x] **Doim uyg'oq va tez** — javob 1 soniyada, keyin Google/VirusTotal natijasi bilan xabar o'zi yangilanadi.
- [x] **Statistika o'chmaydi** — baza doimiy diskda.
- [x] **Yangi `/stats`**: kunlik o'sish grafigi, odamlar qayerdan kelgani (kanal, QR, sayt, do'sti ulashgan), eng faol soatlar, bot ishlayotgan guruhlar. Ism saqlanmaydi.
- [x] **Belgili havolalar va QR kod** (`?start=qr`, `?start=kanal`…) — qaysi reklama ishlaganini bilish uchun.
- [x] **Ilovalar uchun API** — Tekshir endi faqat Telegram'da emas, ilovalarda ham ishlaydi.

### AHdigital ilovasi — yangi «Foydali» bo'limi
- [x] **🛡 Firibgarlikni tekshirish** — SMS, havola yoki APK faylni tekshiradi (fayl internetga yuklanmaydi).
- [x] **🔳 QR kod yasagich** — menyu, Wi-Fi, telefon, havola uchun; rasmini saqlash va ulashish.
- [x] **💡 70 ta maslahat, 7 yo'nalishda** (har biri 10 tadan) — firibgarlik, parol va akkaunt, telefon va internet, oila va bolalar, kichik biznes, Instagram, AI bilan ishlash. Har kuni yangi «kun maslahati».

### Tekshir — alohida ilova 🛡
- [x] **O'z dizayni** — to'q ko'k xavfsizlik paneli, markazda yashil qalqon (AHdigital'dan butunlay farqli).
- [x] **«Ulashish → Tekshir»** — SMS yoki Telegram'dagi xabarni ulashish tugmasi bilan to'g'ridan-to'g'ri tekshirish.
- [x] **APK faylni tekshirish** — fayl internetga yuklanmaydi.
- [x] **Tekshiruvlar tarixi** — faqat telefonda, raqamlar yashirilgan.
- [x] **70 ta maslahat**, o'zbek va rus tilida interfeys.
- [x] **O'z manzili:** tekshir.ah-digital.uz
- [x] **Maxfiylik siyosati** (o'zbek va rus tilida) va Google Play uchun tayyor rasm va matnlar.
- [x] **Haqiqiy Android ilova (Kotlin)** — tekshiruv telefonning o'zida, internetsiz; Telegram bot bilan bir xil qoidalar (43 ta test).
- [x] **🔔 Avtomatik himoya: xabarlarni kuzatish** — SMS, Telegram, WhatsApp'ga firibgar xabar kelishi bilan o'zi ogohlantiradi. Xabar matni telefondan chiqmaydi.
- [ ] Google Play'ga chiqarish (AHdigital'dan keyin).

## Dadamga qanday ko'rsataman (reja)
1. Telefonda ilovani ochib, «Foydali» bo'limini ko'rsataman — dadamning o'z SMS'larini tekshirib beraman.
2. Dadamning do'koni/ishi uchun QR kod yasab beraman (Wi-Fi yoki telefon).
3. `/stats` ni ko'rsataman — bot qancha odamga yordam berganini.
4. Oxirida — Tekshir ilovasi (Google Play'da chiqqach).
