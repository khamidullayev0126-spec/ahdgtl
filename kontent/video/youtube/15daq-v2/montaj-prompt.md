# Claude uchun prompt — «Claude bilan 15 daqiqada sayt» videosini to'liq montaj qilish

(Quyidagini video fayllar turgan papka ulangan yangi Claude chatiga to'liq nusxalab yuboring.)

---

Sen tajribali video montajchi va motion-dizaynersan. Ulangan papkadagi xom videolardan YouTube uchun tayyor, professional video yasab ber. Kod yozib, ffmpeg va (kerak bo'lsa) Playwright/HTML orqali animatsiyalarni render qilib ishlaysan.

## Video haqida
- Nomi: «Claude bilan 15 daqiqada SAYT — ulguramanmi?»
- Format: challenge. Burchakda haqiqiy 15 daqiqalik taymer, faqat Claude bilan, kod yozmasdan, «Dilnoza Teacher» (ingliz tili repetitori, o'ylab topilgan odam) uchun sayt yasayman.
- Uzunlik: 16–20 daqiqa. Natija: 1920×1080, 30 fps, H.264 + AAC, ovoz −14 LUFS, true peak −1.5 dB.
- Ssenariy: `matn.md` (bo'limlar va [qavs] ichidagi ekran ko'rsatmalari shu yerda).
- Tayyor hook: `hook.mp4` (40 soniya, ovozi bilan) — videoning eng boshiga qo'yiladi, o'zgartirma.

## Ishlash tartibi
1. Avval papkadagi barcha fayllarni ko'rib chiq (ffprobe): qaysi fayl kamera, qaysi ekran yozuvi, uzunligi, ovozi. Menga qisqa ro'yxat va montaj rejasini ko'rsat. **Rejani tasdiqlamagunimcha render qilma.**
2. Biror dastur o'rnatish kerak bo'lsa — avval mendan so'ra.
3. Ovozdan vaqtlarni ol (jimlik joylari yoki transkripsiya) va har bir animatsiyani aynan aytilgan so'zga mosla.
4. Avval past sifatli qisqa namunalar (preview) render qil, kadrlarni tekshir, keyin to'liq versiya.
5. Natijani yangi nom bilan saqla (`yakuniy-v1.mp4`), eski fayllarni o'chirma.

## Montaj qoidalari
- **Taymer — haqiqiy.** Claude javob yozayotgan kutishlarni 2x–4x tezlashtirsang ham, burchakdagi taymer haqiqiy o'tgan vaqtni ko'rsatsin. Natijani o'zgartirma: ulgurdimmi yoki yo'qmi — qanday bo'lsa, shunday.
- Uzun jimliklar, «ee», takroriy gaplar va xato boshlanishlarni kes, lekin gap ma'nosi o'zgarmasin.
- Har 5–10 soniyada ko'rinishda kichik o'zgarish bo'lsin: zoom-in (1.0→1.15) muhim joyga, kursor atrofida yumshoq zoom, B-roll yoki kartochka.
- Ekran yozuvida kichik matnlar (buyruqlar, natija) o'qiladigan bo'lsin — kerak bo'lsa kattalashtir.
- Kamera qismlarida orqa fonni yengil xiralashtir (portret effekti), yuz va ranglar tabiiy qolsin.

## Dizayn (hook bilan bir xil uslub)
- Fon: `#f5ead8`, asosiy rang (aksent): `#c67139`, matn: `#201e1d`, shaftoli doira: `#ffc6a5`, yashil doira: `#ccdbb2`.
- Shriftlar: sarlavhalar — Caprasimo, matn — Figtree 600/800 (papkada `.ttf` fayllari bor).
- Kartochkalar: oq, katta yumaloq burchak (40px), yumshoq soya.
- Harakat: yumshoq «ease-out» va biroz sakrab chiqish (back easing), 0.4–0.6 soniya. Haddan tashqari effekt, aylanish, chaqnash ishlatma.
- Burchakda logo: AHdigital (`images/logo.svg`).

## Qo'shiladigan animatsiyalar
1. **Taymer** — o'ng yuqori burchakda doimiy: qora yumaloq to'rtburchak, oq raqamlar «⏱ 12:34». Oxirgi 1 daqiqada aksent rangga o'tib, sekin pulslasin. Taymer to'xtaganda markazga kattalashib chiqsin va natijani ko'rsatsin.
2. **Bo'lim sarlavhalari** — har raund boshida 2 soniyalik to'liq ekran kartochka: «RAUND 1 — Reja va birinchi buyruq» va hokazo.
3. **Buyruq kartochkasi** — har buyruq yuborilganda buyruq matni ekranning pastki qismida katta, o'qiladigan kartochkada 3–4 soniya chiqsin.
4. **«Sir» belgisi** — «Sir №1: Claude'ga rol bering» kabi joylarda chap tomondan chiqadigan kichik kartochka.
5. **Muammo/yechim** — «jadval telefonga sig'maydi» degan joyda qizil ✗, tuzatilganda yashil ✓.
6. **Ro'yxatlar** — «5 ta sir», «xatolar», «3 ta qoida», «keyingi qadamlar» bo'limlarida punktlar ovozga mos ketma-ket chiqsin.
7. **Halollik daqiqasi** — «O'ylab topilgan raqam va sharh qo'shma» yozuvi alohida ajralib tursin.
8. **Telefon mockup** — sayt telefonda tekshirilganda ekran yozuvini telefon ramkasi ichida ko'rsat.
9. **Subtitrlar** — o'zbek tilida, pastda, 2 qatordan oshmasin, gapirilayotgan so'z aksent rangda ajralsin. Avval matnni menga ko'rsat — xatolarni to'g'rilayman.
10. **Yakun** — «Barcha buyruqlar — Telegram kanalimda: t.me/ahdigital_01» kartochkasi + obuna eslatmasi (oxirgi 10–15 soniya, YouTube yakuniy ekrani uchun joy qoldir).

## Ovoz
- Ovozni tozala: shovqinni kamaytir (highpass 80 Hz, yengil denoise), balandlikni tekisla.
- Animatsiyalarga juda yengil, qisqa tovushlar (klik, «whoosh») qo'shish mumkin — ovozni bosib ketmasin.
- **Mualliflik huquqi bilan himoyalangan musiqa ishlatma.** Fon musiqasi kerak bo'lsa — faqat litsenziyasi aniq bepul musiqa (masalan, YouTube Audio Library) va manbasini yozib qo'y. Musiqasiz ham bo'ladi.

## Xavfsizlik va shaxsiy ma'lumot
- Ekranda email, boshqa chatlar, bildirishnomalar, parol, telefon raqam yoki manzil ko'rinib qolsa — xiralashtir (blur).
- Saytdagi telefon raqam namuna bo'lishi kerak (+998 90 000 00 00).

## YouTube bo'limlari
Montajdan keyin haqiqiy vaqtlar bilan YouTube bo'limlari ro'yxatini yoz (birinchisi 0:00 dan boshlansin):
Hook · Bugungi «mijoz» · Qoidalar · Raund 1 · Natijani tekshirish · Raund 2 · Halollik daqiqasi · Raund 3 · Tahlil: 5 ta sir · Xatolar · O'z biznesingizga · Bonus · Savollar · Keyingi qadamlar · Yakun.

## Oxirida menga ber
1. `yakuniy-v1.mp4`
2. Bo'limlar ro'yxati (vaqtlar bilan)
3. Subtitr fayli (`.srt`)
4. Qisqa hisobot: nima qilinganini, nimani tekshirganingni va nima menga qoldirilganini.
