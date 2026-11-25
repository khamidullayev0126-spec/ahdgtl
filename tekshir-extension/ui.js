// Popup va natija oynasi uchun umumiy: natija kartasini chizish.
(function (g) {
  const E = g.TekshirEngine, S = g.TekshirText;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /** r — E.checkText() yoki E.checkPage() natijasi. withAdvice — «Nima qilish kerak» ham chiqsinmi. */
  function renderResult(r, lang, withAdvice = true) {
    const box = el("div", "card res " + r.level);
    box.append(el("div", "lvl", E.t(lang, "level_" + r.level)));
    const reasons = r.reasons.filter(x => x.points > 0 || r.level === "safe").map(x => E.t(lang, x.code, x.vars));
    if (reasons.length && r.level !== "safe") {
      box.append(el("div", "kicker", E.t(lang, "why")));
      const ul = el("ul"); reasons.forEach(t => ul.append(el("li", null, t))); box.append(ul);
    } else if (reasons.length) box.append(el("div", "muted", reasons[0]));
    if (withAdvice) {
      box.append(el("div", "kicker", E.t(lang, "what_to_do")));
      E.adviceKeys(r).forEach(k => box.append(el("div", null, E.t(lang, k))));
    }
    if (r.pending) box.append(el("div", "muted", S.s(lang, "pending")));
    return box;
  }
  g.TekshirUI = { renderResult, el };
})(globalThis);
