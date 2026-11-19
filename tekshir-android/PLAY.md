# Tekshir → Google Play (8-bosqich)

> ⚠️ Play Console hisobi, to'lov ($25) va shaxsni tasdiqlash — **dadangiz nomidan**, dadangiz qiladi.
> Shartnomalarni (Developer Distribution Agreement) ham dadangiz o'qib, o'zi qabul qiladi.

## 1. Imzolangan AAB yaratish (Android Studio)
1. `app/build.gradle.kts` → `defaultConfig`: `versionCode = 1`, `versionName = "1.0"` (har yangilanishda versionCode +1).
2. **Build → Generate Signed App Bundle or APK → Android App Bundle → Create new…** (kalit yaratish).
   - Kalit faylini (`tekshir-upload.jks`) **GitHub'ga yuklamang** va papkadan tashqarida, zaxira nusxa bilan saqlang (masalan fleshka).
   - Parolni dadangiz bilan birga xavfsiz joyga yozib qo'ying. Yo'qolsa — ilovani yangilab bo'lmaydi.
3. **release** → Create. Natija: `app/release/app-release.aab`.
4. Play Console → Setup → **App signing**: Google'ning imzosi yoqilgan bo'lsin (standart).

## 2. Do'kon sahifasi
Matnlar, ikonka (512×512) va banner (1024×500): `tekshir-bot/play-store/` (README'dagi matnlar).
**Skrinshotlar — yangi, haqiqiy ilovadan oling** (Himoya, Tekshirish natijasi, Ilovalar tekshiruvi, Xavfsizlik bali, Oila himoyasi).
Telefonda: ekran tugmasi + ovoz pasaytirish. Skrinshotlarda shaxsiy xabar va raqamlar ko'rinmasin.

## 3. Ruxsatlar deklaratsiyasi (Play Console → App content)
| Ruxsat | Nima deb javob berish |
|---|---|
| `QUERY_ALL_PACKAGES` | **Permitted use: Antivirus / security / device-search**. Izoh: «Tekshir is an anti-fraud security app. It scans installed apps on-device to detect apps installed outside of app stores that request SMS reading, accessibility control or device admin — typical banking trojans in Uzbekistan. The app list never leaves the device.» Video: ilovada «Hamma ilovalarni tekshirish» va natija (30 soniya). |
| Notification listener | Maxsus deklaratsiya yo'q, lekin **ilovada tushuntirish oynasi bor** («Tekshir qanday ma'lumot ishlatadi» — rozilikdan keyin). Data safety'da ko'rsatiladi. |
| Call screening roli | Restricted permission emas (CALL_LOG so'ralmaydi). Data safety'da «Phone number — processed, not stored». |
| `POST_NOTIFICATIONS` | Oddiy ruxsat — ogohlantirishlar uchun. |

## 4. Data safety (Ma'lumotlar xavfsizligi) javoblari
- **Data collected / shared:**
  - *Messages → Other in-app messages*: **No** (bildirishnoma matni telefonda qayta ishlanadi, yuborilmaydi — «processed ephemerally on device» Data safety'ga kirmaydi).
  - *App activity → Installed apps*: **No** (telefondan chiqmaydi).
  - *Web browsing → URLs*: **Collected, not shared**, ephemeral (havolalar tekshiruv uchun serverga, saqlanmaydi). Purpose: *Fraud prevention, security*.
  - *Personal info → Phone number*: **Collected**, ephemeral, not stored (qo'ng'iroq qilgan notanish raqam — shikoyatlarni tekshirish). Purpose: *Fraud prevention, security*.
  - *Files and docs*: **No** (faqat SHA-256 hash — fayl emas).
  - *Device or other IDs*: **No** (oila himoyasi kaliti tasodifiy, qurilma ID'si emas).
- **Encrypted in transit:** Yes (HTTPS).
- **Users can request deletion:** Yes — tarix ilovada o'chiriladi; oila — «Uzish» yoki /oila_ochir; so'rov: Telegram @Abdulkhamid_2905.
- **Privacy policy URL:** `https://tekshir.ah-digital.uz/maxfiylik.html`

## 5. Boshqa savollar
- **Target audience:** 18+ (ilova kattalar uchun — bolalarga mo'ljallanmagan). 
- **Ads:** No. **App access:** hamma imkoniyat login'siz ochiq.
- **Content rating:** so'rovnoma — zo'ravonlik/qimor yo'q → «Everyone / 3+».
- **Category:** Tools. **Contact email:** dadangizning emaili.

## 6. Sinovchilar (yangi shaxsiy hisob uchun majburiy)
- **Testing → Closed testing**: kamida **12 kishi** ketma-ket **14 kun** ilovani o'rnatib turishi kerak (oila, qarindoshlar guruhi, sinfdoshlar — ota-onasi ruxsati bilan).
- Keyin **Production** ga ariza.

## 7. Chiqarishdan oldin tekshiruv ro'yxati
- [ ] Telefonda hamma bosqichlar sinab ko'rildi (README → «sinash» bo'limlari)
- [ ] Tushuntirish oynasi chiqadi (Sozlama → Xabarlarni kuzatish → Yoqish)
- [ ] Maxfiylik siyosati ochiladi (Sozlama → Maxfiylik siyosati)
- [ ] versionCode oshirildi, kalit zaxirada
- [ ] Sinovdan keyin telefonda **USB debugging o'chirildi** va **Auto Blocker yoqildi**
