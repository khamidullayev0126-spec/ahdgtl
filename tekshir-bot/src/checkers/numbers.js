// Telefon va karta raqamlarini xabardan topish (7-bosqich).
// MUHIM: bu fayl raqamlarni faqat TOPADI. Bazaga raqamning o'zi emas, faqat hash'i yoziladi (db.hash).
// Raqam ekranda ham to'liq ko'rsatilmaydi — o'rtasi yulduzcha bilan yopiladi.

// O'zbekiston mobil va shahar kodlari (+998 dan keyingi 2 raqam)
const UZ_CODES = new Set(["20", "33", "50", "55", "61", "62", "65", "66", "67", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "88", "90", "91", "93", "94", "95", "97", "98", "99"]);
// Karta boshlanishi: Uzcard 8600, Humo 9860, Uzcard Co-badge 5614/6262, Visa 4, Mastercard 5/2
const CARD_PREFIX = /^(8600|9860|5614|6262|4|5[1-5]|2[2-7])/;

// 16 raqam (bo'shliq yoki chiziqcha bilan bo'lishi mumkin): 8600 1234 5678 9012
const CARD_RE = /(?<!\d)(?:\d{4}[ \-]?){3}\d{4}(?!\d)/g;
// Telefon: +998 90 123 45 67, 998901234567, (90) 123-45-67, 90 123 45 67, 901234567
const PHONE_RE = /(?<![\d+])(?:\+?998[\s\-]?)?\(?\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}(?!\d)/g;

const digitsOf = s => s.replace(/\D/g, "");

function maskCard(d) { return `${d.slice(0, 4)} **** **** ${d.slice(-4)}`; }
function maskPhone(d) { return `+998 ${d.slice(3, 5)} *** ** ${d.slice(-2)}`; }

// Natija: [{ kind: "card" | "phone", digits: "8600...", masked: "8600 **** **** 9012" }]
function extractNumbers(text) {
  const out = [];
  const seen = new Set();
  // Avval kartalar — keyin ularni matndan olib tashlaymiz, aks holda karta bo'lagi telefon bo'lib ko'rinadi
  let rest = text;
  for (const m of text.matchAll(CARD_RE)) {
    const d = digitsOf(m[0]);
    if (!CARD_PREFIX.test(d) || seen.has(d)) continue;
    seen.add(d);
    out.push({ kind: "card", digits: d, masked: maskCard(d) });
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(PHONE_RE)) {
    let d = digitsOf(m[0]);
    if (d.length === 9) d = "998" + d;
    if (d.length !== 12 || !d.startsWith("998") || !UZ_CODES.has(d.slice(3, 5)) || seen.has(d)) continue;
    seen.add(d);
    out.push({ kind: "phone", digits: d, masked: maskPhone(d) });
  }
  return out.slice(0, 5);          // bitta xabarda 5 tadan ko'p raqamni tekshirmaymiz
}

// Shikoyatlar soniga qarab ball. Diqqat: shikoyat — bu DALIL EMAS, shuning uchun
// faqat shikoyatning o'zi hech qachon "🔴 XAVFLI" bermaydi (eng ko'pi 50 ball → 🟡).
function reportPoints(n) {
  if (n >= 10) return 50;
  if (n >= 3) return 35;
  if (n >= 1) return 15;
  return 0;
}

module.exports = { extractNumbers, reportPoints, maskCard, maskPhone };
