// Ballarni yig'ish va xavf darajasini aniqlash.
// 0–29 → safe (✅), 30–69 → suspicious (🟡), 70–100 → danger (🔴)

const K = require("../data/scam-keywords.json");

function levelOf(score) {
  if (score >= 70) return "danger";
  if (score >= 30) return "suspicious";
  return "safe";
}

// Bir nechta tekshiruv natijasini (masalan, xabardagi 3 ta havola) bitta xulosaga birlashtiradi.
// Ball: eng xavfli havolaning bali (havolalar ko'p bo'lgani uchun ball oshib ketmasin).
function combine(results) {
  let score = 0;
  const reasons = [];
  const seen = new Set();
  for (const r of results) {
    const s = Math.min(100, r.reasons.reduce((a, x) => a + x.points, 0));
    score = Math.max(score, s);
    for (const x of r.reasons) {
      const key = x.code + JSON.stringify(x.vars);
      if (!seen.has(key)) { seen.add(key); reasons.push({ ...x, host: r.host }); }
    }
  }
  // Rasmiy sayt sababi faqat boshqa xavf topilmaganda ko'rsatiladi
  const risky = reasons.filter(x => x.points > 0);
  return { score, level: levelOf(score), reasons: risky.length ? risky.sort((a, b) => b.points - a.points) : reasons };
}

// Havolalar + matn natijasini birlashtirish (4-bosqich).
// Ikkalasi ham shubhali bo'lsa (masalan, "SMS kodni yuboring" + soxta havola) — xavf yanada oshadi: +20.
// Firibgar matn guruhi + shubhali havola (data/scam-keywords.json → url_combo) — ham ball oshadi.
// extra — qo'shimcha natijalar (7-bosqich: raqamlar/domenlar ustidan shikoyatlar)
function combineAll(urlResults = [], textResult = null, fileResult = null, extra = []) {
  const parts = [...urlResults, ...extra.filter(r => r.reasons.length)];
  if (textResult && textResult.reasons.length) parts.push(textResult);
  if (fileResult) parts.push(fileResult);
  const res = combine(parts);
  const sum = r => Math.min(100, r.reasons.reduce((a, x) => a + x.points, 0));
  const urlMax = Math.max(0, ...urlResults.map(sum));
  const textScore = textResult ? sum(textResult) : 0;
  // Firibgar matn guruhi (sovrin, posilka, ovoz, pul o'tkazish) + ball olgan rasmiy bo'lmagan havola.
  // «yutdingiz» (25) + «.click» (25) alohida 30 ga yetmaydi, lekin birga — tipik aldov. Ikkala qo'shimcha (+20 va url_combo) bir-biriga qo'shilmaydi.
  const uc = K.url_combo;
  const linkScam = !!uc && !!textResult && (textResult.groups || []).some(g => uc.groups.includes(g)) &&
    urlResults.some(r => !r.trusted && sum(r) > 0);
  const bonus = urlMax >= 30 && textScore >= 30 ? 20 : linkScam ? uc.points : 0;
  if (bonus) {
    res.score = Math.min(100, res.score + bonus);
    res.level = levelOf(res.score);
  }
  res.hasUrl = urlResults.length > 0;
  res.hasFile = !!fileResult;
  res.groups = textResult ? textResult.groups : [];
  return res;
}

module.exports = { levelOf, combine, combineAll };
