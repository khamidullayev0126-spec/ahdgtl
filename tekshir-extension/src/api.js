// Kengaytma uchun tashqi API — bot mexanizmi ustida yupqa qobiq.
// Hammasi kompyuterda (brauzerda) bajariladi: internetga hech narsa yuborilmaydi.
const { analyzeText } = require("src/checkers/text");
const { extractUrls, analyzeUrl } = require("src/checkers/url");
const { analyzeFileName } = require("src/checkers/file");
const { extractNumbers } = require("src/checkers/numbers");
const { combine, combineAll, levelOf } = require("src/scoring");
const RULES = require("data/url-rules.json");
const LOCALES = require("locales");

const LANGS = ["uz-latn", "uz-cyrl", "ru"];

function hostOf(u) {
  try { return new URL(u).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); } catch { return ""; }
}

// Botdagi checkUrls(…, { fast: true }) bilan bir xil: qisqartirilgan havola internetsiz ochilmaydi — «kutilmoqda»
function urlPart(url) {
  const host = hostOf(url);
  if (host && RULES.shorteners.includes(host))
    return { url, host, trusted: false, pending: true, reasons: [{ code: "url_shortener_wait", points: 15, vars: {} }] };
  return analyzeUrl(url);
}

/** Ochilgan sahifa manzilini tekshirish (sahifaning ichi o'qilmaydi). */
function checkPage(href) {
  const part = urlPart(href);
  const r = combine([part]);
  r.host = part.host || hostOf(href);
  r.trusted = !!part.trusted;
  r.hasUrl = true; r.hasFile = false; r.groups = [];
  return r;
}

// «Rasmlar.apk» kabi fayl nomi matn ichida bo'lsa — fayl sifatida ham tekshiriladi (Android ilovadagi Scan bilan bir xil)
const FILE_RE = /[^\s/\\"'«»()<>]{1,80}\.(apk|xapk|apks|exe|msi|scr|bat|cmd|vbs|jar)(?![\p{L}\p{N}])/iu;
function fileInText(text) { const m = String(text || "").match(FILE_RE); return m ? m[0] : null; }

/** Xabar yoki havolani tekshirish — botdagi kabi: havolalar + matn + fayl nomi. */
function checkText(text) {
  const urls = extractUrls(text);
  const file = fileInText(text);
  const r = combineAll(urls.map(urlPart), analyzeText(text), file ? { host: "", reasons: analyzeFileName(file) } : null);
  r.pending = urls.some(u => urlPart(u).pending);
  return r;
}

/** Maslahat kalitlari — botdagi reply.js advice() bilan bir xil tartib. */
function adviceKeys(r) {
  if (r.level === "safe") return ["adv_safe"];
  const out = [];
  const g = r.groups || [];
  if (r.level === "danger") {
    if (r.hasFile) out.push("adv_no_install");
    if (r.hasUrl) out.push("adv_no_open");
    out.push("adv_no_code");
    if (g.some(x => ["transfer", "money", "prize", "parcel"].includes(x))) out.push("adv_no_money");
    out.push(r.hasFile ? "adv_installed" : "adv_call_bank");
  } else {
    if (r.hasFile) out.push("adv_file_wait");
    if (r.hasUrl) out.push("adv_wait");
    out.push("adv_check_official");
    out.push("adv_no_code");
  }
  return out;
}

function t(lang, key, vars = {}) {
  const l = LANGS.includes(lang) ? lang : LANGS[0];
  let s = LOCALES[l][key] ?? LOCALES[LANGS[0]][key] ?? key;
  for (const [k, v] of Object.entries(vars || {})) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/**
 * Serverga yuboriladigan qism: faqat havolalar va telefon/karta raqamlari (xabar matni emas).
 * Server ular bo'yicha Google/VirusTotal va shikoyatlar bazasini tekshiradi. Bo'sh — serverga hech narsa kerak emas.
 */
function onlinePart(text) {
  const urls = extractUrls(text);
  const nums = extractNumbers(String(text || "")).map(n => n.kind === "phone" ? "+" + n.digits : n.digits);
  return [...urls, ...nums].join("\n");
}

// ---------- 🔳 QR kod (Android'dagi QrCheck bilan bir xil: tekshir-android/.../engine/Help.kt) ----------
// Natija: { kind, text, fields, notes, check } — check: mexanizmga beriladigan matn (bo'sh — tekshiradigan narsa yo'q).
// Wi-Fi paroli hech qachon olinmaydi.
function qr(raw) {
  const s = String(raw || "").trim(), low = s.toLowerCase();
  let kind = "text", text = s, fields = {};
  if (!s) kind = "empty";
  else if (low.startsWith("wifi:")) {
    const f = {}; let cur = "", esc = false;
    const flush = () => { const i = cur.indexOf(":"); if (i > 0) f[cur.slice(0, i).toUpperCase()] = cur.slice(i + 1); cur = ""; };
    for (const c of s.slice(5)) { if (esc) { cur += c; esc = false; } else if (c === "\\") esc = true; else if (c === ";") flush(); else cur += c; }
    flush();
    const tt = (f.T || "").toUpperCase();
    const security = !tt || tt === "NOPASS" ? "nopass" : tt.startsWith("WPA") ? "wpa" : tt === "WEP" ? "wep" : tt.toLowerCase();
    kind = "wifi"; text = f.S || ""; fields = { ssid: f.S || "", security, hidden: f.H || "false" };
  } else if (low.startsWith("tel:")) { kind = "tel"; text = s.slice(4).trim(); }
  else if (low.startsWith("smsto:")) {
    const rest = s.slice(6), i = rest.indexOf(":");
    kind = "sms"; text = i < 0 ? rest.trim() : rest.slice(i + 1).trim(); fields = { to: (i < 0 ? rest : rest.slice(0, i)).trim() };
  } else if (low.startsWith("sms:")) {
    const rest = s.slice(4), m = rest.match(/[?&]body=([^&]*)/);
    let body = ""; if (m) { try { body = decodeURIComponent(m[1]); } catch { body = m[1]; } }
    kind = "sms"; text = body; fields = { to: rest.split("?")[0].trim() };
  } else if (low.startsWith("mailto:") || low.startsWith("matmsg:")) kind = "email";
  else if (low.startsWith("geo:")) kind = "geo";
  else if (/^(https?:\/\/|www\.)/.test(low)) kind = "url";
  const check = ["url", "text", "email", "tel"].includes(kind) ? text
    : kind === "sms" ? [text, fields.to].filter(Boolean).join("\n") : "";
  const notes = kind === "wifi" ? [fields.security === "nopass" ? "qr_wifi_open" : "qr_wifi"]
    : kind === "tel" ? ["qr_tel"] : kind === "sms" ? ["qr_sms"] : kind === "geo" ? ["qr_geo"]
    : kind === "url" && low.startsWith("http://") ? ["qr_http"] : [];
  return { kind, text, fields, notes, check };
}

/** Ilova uchun tayyor natija (iPhone ilovasi chizadi): daraja, sarlavha, sabablar, maslahatlar, serverga ketadigan qism. */
function view(text, lang) {
  const r = checkText(text);
  return {
    level: r.level, score: r.score, title: t(lang, "level_" + r.level),
    reasons: r.reasons.filter(x => x.points > 0).slice(0, 5).map(x => t(lang, x.code, x.vars)),
    advice: adviceKeys(r).map(k => t(lang, k)),
    online: onlinePart(text), pending: !!r.pending
  };
}

module.exports = { checkPage, checkText, adviceKeys, fileInText, onlinePart, view, qr, t, levelOf, LANGS };
