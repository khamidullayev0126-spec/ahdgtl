# Tekshir — Android ilova (Kotlin + Jetpack Compose)

Firibgarlikka qarshi **haqiqiy Android ilova**: tekshiruv telefonning o'zida, internetsiz bajariladi.
Telegram bot (`tekshir-bot/`) bilan bir xil qoidalar — `engine/` testlari 43 ta holatda botdagi natija bilan solishtiradi.

> ✅ **2026-11-19:** Galaxy A17 telefonida sinab ko'rildi — tekshirish, avtomatik ogohlantirish, xavfsizlik bali, ilovalar tekshiruvi, oila himoyasi ishladi.

## Papkalar
| Papka | Nima |
|---|---|
| `app/` | Android Studio loyihasiga **nusxalanadigan** fayllar (Kotlin kod, manifest, qoidalar) |
| `engine/` | Tekshiruv mexanizmi + testlar (kompyuterda: `cd engine && gradle test`) |

## Bosqichlar
- [x] **1-bosqich:** dizayn, Himoya · Tekshirish (internetsiz + havolalar uchun Google/VirusTotal) · Tarix · 50 ta xavfsizlik maslahati · Sozlama (o'zbek/rus) · «Ulashish → Tekshir»
- [x] **2-bosqich:** 🔔 Xabarlarni avtomatik kuzatish — SMS, Telegram, WhatsApp… bildirishnomasi kelishi bilan telefonda (internetsiz) tekshiradi, xavfli/shubhali bo'lsa ogohlantiradi. Xabar matni hech qayerga yuborilmaydi.
- [x] **3-bosqich:** 📲 Ilovalar tekshiruvi — yangi ilova o'rnatilishi bilan tekshiradi (Play Market'danmi, SMS o'qiydimi, ekranni boshqaradimi, bank nomiga o'xshaydimi); «Hamma ilovalarni tekshirish» tugmasi.
- [x] **4-bosqich:** 📁 APK faylni **o'rnatishdan oldin** tekshirish — Telegram'da APK bosilganda «Tekshir bilan ochish», «Ulashish → Tekshir» yoki «📁 APK faylni tekshirish» tugmasi. Fayl ichidagi nom, ruxsatlar o'qiladi; internetga faqat SHA-256 izi (VirusTotal).
- [x] **5-bosqich:** 🩺 Xavfsizlik bali (0–100): ekran qulfi, yangilanish, Android versiyasi, USB debugging, Tekshir himoyalari, xavfli ilovalar, «Maxsus imkoniyatlar» — har biriga «Tuzatish» tugmasi.
- [x] **6-bosqich:** 📞 Qo'ng'iroqda ogohlantirish (Android 10+, «spam aniqlovchi» roli): notanish raqam shikoyatlar bazasida bo'lsa — ogohlantirish. Qo'ng'iroq bloklanmaydi.
- [x] **7-bosqich:** 👨‍👩‍👧 Oila himoyasi: botda /oila → 6 raqamli kod → ilovada kiritiladi; 🔴 xavf aniqlansa yaqiniga Telegram'da xabar (matnsiz).
- [x] **8-bosqich:** Google Play'ga tayyorlash — ruxsatdan oldin tushuntirish oynasi, yangilangan maxfiylik siyosati, `PLAY.md` (imzolash, deklaratsiyalar, Data safety javoblari). Do'konga chiqarish — dadamning Play Console hisobi bilan.

## 1-bosqichni o'rnatish
1. Android Studio → **New Project → Empty Activity**
   - Name: `Tekshir` · Package: `uz.ahdigital.tekshir` · Minimum SDK: **API 26** · Kotlin DSL → Finish.
2. Loyiha ochilgach, Android Studio'ni **yoping**.
3. Finder → `AndroidStudioProjects/Tekshir/app/src/main/` papkasini oching.
4. Zip ichidagi `app/src/main/` dagi hamma narsani shu yerga **ko'chiring** → «Replace» (almashtirish).
   - Almashadi: `AndroidManifest.xml`, `MainActivity.kt`, `ui/theme/Color.kt`, `ui/theme/Theme.kt`
   - Qo'shiladi: `assets/`, `engine/`, `data/`, `guard/`, `ui/Screens.kt`, `ui/Strings.kt`, `res/drawable/ic_stat_shield.xml`
   - Ikonka (almashadi): `res/drawable/ic_launcher_foreground.xml`, `ic_launcher_background.xml`, `ic_launcher_monochrome.xml`, `res/mipmap-anydpi-v26/` — yashil qalqon
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

## 5–7-bosqichlarni sinash
- **🩺 Xavfsizlik bali:** bosh ekran → Xavfsizlik bali. USB debugging yoqilgan bo'lsa ⚠️ chiqishi kerak (to'g'ri!).
- **📞 Qo'ng'iroqlar:** Sozlama → Qo'ng'iroqlarda ogohlantirish → Yoqish → «Spam aniqlovchi»: Tekshir.
- **👨‍👩‍👧 Oila:** dadangiz (yoki o'zingiz boshqa Telegram'dan) botga `/oila` → kod → ilovada Sozlama → Oila himoyasi → kod + nom → Ulash.
  Botda «✅ … telefoni ulandi» chiqadi. Keyin 🧪 «Sinab ko'rish» — botga «🚨 Oila himoyasi» xabari keladi.

## Xavfsizlik
- Imzolash kaliti (`.jks`/`.keystore`) GitHub'ga yuklanmaydi (`.gitignore`).
- Sinovdan keyin telefonda **USB debugging**ni o'chiring va **Auto Blocker**ni yoqing.
