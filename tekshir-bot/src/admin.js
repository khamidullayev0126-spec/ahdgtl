// Admin buyruqlari (6-bosqich): /stats va /export.
// Adminlar .env dagi ADMIN_IDS ro'yxatida: ADMIN_IDS=123456789,987654321
// O'z ID'ingizni bilish: Telegram'da @userinfobot ga /start yozing.

const adminIds = () => (process.env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean).map(Number);
const isAdmin = id => adminIds().includes(Number(id));

const LANG_NAMES = { "uz-latn": "O'zbek (lotin)", "uz-cyrl": "O'zbek (kirill)", ru: "Rus" };
const pct = (n, total) => total ? Math.round(n * 100 / total) + "%" : "0%";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Statistikani o'qishga qulay matnga aylantiramiz (admin uchun — o'zbekcha)
function formatStats(s) {
  const L = s.levels, total = s.checks;
  const lines = [
    "📊 <b>Tekshir — statistika</b>",
    "",
    "👥 <b>Foydalanuvchilar</b>",
    `Jami: <b>${s.users}</b>`,
    `Bugun yangi: ${s.usersToday} · 7 kunda yangi: ${s.usersWeek}`,
    `7 kunda faol: ${s.activeWeek}`,
    "",
    "🔍 <b>Tekshiruvlar</b>",
    `Jami: <b>${total}</b> · bugun: ${s.checksToday} · 7 kunda: ${s.checksWeek}`,
    `✅ Xavfsiz: ${L.safe} (${pct(L.safe, total)})`,
    `🟡 Shubhali: ${L.suspicious} (${pct(L.suspicious, total)})`,
    `🔴 Xavfli: ${L.danger} (${pct(L.danger, total)})`,
    "",
    `🔗 Havola: ${s.kinds.url || 0} · 💬 Matn: ${s.kinds.text || 0} · 📎 Fayl: ${s.kinds.file || 0}`
  ];
  if (s.reports !== undefined) {
    const k = Object.fromEntries((s.reportedTargets || []).map(r => [r.kind, r.n]));
    lines.push("", "📢 <b>Shikoyatlar</b>", `Jami: ${s.reports} · 7 kunda: ${s.reportsWeek}`,
      `Raqamlar: 📞 ${k.phone || 0} · 💳 ${k.card || 0} · 🌐 ${k.domain || 0}`);
  }
  if (s.groups !== undefined) lines.push("", "👥 <b>Guruhlar</b>", `Jami: ${s.groups} · faol: ${s.groupsActive} · ogohlantirishlar: ${s.groupWarnings}`);
  if (s.langs.length) lines.push("", "🌐 <b>Tillar</b>", ...s.langs.map(l => `${LANG_NAMES[l.lang] || l.lang}: ${l.n}`));
  if (s.topDanger.length) lines.push("", "🚨 <b>Eng ko'p xavfli chiqqan domenlar</b>", ...s.topDanger.map((d, i) => `${i + 1}. <code>${esc(d.domain)}</code> — ${d.danger} marta`));
  if (s.topReasons.length) lines.push("", "🧩 <b>Eng ko'p sabablar</b>", ...s.topReasons.map(r => `<code>${esc(r.code)}</code> — ${r.n}`));
  return lines.join("\n");
}

module.exports = { isAdmin, adminIds, formatStats };
