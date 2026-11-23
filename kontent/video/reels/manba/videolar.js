// 7 ta Reels: ovoz bo'laklari (subtitr), sarlavhalar va vizual sahnalar.
// c — ekranda chiqadigan matn; s — ovozda aytilgani (farq qilsa: vaqtni hisoblash uchun).
// heads/vis: { at: bo'lak raqami } — o'sha gap boshlanganda sahna almashadi.
module.exports = {
  1: {
    tag: "Biznes maslahat", out: "1-instagram-3-xato",
    chunks: [
      { c: "Instagram sahifangizda shu uchta xato bo'lsa," }, { c: "mijoz yozmasdan ketadi." },
      { c: "Birinchisi — narx yo'q." }, { c: "Odam narxini so'rashga erinadi" }, { c: "va boshqa sahifaga o'tib ketadi." },
      { c: "Hech bo'lmasa, \"...dan boshlab\" deb yozing." },
      { c: "Ikkinchisi — aloqa tugmasi yo'q." }, { c: "Profilni tahrirlashda uni bir daqiqada qo'shsa bo'ladi." },
      { c: "Uchinchisi — bio'da havola yo'q." }, { c: "Narx, manzil va rasmlar bir joyda bo'lsin." },
      { c: "Shunday sahifa kerak bo'lsa," }, { c: "bio'dagi havolada 10 soniyada bepul ko'ring.", s: "bio'dagi havolada o'n soniyada bepul ko'ring." }
    ],
    heads: [
      { at: 0, lines: [["Sahifangizda", "sm"], ["3 ta xato", "acc"]] },
      { at: 2, lines: [["1. Narx", ""], ["yo'q", "acc"]] },
      { at: 6, lines: [["2. Aloqa tugmasi", "sm"], ["yo'q", "acc"]] },
      { at: 8, lines: [["3. Bio'da havola", "sm"], ["yo'q", "acc"]] },
      { at: 10, lines: [["Bepul", "acc"], ["ko'ring 👀", "sm"]] }
    ],
    vis: [
      { at: 0, v: "badges", items: [["💰", "Narx yo'q"], ["📞", "Tugma yo'q"], ["🔗", "Havola yo'q"]] },
      { at: 2, v: "ig", st: [5, 7, 9], focus: 0 },
      { at: 6, v: "ig", st: [5, 7, 9], focus: 1, keep: true },
      { at: 8, v: "ig", st: [5, 7, 9], focus: 2, keep: true },
      { at: 10, v: "cta", line: "Sahifangizga sayt — 30 000 so'mdan" }
    ]
  },
  2: {
    tag: "Biznes maslahat", out: "2-google-bepul",
    chunks: [
      { c: "Biznesingizni Google'da bepul chiqarish mumkin." }, { c: "Men o'zim qildim." },
      { c: "\"AHdigital\" deb qidirsangiz," }, { c: "o'ng tomonda telefon, ish vaqti va sayt chiqadi." },
      { c: "Bu — Google Business Profile." }, { c: "business.google.com saytiga kirasiz," },
      { c: "biznes nomi, telefon va ish vaqtini yozasiz," }, { c: "keyin tasdiqlaysiz." }, { c: "Hammasi bepul." },
      { c: "Keyin mijozlardan haqiqiy sharh so'rang —" }, { c: "Google sizni yuqoriroq ko'rsatadi." },
      { c: "Saqlab qo'ying, keyin kerak bo'ladi." }
    ],
    heads: [
      { at: 0, lines: [["Google'da", "sm"], ["BEPUL", "acc"]] },
      { at: 2, lines: [["Mana", "sm"], ["natija", "it"]] },
      { at: 4, lines: [["Google Business", "sm"], ["Profile", "acc"]] },
      { at: 8, lines: [["Hammasi", "sm"], ["bepul", "acc"]] },
      { at: 9, lines: [["Sharh", ""], ["so'rang ⭐", "sm"]] },
      { at: 11, lines: [["Saqlab", ""], ["qo'ying 📌", "sm"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "🗺️", text: "0 so'm", bg: "#3f8f5a" },
      { at: 2, v: "google", card: 3 },
      { at: 4, v: "steps", items: [[5, "business.google.com", "🌐"], [6, "Nom, telefon, ish vaqti", "✍️"], [7, "Tasdiqlash", "✅"]] },
      { at: 8, v: "stamp", icon: "💸", text: "BEPUL", fs: 90 },
      { at: 9, v: "stars" },
      { at: 11, v: "stamp", icon: "📌", text: "Saqlang", sub: "keyin kerak bo'ladi" }
    ]
  },
  3: {
    tag: "Kafe uchun", out: "3-qr-menyu",
    chunks: [
      { c: "Kafengizda hali ham qog'oz menyu?" }, { c: "QR menyuda narx o'zgarsa," }, { c: "qayta chop etish shart emas —" },
      { c: "bir daqiqada yangilanadi." }, { c: "Mijoz taomni rasmda ko'radi" }, { c: "va bir bosishda qo'ng'iroq qiladi." },
      { c: "Menyu sayt — 30 000 so'mdan,", s: "Menyu sayt — o'ttiz ming so'mdan," }, { c: "2–3 kunda tayyor.", s: "ikki-uch kunda tayyor." }
    ],
    heads: [
      { at: 0, lines: [["Hali ham", "sm"], ["qog'oz menyu?", "acc"]] },
      { at: 1, lines: [["Narx o'zgardi?", "sm"], ["muammo yo'q", "it"]] },
      { at: 4, lines: [["Rasm +", "sm"], ["1 bosish", "acc"]] },
      { at: 6, lines: [["QR menyu", "sm"], ["sayt", "acc"]] }
    ],
    vis: [
      { at: 0, v: "paper" },
      { at: 1, v: "update", chg: 1, noprint: 2 },
      { at: 4, v: "menuPhone", call: 5 },
      { at: 6, v: "price", what: "Menyu sayt", price: "30 000", sub: "so'mdan · 2–3 kunda tayyor" }
    ]
  },
  4: {
    tag: "Bilasizmi? 💡", out: "4-qr-fakt",
    chunks: [
      { c: "QR kod restoran uchun emas," }, { c: "mashina zavodi uchun ixtiro qilingan." },
      { c: "1994-yilda Yaponiyadagi Denso Wave kompaniyasi", s: "Bir ming to'qqiz yuz to'qson to'rtinchi yilda Yaponiyadagi Denso Wave kompaniyasi" },
      { c: "uni avtomobil detallarini tez sanash uchun yaratgan." },
      { c: "Oddiy shtrix-kodga qaraganda" }, { c: "unga ko'proq ma'lumot sig'adi." },
      { c: "Bugun esa menyu, to'lov," }, { c: "hatto Wi-Fi paroli ham QR kodda." },
      { c: "Kafengiz uchun QR menyu kerakmi?" }, { c: "Izohda yozing." }
    ],
    heads: [
      { at: 0, lines: [["QR kod", ""], ["mashina uchun?", "acc"]] },
      { at: 2, lines: [["Yaponiya", "sm"], ["1994", "acc"]] },
      { at: 4, lines: [["Shtrix-kod", "sm"], ["vs QR", "acc"]] },
      { at: 6, lines: [["Bugun —", "sm"], ["hamma joyda", "it"]] },
      { at: 8, lines: [["Sizga", "sm"], ["kerakmi?", "acc"]] }
    ],
    vis: [
      { at: 0, v: "factory" },
      { at: 2, v: "year", from: 1950, year: 1994, place: "🇯🇵 Yaponiya", who: "Denso Wave" },
      { at: 4, v: "vs" },
      { at: 6, v: "icons", items: [["📋", "Menyu", 6], ["💳", "To'lov", 6], ["📶", "Wi-Fi", 7]] },
      { at: 8, v: "comment", text: "Ha, kafemiz uchun kerak!" }
    ]
  },
  5: {
    tag: "Bilasizmi? 💡", out: "5-birinchi-sayt",
    chunks: [
      { c: "Dunyodagi birinchi sayt hali ham ishlaydi." },
      { c: "Uni 1991-yilda Tim Berners-Li CERN'da yaratgan.", s: "Uni bir ming to'qqiz yuz to'qson birinchi yilda Tim Berners-Li CERN'da yaratgan." },
      { c: "Ko'k havolalar va oq fon —" }, { c: "boshqa hech narsa yo'q." },
      { c: "35 yildan keyin sayt —", s: "O'ttiz besh yildan keyin sayt —" }, { c: "bu biznesning vizitkasi:" },
      { c: "telefonda ochiladi" }, { c: "va bir bosishda qo'ng'iroq qiladi." },
      { c: "Sizning biznesingizda sayt bormi?" }, { c: "Izohda yozing." }
    ],
    heads: [
      { at: 0, lines: [["Birinchi sayt", "sm"], ["hali ishlaydi", "acc"]] },
      { at: 1, lines: [["CERN", ""], ["1991", "acc"]] },
      { at: 2, lines: [["info.cern.ch", "sm"], ["shunaqa edi", "it"]] },
      { at: 4, lines: [["35 yildan", "sm"], ["keyin", "acc"]] },
      { at: 5, lines: [["Sayt —", "sm"], ["vizitka", "acc"]] },
      { at: 8, lines: [["Sizda", "sm"], ["bormi?", "acc"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "🌐", text: "1991 → hozir" },
      { at: 1, v: "year", from: 1950, year: 1991, place: "🇨🇭 CERN, Shveytsariya", who: "Tim Berners-Lee" },
      { at: 2, v: "cern" },
      { at: 4, v: "timeline" },
      { at: 5, v: "sitePhone", call: 7 },
      { at: 8, v: "comment", text: "Hali yo'q... kerak!" }
    ]
  },
  6: {
    tag: "Dasturlash", out: "6-ai-kod",
    chunks: [
      { c: "AI kod yozib berdi." }, { c: "Ko'pchilik aynan shu yerda xato qiladi." },
      { c: "Kodni nusxalab qo'yish — bu o'rganish emas." }, { c: "Xato chiqsa, nima qilishni bilmay qolasiz." },
      { c: "Men doim bitta savol beraman:" }, { c: "\"Har bir qatorni oddiy so'zlar bilan tushuntir.\"" },
      { c: "Keyin bitta qatorni o'zim o'zgartirib ko'raman." },
      { c: "Shunday qilib JavaScript'ni o'rganyapman." }, { c: "To'liq hikoya — YouTube kanalimda." }
    ],
    heads: [
      { at: 0, lines: [["AI kod", ""], ["yozdi", "acc"]] },
      { at: 1, lines: [["Keyin-chi?", "acc"]] },
      { at: 2, lines: [["Nusxa ≠", "sm"], ["o'rganish", "acc"]] },
      { at: 4, lines: [["1 ta", "sm"], ["savol", "acc"]] },
      { at: 6, lines: [["O'zim", "sm"], ["o'zgartiraman", "it"]] },
      { at: 8, lines: [["To'liq hikoya", "sm"], ["YouTube'da", "acc"]] }
    ],
    vis: [
      { at: 0, v: "code", dur: 1.6 },
      { at: 2, v: "copy" },
      { at: 3, v: "code", dur: .01, err: 3 },
      { at: 4, v: "chat", q: 5 },
      { at: 6, v: "code", dur: .01, hl: 6 },
      { at: 8, v: "cta", line: "YouTube: @ahdigital_01", url: "▶ YouTube kanal", small: "Scratch'dan o'z biznesimgacha" }
    ]
  },
  7: {
    tag: "Mac maslahat", out: "7-mac-tugmalar",
    chunks: [
      { c: "Mac'da shu 3 ta tugmani bilmasangiz,", s: "Mac'da shu uchta tugmani bilmasangiz," }, { c: "vaqtingiz ketyapti." },
      { c: "Birinchisi — Command va Space." }, { c: "Spotlight istalgan dastur yoki faylni 1 soniyada ochadi.", s: "Spotlight istalgan dastur yoki faylni bir soniyada ochadi." },
      { c: "Ikkinchisi — Command, Shift va 4.", s: "Ikkinchisi — Command, Shift va to'rt." }, { c: "Ekranning kerakli qismini skrinshot qiladi." },
      { c: "Uchinchisi — Command, Shift va 5.", s: "Uchinchisi — Command, Shift va besh." }, { c: "Ekranni videoga yozadi." },
      { c: "Men YouTube videolarimni shu bilan yozaman." }, { c: "Saqlab qo'ying!" }
    ],
    heads: [
      { at: 0, lines: [["Mac'da", "sm"], ["3 ta tugma", "acc"]] },
      { at: 2, lines: [["Spotlight", "acc"], ["tez qidiruv", "it"]] },
      { at: 4, lines: [["Skrinshot", "acc"], ["kerakli joy", "it"]] },
      { at: 6, lines: [["Ekranni", "sm"], ["yozish", "acc"]] },
      { at: 9, lines: [["Saqlab", ""], ["qo'ying 📌", "sm"]] }
    ],
    vis: [
      { at: 0, v: "keys", keys: ["⌘"], res: "clock" },
      { at: 2, v: "keys", keys: ["⌘", "Space"], res: "spot", r: 3 },
      { at: 4, v: "keys", keys: ["⌘", "⇧", "4"], res: "shot", r: 5 },
      { at: 6, v: "keys", keys: ["⌘", "⇧", "5"], res: "rec", r: 7 },
      { at: 9, v: "stamp", icon: "📌", text: "Saqlang", sub: "⌘ Space · ⌘⇧4 · ⌘⇧5" }
    ]
  }
  ,
  8: {
    tag: "Xavfsizlik", out: "8-tekshir-bot",
    chunks: [
      { c: "Shunday SMS keldimi?" }, { c: "Hech narsani bosmang." },
      { c: "Firibgarlar bankdan yozgandek qilib," }, { c: "SMS kodingizni so'raydi." },
      { c: "Kodni bersangiz — kartangiz bo'shaydi." },
      { c: "Men Tekshir degan bot yasadim." }, { c: "Shubhali xabarni botga uzatasiz —" },
      { c: "u bir necha soniyada aytadi: xavfli yoki yo'q." },
      { c: "Havolalarni ham tekshiradi." },
      { c: "Mana — c1ick: «l» o'rnida «1» raqami.", s: "Mana — klik so'zida \"l\" harfi o'rniga bir raqami turibdi." },
      { c: "Ko'z bilan sezish qiyin, bot esa darrov topadi." },
      { c: "Yashil — xavf topilmadi, sariq — ehtiyot bo'ling, qizil — ochmang." },
      { c: "Bu videoni ota-onangizga yuboring." }
    ],
    heads: [
      { at: 0, lines: [["Shunday SMS", "sm"], ["keldimi?", "acc"]] },
      { at: 2, lines: [["Bu bank", "sm"], ["emas!", "acc"]] },
      { at: 4, lines: [["Karta", "sm"], ["bo'shaydi", "acc"]] },
      { at: 5, lines: [["Men bot", "sm"], ["yasadim", "acc"]] },
      { at: 7, lines: [["Bir necha", "sm"], ["soniyada", "acc"]] },
      { at: 8, lines: [["Soxta", "sm"], ["havola", "acc"]] },
      { at: 9, lines: [["Sezdingizmi?", "sm"], ["1 ≠ L", "acc"]] },
      { at: 11, lines: [["3 ta", "sm"], ["javob", "acc"]] },
      { at: 12, lines: [["Oilangizga", "sm"], ["yuboring", "acc"]] }
    ],
    vis: [
      { at: 0, v: "tg", mode: "sms", hl: 3, msg: "Hurmatli mijoz! Kartangiz vaqtincha bloklandi. Blokdan chiqarish uchun <span class='mk'>SMS kodni</span> xavfsizlik xizmatiga yuboring. 1 soat ichida javob bermasangiz, pulingiz yo'qoladi!" },
      { at: 4, v: "stamp", icon: "💳", text: "0 so'm", bg: "#d94b3d", fs: 90 },
      { at: 5, v: "tg", mode: "bot", replyAt: 7,
        msg: "Hurmatli mijoz! Kartangiz vaqtincha bloklandi. Blokdan chiqarish uchun SMS kodni xavfsizlik xizmatiga yuboring…",
        reply: "<div class='ln' style='font-weight:900;font-size:27px;color:#ff6b5e'>🔴 XAVFLI</div><div class='ln' style='color:#9fb0c0;margin-top:8px'>Nima uchun:</div><div class='ln'>• «SMS kod» so'ralyapti — bank buni hech qachon so'ramaydi</div><div class='ln'>• Sizni shoshiltiryapti («1 soat ichida»)</div><div class='ln' style='margin-top:8px'>❌ Kodni hech kimga bermang</div>" },
      { at: 8, v: "tg", mode: "bot", hl: 9,
        msg: "Tabriklaymiz! Siz Click aksiyasida 1 000 000 so'm yutdingiz 🎁 Olish uchun: <span style='white-space:nowrap'>c<span class='mk'>1</span>ick-uz.com/bonus</span>",
        reply: "<div class='ln' style='font-weight:900;font-size:27px;color:#ff6b5e'>🔴 XAVFLI</div><div class='ln' style='color:#9fb0c0;margin-top:8px'>Nima uchun:</div><div class='ln'>• Sayt Click'ga o'xshatilgan, lekin rasmiy emas</div><div class='ln'>• Rasmiysi: <b style='color:#ffd7b5'>click.uz</b></div><div class='ln'>• «yutdingiz» — eng ko'p aldov usuli</div>" },
      { at: 11, v: "badges", items: [["✅", "Xavf yo'q"], ["🟡", "Ehtiyot bo'ling"], ["🔴", "Ochmang"]] },
      { at: 12, v: "cta", line: "📌 Bot havolasi — Telegram kanalimda", url: "@ahdigital_01", small: "🔗 Kanal havolasi — bio'da" }
    ]
  }
  ,
  9: {
    tag: "Claude skill", out: "9-claude-handoff",
    chunks: [
      { c: "Claude'da limit juda tez tugayaptimi?" }, { c: "Sababi oddiy:" },
      { c: "Claude har bir xabarda butun suhbatni boshidan qayta o'qiydi." },
      { c: "Suhbat qancha uzun bo'lsa, limit shuncha tez tugaydi." },
      { c: "Yangi chat ochsangiz-chi?" }, { c: "Unda hamma narsa unutiladi." },
      { c: "Shuning uchun Claude uchun skill yasadim —" }, { c: "Handoff." },
      { c: "«Yangi chatga o'tamiz» deb yozasiz —" }, { c: "Claude butun ishni qisqa xulosaga yig'adi." },
      { c: "Uni yangi chatga qo'yasiz," }, { c: "Claude hech narsani unutmasdan davom etadi." },
      { c: "Skill bepul." }, { c: "U Telegram kanalimda," }, { c: "havola bio'da." }
    ],
    heads: [
      { at: 0, lines: [["Limit", "sm"], ["tugadi?", "acc"]] },
      { at: 1, lines: [["Sababi", "sm"], ["oddiy", "acc"]] },
      { at: 4, lines: [["Yangi", "sm"], ["chat?", "acc"]] },
      { at: 6, lines: [["Men skill", "sm"], ["yasadim", "acc"]] },
      { at: 8, lines: [["Bitta", "sm"], ["buyruq", "acc"]] },
      { at: 10, lines: [["Hech narsa", "sm"], ["unutilmaydi", "acc"]] },
      { at: 12, lines: [["Bepul", "sm"], ["skill", "acc"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "⛔", text: "Limit 100%", bg: "#d94b3d", fs: 90 },
      { at: 2, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "147-xabar · uzun suhbat", typing: "Claude o'ylamoqda…", replyAt: 3,
        msg: "Kafe sayti uchun menyu sahifasini davom ettiraylik",
        reply: "<div class='ln'>♻️ Butun suhbatni boshidan qayta o'qiyapman…</div><div class='ln' style='color:#9fb0c0'>146 ta xabar · 95 000 token</div><div class='ln' style='font-weight:900;color:#ff6b5e;margin-top:8px'>⚠️ Limit 92% ishlatildi</div>" },
      { at: 4, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "yangi chat", typing: "Claude o'ylamoqda…", replyAt: 5,
        msg: "Davom etamiz! Menyu sahifasi qayerda qolgan edi?",
        reply: "<div class='ln'>Kechirasiz, qaysi loyiha haqida? 🤔</div><div class='ln' style='color:#9fb0c0'>Oldingi suhbatni ko'ra olmayman.</div>" },
      { at: 6, v: "stamp", icon: "🎁", text: "HANDOFF", sub: "Claude uchun skill" },
      { at: 8, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "eski chat", typing: "Claude xulosa yozmoqda…", replyAt: 9,
        msg: "yangi chatga o'tamiz",
        reply: "<div class='ln' style='font-family:monospace;font-weight:900;color:#ffd7b5'>HANDOFF — Kafe sayti</div><div class='ln'>🎯 Maqsad: kafe uchun sayt</div><div class='ln'>✅ Qarorlar: bepul hosting, o'zbekcha</div><div class='ln'>📍 Tayyor: bosh sahifa, aloqa</div><div class='ln'>➡️ Keyingi qadam: menyu sahifasi</div><div class='ln' style='color:#9fb0c0;margin-top:6px'>📋 Nusxalab, yangi chatga qo'ying</div>" },
      { at: 10, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "yangi chat", typing: "Claude o'ylamoqda…", replyAt: 11,
        msg: "<span style='font-family:monospace'>HANDOFF — Kafe sayti<br>🎯 kafe uchun sayt · ➡️ menyu sahifasi</span>",
        reply: "<div class='ln' style='font-weight:900;color:#5fd38d'>✅ Tushundim!</div><div class='ln'>Kafe sayti, bosh sahifa tayyor.</div><div class='ln'>Menyu sahifasidan davom etamiz 👇</div>" },
      { at: 12, v: "cta", line: "🎁 Skill — Telegram kanalimda", url: "@ahdigital_01", small: "🔗 Kanal havolasi — bio'da" }
    ]
  }
  ,
  10: {
    tag: "O'yin", out: "10-parol-qalasi",
    chunks: [
      { c: "Parolingiz qanchalik kuchli?" }, { c: "Buni o'yinda tekshirib ko'ring!" },
      { c: "Men «Parol qal'asi» degan o'yin yasadim." }, { c: "Siz qal'a qurasiz va unga parol qo'yasiz." },
      { c: "Boshqa o'yinchilar kamon bilan harflarni otib, parolingizni topishga harakat qiladi.", s: "Boshqa o'yinchilar esa kamon bilan harflarni otib, parolingizni topishga harakat qiladi." },
      { c: "Har bir xato — bitta jon.", t: 13.57 }, { c: "Qalqon o'qni to'sadi,", t: 15.49 }, { c: "shamol esa uni buradi.", t: 16.87 },
      { c: "Qal'angiz omon qolsa — ball olasiz.", t: 18.46 }, { c: "Mening qal'amni buza olasizmi?", t: 20.85 },
      { c: "O'yin havolasi Telegram kanalimda,", t: 22.63 }, { c: "havola bio'da.", t: 24.73 }
    ],
    heads: [
      { at: 0, lines: [["Parolingiz", "sm"], ["kuchlimi?", "acc"]] },
      { at: 2, lines: [["Parol", "sm"], ["qal'asi", "acc"]] },
      { at: 3, lines: [["Qal'a", "sm"], ["quring", "acc"]] },
      { at: 4, lines: [["Kamon bilan", "sm"], ["harf oting", "acc"]] },
      { at: 5, lines: [["Xato =", "sm"], ["−1 jon", "acc"]] },
      { at: 6, lines: [["Qalqon", "sm"], ["va shamol", "acc"]] },
      { at: 8, lines: [["Omon qolsa —", "sm"], ["ball", "acc"]] },
      { at: 9, lines: [["Qal'amni", "sm"], ["buza olasizmi?", "acc"]] },
      { at: 11, lines: [["Havola", "sm"], ["Telegramda", "acc"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "🔐", text: "Parolingiz kuchlimi?", bg: "#d94b3d", fs: 70 },
      { at: 1, v: "game", clip: "urish", from: 95, n: 152 },
      { at: 2, v: "stamp", icon: "🏰🏹", size: 200, text: "Parol qal'asi", sub: "Men yasagan o'yin 🎮" },
      { at: 3, v: "shot", src: "oyin/ekran-qurish.png" },
      { at: 4, v: "game", clip: "urish", from: 0, n: 152 },
      { at: 5, v: "game", clip: "xato", from: 22, n: 84 },
      { at: 6, v: "game", clip: "qalqon", from: 12, n: 78 },
      { at: 8, v: "shot", src: "oyin/ekran-xabar.png" },
      { at: 9, v: "game", clip: "qulash", from: 22, n: 121 },
      { at: 11, v: "cta", line: "🏰 O'yin havolasi — Telegram kanalimda", url: "@ahdigital_01", small: "🔗 Kanal havolasi — bio'da" }
    ]
  }
  ,
  11: {
    tag: "Yangilik", out: "11-jamoa-obunasi",
    chunks: [
      { c: "Kompaniyangizda kontent bilan bir nechta odam shug'ullanadimi?" },
      { c: "Har biri alohida yozadi, alohida to'laydi — tartib yo'q." },
      { c: "Shuning uchun saytimga yangi narsa qo'shdim —" },
      { c: "Jamoa obunasi." },
      { c: "Bitta obuna — butun jamoa uchun, uch kishidan besh kishigacha." },
      { c: "Har bir xodim saytdan o'zi buyurtma beradi." },
      { c: "Kim nima buyurtma bergani, bu oy qancha ishlatilgani — hammasi jamoa kabinetida." },
      { c: "Xodim qo'shish uchun bitta havola yuborasiz, xolos." },
      { c: "Har oy boshida esa hisobot Telegram'ga keladi." },
      { c: "Hozircha faqat bitta jamoa uchun joy bor." },
      { c: "Batafsil — Telegram kanalimda," }, { c: "havola bio'da." }
    ],
    heads: [
      { at: 0, lines: [["Bir nechta", "sm"], ["xodim?", "acc"]] },
      { at: 1, lines: [["Har biri", "sm"], ["alohida", "acc"]] },
      { at: 2, lines: [["Yangilik", "sm"], ["AHdigital'da", "acc"]] },
      { at: 3, lines: [["Jamoa", "sm"], ["obunasi", "acc"]] },
      { at: 4, lines: [["3–5", "sm"], ["kishi", "acc"]] },
      { at: 5, lines: [["Har kim", "sm"], ["o'zi buyurtma", "acc"]] },
      { at: 6, lines: [["Jamoa", "sm"], ["kabineti", "acc"]] },
      { at: 7, lines: [["Bitta", "sm"], ["havola", "acc"]] },
      { at: 8, lines: [["Oylik", "sm"], ["hisobot", "acc"]] },
      { at: 9, lines: [["Faqat", "sm"], ["1 ta joy", "acc"]] },
      { at: 10, lines: [["Batafsil", "sm"], ["Telegramda", "acc"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "👥", text: "Bir&nbsp;nechta&nbsp;xodim?", fs: 60 },
      { at: 1, v: "stamp", icon: "😵‍💫", text: "Tartib yo'q", bg: "#d94b3d", fs: 80 },
      { at: 2, v: "stamp", icon: "🎁", text: "Yangilik", sub: "ah-digital.uz" },
      { at: 3, v: "shot", src: "jamoa/1-karta.png" },
      { at: 5, v: "shot", src: "jamoa/5-forma.png" },
      { at: 6, v: "shot", src: "jamoa/2-kabinet.png" },
      { at: 7, v: "shot", src: "jamoa/3-azolar.png" },
      { at: 8, v: "shot", src: "jamoa/4-hisobot.png" },
      { at: 9, v: "stamp", icon: "⚠️", text: "Faqat&nbsp;1&nbsp;ta&nbsp;joy", bg: "#d94b3d", fs: 64 },
      { at: 10, v: "cta", line: "👥 Jamoa obunasi — batafsil", url: "@ahdigital_01", small: "🔗 Kanal havolasi — bio'da" }
    ]
  }
  ,
  12: {
    tag: "Claude maslahat", out: "12-claude-tushunmayapti",
    chunks: [
      { c: "Claude sizni tushunmayaptimi?" },
      { c: "Muammo Claude'da emas — buyruqda." },
      { c: "Ko'pchilik shunday yozadi: «menga sayt yasab ber»." },
      { c: "Natija — bo'sh, inglizcha, umumiy sahifa." },
      { c: "Chunki Claude fikringizni o'qiy olmaydi." },
      { c: "Yaxshi buyruqning uchta qismi bor." },
      { c: "Birinchi — kim uchun: uyda tort pishiradigan biznes uchun." },
      { c: "Ikkinchi — nima kerak: narxlar, buyurtma tugmasi va aloqa." },
      { c: "Uchinchi — qanday: o'zbek tilida, pushti ranglarda, telefonda chiroyli." },
      { c: "Mana farq!" },
      { c: "Tayyor shablon va beshta buyruq — Telegram kanalimda," }, { c: "havola bio'da." }
    ],
    heads: [
      { at: 0, lines: [["Claude sizni", "sm"], ["tushunmayaptimi?", "acc"]] },
      { at: 2, lines: [["Ko'pchilikning", "sm"], ["xatosi", "acc"]] },
      { at: 4, lines: [["Claude fikr", "sm"], ["o'qimaydi", "acc"]] },
      { at: 5, lines: [["Yaxshi buyruq", "sm"], ["= 3 qism", "acc"]] },
      { at: 9, lines: [["Mana", "sm"], ["farq!", "acc"]] },
      { at: 11, lines: [["Tekin", "sm"], ["shablon", "acc"]] }
    ],
    vis: [
      { at: 0, v: "stamp", icon: "🤔", text: "Tushunmayaptimi?", fs: 64 },
      { at: 2, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "yangi chat", typing: "Claude yozmoqda…", replyAt: 3,
        msg: "menga sayt yasab ber",
        reply: "<div class='ln' style='font-family:monospace;color:#9fb0c0'>&lt;h1&gt;Welcome to My Website&lt;/h1&gt;</div><div class='ln' style='font-family:monospace;color:#9fb0c0'>&lt;p&gt;Lorem ipsum dolor sit amet…&lt;/p&gt;</div><div class='ln' style='font-weight:900;color:#ff6b5e;margin-top:8px'>❌ Bo'sh · inglizcha · umumiy</div>" },
      { at: 4, v: "stamp", icon: "🧠❓", size: 200, text: "Fikr o'qimaydi", bg: "#d94b3d", fs: 64 },
      { at: 5, v: "steps", items: [[6, "<b>Kim uchun?</b><br><span style='font-weight:600;font-size:34px'>tort pishiradigan biznes</span>", "👩‍🍳"], [7, "<b>Nima kerak?</b><br><span style='font-weight:600;font-size:34px'>narxlar, tugma, aloqa</span>", "📋"], [8, "<b>Qanday?</b><br><span style='font-weight:600;font-size:34px'>o'zbekcha, pushti, telefonga mos</span>", "🎨"]] },
      { at: 9, v: "tg", mode: "bot", plain: true, name: "Claude", avatar: "✳️", abg: "#c96442", sub: "yangi chat", typing: "Claude yozmoqda…", replyAt: 9,
        msg: "Uyda tort pishiradigan «Shirin Tortlar» biznesi uchun sayt yasa: narxlar, buyurtma tugmasi, aloqa. O'zbek tilida, pushti ranglarda, telefonda chiroyli bo'lsin.",
        reply: "<div class='ln' style='font-weight:900;color:#ff9ec4;font-size:26px'>🎂 Shirin Tortlar</div><div class='ln'>Uyda, mehr bilan pishirilgan tortlar</div><div class='ln'>🍰 Medovik — 150 000 so'm</div><div class='ln'>🍫 Napoleon — 140 000 so'm</div><div class='ln' style='font-weight:900;color:#5fd38d;margin-top:8px'>✅ Buyurtma berish →</div>" },
      { at: 11, v: "cta", line: "📥 Tekin shablon + 5 ta buyruq", url: "@ahdigital_01", small: "🔗 Telegram — havola bio'da" }
    ]
  }
};
