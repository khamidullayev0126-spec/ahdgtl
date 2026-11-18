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
- [ ] 2. 🔔 Xabarlarni avtomatik kuzatish (SMS, Telegram, WhatsApp bildirishnomalari)
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
   - Qo'shiladi: `assets/`, `engine/`, `data/`, `ui/Screens.kt`, `ui/Strings.kt`
   - `ui/theme/Type.kt` — Android Studio'niki qoladi.
5. Android Studio'ni oching → yuqorida **Sync Now** chiqsa bosing → telefoningizni tanlang → **▶ Run**.

## Xavfsizlik
- Imzolash kaliti (`.jks`/`.keystore`) GitHub'ga yuklanmaydi (`.gitignore`).
- Sinovdan keyin telefonda **USB debugging**ni o'chiring va **Auto Blocker**ni yoqing.
