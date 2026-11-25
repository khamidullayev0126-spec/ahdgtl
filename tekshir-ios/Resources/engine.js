// AVTOMATIK YARATILGAN FAYL — qo'lda tahrirlamang. Manba: tekshir-bot/src va src/api.js. Yangilash: node build.js
// Tekshir tekshiruv mexanizmi (Telegram bot bilan bir xil). Internetga hech narsa yubormaydi.
// URL o'rinbosari — faqat `URL` YO'Q muhitlar uchun (iPhone'dagi JavaScriptCore). Brauzer va Node'da ishlamaydi.
// Mexanizmga kerak bo'lgani: protocol, username, password, hostname (punycode «xn--» bilan), port, pathname, search, hash.
// Xalqaro harfli domenlar (masalan kirill «с» bilan «сlick.uz») — xuddi brauzerdagidek «xn--…» ko'rinishiga o'tadi:
// firibgarlikni aynan shu belgi bo'yicha ushlaymiz (url_punycode).
(function (g) {
  if (typeof g.URL === "function") return;

  // ---- Punycode (RFC 3492), faqat kodlash ----
  const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;
  const digit = d => String.fromCharCode(d + 22 + 75 * (d < 26));
  function adapt(delta, num, first) {
    let k = 0;
    delta = first ? Math.floor(delta / DAMP) : delta >> 1;
    delta += Math.floor(delta / num);
    for (; delta > ((BASE - TMIN) * TMAX) >> 1; k += BASE) delta = Math.floor(delta / (BASE - TMIN));
    return Math.floor(k + ((BASE - TMIN + 1) * delta) / (delta + SKEW));
  }
  function encode(input) {
    const cps = Array.from(input).map(c => c.codePointAt(0));
    let n = INITIAL_N, delta = 0, bias = INITIAL_BIAS, out = "";
    for (const c of cps) if (c < 128) out += String.fromCharCode(c);
    const b = out.length; let h = b;
    if (b) out += "-";
    while (h < cps.length) {
      let m = Infinity;
      for (const c of cps) if (c >= n && c < m) m = c;
      delta += (m - n) * (h + 1); n = m;
      for (const c of cps) {
        if (c < n) delta++;
        if (c === n) {
          let q = delta;
          for (let k = BASE; ; k += BASE) {
            const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
            if (q < t) break;
            out += digit(t + ((q - t) % (BASE - t)));
            q = Math.floor((q - t) / (BASE - t));
          }
          out += digit(q);
          bias = adapt(delta, h + 1, h === b);
          delta = 0; h++;
        }
      }
      delta++; n++;
    }
    return out;
  }
  const toASCII = host => host.split(".").map(l => /[^\x00-\x7f]/.test(l) ? "xn--" + encode(l.normalize("NFC")) : l).join(".");

  const RE = /^([a-z][a-z0-9+.\-]*:)\/\/(?:([^:@\/?#]*)(?::([^@\/?#]*))?@)?(\[[^\]]*\]|[^\/?#:]*)(?::(\d*))?([^?#]*)(\?[^#]*)?(#.*)?$/i;
  class URL {
    constructor(href) {
      const m = RE.exec(String(href).trim());
      if (!m || !m[4]) throw new TypeError("Invalid URL: " + href);
      this.protocol = m[1].toLowerCase();
      this.username = m[2] || "";
      this.password = m[3] || "";
      let host = m[4].toLowerCase();
      try { host = decodeURIComponent(host); } catch { /* o'zgarishsiz */ }
      this.hostname = toASCII(host);
      const defPort = { "http:": "80", "https:": "443" }[this.protocol];
      this.port = m[5] && m[5] !== defPort ? m[5] : "";
      this.pathname = m[6] || "/";
      this.search = m[7] && m[7] !== "?" ? m[7] : "";
      this.hash = m[8] && m[8] !== "#" ? m[8] : "";
      this.host = this.hostname + (this.port ? ":" + this.port : "");
      this.origin = this.protocol + "//" + this.host;
    }
    get href() {
      const auth = this.username ? this.username + (this.password ? ":" + this.password : "") + "@" : "";
      return this.protocol + "//" + auth + this.host + this.pathname + this.search + this.hash;
    }
    toString() { return this.href; }
  }
  g.URL = URL;
})(typeof globalThis !== "undefined" ? globalThis : this);

(function (g) {
"use strict";
const M = {}, C = {};
function require(k) {
  if (C[k]) return C[k].exports;
  if (!M[k]) throw new Error("Tekshir: modul topilmadi: " + k);
  const m = { exports: {} }; C[k] = m; M[k](m, m.exports, require);
  return m.exports;
}
M["src/checkers/text"] = function (module, exports, require) {
// Matn tekshiruvi (4-bosqich): firibgarlik so'zlari va ball tizimi.
// Xabar matni hech qayerda SAQLANMAYDI — faqat shu yerda tekshiriladi va natija (sabablar) qaytariladi.

const K = require("data/scam-keywords.json");

// Matnni bir xil ko'rinishga keltiramiz: kichik harf, har xil apostroflar → ', ё → е, ortiqcha bo'shliqlar → bitta
function normalize(text) {
  return String(text || "").toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

// So'z boshidan qidiramiz: "bonus" topiladi, lekin "sabonus" ichidan emas.
// (?<!\p{L}) — "oldida harf yo'q" degani; u bayrog'i kirill harflari uchun kerak.
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GROUPS = K.groups.map(g => ({ ...g, re: new RegExp(`(?<![\\p{L}])(${g.p.map(esc).join("|")})`, "iu") }));

// Inkor: "SMS kodni hech kimga aytmang" — bu ogohlantirish, firibgarlik emas.
// Topilgan so'zning atrofidagi 40 belgida inkor so'zi bo'lsa — bu guruh hisoblanmaydi.
function negated(text, index, length) {
  const around = text.slice(Math.max(0, index - 40), index + length + 40);
  return K.negation.some(n => around.includes(n));
}

function analyzeText(raw) {
  const text = normalize(raw);
  const found = new Map();                    // guruh id → topilgan so'z
  for (const g of GROUPS) {
    const m = text.match(g.re);
    if (!m) continue;
    if (g.neg && negated(text, m.index, m[0].length)) continue;
    found.set(g.id, { points: g.points, word: m[1] });
  }
  const reasons = [...found.entries()].map(([id, x]) => ({ code: "txt_" + id, points: x.points, vars: { word: x.word } }));
  // Xavfli birikmalar: masalan "yutdingiz" + "karta raqamingizni yuboring"
  for (const c of K.combos) if (c.need.every(id => found.has(id))) reasons.push({ code: "txt_combo", points: c.points, vars: {} });
  return { host: "", reasons, groups: [...found.keys()] };
}

module.exports = { analyzeText, normalize };

};
M["src/checkers/url"] = function (module, exports, require) {
// Havola tekshiruvi (2-bosqich: tashqi API'siz, faqat qoidalar).
// Har bir qoida "sabab" qaytaradi: { code, points, vars }.  code — locales'dagi matn kaliti, points — xavf bali.
// Bot havolani O'ZI OCHMAYDI. Faqat qisqartirilgan havolalarda "qayerga yo'naltiradi?" degan
// sarlavhani (redirect) so'raydi — sahifaning ichini yuklab olmaydi va ishga tushirmaydi.

const TRUSTED = require("data/trusted-domains.json").domains;
const RULES = require("data/url-rules.json");
const { externalReasons } = require("src/checkers/external");

// ---------- 1. Matndan havolalarni topish ----------
// http:// bilan yoki usiz yozilgan havolalarni topadi ("https://click.uz@yomon.top" kabi aldovni ham butunligicha): "https://click.uz", "bit.ly/abc", "c1ick-uz.com/bonus"
const URL_RE = /\b((?:https?:\/\/(?:[^\s\/@]+@)?)?(?:(?:[a-z0-9¡-\uffff](?:[a-z0-9¡-\uffff-]*[a-z0-9¡-\uffff])?\.)+[a-z¡-\uffff]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d{2,5})?(?:[/?#][^\s<>"'«»]*)?)/gi;

function extractUrls(text = "", entities = []) {
  const found = new Set();
  // Telegram "yashirin" havolalari: matnda "Bu yerni bosing", ichida esa boshqa manzil (text_link)
  for (const e of entities || []) if (e.type === "text_link" && e.url) found.add(e.url);
  for (const m of text.matchAll(URL_RE)) {
    let u = m[1].replace(/[.,!?;:)\]]+$/, "");              // gap oxiridagi tinish belgilarini olib tashlaymiz
    if (/^[\d.]+$/.test(u) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(u)) continue; // "5.000" kabi sonlar havola emas
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    found.add(u);
  }
  return [...found].slice(0, 10);                            // bitta xabarda ko'pi bilan 10 ta havola
}

// ---------- 2. Yordamchi funksiyalar ----------
function parse(url) { try { return new URL(url); } catch { return null; } }
// new URL() o'zbekcha/kirillcha harfli domenlarni avtomatik "xn--..." (punycode) ko'rinishiga o'tkazadi
const hostOf = u => u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

// Asosiy domen: "login.click.uz.secure.top" → "secure.top";  "my.gov.uz" → "gov.uz"
function registrable(host) {
  const parts = host.split(".");
  const last2 = parts.slice(-2).join(".");
  return RULES.second_level.includes(last2) ? parts.slice(-3).join(".") : last2;
}
const isIp = host => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
const trustedFor = host => TRUSTED.find(d => host === d.domain || host.endsWith("." + d.domain));
const isShortener = host => RULES.shorteners.includes(host);

// Levenshtein masofasi: bitta so'zni ikkinchisiga aylantirish uchun nechta harf o'zgartirish kerak
// "paymee" → "payme" = 1,  "c1ick" → "click" = 1
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// O'xshash belgilar: firibgarlar "l" o'rniga "1", "o" o'rniga "0" yozadi (c1ick, paym0)
function normalize(s) {
  return s.replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/@/g, "a");
}

// ---------- 3. Bitta havolani qoidalar bo'yicha tekshirish ----------
function analyzeUrl(url) {
  const reasons = [];
  const u = parse(url);
  if (!u) return { url, host: "", reasons: [], trusted: false };
  const host = hostOf(u);

  // Rasmiy sayt — xavf yo'q
  const trusted = trustedFor(host);
  if (trusted) return { url, host, trusted: true, reasons: [{ code: "url_trusted", points: 0, vars: { name: trusted.name } }] };

  if (isIp(host)) reasons.push({ code: "url_ip", points: 45, vars: {} });
  if (host.split(".").some(p => p.startsWith("xn--"))) reasons.push({ code: "url_punycode", points: 60, vars: {} });
  if (u.username || u.password) reasons.push({ code: "url_at", points: 50, vars: {} });   // https://click.uz@yomon.top — aldov

  const tld = host.split(".").pop();
  if (RULES.suspicious_tlds.includes(tld)) reasons.push({ code: "url_tld", points: 25, vars: { tld: "." + tld } });

  // Brendga o'xshatish: domenning bo'laklarini ("c1ick-uz" → "c1ick", "uz") rasmiy nomlar bilan solishtiramiz
  if (!isIp(host)) {
    const reg = registrable(host);
    const label = reg.split(".")[0];
    const sub = host.slice(0, -reg.length).split(".").filter(Boolean);       // subdomenlar ham: "click.secure-pay.top"
    const tokens = new Set([label, label.replace(/[-_]/g, ""), ...label.split(/[-_]/), ...sub, ...sub.flatMap(s => s.split(/[-_]/))].filter(Boolean));
    let brandHit = null;
    for (const raw of tokens) {
      const tok = normalize(raw);
      for (const d of TRUSTED) {
        if (!d.brand) continue;
        if (tok === d.brand) { brandHit = { code: "url_brand", points: 70, name: d.name, real: d.domain }; break; }
        // Qisqa nomlar (xb, nbu, olx...) faqat to'liq mos kelsa hisoblanadi — aks holda ko'p xato signal bo'ladi
        if (d.brand.length >= 5 && tok.length >= 4) {
          const dist = levenshtein(tok, d.brand);
          if (dist > 0 && dist <= (d.brand.length >= 8 ? 2 : 1)) {
            // Harf qo'shilgan yoki tushirilgan (paymee, clik) — aniq aldov: 70 ball.
            // Uzunligi bir xil, bitta harf boshqa (clock ↔ click) — boshqa haqiqiy sayt bo'lishi mumkin: 45 ball (shubhali).
            const points = tok.length !== d.brand.length ? 70 : 45;
            if (!brandHit || points > brandHit.points) brandHit = { code: "url_lookalike", points, name: d.name, real: d.domain };
          }
        }
      }
      if (brandHit && brandHit.code === "url_brand") break;
    }
    if (brandHit) reasons.push({ code: brandHit.code, points: brandHit.points, vars: { name: brandHit.name, real: brandHit.real } });
  }

  // Manzilda "bonus", "karta", "sms" kabi so'zlar
  const pathLow = decodeURIComponent((u.pathname + u.search).toLowerCase());
  const word = RULES.path_words.find(w => pathLow.includes(w));
  if (word) reasons.push({ code: "url_words", points: 15, vars: { word } });

  if ((host.match(/-/g) || []).length >= 3) reasons.push({ code: "url_hyphens", points: 10, vars: {} });

  return { url, host, trusted: false, reasons };
}

// ---------- 4. Qisqartirilgan havolani ochish (faqat yo'naltirish manzilini bilish) ----------
let doFetch = (...a) => fetch(...a);
function setFetch(f) { doFetch = f; }                    // testlarda internetsiz ishlash uchun

async function expandShort(url, hops = 5) {
  let cur = url;
  const deadline = Date.now() + 5000;                   // hammasi bo'lib 5 soniyadan ko'p kutmaymiz
  for (let i = 0; i < hops; i++) {
    if (Date.now() > deadline) return null;
    const u = parse(cur);
    if (!u || !isShortener(hostOf(u))) return cur;     // endi qisqartiruvchi emas — oxirgi manzil topildi
    let res;
    try {
      res = await doFetch(cur, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(Math.max(500, Math.min(2500, deadline - Date.now()))), headers: { "User-Agent": "TekshirBot/1.0 (link safety check)" } });
    } catch { return null; }
    const loc = res.headers.get("location");
    if (!loc) return null;
    cur = new URL(loc, cur).toString();
  }
  return cur;
}

// ---------- 5. Asosiy funksiya: xabardagi barcha havolalar ----------
// opts.fast = true — faqat ichki qoidalar (internetga chiqmaydi): bot DARHOL javob berishi uchun.
// Qisqartirilgan havolani ochish va Google/VirusTotal — keyingi (to'liq) bosqichda.
async function checkUrls(urls, opts = {}) {
  const results = [];
  for (const url of urls) {
    const u = parse(url);
    if (u && isShortener(hostOf(u)) && opts.fast) {
      results.push({ url, host: hostOf(u), trusted: false, pending: true, reasons: [{ code: "url_shortener_wait", points: 15, vars: {} }] });
      continue;
    }
    if (u && isShortener(hostOf(u))) {
      const finalUrl = await expandShort(url);
      if (!finalUrl) { results.push({ url, host: hostOf(u), trusted: false, reasons: [{ code: "url_short_hidden", points: 35, vars: {} }] }); continue; }
      const r = analyzeUrl(finalUrl);
      if (!r.trusted) r.reasons.unshift({ code: "url_shortener", points: 15, vars: { host: r.host } });
      r.via = url;
      results.push(r);
    } else results.push(analyzeUrl(url));
  }
  if (opts.fast) return results;
  // 3-bosqich: rasmiy bo'lmagan havolalarni tashqi xizmatlarda ham tekshiramiz (hammasi parallel)
  await Promise.all(results.filter(r => !r.trusted && r.host).map(async r => {
    const ext = await externalReasons(r.url, r.host);
    r.reasons.push(...ext.reasons);
    r.checked = ext.checked;          // qaysi xizmat haqiqatan javob berdi (statistika uchun)
  }));
  return results;
}

module.exports = { extractUrls, analyzeUrl, checkUrls, expandShort, setFetch, levenshtein, normalize, registrable };

};
M["src/checkers/file"] = function (module, exports, require) {
// Fayl tekshiruvi (5-bosqich).
// 1) Nomi va turi bo'yicha (faylni ochmasdan).  2) SHA-256 hash → VirusTotal (faylning o'zi YUBORILMAYDI).
// Bot faylni HECH QACHON ishga tushirmaydi va diskka saqlamaydi — faqat xotirada hash hisoblaydi.

const crypto = require("crypto");
const { virusTotalFile } = require("src/checkers/external");

// Android ilova fayllari — noma'lum manbadan kelgan bo'lsa, eng ko'p uchraydigan firibgarlik vositasi
const APK = ["apk", "xapk", "apks", "apkm"];
// Kompyuterda ishga tushadigan fayllar
const EXEC = ["exe", "scr", "bat", "cmd", "com", "pif", "msi", "vbs", "vbe", "js", "jse", "wsf", "hta", "jar", "ps1", "lnk", "reg"];
// Ichida makros (dastur) bo'lishi mumkin bo'lgan hujjatlar
const MACRO = ["docm", "xlsm", "pptm", "dotm", "xlam"];
// Arxivlar — ichida APK yashirilgan bo'lishi mumkin
const ARCHIVE = ["zip", "rar", "7z", "tar", "gz"];
// Ko'rinishi "begunoh" kengaytmalar — ikki kengaytmali nomlarda aldash uchun ishlatiladi (rasm.jpg.apk)
const INNOCENT = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt", "mp4", "mp3", "heic", "webp"];

const MAX_DOWNLOAD = 20 * 1024 * 1024;   // Telegram bot API 20 MB dan katta faylni yuklab berolmaydi

function analyzeFileName(name = "", mime = "", size = 0) {
  const reasons = [];
  const low = name.toLowerCase().trim();
  const parts = low.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  const prev = parts.length > 1 ? parts[parts.length - 1] : "";

  if (APK.includes(ext)) reasons.push({ code: "file_apk", points: 80, vars: { ext: "." + ext } });
  else if (mime === "application/vnd.android.package-archive") reasons.push({ code: "file_apk_hidden", points: 85, vars: { ext: ext ? "." + ext : "?" } });
  else if (EXEC.includes(ext)) reasons.push({ code: "file_exe", points: 75, vars: { ext: "." + ext } });
  else if (MACRO.includes(ext)) reasons.push({ code: "file_macro", points: 40, vars: { ext: "." + ext } });
  else if (ARCHIVE.includes(ext)) reasons.push({ code: "file_archive", points: 15, vars: { ext: "." + ext } });

  // "rasm.jpg.apk" — oxirgi kengaytma xavfli, oldingisi esa ishonch uyg'otish uchun qo'yilgan
  if (prev && INNOCENT.includes(prev) && (APK.includes(ext) || EXEC.includes(ext))) reasons.push({ code: "file_double", points: 20, vars: { name } });
  // Nomida ko'p bo'shliq bilan yashirilgan kengaytma: "hujjat.pdf          .exe"
  if (/\s{5,}/.test(name)) reasons.push({ code: "file_spaces", points: 20, vars: {} });

  if (size > MAX_DOWNLOAD) reasons.push({ code: "file_big", points: 0, vars: {} });
  return reasons;
}

const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");

// Asosiy funksiya. download — faylni xotiraga yuklab beradigan funksiya (bot.js beradi; testlarda soxtasi).
// opts.fast = true — faqat nomi va turi (yuklab olmaymiz, VirusTotal'ga so'ramaymiz)
async function checkFile({ name, mime, size }, download, opts = {}) {
  const reasons = analyzeFileName(name, mime, size);
  let hashChecked = false;
  // opts.sha — hash tayyor bo'lsa (ilova faylni o'zi hisoblab yuboradi — fayl serverga YUKLANMAYDI)
  if (opts.sha && !opts.fast) {
    const vt = /^[0-9a-f]{64}$/i.test(opts.sha) ? await virusTotalFile(opts.sha.toLowerCase()) : null;
    if (vt) {
      hashChecked = true;
      if (vt.malicious >= 2) reasons.push({ code: "file_vt_bad", points: 85, vars: { n: vt.malicious } });
      else if (vt.malicious === 1 || vt.suspicious >= 2) reasons.push({ code: "file_vt_some", points: 35, vars: { n: vt.malicious + vt.suspicious } });
    }
    return { host: "", reasons, hashChecked };
  }
  if (size <= MAX_DOWNLOAD && download && !opts.fast) {
    try {
      const buf = await download();
      const vt = await virusTotalFile(sha256(buf));
      if (vt) {
        hashChecked = true;
        if (vt.malicious >= 2) reasons.push({ code: "file_vt_bad", points: 85, vars: { n: vt.malicious } });
        else if (vt.malicious === 1 || vt.suspicious >= 2) reasons.push({ code: "file_vt_some", points: 35, vars: { n: vt.malicious + vt.suspicious } });
      }
    } catch (e) {
      console.error("Faylni yuklab bo'lmadi:", e.message);   // xato bo'lsa — faqat nomiga qarab baho beramiz
    }
  }
  return { host: "", reasons, hashChecked };
}

module.exports = { analyzeFileName, checkFile, sha256, MAX_DOWNLOAD };

};
M["src/checkers/numbers"] = function (module, exports, require) {
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

};
M["src/scoring"] = function (module, exports, require) {
// Ballarni yig'ish va xavf darajasini aniqlash.
// 0–29 → safe (✅), 30–69 → suspicious (🟡), 70–100 → danger (🔴)

const K = require("data/scam-keywords.json");

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

};
M["api"] = function (module, exports, require) {
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

};
M["src/checkers/external"] = function (module) { module.exports = { externalReasons: async () => ({ reasons: [], checked: [] }), virusTotalFile: async () => null }; };
M["crypto"] = function (module) { module.exports = {}; };
M["data/scam-keywords.json"] = function (module) { module.exports = {
  "_izoh": "Firibgarlik belgilari. Har bir guruh bir marta ball beradi. 'p' — qidiriladigan so'z boshlari (kichik harf, apostrof '). Lotin, kirill (o'zbek) va rus tilida. So'z oxirini yozmaslik mumkin: 'yutdingiz' → 'yutib', 'yutgan' kabi shakllarni alohida yozing.",
  "groups": [
    {
      "id": "secret",
      "points": 45,
      "neg": true,
      "p": [
        "sms kod",
        "sms-kod",
        "smsdagi kod",
        "smsda kelgan kod",
        "tasdiqlash kodi",
        "kodni ayt",
        "kodni yubor",
        "kodni yoz",
        "kodni ber",
        "karta raqam",
        "kartangiz raqam",
        "karta ma'lumot",
        "cvv",
        "cvc",
        "amal qilish muddat",
        "kartaning orqa",
        "parolingiz",
        "смс код",
        "смс-код",
        "кодни айт",
        "кодни юбор",
        "карта рақам",
        "амал қилиш муддат",
        "код из смс",
        "код из sms",
        "назовите код",
        "продиктуйте код",
        "сообщите код",
        "номер карты",
        "номер вашей карты",
        "срок действия карты",
        "пароль от",
        "sms-код",
        "sms код",
        "sms-kodni",
        "назовите sms",
        "назовите смс",
        "код из сообщения"
      ]
    },
    {
      "id": "prize",
      "points": 25,
      "p": [
        "yutdingiz",
        "yutib oldingiz",
        "yutuq",
        "g'olib bo'ldingiz",
        "g'olibi bo'ldingiz",
        "sovrin",
        "sovg'a",
        "bonus",
        "tekin",
        "pul mukofot",
        "ютдингиз",
        "ютиб олдингиз",
        "ютуқ",
        "ғолиб бўлдингиз",
        "совринг",
        "совға",
        "бонус",
        "текин",
        "вы выиграли",
        "выиграли",
        "выигрыш",
        "приз",
        "подарок",
        "розыгрыш"
      ]
    },
    {
      "id": "bank",
      "points": 35,
      "p": [
        "bank xodimi",
        "bankdan qo'ng'iroq",
        "bankdan yozyapmiz",
        "bank xavfsizlik",
        "xavfsizlik xizmati",
        "markaziy bank",
        "банк ходими",
        "банкдан",
        "хавфсизлик хизмати",
        "служба безопасности",
        "службы безопасности",
        "сотрудник банка",
        "из банка",
        "центробанк",
        "центрального банка"
      ]
    },
    {
      "id": "urgent",
      "points": 20,
      "p": [
        "bloklandi",
        "bloklanadi",
        "to'xtatildi",
        "shoshiling",
        "24 soat ichida",
        "darhol",
        "oxirgi imkoniyat",
        "zudlik bilan",
        "блокланди",
        "шошилинг",
        "24 соат ичида",
        "дарҳол",
        "заблокирован",
        "срочно",
        "в течение 24 часов",
        "немедленно",
        "последний шанс"
      ]
    },
    {
      "id": "money",
      "points": 30,
      "p": [
        "uyda o'tirib",
        "kafolatlangan foyda",
        "kafolatlangan daromad",
        "passiv daromad",
        "investitsiya",
        "kuniga 500",
        "kuniga 1 000 000",
        "oyiga 10 000 000",
        "tez pul",
        "уйда ўтириб",
        "кафолатланган",
        "инвестиция",
        "заработок без вложений",
        "гарантированный доход",
        "пассивный доход",
        "инвестиции",
        "без вложений"
      ]
    },
    {
      "id": "vote",
      "points": 30,
      "p": [
        "ovoz bering",
        "ovoz berib",
        "do'stimga ovoz",
        "golos bering",
        "овоз беринг",
        "проголосуйте",
        "проголосуй",
        "голосуй",
        "отдай голос"
      ]
    },
    {
      "id": "parcel",
      "points": 20,
      "p": [
        "posilka",
        "pochtadan",
        "bojxona",
        "yetkazib berish uchun to'lov",
        "посилка",
        "почтадан",
        "божхона",
        "посылка",
        "посылку",
        "таможн",
        "оплатите доставку"
      ]
    },
    {
      "id": "transfer",
      "points": 25,
      "p": [
        "pul o'tkazing",
        "kartaga tashlang",
        "oldindan to'lov",
        "oldindan pul",
        "to'lovni amalga oshiring",
        "пул ўтказинг",
        "олдиндан тўлов",
        "переведите",
        "предоплат",
        "оплатите комиссию",
        "to'lov qiling",
        "to'lang",
        "тўлов қилинг",
        "тўланг",
        "оплатите",
        "оплатить",
        "tashlang",
        "tashlab bering",
        "tashlab yuboring",
        "ташланг",
        "ташлаб беринг",
        "скиньте",
        "перекиньте",
        "закиньте"
      ]
    },
    {
      "id": "apk",
      "points": 35,
      "p": [
        ".apk",
        "ilovani o'rnating",
        "ilovani yuklab",
        "faylni oching",
        "иловани ўрнатинг",
        "файлни очинг",
        "установите приложение",
        "скачайте приложение",
        "откройте файл"
      ]
    }
  ],
  "negation": [
    "hech kimga",
    "aytmang",
    "bermang",
    "yubormang",
    "ҳеч кимга",
    "айтманг",
    "берманг",
    "никому не",
    "не сообщайте",
    "не называйте",
    "не передавайте"
  ],
  "url_combo": {
    "_izoh": "Firibgar matn guruhi + ball olgan (rasmiy bo'lmagan) havola: masalan «yutdingiz» + https://yutuq-uz.click. Har biri alohida 30 ga yetmasa ham — birga shubhali.",
    "groups": ["prize", "parcel", "vote", "transfer"],
    "points": 20
  },
  "combos": [
    {
      "need": [
        "secret",
        "prize"
      ],
      "points": 20
    },
    {
      "need": [
        "secret",
        "bank"
      ],
      "points": 20
    },
    {
      "need": [
        "secret",
        "urgent"
      ],
      "points": 15
    },
    {
      "need": [
        "transfer",
        "prize"
      ],
      "points": 15
    },
    {
      "need": [
        "parcel",
        "transfer"
      ],
      "points": 15
    }
  ]
}; };
M["data/url-rules.json"] = function (module) { module.exports = {
  "_izoh": "Havola qoidalari. Ballar scoring.js da qo'shiladi.",
  "shorteners": ["bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "t.ly", "goo.su", "clck.ru", "rb.gy", "shorturl.at", "ow.ly", "tiny.cc", "s.id", "v.gd", "qps.ru", "u.to", "bitly.ws", "short.gy", "lnkd.in", "tinyurl.ru", "surl.li"],
  "suspicious_tlds": ["xyz", "top", "click", "icu", "buzz", "monster", "rest", "cfd", "sbs", "online", "site", "live", "shop", "fun", "pw", "tk", "ml", "ga", "cf", "gq", "work", "loan", "win", "bid", "vip", "cyou", "lol", "quest", "support"],
  "path_words": ["bonus", "prize", "priz", "yutuq", "sovg", "sovrin", "aksiya", "gift", "free", "login", "verify", "confirm", "card", "karta", "sms", "otp", "posilka", "parcel", "vote", "ovoz", "golos", "secure", "update", "unlock", "blok"],
  "second_level": ["com.uz", "org.uz", "net.uz", "co.uk", "com.ru", "com.tr", "co.uz"]
}; };
M["data/trusted-domains.json"] = function (module) { module.exports = {
  "_izoh": "Rasmiy domenlar. 'brand' — firibgarlar o'xshatishga urinadigan nom. Ro'yxatni kengaytirsa bo'ladi: har bir yangi domenni rasmiy manbadan tekshirib qo'shing.",
  "domains": [
    { "domain": "click.uz", "brand": "click", "name": "Click" },
    { "domain": "payme.uz", "brand": "payme", "name": "Payme" },
    { "domain": "uzum.uz", "brand": "uzum", "name": "Uzum" },
    { "domain": "uzumbank.uz", "brand": "uzumbank", "name": "Uzum Bank" },
    { "domain": "paynet.uz", "brand": "paynet", "name": "Paynet" },
    { "domain": "my.gov.uz", "brand": "mygov", "name": "my.gov.uz" },
    { "domain": "gov.uz", "brand": "gov", "name": "Davlat portali" },
    { "domain": "soliq.uz", "brand": "soliq", "name": "Soliq qo'mitasi" },
    { "domain": "cbu.uz", "brand": "cbu", "name": "Markaziy bank" },
    { "domain": "kapitalbank.uz", "brand": "kapitalbank", "name": "Kapitalbank" },
    { "domain": "xb.uz", "brand": "xb", "name": "Xalq banki" },
    { "domain": "nbu.uz", "brand": "nbu", "name": "Milliy bank" },
    { "domain": "sqb.uz", "brand": "sqb", "name": "SQB" },
    { "domain": "hamkorbank.uz", "brand": "hamkorbank", "name": "Hamkorbank" },
    { "domain": "ipakyulibank.uz", "brand": "ipakyuli", "name": "Ipak Yo'li banki" },
    { "domain": "agrobank.uz", "brand": "agrobank", "name": "Agrobank" },
    { "domain": "aloqabank.uz", "brand": "aloqabank", "name": "Aloqabank" },
    { "domain": "infinbank.com", "brand": "infinbank", "name": "InfinBank" },
    { "domain": "anorbank.uz", "brand": "anorbank", "name": "Anorbank" },
    { "domain": "tbcbank.uz", "brand": "tbcbank", "name": "TBC Bank" },
    { "domain": "ofb.uz", "brand": "ofb", "name": "Orient Finans Bank" },
    { "domain": "olx.uz", "brand": "olx", "name": "OLX" },
    { "domain": "pochta.uz", "brand": "pochta", "name": "O'zbekiston pochtasi" },
    { "domain": "beeline.uz", "brand": "beeline", "name": "Beeline" },
    { "domain": "ucell.uz", "brand": "ucell", "name": "Ucell" },
    { "domain": "mobi.uz", "brand": "mobiuz", "name": "Mobiuz" },
    { "domain": "uztelecom.uz", "brand": "uztelecom", "name": "Uztelecom" },
    { "domain": "telegram.org", "brand": "telegram", "name": "Telegram" },
    { "domain": "t.me", "brand": null, "name": "Telegram" },
    { "domain": "google.com", "brand": "google", "name": "Google" },
    { "domain": "youtube.com", "brand": "youtube", "name": "YouTube" },
    { "domain": "youtu.be", "brand": null, "name": "YouTube" },
    { "domain": "instagram.com", "brand": "instagram", "name": "Instagram" },
    { "domain": "facebook.com", "brand": "facebook", "name": "Facebook" },
    { "domain": "kun.uz", "brand": null, "name": "Kun.uz" },
    { "domain": "daryo.uz", "brand": null, "name": "Daryo" }
  ]
}; };
M["locales"] = function (module) { module.exports = {"uz-latn":{"level_safe":"✅ Xavf topilmadi","level_suspicious":"🟡 SHUBHALI","level_danger":"🔴 XAVFLI","why":"Nima uchun:","what_to_do":"Nima qilish kerak:","url_trusted":"Bu — {name}ning rasmiy sayti","url_ip":"Havolada sayt nomi o'rniga raqamlar bor — rasmiy saytlar bunday qilmaydi","url_punycode":"Sayt nomida boshqa alifbo harflari yashirilgan — rasmiy saytga o'xshatish usuli","url_at":"Havola aldamchi tuzilgan: boshida bir sayt nomi, aslida boshqa saytga olib boradi","url_tld":"Sayt nomi {tld} bilan tugaydi — firibgarlar buni ko'p ishlatadi","url_brand":"Bu sayt {name}ga o'xshatilgan, lekin rasmiy emas. Rasmiysi: {real}","url_lookalike":"Sayt nomi {name}ga juda o'xshaydi, lekin harflari boshqa. Rasmiysi: {real}","url_words":"Havolada «{word}» so'zi bor — aldov havolalarida ko'p uchraydi","url_hyphens":"Sayt nomida juda ko'p chiziqcha bor — shubhali","url_shortener":"Bu qisqartirilgan havola, aslida {host} saytiga olib boradi","url_short_hidden":"Bu qisqartirilgan havola va u qayerga olib borishini bilib bo'lmadi","adv_safe":"👍 Xavf belgisi topilmadi.\nℹ️ Lekin 100% kafolat yo'q — SMS kodni hech kimga aytmang.","adv_no_open":"❌ Havolani ochmang","adv_no_code":"❌ Hech kimga SMS kod va karta ma'lumotini bermang","adv_no_money":"❌ Hech qanday pul o'tkazmang","adv_call_bank":"✅ Ma'lumot berib qo'ygan bo'lsangiz — darhol bankingizga qo'ng'iroq qiling","adv_wait":"⚠️ Havolani ochishga shoshilmang","adv_check_official":"✅ Rasmiy ilova yoki saytga o'zingiz kirib tekshiring","txt_secret":"Xabarda «{word}» so'raladi — bank hech qachon buni so'ramaydi","txt_prize":"Xabarda «{word}» degan so'z bor — «yutuq» firibgarlarning eng ko'p usuli","txt_bank":"Yozgan odam o'zini bank xodimi deb ko'rsatyapti («{word}»)","txt_urgent":"Sizni shoshiltiryapti yoki qo'rqityapti («{word}»)","txt_money":"Oson va kafolatlangan pul va'da qilinyapti («{word}») — bunday bo'lmaydi","txt_vote":"«Ovoz bering» havolasi — Telegram akkauntingizni o'g'irlash usuli","txt_parcel":"Posilka yoki bojxona haqida xabar («{word}») — ko'p tarqalgan aldov","txt_transfer":"Sizdan pul o'tkazish so'ralyapti («{word}»)","txt_apk":"Fayl yoki ilova o'rnatish so'ralyapti («{word}») — telefoningizga virus tushishi mumkin","txt_combo":"Bir xabarda bir nechta firibgarlik belgisi birga uchradi","file_apk":"Bu Android ilova fayli ({ext}). Notanish odamdan kelgan ilova — eng ko'p tarqalgan firibgarlik usuli: o'rnatsangiz, SMS va kartangizni o'g'irlaydi","file_apk_hidden":"Bu aslida Android ilova fayli, lekin nomi boshqacha ko'rsatilgan ({ext})","file_exe":"Bu kompyuterda ishga tushadigan dastur fayli ({ext}) — virus bo'lishi mumkin","file_macro":"Bu hujjat ichida dastur (makros) bo'lishi mumkin ({ext})","file_archive":"Bu arxiv ({ext}) — ichida xavfli fayl yashirilgan bo'lishi mumkin","file_double":"Fayl nomi aldamchi: {name} — rasm yoki hujjatga o'xshatilgan","file_spaces":"Fayl nomida ko'p bo'shliq bilan haqiqiy turi yashirilgan","file_big":"Fayl 20 MB dan katta — faqat nomi va turiga qarab baholandi","file_vt_bad":"{n} ta antivirus bu faylni virusli deb topgan","file_vt_some":"{n} ta antivirus bu faylga shubha bildirgan","adv_no_install":"❌ Faylni ochmang va o'rnatmang","adv_installed":"✅ O'rnatib qo'ygan bo'lsangiz — internetni o'chiring, ilovani o'chirib tashlang va darhol bankingizga qo'ng'iroq qiling","adv_file_wait":"⚠️ Faylni ochishdan oldin yuborgan odamdan boshqa yo'l bilan so'rab ko'ring","url_reports":"Bu sayt ustidan {n} ta foydalanuvchi shikoyat qilgan","url_shortener_wait":"Bu qisqartirilgan havola — qayerga olib borishi tekshirilmoqda"},"uz-cyrl":{"level_safe":"✅ Хавф топилмади","level_suspicious":"🟡 ШУБҲАЛИ","level_danger":"🔴 ХАВФЛИ","why":"Нима учун:","what_to_do":"Нима қилиш керак:","url_trusted":"Бу — {name}нинг расмий сайти","url_ip":"Ҳаволада сайт номи ўрнига рақамлар бор — расмий сайтлар бундай қилмайди","url_punycode":"Сайт номида бошқа алифбо ҳарфлари яширилган — расмий сайтга ўхшатиш усули","url_at":"Ҳавола алдамчи тузилган: бошида бир сайт номи, аслида бошқа сайтга олиб боради","url_tld":"Сайт номи {tld} билан тугайди — фирибгарлар буни кўп ишлатади","url_brand":"Бу сайт {name}га ўхшатилган, лекин расмий эмас. Расмийси: {real}","url_lookalike":"Сайт номи {name}га жуда ўхшайди, лекин ҳарфлари бошқа. Расмийси: {real}","url_words":"Ҳаволада «{word}» сўзи бор — алдов ҳаволаларида кўп учрайди","url_hyphens":"Сайт номида жуда кўп чизиқча бор — шубҳали","url_shortener":"Бу қисқартирилган ҳавола, аслида {host} сайтига олиб боради","url_short_hidden":"Бу қисқартирилган ҳавола ва у қаерга олиб боришини билиб бўлмади","adv_safe":"👍 Хавф белгиси топилмади.\nℹ️ Лекин 100% кафолат йўқ — SMS кодни ҳеч кимга айтманг.","adv_no_open":"❌ Ҳаволани очманг","adv_no_code":"❌ Ҳеч кимга SMS код ва карта маълумотини берманг","adv_no_money":"❌ Ҳеч қандай пул ўтказманг","adv_call_bank":"✅ Маълумот бериб қўйган бўлсангиз — дарҳол банкингизга қўнғироқ қилинг","adv_wait":"⚠️ Ҳаволани очишга шошилманг","adv_check_official":"✅ Расмий илова ёки сайтга ўзингиз кириб текширинг","txt_secret":"Хабарда «{word}» сўралади — банк ҳеч қачон буни сўрамайди","txt_prize":"Хабарда «{word}» деган сўз бор — «ютуқ» фирибгарларнинг энг кўп усули","txt_bank":"Ёзган одам ўзини банк ходими деб кўрсатяпти («{word}»)","txt_urgent":"Сизни шошилтиряпти ёки қўрқитяпти («{word}»)","txt_money":"Осон ва кафолатланган пул ваъда қилиняпти («{word}») — бундай бўлмайди","txt_vote":"«Овоз беринг» ҳаволаси — Telegram аккаунтингизни ўғирлаш усули","txt_parcel":"Посилка ёки божхона ҳақида хабар («{word}») — кўп тарқалган алдов","txt_transfer":"Сиздан пул ўтказиш сўраляпти («{word}»)","txt_apk":"Файл ёки илова ўрнатиш сўраляпти («{word}») — телефонингизга вирус тушиши мумкин","txt_combo":"Бир хабарда бир нечта фирибгарлик белгиси бирга учради","file_apk":"Бу Android илова файли ({ext}). Нотаниш одамдан келган илова — энг кўп тарқалган фирибгарлик усули: ўрнатсангиз, SMS ва картангизни ўғирлайди","file_apk_hidden":"Бу аслида Android илова файли, лекин номи бошқача кўрсатилган ({ext})","file_exe":"Бу компьютерда ишга тушадиган дастур файли ({ext}) — вирус бўлиши мумкин","file_macro":"Бу ҳужжат ичида дастур (макрос) бўлиши мумкин ({ext})","file_archive":"Бу архив ({ext}) — ичида хавфли файл яширилган бўлиши мумкин","file_double":"Файл номи алдамчи: {name} — расм ёки ҳужжатга ўхшатилган","file_spaces":"Файл номида кўп бўшлиқ билан ҳақиқий тури яширилган","file_big":"Файл 20 MB дан катта — фақат номи ва турига қараб баҳоланди","file_vt_bad":"{n} та антивирус бу файлни вирусли деб топган","file_vt_some":"{n} та антивирус бу файлга шубҳа билдирган","adv_no_install":"❌ Файлни очманг ва ўрнатманг","adv_installed":"✅ Ўрнатиб қўйган бўлсангиз — интернетни ўчиринг, иловани ўчириб ташланг ва дарҳол банкингизга қўнғироқ қилинг","adv_file_wait":"⚠️ Файлни очишдан олдин юборган одамдан бошқа йўл билан сўраб кўринг","url_reports":"Бу сайт устидан {n} та фойдаланувчи шикоят қилган","url_shortener_wait":"Бу қисқартирилган ҳавола — қаерга олиб бориши текширилмоқда"},"ru":{"level_safe":"✅ Угроз не найдено","level_suspicious":"🟡 ПОДОЗРИТЕЛЬНО","level_danger":"🔴 ОПАСНО","why":"Почему:","what_to_do":"Что делать:","url_trusted":"Это официальный сайт: {name}","url_ip":"В ссылке вместо названия сайта цифры — официальные сайты так не делают","url_punycode":"В названии сайта спрятаны буквы другого алфавита — так подделывают официальные сайты","url_at":"Ссылка обманчивая: в начале одно название, а ведёт на другой сайт","url_tld":"Адрес сайта заканчивается на {tld} — мошенники часто это используют","url_brand":"Сайт выдаёт себя за {name}, но он не официальный. Официальный: {real}","url_lookalike":"Название сайта очень похоже на {name}, но буквы другие. Официальный: {real}","url_words":"В ссылке есть слово «{word}» — часто встречается в мошеннических ссылках","url_hyphens":"В названии сайта слишком много дефисов — подозрительно","url_shortener":"Это сокращённая ссылка, на самом деле она ведёт на сайт {host}","url_short_hidden":"Это сокращённая ссылка, и не удалось узнать, куда она ведёт","adv_safe":"👍 Признаков угрозы не найдено.\nℹ️ Но 100% гарантии нет — никому не сообщайте SMS-код.","adv_no_open":"❌ Не открывайте ссылку","adv_no_code":"❌ Никому не сообщайте SMS-код и данные карты","adv_no_money":"❌ Не переводите никаких денег","adv_call_bank":"✅ Если вы уже сообщили данные — сразу позвоните в свой банк","adv_wait":"⚠️ Не спешите открывать ссылку","adv_check_official":"✅ Проверьте сами через официальное приложение или сайт","txt_secret":"В сообщении просят «{word}» — банк никогда этого не спрашивает","txt_prize":"В сообщении есть слово «{word}» — «выигрыш» самый частый обман","txt_bank":"Автор выдаёт себя за сотрудника банка («{word}»)","txt_urgent":"Вас торопят или пугают («{word}»)","txt_money":"Обещают лёгкие или гарантированные деньги («{word}») — так не бывает","txt_vote":"Ссылка «проголосуйте» — способ украсть ваш Telegram-аккаунт","txt_parcel":"Сообщение о посылке или таможне («{word}») — частый обман","txt_transfer":"Вас просят перевести деньги («{word}»)","txt_apk":"Просят установить файл или приложение («{word}») — на телефон может попасть вирус","txt_combo":"В одном сообщении сразу несколько признаков мошенничества","file_apk":"Это файл Android-приложения ({ext}). Приложение от незнакомца — самый частый способ мошенничества: после установки оно крадёт SMS и данные карты","file_apk_hidden":"На самом деле это Android-приложение, но имя файла замаскировано ({ext})","file_exe":"Это исполняемый файл для компьютера ({ext}) — может быть вирусом","file_macro":"В этом документе может быть программа (макрос) ({ext})","file_archive":"Это архив ({ext}) — внутри может быть спрятан опасный файл","file_double":"Обманчивое имя файла: {name} — замаскирован под фото или документ","file_spaces":"В имени файла пробелами спрятан его настоящий тип","file_big":"Файл больше 20 МБ — оценка только по имени и типу","file_vt_bad":"{n} антивирусов признали этот файл заражённым","file_vt_some":"{n} антивирусов отметили этот файл как подозрительный","adv_no_install":"❌ Не открывайте и не устанавливайте файл","adv_installed":"✅ Если уже установили — отключите интернет, удалите приложение и сразу позвоните в банк","adv_file_wait":"⚠️ Прежде чем открыть, уточните у отправителя другим способом","url_reports":"На этот сайт пожаловались пользователи: {n}","url_shortener_wait":"Это сокращённая ссылка — проверяем, куда она ведёт"}}; };
g.TekshirEngine = require("api");
})(typeof globalThis !== "undefined" ? globalThis : self);
