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
- [ ] 3. 📲 Yangi o'rnatilgan ilovalarni tekshirish
- [ ] 4. 📁 Yuklangan APK fayllar
- [ ] 5. 🩺 Telefon xavfsizlik bali
- [ ] 6. 📞 Qo'ng'iroqda ogohlantirish
- [ ] 7. 👨‍👩‍👧 Oila himoyasi (Telegram bot orqali)
- [ ] 8. Google Play'ga tayyorlash

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

## Xavfsizlik
- Imzolash kaliti (`.jks`/`.keystore`) GitHub'ga yuklanmaydi (`.gitignore`).
- Sinovdan keyin telefonda **USB debugging**ni o'chiring va **Auto Blocker**ni yoqing.
