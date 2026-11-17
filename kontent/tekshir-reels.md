# Instagram Reels: Tekshir boti — 2 ta ssenariy

**Format:** vertikal 9:16, 30–45 soniya. Yuzingiz (shtativ + oq devor) + telefon ekran yozuvi.
**Qoida:** birinchi 2 soniya — ilgak. Ekrandagi matn katta, 1 qatorda 3–5 so'z. Har videoda **bitta** fikr.
**Ekran yozuvi uchun:** botdagi **/demo** dan foydalaning — namunalar tayyor va xavfsiz.

**Xavfsizlik (yozishdan oldin tekshiring):**
- Ekranda **haqiqiy** firibgar raqami, karta yoki havola bo'lmasin — faqat /demo namunalari.
- Terminal yoki VS Code ko'rinsa, `.env` fayli va bot tokeni **ko'rinmasin**.
- Telegram'dagi boshqa chatlaringiz (ismlar, xabarlar) kadrga tushmasin: botni alohida oching yoki xiralashtiring.

---

## 1. «Bu SMS'ni 3 soniyada tekshiraman» — keng auditoriya (ota-onalar, oila)
**Uzunlik:** ~35 s · **Kadr:** yuzingiz + telefon ekran yozuvi (/demo → «Soxta bank SMS» va «Soxta havola»)
**Maqsad:** saqlash 📌 va oilaga yuborish (eng ko'p tarqaladigan turdagi video)

| Vaqt | Ekranda | Siz aytasiz |
|---|---|---|
| 0–2 | **«Kartangiz bloklandi»** 😱 | «Shunday SMS keldimi? Hech narsa bosmang.» |
| 2–7 | Soxta SMS namunasi (ekran yozuvi) | «Firibgarlar bankdan yozgandek qilib, SMS kodingizni so'raydi. Kod berilsa — karta bo'shaydi.» |
| 7–15 | Xabarni botga uzatish → 🔴 **XAVFLI** | «Men Tekshir degan bot yasadim. Shubhali xabarni botga uzatasiz — u 3 soniyada aytadi: xavfli yoki yo'q. Nima uchunligini ham tushuntiradi.» |
| 15–23 | Soxta havola → «Rasmiysi: click.uz» | «Havolalarni ham tekshiradi. Mana — c1ick, birinchi harfi "l" emas, "1". Ko'z bilan sezish qiyin, bot esa darrov topadi.» |
| 23–30 | ✅ / 🟡 / 🔴 | «Uchta javob bor: yashil — xavf topilmadi, sariq — ehtiyot bo'ling, qizil — ochmang.» |
| 30–35 | **Oilangizga yuboring** 👨‍👩‍👧 | «Bu videoni ota-onangizga yuboring — firibgarlar ko'pincha ularni nishonga oladi.» |

**Caption:**
```
«Kartangiz bloklandi, SMS kodni yuboring» — tanish xabarmi? 😱

Bank HECH QACHON SMS kod so'ramaydi.

Shubhali xabar, havola yoki faylni tekshirish uchun Telegram bot yasadim — Tekshir 🛡
✅ xavf topilmadi
🟡 shubhali — ehtiyot bo'ling
🔴 xavfli — ochmang, kod bermang

📌 Saqlab qo'ying va ota-onangizga yuboring.
🤖 Bot havolasi — Telegram kanalimda (📌 pin'da).
🔗 Kanal havolasi — bio'da.

#firibgarlik #xavfsizlik #telegram #kiberxavfsizlik #ozbekiston #AHdigital
```

**Diqqat:**
- «100% himoya qiladi» demang. Bot xatolashi mumkin — videoda «yordam beradi» deb ayting.
- Bot bepul serverda ishlaydi: uzoq vaqt xabar bo'lmasa, birinchi javob ~1 daqiqa kechikishi mumkin. Shuning uchun **«24/7 ishlaydi» demang**.

---

## 2. «Firibgarlikka qarshi bot yasadim» — o'rganuvchilar va portfolio uchun
**Uzunlik:** ~40 s · **Kadr:** yuzingiz + VS Code (kod) + terminal (`npm test` — hammasi yashil) + bot ekrani
**Maqsad:** dasturchi sifatida o'zingizni ko'rsatish, obunachilar

| Vaqt | Ekranda | Siz aytasiz |
|---|---|---|
| 0–2 | **10 bosqich · 1 bot** | «Firibgarlikka qarshi Telegram bot yasadim. 10 bosqichda.» |
| 2–9 | Bot ekrani: 🔴 XAVFLI | «Shubhali havola, xabar, APK fayl yoki karta raqamini yuborasiz — bot bir necha soniyada tekshiradi.» |
| 9–20 | VS Code: papkalar (`checkers/`) | «Ichida — har bir narsa uchun alohida tekshiruvchi: havola, matn, fayl, raqam. Havolani Google Safe Browsing va VirusTotal'dan ham so'raydi.» |
| 20–27 | Terminal: `npm test` → **pass 109** | «Eng muhimi — testlar. Yuzdan ortiq avtomatik test: bot to'g'ri ishlayaptimi, shaxsiy ma'lumotni saqlamayaptimi — hammasini o'zi tekshiradi.» |
| 27–34 | 🔒 «Matn saqlanmaydi» | «Xabaringiz saqlanmaydi, karta raqami faqat shifrlangan holda. Bot hech kimni "firibgar" demaydi — faqat shikoyatlar sonini ko'rsatadi.» |
| 34–40 | Node.js · grammY · SQLite | «Node.js, grammY va SQLite'da. Qaysi qismini batafsil ko'rsatay? Izohda yozing.» |

**Caption:**
```
Firibgarlikka qarshi Telegram bot yasadim 🛡 — 10 bosqichda

🔗 Havola: soxta saytlar, qisqartirilgan havolalar, Google + VirusTotal
💬 Matn: «SMS kod», «yutuq», «posilka» kabi 9 ta aldov turi
📎 Fayl: APK va aldamchi nomlar (rasm.jpg.apk)
📞 Raqam: shikoyatlar soni (raqam shifrlangan holda saqlanadi)
👥 Guruh rejimi · 3 til · 100+ avtomatik test

Node.js · grammY · SQLite
Qaysi qismini batafsil ko'rsatay? 👇

#dasturlash #nodejs #telegrambot #junior #coddycamp #AHdigital
```

**Diqqat:**
- Kod ko'rinadigan kadrlarda `.env` faylini **ochmang**. Tokenlar faqat o'sha faylda.
- `npm test` natijasini haqiqiy yozib oling. Raqamni o'ylab topmang — qancha chiqsa, shuni ko'rsating.

---

## Joylash rejasi
1. **Avval 1-video** (ko'proq tarqaladi). Hikoyada (story): «Botni sinab ko'ring» + havola stikeri.
2. 3–4 kundan keyin **2-video**. Izohlarda savol berishsa — keyingi videoni shu savolga javob qilib yozing.
3. Telegram kanalda (@ahdigital_01) — bot haqida qisqa post + /demo skrinshoti.
4. Bio'dagi havola: portfolio sahifasi (u yerda «Tekshir» kartasi bor) yoki to'g'ridan-to'g'ri bot.
