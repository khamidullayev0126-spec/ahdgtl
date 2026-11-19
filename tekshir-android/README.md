# Tekshir — Android ilova (Kotlin + Jetpack Compose)

Firibgarlikka qarshi **haqiqiy Android ilova**: tekshiruv telefonning o'zida, internetsiz bajariladi.
Telegram bot (`tekshir-bot/`) bilan bir xil qoidalar — `engine/` testlari 43 ta holatda botdagi natija bilan solishtiradi.

## Papkalar
| Papka | Nima |
|---|---|
| `app/` | Android Studio loyihasiga **nusxalanadigan** fayllar (Kotlin kod, manifest, qoidalar) |
| `engine/` | Tekshiruv mexanizmi + testlar (kompyuterda: `cd engine && gradle test`) |

## Bosqichlar
- [x] **1-bosqich:** dizayn, Himoya · Tekshirish (internetsiz + havolalar uchun Google/VirusTotal) · Tarix · 70 ta maslahat · Sozlama (o'zbek/rus) · «Ulashish → Tekshir»
- [x] **2-bosqich:** 🔔 Xabarlarni avtomatik kuzatish — SMS, Telegram, WhatsApp… bildirishnomasi kelishi bilan telefonda (internetsiz) tekshiradi, xavfli/shubhali bo'lsa ogohlantiradi. Xabar matni hech qayerga yuborilmaydi.
- [x] **3-bosqich:** 📲 Ilovalar tekshiruvi — yangi ilova o'rnatilishi bilan tekshiradi (Play Market'danmi, SMS o'qiydimi, ekranni boshqaradimi, bank nomiga o'xshaydimi); «Hamma ilovalarni tekshirish» tugmasi.
- [x] **4-bosqich:** 📁 APK faylni **o'rnatishdan oldin** tekshirish — Telegram'da APK bosilganda «Tekshir bilan ochish», «Ulashish → Tekshir» yoki «📁 APK faylni tekshirish» tugmasi. Fayl ichidagi nom, ruxsatlar o'qiladi; internetga faqat SHA-256 izi (VirusTotal).
- [ ] 5. 🩺 Telefon xavfsizlik bali
- [ ] 6. 📞 Qo'ng'iroqda ogohlantirish
- [ ] 7. 👨‍👩‍👧 Oila himoyasi (Telegram bot orqali)
- [ ] 8. Google Play'ga tayyorlash (maxfiylik siyosatiga bildirishnomalar, ilovalar ro'yxati va APK izi haqida qo'shish; QUERY_ALL_PACKAGES va bildirishnoma ruxsati uchun Play deklaratsiyasi)

## 1-bosqichni o'rnatish
1. Android Studio → **New Project → Empty Activity**
   - Name: `Tekshir` · Package: `uz.ahdigital.tekshir` · Minimum SDK: **API 26** · Kotlin DSL → Finish.
2. Loyiha ochilgach, Android Studio'ni **yoping**.
3. Finder → `AndroidStudioProjects/Tekshir/app/src/main/` papkasini oching.
4. Zip ichidagi `app/src/main/` dagi hamma narsani shu yerga **ko'chiring** → «Replace» (almashtirish).
   - Almashadi: `AndroidManifest.xml`, `MainActivity.kt`, `ui/theme/Color.kt`, `ui/theme/Theme.kt`
   - Qo'shiladi: `assets/`, `engine/`, `data/`, `guard/`, `ui/Screens.kt`, `ui/Strings.kt`, `res/drawable/ic_stat_shield.xml`
   - `ui/theme/Type.kt` — Android Studio'niki qoladi.
5. Android Studio'ni oching → yuqorida **Sync Now** chiqsa bosing → telefoningizni tanlang → **▶ Run**.

## 2-bosqichni sinash (xabarlarni kuzatish)
1. Ilovada **Sozlama → 🔔 Xabarlarni kuzatish → Yoqish** → ro'yxatdan **Tekshir** → ruxsat bering → orqaga.
   - «Cheklangan sozlama» (Restricted setting) desa: Sozlamalar → Ilovalar → Tekshir → yuqorida **⋮** → **Cheklangan sozlamalarga ruxsat berish** → qaytadan urinib ko'ring.
2. «Bildirishnomaga ruxsat» chiqsa — ruxsat bering.
3. **🧪 Sinab ko'rish** → tepada 🔴 ogohlantirish chiqishi kerak → bosing → ilovada to'liq natija.
4. Haqiqiy sinov: boshqa telefondan o'zingizga SMS yoki Telegram yuboring:
   `Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com`

## 3-bosqichni sinash (ilovalar)
1. Bosh ekran → **📲 Yangi ilovalar** → **🔍 Hamma ilovalarni tekshirish**.
   - Android Studio'dan o'rnatilgan ilovalar (masalan Tekshir'ning o'zi emas, boshqa sinov ilovalar) «Play Market'dan emas» deb sariq chiqishi normal.
2. Avtomatik tekshirish «Xabarlarni kuzatish» ruxsati yoqilgan bo'lsa ishlaydi: Play Market'dan **emas** ilova o'rnatilsa — darhol ogohlantirish.
   - Play Market'dan o'rnatilgan ilovalar uchun ogohlantirish chiqmaydi (ortiqcha xavotir bo'lmasligi uchun).

## 4-bosqichni sinash (APK fayl)
1. **Tekshirish** oynasi → **📁 APK faylni tekshirish** → Downloads'dagi istalgan `.apk` ni tanlang.
2. Telegram'da APK faylni bosing → ro'yxatda **Tekshir** chiqsa — tanlang (o'rnatishdan oldin tekshiradi).
3. Natijada: ilova nomi, paket, hajm, sabablar va «⏳ VirusTotal bazasida qidirilmoqda…».

## Xavfsizlik
- Imzolash kaliti (`.jks`/`.keystore`) GitHub'ga yuklanmaydi (`.gitignore`).
- Sinovdan keyin telefonda **USB debugging**ni o'chiring va **Auto Blocker**ni yoqing.
