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
- [x] **50 ta xavfsizlik maslahati** (firibgarlik, parol, telefon, oila, karta va to'lovlar), o'zbek va rus tilida interfeys.
- [x] **O'z manzili:** tekshir.ah-digital.uz
- [x] **Maxfiylik siyosati** (o'zbek va rus tilida) va Google Play uchun tayyor rasm va matnlar.
- [x] **Haqiqiy Android ilova (Kotlin)** — tekshiruv telefonning o'zida, internetsiz; Telegram bot bilan bir xil qoidalar (43 ta test).
- [x] **🔔 Avtomatik himoya: xabarlarni kuzatish** — SMS, Telegram, WhatsApp'ga firibgar xabar kelishi bilan o'zi ogohlantiradi. Xabar matni telefondan chiqmaydi.
- [x] **📲 Xavfli ilova ogohlantirishi** — Telegram'dan kelgan soxta «Click.apk» yoki «Rasmlar.apk» o'rnatilsa, darhol aytadi va o'chirish sahifasini ochadi. Telefondagi hamma ilovalarni bir tugma bilan tekshirish.
- [x] **📁 APK faylni o'rnatishdan OLDIN tekshirish** — Telegram'da APK bosilsa «Tekshir bilan ochish»: ichida nima borligini (SMS o'qiydimi, bank nomiga o'xshaydimi) ko'rsatadi va VirusTotal bazasidan qidiradi. Fayl hech qayerga yuklanmaydi.
- [x] **🩺 Xavfsizlik bali** — telefon qanchalik himoyalanganini 0–100 ball bilan ko'rsatadi va nimani tuzatishni aytadi.
- [x] **📞 Shubhali qo'ng'iroq ogohlantirishi** — shikoyat qilingan raqamdan qo'ng'iroq bo'lsa, ekranda «Diqqat!» chiqadi.
- [x] **👨‍👩‍👧 Oila himoyasi** — buvim/oyimning telefonida firibgar xabar aniqlansa, dadamga Telegram'da xabar keladi (xabar matni emas, faqat «xavf bor»). Dadamga ko'rsatishning eng zo'r joyi shu! 😄
- [x] Google Play uchun hammasi tayyor (maxfiylik siyosati, ruxsatlar tushuntirishi) — faqat dadamning Play Console hisobi kerak.
- [ ] Google Play'ga chiqarish (AHdigital'dan keyin).

## Dadamga qanday ko'rsataman (reja) — ~15 daqiqa

### Oldindan tayyorlanadi (dadam yo'qligida)
- [x] Tekshir ilovasi **mening telefonimda** ishlayapti (Android Studio → Run), hamma bosqichlar sinab ko'rilgan. ✅ 2026-11-19
- [ ] Telefon to'liq zaryadlangan, internet bor, **Tarix tozalangan** (shaxsiy narsalar ko'rinmasin).
- [ ] Botda `/stats` raqamlari yaxshi ko'rinadi (avval o'zim ochib qarayman).
- [ ] Namuna xabar tayyor (bu haqiqiy havola emas, faqat sinov uchun):
  `Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com`
- [ ] Dadamning telefonida Telegram ochiq, @tekshirbot_bot bor.
- [ ] Ilovada Sozlama → Oila himoyasi → **Uzish** («Buvim» sinov ulanishi o'chsin — dadam jonli ulaydi).
- [ ] USB debugging o'chirilgan, Auto Blocker yoqilgan (dadam xavfsizlik balini ko'rsa — 100 ga yaqin chiqsin 😄).

### Ko'rsatish tartibi
1. **Kirish (1 daq).** «Dada, eslaysizmi, yangiliklar sir dedim? Mana — 3 ta narsa tayyor.»
2. **Bot (3 daq).** Dadamning telefonida `/stats`: nechta odam, nechta tekshiruv, qayerdan kelgani.
   «Server siz to'lagan pulga ishlayapti — mana natijasi.»
3. **AHdigital ilovasi → Foydali (3 daq).**
   - Dadamning ishi uchun **QR kod** yasab beraman (Wi-Fi yoki telefon) — darhol foydasi bor.
   - 70 ta maslahatdan bittasini o'qib beraman.
4. **Tekshir ilovasi (5 daq)** — eng zo'r qismi:
   - Bosh ekran: qalqon, **🩺 Xavfsizlik bali**.
   - Namuna xabarni tekshiraman → 🔴 XAVFLI va sabablari.
   - Sozlama → **🧪 Sinab ko'rish** → tepada ogohlantirish chiqadi («telefon o'zi ogohlantiradi»).
5. **👨‍👩‍👧 Oila himoyasi — jonli (3 daq).** 🎯 WOW lahza:
   - Dadam o'z telefonida botga `/oila` yozadi → kod oladi.
   - Men kodni ilovaga kiritaman, nom: «Abdulhamid».
   - Botda dadamga «✅ Abdulhamid telefoni ulandi» keladi.
   - 🧪 Sinab ko'rish → **dadamning telefoniga «🚨 Oila himoyasi»** xabari keladi.
   - «Buvimning telefoniga ham o'rnatsak — unga firibgar yozsa, sizga xabar keladi.»
6. **Yakun (1 daq).** «Google Play'ga chiqarish oyim bilan tayyorlanyapti — 12 kishi 14 kun sinashi kerak. Siz ham tanishlaringizdan Gmail yig'ib bera olasizmi?»

### Nima demaslik / ehtiyot
- Haqiqiy firibgar havolani ochmayman — faqat namuna matn.
- Dadamning shaxsiy SMS'larini faqat **o'zi ruxsat bersa** tekshiraman.
- «100% himoya qiladi» demayman — «yordam beradi, lekin ehtiyot bo'lish baribir kerak».

### Keyin
- Buvim/oyimning telefoniga Tekshir (Play'da chiqqach) + oila himoyasi → dadamga ulash.
- Kanalga «Oila himoyasi» posti (`kontent/oila-himoyasi-post.md`) — ilova chiqqan kuni.
