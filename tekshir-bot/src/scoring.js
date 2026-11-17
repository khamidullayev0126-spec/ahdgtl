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

module.exports = { levelOf, combine };
