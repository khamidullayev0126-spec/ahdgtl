// Kengaytma uchun tashqi API — bot mexanizmi ustida yupqa qobiq.
// Hammasi kompyuterda (brauzerda) bajariladi: internetga hech narsa yuborilmaydi.
const { analyzeText } = require("src/checkers/text");
const { extractUrls, analyzeUrl } = require("src/checkers/url");
const { analyzeFileName } = require("src/checkers/file");
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

module.exports = { checkPage, checkText, adviceKeys, fileInText, t, levelOf, LANGS };
