# Tekshir — iPhone ilovasi (SwiftUI, iOS 16.4+)

Firibgarlikdan himoya — Android ilova bilan bir xil imkoniyatlar, iPhone'ning o'z vositalari bilan.

## Nima bor (1-bosqich)
| | |
|---|---|
| 🔍 | **Tekshirish** — xabar, havola, raqam. Tekshiruv **telefonning o'zida** (internetsiz). Havola/raqam bo'lsa — faqat ular serverga (Google, VirusTotal, shikoyatlar). |
| 📸 | **Skrinshot** — rasmdagi matn va QR kod **Apple Vision** bilan telefonda o'qiladi. Galereyaga ruxsat kerak emas (faqat tanlangan rasm). |
| 🔳 | **QR kod** — kamera bilan (VisionKit). Havola, Wi-Fi, telefon, SMS QR'larini tushuntiradi. Wi-Fi paroli o'qilmaydi. |
| 🆘 ✈️ 🎓 | **Aldandim**, **Telegram himoyasi**, **Firibgarni tani** — Android va sayt bilan aynan bir xil matnlar. |
| 🕘 💡 ⚙️ | Tarix (faqat telefonda, raqamlar yashirin), 40 ta xavfsizlik maslahati, o'zbek/rus tili. |

**Mexanizm bitta:** `Resources/engine.js` — Telegram botning o'z kodi (`tekshir-extension/build.js` yig'adi), iPhone'ning **JavaScriptCore**'ida ishlaydi. Shuning uchun bot, Android, sayt, kengaytma va iPhone bir xil javob beradi.

**Keyingi bosqichlar:** 2) ✉️ SMS filtri (firibgar SMS «Junk»ga) + ↗️ «Ulashish → Tekshir»; 3) 🧩 vidjet + Siri/Qisqa buyruqlar + App Store'ga tayyorlash.

## Mac'da ochish (birinchi marta)
1. **Terminal**'ni oching. Homebrew bormi?
   ```bash
   brew --version
   ```
   «command not found» chiqsa — Homebrew o'rnating (Mac paroli so'raladi — oyingiz kiritsin):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. **XcodeGen** (loyiha faylini yaratadigan dastur):
   ```bash
   brew install xcodegen
   ```
3. Loyihani yarating va oching (`tekshir-ios` papkasi qayerda bo'lsa — o'sha yerga `cd`):
   ```bash
   cd ~/Downloads/tekshir-ios
   xcodegen
   open Tekshir.xcodeproj
   ```
4. Xcode'da: chapda **Tekshir** (ko'k ikonka) → **Signing & Capabilities** → **Team** → Apple ID'ni tanlang
   (hali bo'lmasa: «Add an Account…» → oyingizning Apple ID'si).
5. Yuqorida qurilma: **iPhone 15 (simulator)** yoki ulangan iPhone → **▶ Run** (⌘R).

### Haqiqiy iPhone'da
- iPhone'ni kabel bilan ulang → «Bu kompyuterga ishonasizmi?» → **Ishonish**.
- iPhone: **Sozlamalar → Maxfiylik va xavfsizlik → Developer Mode → yoqish** (qayta yonadi).
- Birinchi ochilishda «Untrusted Developer» desa: **Sozlamalar → Umumiy → VPN va qurilma boshqaruvi → ishonish**.
- Bepul Apple ID bilan ilova telefonda **7 kun** ishlaydi; App Store uchun — **Apple Developer Program ($99/yil)**, oyingiz nomidan.

## Sinash
- **Tekshirish:** `Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com` → 🔴.
- **📸 Skrinshot:** firibgar SMS skrinshotini tanlang → 🔴. (Simulatorda ham ishlaydi — rasmni simulator oynasiga sudrab tashlang.)
- **🔳 QR:** faqat haqiqiy iPhone'da (simulatorda kamera yo'q — «QR skaner ishlamaydi» degan xabar chiqishi to'g'ri).
- **🆘 / ✈️ / 🎓:** Himoya → «Yordam va o'rganish».

## Dasturchi uchun
```bash
cd ../tekshir-extension && node build.js   # bot kodi o'zgarsa: engine.js, yordam.js, maslahatlar.js yangilanadi
cd ../tekshir-ios && npm test              # iPhone muhiti (URL yo'q, window = this) sinovi
```
- `project.yml` — XcodeGen sozlamasi; `Tekshir.xcodeproj` va `Info.plist` har safar `xcodegen` bilan yaratiladi (GitHub'ga yuklanmaydi).
- Maxfiylik: xabar matni, rasm va tarix telefondan chiqmaydi. Serverga faqat havolalar va telefon/karta raqamlari (`/api/check`).
