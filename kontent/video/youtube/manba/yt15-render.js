// «Claude bilan 15 daqiqada sayt» — 15 daqiqalik YouTube video (16:9).
// Ovoz: ../15daq/ovoz/00.mp3 … 21.mp3 (har bo'lim alohida). Ovoz bo'lmasa — taxminiy vaqt bilan OVOZSIZ ko'rinish.
// Ishlatish: node yt15-render.js [fps] [masshtab]     tez ko'rish: node yt15-render.js 5 0.35
const { chromium } = require("playwright");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const [fps = 30, scale = 1] = process.argv.slice(2).map(Number);
const DIR = path.join(__dirname, "../15daq"), OUT = path.join(__dirname, "..");
const B = JSON.parse(fs.readFileSync(path.join(DIR, "bolimlar.json"), "utf8"));
const split = t => t.split(/(?<=[.!?»])\s+(?=[A-ZА-ЯЎҚҒҲ«O"])|\n/).map(s => s.trim()).filter(Boolean);
const CHAP = 2.4, TAIL = .5, CPS = 19.7;
const voice = i => path.join(DIR, "ovoz", String(i).padStart(2, "0") + ".mp3");
const HAVE = B.every((_, i) => fs.existsSync(voice(i)));
const dur = f => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString();

// Bo'lim ichidagi gaplar vaqti: ovozdagi pauzalarga «yopishtiramiz»
function sectionTimes(i, sents) {
  const w = sents.map(s => s.length), tot = w.reduce((a, b) => a + b, 0);
  if (!HAVE) {
    const ts = []; let x = 0; sents.forEach(s => { ts.push(x); x += s.length / CPS + .35; });
    return { ts, len: x };
  }
  const f = voice(i), D = dur(f);
  const err = spawnSync("ffmpeg", ["-i", f, "-af", "silencedetect=n=-32dB:d=0.14", "-f", "null", "-"]).stderr.toString();
  const S = [...err.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]), E = [...err.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  let sil = S.map((s, k) => ({ s, e: E[k] ?? D }));
  let s0 = 0, s1 = D;
  if (sil.length && sil[0].s < .05) { s0 = sil[0].e; sil.shift(); }
  if (sil.length && sil[sil.length - 1].e >= D - .05) { s1 = sil[sil.length - 1].s; sil.pop(); }
  const ts = [Math.max(0, s0 - .05)]; let cum = 0, used = -1;
  for (let k = 1; k < w.length; k++) {
    cum += w[k - 1]; const est = s0 + (s1 - s0) * cum / tot;
    let best = -1, bd = 1.6;
    sil.forEach((x, j) => { const dd = Math.abs((x.s + x.e) / 2 - est); if (j > used && dd < bd && x.e > ts[ts.length - 1] + .5) { bd = dd; best = j; } });
    if (best >= 0) { ts.push(sil[best].e - .04); used = best; } else ts.push(Math.max(est, ts[ts.length - 1] + .5));
  }
  return { ts, len: D };
}

// Umumiy vaqt chizig'i
const SEC = [], chunks = []; let T = 0;
B.forEach((b, i) => {
  const title = b.title.replace(/^\d+b?\.\s*/, "");
  const chapT = i > 0 ? T : null; if (i > 0) { chunks.push({ t: T, text: "" }); T += CHAP; }
  const sents = split(b.text), st = sectionTimes(i, sents);
  SEC.push({ i, title, start: T, chapT, ts: st.ts.map(x => T + x), sents });
  sents.forEach((s, k) => chunks.push({ t: T + st.ts[k], text: s }));
  T += st.len + TAIL;
});
const END = T + 1.5;
const R = (s, k = 0, off = 0) => SEC[s].ts[Math.min(k, SEC[s].ts.length - 1)] + off;

const GOOD = `Uyda tort pishiradigan «Shirin Tortlar» biznesi uchun bitta sahifali sayt yasab ber.
Til: o'zbekcha. Telefonda chiroyli ko'rinsin.

Bo'limlar:
1. Bosh qism: nomi, qisqa shior va «Buyurtma berish» tugmasi
2. Tortlar: 6 ta tort — nomi, qisqa tavsifi, narxi (so'mda)
3. Qanday buyurtma beriladi: 3 qadam
4. Mijozlar fikri: 3 ta qisqa sharh
5. Aloqa: telefon, Telegram tugmasi, ish vaqti

Uslub: iliq, pushti va krem ranglar, yumaloq burchaklar, katta shrift.
Rasmlar o'rniga emoji ishlat. Hammasi bitta HTML faylda bo'lsin.`;
const RING1 = [581, 353, 239, 85], RING2 = [509, 353, 383, 112];
const it = (t, icon, text, sub) => ({ t, icon, text, sub });

// Sahnalar: [boshlanish vaqti, sahna]
const SC = [
  // 1. Kirish
  [R(0, 0), { type: "hook", img: "v4" }],
  [R(0, 4), { type: "web", seq: [{ t: R(0, 4), img: "v4", y: 0, y2: .95, label: "🎂 Shirin Tortlar" }] }],
  [R(0, 6), { type: "list", title: "Istalgan biznesga", items: [it(R(0, 6, .3), "✂️", "Sartaroshxona"), it(R(0, 6, .8), "☕", "Kafe"), it(R(0, 6, 1.3), "🧵", "Tikuvchi"), it(R(0, 6, 1.8), "👨‍💻", "Portfolio")] }],
  [R(0, 8), { type: "toc", titles: B.map(b => b.title.replace(/^\d+b?\.\s*/, "")) }],
  // 2. Nima kerak
  [R(1, 0), { type: "list", title: "Nima kerak?", items: [it(R(1, 1), "💻", "Kompyuter yoki telefon", "kompyuterda qulayroq"), it(R(1, 3), "✳️", "claude.ai", "bepul versiya ham yetadi"), it(R(1, 6), "👨‍👩‍👦", "18 yoshgacha", "akkauntni ota-ona bilan"), it(R(1, 7), "🎯", "Aniq reja", "eng muhimi!")] }],
  [R(1, 10), { type: "artifact" }],
  // 3. Ma'lumot yig'ish
  [R(2, 0), { type: "list", title: "Sayt uchun ma'lumot 📝", cols: 1, items: [it(R(2, 3), "1️⃣", "Nom va shior", "Shirin Tortlar — «Uyda, mehr bilan pishirilgan mazali tortlar»"), it(R(2, 5), "2️⃣", "Mahsulot va narxlar", "6 xil tort, har birining narxi"), it(R(2, 8), "3️⃣", "Buyurtma usuli", "telefon yoki Telegram"), it(R(2, 9), "4️⃣", "Aloqa va ish vaqti", "+998 90 000 00 00 · 9:00–20:00 (namuna)"), it(R(2, 10), "5️⃣", "Uslub", "iliq pushti va krem ranglar 🎀")] }],
  [R(2, 13), { type: "compare", title: "Saytga nima yoziladi?", left: { t: R(2, 13, .5), color: "#3f8f5a", title: "✅ Yozsa bo'ladi", lines: ["Biznes telefoni", "Ish vaqti", "Narxlar", "Telegram havolasi"] }, right: { t: R(2, 14), color: "#e53935", title: "❌ Yozmang", lines: ["Uy manzilingiz", "Shaxsiy hujjatlar", "Karta raqamlari", "Parollar"] } }],
  // 4. Yomon va yaxshi buyruq
  [R(3, 1), { type: "chat", tag: "❌ Yomon buyruq", prompt: "menga sayt yasab ber", cps: 9, replyT: R(3, 3, -.6), reply: "Mana oddiy sayt: «Welcome to My Website», About, Services, Contact…" }],
  [R(3, 3), { type: "web", url: "my-website", seq: [{ t: R(3, 3), img: "v0", y: 0, label: "❌ Inglizcha, bo'sh, zerikarli" }] }],
  [R(3, 5), { type: "formula", items: [it(R(3, 6), "👥", "Kim uchun?", "uyda tort pishiradigan «Shirin Tortlar» biznesi"), it(R(3, 7), "🧩", "Nima kerak?", "bosh qism, tortlar, buyurtma tartibi, sharhlar, aloqa"), it(R(3, 8), "🎨", "Qanday ko'rinishda?", "o'zbekcha, pushti-krem ranglar, katta shrift, telefonga mos")], extra: { t: R(3, 9), text: "➕ Texnik istak: «hammasi bitta HTML faylda bo'lsin»" } }],
  [R(3, 11), { type: "chat", tag: "✅ 1-buyruq", prompt: GOOD, cps: 150, replyT: 1e9, reply: "" }],
  // 5. Tayyor ma'lumot
  [R(4, 0), { type: "chat", tag: "📎 Rasm bilan", attach: true, prompt: "Shu rasmdagi tortlar va narxlarni saytga qo'y", cps: 25, replyT: R(4, 4), reply: "Rasmdagi 6 ta tort va narxni saytga qo'shdim ✅", warn: "⚠️ Raqamlarni albatta o'zingiz tekshiring", warnT: R(4, 5) }],
  // 6. Birinchi natija
  [R(5, 0), { type: "chat", tag: "✅ 1-buyruq", prompt: GOOD, cps: 9999, replyT: R(5, 1), reply: "Tayyor! «Shirin Tortlar» uchun bitta sahifali sayt: bosh qism, 6 ta tort, 3 qadam, sharhlar va aloqa 🎂" }],
  [R(5, 3), { type: "web", seq: [{ t: R(5, 3), img: "v1", y: 0, y2: .92, label: "🎉 Birinchi natija" }] }],
  [R(5, 9), { type: "list", title: "Tekshiruv: 3 ta savol 🔍", cols: 1, items: [it(R(5, 11), "❓", "Hamma ma'lumot to'g'rimi?"), it(R(5, 12), "❓", "Mijoz nima qilishni tushunadimi?"), it(R(5, 13), "❓", "Asosiy tugma ko'zga tashlanadimi?")] }],
  [R(5, 14), { type: "web", seq: [{ t: R(5, 14), img: "v1", y: 0, label: "🤏 Tugma juda kichkina", ring: RING1 }] }],
  // 7. O'zgartirishlar
  [R(6, 0), { type: "big", icon: "☝️", text: "1 xabar = 1 o'zgarish", sub: "Oltin qoida" }],
  [R(6, 2), { type: "chat", tag: "2-buyruq", prompt: "«Buyurtma berish» tugmasini kattaroq qil va bosilganda Telegram ochilsin", cps: 30, replyT: R(6, 3, -.8), reply: "Tayyor! Tugma kattalashdi ✈️" }],
  [R(6, 3), { type: "web", seq: [{ t: R(6, 3), img: "v2", y: 0, label: "✈️ Katta tugma → Telegram", ring: RING2 }] }],
  [R(6, 4), { type: "hover" }],
  [R(6, 7), { type: "web", seq: [{ t: R(6, 7), img: "v2", y: 1, label: "🎁 10% chegirma banneri" }] }],
  [R(6, 9), { type: "big", icon: "🗣", text: "Kodga tegmadim", sub: "Oddiy o'zbek tilida aytdim — xolos" }],
  // 8. Ranglar va versiyalar
  [R(7, 1), { type: "chat", tag: "5-buyruq", prompt: "Ranglarni ko'k va oq qilib o'zgartir", cps: 22, replyT: R(7, 2, -.5), reply: "Tayyor! Ranglar ko'k va oq 💙" }],
  [R(7, 2), { type: "web", seq: [{ t: R(7, 2), img: "v-kok", y: 0, y2: .3, label: "💙 Ko'k variant", pill: "Versiya 6" }, { t: R(7, 8), img: "v2", y: 0, label: "💗 Oldingi versiya qaytdi", pill: "↩ Versiya 5" }] }],
  [R(7, 10), { type: "big", icon: "🔁", text: "Tajriba qilishdan qo'rqmang", sub: "Yoqmasa — bir bosishda qaytarasiz" }],
  // 9. Yangi bo'limlar
  [R(8, 1), { type: "list", title: "Mijozlarning savollari 💬", cols: 1, items: [it(R(8, 1, .8), "📅", "Necha kun oldin buyurtma beriladi?"), it(R(8, 1, 2), "🚚", "Yetkazib berish bormi?"), it(R(8, 1, 3.2), "💳", "To'lov qanday?")] }],
  [R(8, 3), { type: "chat", tag: "6-buyruq", prompt: "Aloqa bo'limidan oldin savol-javob bo'limini qo'sh: buyurtma muddati, yetkazib berish, to'lov va maxsus buyurtmalar haqida 4 ta savol. Savol bosilganda javob ochilsin", cps: 45, replyT: R(8, 5, -.8), reply: "Tayyor! Savol-javob bo'limi qo'shildi ✅" }],
  [R(8, 5), { type: "web", seq: [{ t: R(8, 5), img: "v3-faq", y: 0, label: "❓ Savol-javob" }, { t: R(8, 5, 2.2), img: "v3-faq2", y: 0, label: "👆 Bosilganda ochiladi" }] }],
  [R(8, 6), { type: "chat", tag: "7-buyruq", prompt: "Tortlar bo'limidan keyin galereya qo'sh", cps: 22, replyT: R(8, 7, -.6), reply: "Tayyor! Galereya qo'shildi 🖼" }],
  [R(8, 7), { type: "web", seq: [{ t: R(8, 7), img: "v3-gal", y: 0, label: "🖼 Galereya" }] }],
  [R(8, 8), { type: "compare", title: "Qanday rasmlar?", left: { t: R(8, 8, .4), color: "#3f8f5a", title: "✅ Mumkin", lines: ["O'zingiz olgan rasmlar", "Ishlatishga ruxsat berilgan rasmlar"] }, right: { t: R(8, 9), color: "#e53935", title: "❌ Mumkin emas", lines: ["Internetdan birovning rasmi", "Boshqa do'konning rasmlari"] } }],
  // 9b. Haqiqiy rasmlar
  [R(9, 0), { type: "list", title: "Haqiqiy rasmlar 📷", cols: 1, items: [it(R(9, 1), "💡", "Yaxshi yorug'lik, oddiy fon"), it(R(9, 2), "🏷", "Oddiy nom", "medovik.jpg · napoleon.jpg")] }],
  [R(9, 3), { type: "folder", lines: [{ t: R(9, 3, .3), d: 0, text: "📁 shirin-tortlar" }, { t: R(9, 3, .8), d: 1, text: "📄 index.html" }, { t: R(9, 3, 1.3), d: 1, text: "📁 rasmlar" }, { t: R(9, 3, 1.8), d: 2, text: "🖼 medovik.jpg" }, { t: R(9, 3, 2.2), d: 2, text: "🖼 napoleon.jpg" }, { t: R(9, 3, 2.6), d: 2, text: "🖼 shokoladli.jpg" }] }],
  [R(9, 5), { type: "size" }],
  // 10. Matnlar
  [R(10, 2), { type: "chat", tag: "8-buyruq", prompt: "Saytdagi matnlarni iliqroq va ishonchliroq qilib qayta yoz, lekin yolg'on va'dalar va o'ylab topilgan raqamlar qo'shma", cps: 40, replyT: R(10, 6, -1), reply: "Tayyor! Matnlar yangilandi, faqat haqiqat ✍️", warn: "❌ «1000+ mamnun mijoz» — rost bo'lmasa, yozilmaydi", warnT: R(10, 4) }],
  [R(10, 6), { type: "compare", left: { t: R(10, 6, .3), color: "#9a9a9a", title: "Oldin", lines: ["Uyda, mehr bilan pishirilgan mazali tortlar", "Medovik: asalli qatlamlar, smetanali krem"] }, right: { t: R(10, 6, 1.5), color: "#3f8f5a", title: "Keyin ✨", lines: ["Har bir tort — buyurtma bo'yicha, yangi mahsulotlardan", "Medovik: asal hidli yupqa qatlamlar va mayin krem"] } }],
  // 11. Xato
  [R(11, 0), { type: "phonefix", fixT: R(11, 6) }],
  [R(11, 3), { type: "compare", title: "Muammoni qanday yozish kerak?", left: { t: R(11, 4), color: "#e53935", title: "❌ Yomon", lines: ["«ishlamayapti, tuzat»"] }, right: { t: R(11, 5), color: "#3f8f5a", title: "✅ Yaxshi", lines: ["«Telefonda galereya rasmlari bir-birining ustiga chiqib qolyapti, tuzat»", "+ 📸 skrinshot"] } }],
  [R(11, 6), { type: "phonefix", fixT: R(11, 6, 1) }],
  // 11b. Limit
  [R(12, 0), { type: "list", title: "Bepul limitni tejash 🔋", items: [it(R(12, 2), "📝", "Avval o'ylab yozing", "1 yaxshi buyruq > 10 tuzatish"), it(R(12, 4), "🔢", "2–3 tasini raqamlab", "bog'liq kichik o'zgarishlar"), it(R(12, 8), "🆕", "Yangi suhbat", "oxirgi kodni yuborib davom eting"), it(R(12, 10), "✏️", "Kichik narsani o'zingiz", "masalan, bitta narx")] }],
  // 12. Telefon
  [R(13, 0), { type: "phone", img: "mob4", checks: [{ t: R(13, 5), text: "Matn yirikmi?" }, { t: R(13, 6), text: "Tugmalar bosishga qulaymi?" }, { t: R(13, 7), text: "Hech narsa chetga chiqmayaptimi?" }] }],
  // 13. SEO
  [R(14, 2), { type: "chat", tag: "9-buyruq", prompt: "Saytga Google uchun sarlavha va tavsif qo'sh, havola ulashilganda chiqadigan ma'lumotlarni ham sozla", cps: 40, replyT: R(14, 3, -.5), reply: "Tayyor! Sarlavha, tavsif va ulashish ma'lumotlari qo'shildi 🔎" }],
  [R(14, 3), { type: "seo", tabT: R(14, 4), prevT: R(14, 4, 2.5) }],
  [R(14, 5), { type: "big", icon: "⏳", text: "Google'da 1-o'rin — vaqt talab qiladi", sub: "Lekin bu yaxshi boshlanish" }],
  // 14. Internetga chiqarish
  [R(15, 0), { type: "list", title: "Internetga chiqarish — bepul 🌐", cols: 2, items: [it(R(15, 2), "1️⃣", "Claude'da «Publish»", "bir bosish → havola tayyor"), it(R(15, 6), "2️⃣", "Netlify Drop", "o'z faylingiz bilan, domen uchun qulay")] }],
  [R(15, 8), { type: "folder", lines: [{ t: R(15, 9), d: 0, text: "⬇️ Claude'dan faylni yuklab oling" }, { t: R(15, 10), d: 0, text: "📁 shirin-tortlar" }, { t: R(15, 10, .8), d: 1, text: "📄 index.html  ← nomi muhim!" }] }],
  [R(15, 12), { type: "netlify", dropT: R(15, 12, 1), urlT: R(15, 13), renameT: R(15, 14, 2), kid: { t: R(15, 15), text: "👨‍👩‍👦 18 yoshgacha — akkauntni ota-ona bilan oching" } }],
  // 14b. Yangilash
  [R(16, 0), { type: "big", icon: "🔄", text: "Saytni yangilab turing", sub: "Narxlar o'zgaradi, yangi tortlar qo'shiladi" }],
  [R(16, 4), { type: "chat", tag: "1-yo'l", prompt: "Medovik narxini 170 000 so'm qil", cps: 22, replyT: R(16, 4, 2.8), reply: "Tayyor! Medovik — 170 000 so'm ✅" }],
  [R(16, 5), { type: "editor", findT: R(16, 5, 1.5), editT: R(16, 6) }],
  [R(16, 7), { type: "netlify", dropT: R(16, 7, .3), urlT: R(16, 7, 1.6), renameT: 0 }],
  // 15. Boshqa bizneslar
  [R(17, 0), { type: "templates", items: [
    { t: R(17, 2), icon: "✂️", title: "Sartaroshxona", bg: "#1f1e24", fg: "#f2d38a", text: "Ustoz Barber uchun sayt.<br>Bo'limlar: xizmatlar va narxlar, ustalar, ish vaqti, Telegram orqali yozilish.<br>Uslub: qora va oltin, zamonaviy." },
    { t: R(17, 5), icon: "☕", title: "Kafe", bg: "#eef6e8", fg: "#2f5d3a", text: "Lazzat kafesi uchun sayt.<br>Bo'limlar: menyu narxlari bilan, kunlik taom, yetkazib berish, aloqa.<br>Uslub: yashil va krem." },
    { t: R(17, 8), icon: "👨‍💻", title: "Portfolio", bg: "#1b2347", fg: "#e8ecff", text: "Men 15 yoshli dasturchi o'quvchiman. Portfolio sayt.<br>Bo'limlar: men haqimda, loyihalar, ko'nikmalar, aloqa.<br>Uslub: zamonaviy, qorong'i." }] }],
  [R(17, 12), { type: "formula", items: [it(R(17, 12, .2), "👥", "Kim uchun?", ""), it(R(17, 12, .9), "🧩", "Nima kerak?", ""), it(R(17, 12, 1.6), "🎨", "Qanday ko'rinishda?", "")] }],
  // 15b. Pul topish
  [R(18, 0), { type: "list", title: "Bu ko'nikma bilan halol pul 💼", items: [it(R(18, 3), "🎁", "2–3 ta sayt bepul", "→ portfoliongiz"), it(R(18, 5), "🗣", "Rost gapiring", "nima qila olasiz, nima qila olmaysiz"), it(R(18, 7), "🤝", "Narx va muddat", "oldindan kelishib oling"), it(R(18, 8), "👨‍👩‍👦", "Ota-ona ishtirokida", "18 yoshgacha — albatta")] }],
  // 16. Keyin nima
  [R(19, 0), { type: "list", title: "Saytni ishlating 🚀", items: [it(R(19, 2), "📸", "Instagram bio", "havolani qo'ying"), it(R(19, 3), "✈️", "Telegram", "kanal va guruhlarda ulashing"), it(R(19, 4), "💬", "Mijozlarga", "«saytda hammasi bor»")] }],
  [R(19, 6), { type: "big", icon: "🌐", text: "shirintortlar.uz", sub: "O'z domeningiz — keyingi videoda" }],
  // 17. Halol xulosa
  [R(20, 0), { type: "honest", t1: R(20, 0, .3), t2: R(20, 2) }],
  [R(20, 3), { type: "list", title: "Eng ko'p uchraydigan 5 ta xato ⚠️", cols: 1, items: [it(R(20, 4), "1️⃣", "Juda qisqa buyruq"), it(R(20, 5), "2️⃣", "Birdaniga 10 ta o'zgarish"), it(R(20, 6), "3️⃣", "Telefonda tekshirmaslik"), it(R(20, 7), "4️⃣", "Shaxsiy ma'lumot yozish"), it(R(20, 8), "5️⃣", "Matnni o'qib chiqmaslik")] }],
  [R(20, 9), { type: "big", icon: "💡", text: "Rejani siz tuzasiz, tekshiruvni ham siz qilasiz", sub: "Claude — kuchli yordamchi" }],
  // 18. Yakun
  [R(21, 0), { type: "cta" }]
];
// Bo'lim kartochkalari va har bir sahnaga bo'lim nomi
SEC.forEach(s => { if (s.chapT != null) SC.push([s.chapT, { type: "chapter", n: s.i + 1, title: s.title }]); });
SC.sort((a, b) => a[0] - b[0]);
const scenes = SC.map(([t, sc]) => {
  const start = Math.max(0, sc.type === "chapter" ? t : t - .15);
  const sec = [...SEC].reverse().find(s => (s.chapT ?? s.start) <= t + .01);
  return { ...sc, start, ch: sc.type === "chapter" ? "" : `${sec.i + 1}. ${sec.title}` };
});

(async () => {
  console.log(`🎬 ${HAVE ? "OVOZ BILAN" : "OVOZSIZ (taxminiy vaqt)"} — ${(END / 60).toFixed(1)} daqiqa, ${scenes.length} sahna`);
  const imgDir = path.join(__dirname, "img"), imgs = {};
  for (const f of fs.readdirSync(imgDir)) imgs[path.basename(f, ".png")] = "img/" + f;
  const spec = { chunks, scenes, end: END, speechEnd: END - 1.5 };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yt15-"));
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "yt15.html"));
  await p.evaluate(([s, i]) => window.setup(s, i), [spec, imgs]);
  let n = 0;
  for (let t = 0; t < END; t += 1 / fps) {
    await p.evaluate(tt => window.render(tt), t);
    await p.screenshot({ path: path.join(dir, String(n++).padStart(6, "0") + ".jpg"), type: "jpeg", quality: scale < 1 ? 75 : 90 });
    if (n % 500 === 0) console.log(`  ${n} kadr (${(t / 60).toFixed(1)} daq)`);
  }
  await br.close();
  if (errs.length) console.log("⚠️ xatolar:", errs.slice(0, 5));
  const video = path.join(dir, "v.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%06d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "30" : "19", video]);
  const name = path.join(OUT, (scale < 1 || !HAVE ? "korish-" : "") + "claude-15-daqiqada-sayt.mp4");
  if (HAVE) {
    const ins = [], filt = [];
    SEC.forEach((s, k) => { ins.push("-i", voice(k)); const ms = Math.round(s.start * 1000); filt.push(`[${k}:a]adelay=${ms}|${ms}[v${k}]`); });
    const chapT = SEC.filter(s => s.chapT != null).map(s => s.chapT);
    chapT.forEach((c, k) => { ins.push("-f", "lavfi", "-i", "anoisesrc=d=0.35:c=pink:a=0.5,highpass=f=900,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.15:d=0.2,volume=0.12"); const ms = Math.round((c + .1) * 1000); filt.push(`[${SEC.length + k}:a]adelay=${ms}|${ms}[w${k}]`); });
    const all = SEC.map((_, k) => `[v${k}]`).join("") + chapT.map((_, k) => `[w${k}]`).join("");
    const mix = `${filt.join(";")};${all}amix=inputs=${SEC.length + chapT.length}:normalize=0,apad=pad_dur=3,loudnorm=I=-14:TP=-1.5:LRA=9[a]`;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...ins, "-i", video, "-filter_complex", mix, "-map", `${SEC.length + chapT.length}:v`, "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(END), "-movflags", "+faststart", name]);
  } else fs.copyFileSync(video, name);
  fs.rmSync(dir, { recursive: true });
  // YouTube bo'limlari (chapters) — tavsif uchun
  const fmt = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  fs.writeFileSync(path.join(DIR, "bolimlar-vaqt.txt"), SEC.map(s => `${fmt(s.chapT ?? 0)} ${s.title}`).join("\n") + "\n");
  console.log(`✅ ${path.basename(name)} (${n} kadr, ${(END / 60).toFixed(1)} daq)`);
})();
