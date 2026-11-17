// Matn tekshiruvi (4-bosqich): firibgarlik so'zlari va ball tizimi.
// Xabar matni hech qayerda SAQLANMAYDI — faqat shu yerda tekshiriladi va natija (sabablar) qaytariladi.

const K = require("../../data/scam-keywords.json");

// Matnni bir xil ko'rinishga keltiramiz: kichik harf, har xil apostroflar → ', ё → е, ortiqcha bo'shliqlar → bitta
function normalize(text) {
  return String(text || "").toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

// So'z boshidan qidiramiz: "bonus" topiladi, lekin "sabonus" ichidan emas.
// (?<!\p{L}) — "oldida harf yo'q" degani; u bayrog'i kirill harflari uchun kerak.
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GROUPS = K.groups.map(g => ({ ...g, re: new RegExp(`(?<![\\p{L}])(${g.p.map(esc).join("|")})`, "iu") }));

// Inkor: "SMS kodni hech kimga aytmang" — bu ogohlantirish, firibgarlik emas.
// Topilgan so'zning atrofidagi 40 belgida inkor so'zi bo'lsa — bu guruh hisoblanmaydi.
function negated(text, index, length) {
  const around = text.slice(Math.max(0, index - 40), index + length + 40);
  return K.negation.some(n => around.includes(n));
}

function analyzeText(raw) {
  const text = normalize(raw);
  const found = new Map();                    // guruh id → topilgan so'z
  for (const g of GROUPS) {
    const m = text.match(g.re);
    if (!m) continue;
    if (g.neg && negated(text, m.index, m[0].length)) continue;
    found.set(g.id, { points: g.points, word: m[1] });
  }
  const reasons = [...found.entries()].map(([id, x]) => ({ code: "txt_" + id, points: x.points, vars: { word: x.word } }));
  // Xavfli birikmalar: masalan "yutdingiz" + "karta raqamingizni yuboring"
  for (const c of K.combos) if (c.need.every(id => found.has(id))) reasons.push({ code: "txt_combo", points: c.points, vars: {} });
  return { host: "", reasons, groups: [...found.keys()] };
}

module.exports = { analyzeText, normalize };
