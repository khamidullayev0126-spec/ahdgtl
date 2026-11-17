// Natijani foydalanuvchiga chiroyli, sodda javob qilib yig'ish.
const { InlineKeyboard } = require("grammy");
const { t } = require("./i18n");

// HTML'da xavfli belgilarni zararsizlantiramiz. Domenni <code> ichida yozamiz —
// shunda Telegram uni bosiladigan havolaga aylantirmaydi (foydalanuvchi tasodifan ochib yubormasin).
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Maslahatlar vaziyatga qarab: havola bo'lmasa "havolani ochmang" demaymiz, pul so'ralgan bo'lsa "pul o'tkazmang" qo'shamiz
function advice(lang, r) {
  const g = r.groups || [];
  if (r.level === "safe") return [t(lang, "adv_safe")];
  const out = [];
  if (r.level === "danger") {
    if (r.hasFile) out.push(t(lang, "adv_no_install"));
    if (r.hasUrl) out.push(t(lang, "adv_no_open"));
    out.push(t(lang, "adv_no_code"));
    if (g.some(x => ["transfer", "money", "prize", "parcel"].includes(x))) out.push(t(lang, "adv_no_money"));
    out.push(t(lang, r.hasFile ? "adv_installed" : "adv_call_bank"));
  } else {
    if (r.hasFile) out.push(t(lang, "adv_file_wait"));
    if (r.hasUrl) out.push(t(lang, "adv_wait"));
    out.push(t(lang, "adv_check_official"));
    out.push(t(lang, "adv_no_code"));
  }
  return out;
}

// opts.numbers — [{ masked, count }] topilgan raqamlar va ular ustidan shikoyatlar soni (7-bosqich)
// opts.reportId — "Shikoyat qilish" tugmasi uchun qisqa kod. Shikoyat qiladigan narsa bo'lmasa — tugma yo'q
function buildReply(lang, result, botUsername, opts = {}) {
  const head = t(lang, `level_${result.level}`);
  // Domen va so'zlarni <code> ichida, brend nomini oddiy matn bilan yozamiz
  const CODE = ["real", "tld", "word", "host", "ext", "name"];
  const reasons = result.reasons.filter(r => !r.hidden).slice(0, 4).map(r => "• " + t(lang, r.code, Object.fromEntries(Object.entries(r.vars || {}).map(([k, v]) => [k, CODE.includes(k) ? `<code>${esc(v)}</code>` : esc(v)]))));
  let text = `<b>${head}</b>`;
  if (reasons.length) text += `\n\n${t(lang, "why")}\n${reasons.join("\n")}`;
  // Raqamlar bloki: faqat shikoyatlar SONI. Bot hech qachon "bu odam firibgar" demaydi
  const nums = opts.numbers || [];
  if (nums.length) {
    const rows = nums.map(n => "• " + t(lang, n.count ? "num_count" : "num_none", { num: `<code>${esc(n.masked)}</code>`, n: n.count }));
    text += `\n\n${t(lang, "num_title")}\n${rows.join("\n")}\n${t(lang, "num_note")}`;
  }
  text += `\n\n${t(lang, "what_to_do")}\n${advice(lang, result).join("\n")}`;

  // Tugmalar: shikoyat va oilaga ulashish (Telegram'ning "ulashish" oynasi)
  const share = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/" + botUsername)}&text=${encodeURIComponent(t(lang, "share_text"))}`;
  const kb = new InlineKeyboard();
  if (opts.reportId) kb.text(t(lang, "btn_report"), `rep:${opts.reportId}`);
  kb.url(t(lang, "btn_share"), share);
  return { text, reply_markup: kb };
}

module.exports = { buildReply, esc };
