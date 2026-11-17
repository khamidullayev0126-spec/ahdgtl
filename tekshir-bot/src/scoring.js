// Ballarni yig'ish va xavf darajasini aniqlash.
// 0–29 → safe (✅), 30–69 → suspicious (🟡), 70–100 → danger (🔴)

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
function combineAll(urlResults = [], textResult = null) {
  const parts = textResult && textResult.reasons.length ? [...urlResults, textResult] : urlResults;
  const res = combine(parts);
  const sum = r => Math.min(100, r.reasons.reduce((a, x) => a + x.points, 0));
  const urlMax = Math.max(0, ...urlResults.map(sum));
  const textScore = textResult ? sum(textResult) : 0;
  if (urlMax >= 30 && textScore >= 30) {
    res.score = Math.min(100, res.score + 20);
    res.level = levelOf(res.score);
  }
  res.hasUrl = urlResults.length > 0;
  res.groups = textResult ? textResult.groups : [];
  return res;
}

module.exports = { levelOf, combine, combineAll };
