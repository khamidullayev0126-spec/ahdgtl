// Natijani foydalanuvchiga chiroyli, sodda javob qilib yig'ish.
const { InlineKeyboard } = require("grammy");
const { t } = require("./i18n");

// HTML'da xavfli belgilarni zararsizlantiramiz. Domenni <code> ichida yozamiz —
// shunda Telegram uni bosiladigan havolaga aylantirmaydi (foydalanuvchi tasodifan ochib yubormasin).
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildReply(lang, result, botUsername) {
  const head = t(lang, `level_${result.level}`);
  // Domen va so'zlarni <code> ichida, brend nomini oddiy matn bilan yozamiz
  const CODE = ["real", "tld", "word", "host"];
  const reasons = result.reasons.slice(0, 4).map(r => "• " + t(lang, r.code, Object.fromEntries(Object.entries(r.vars || {}).map(([k, v]) => [k, CODE.includes(k) ? `<code>${esc(v)}</code>` : esc(v)]))));
  let text = `<b>${head}</b>`;
  if (reasons.length) text += `\n\n${t(lang, "why")}\n${reasons.join("\n")}`;
  text += `\n\n${t(lang, "what_to_do")}\n${t(lang, `advice_${result.level}`)}`;

  // Tugmalar: shikoyat (7-bosqichda ishlaydi) va oilaga ulashish (Telegram'ning "ulashish" oynasi)
  const share = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/" + botUsername)}&text=${encodeURIComponent(t(lang, "share_text"))}`;
  const kb = new InlineKeyboard();
  if (result.level !== "safe") kb.text(t(lang, "btn_report"), "report");
  kb.url(t(lang, "btn_share"), share);
  return { text, reply_markup: kb };
}

module.exports = { buildReply, esc };
