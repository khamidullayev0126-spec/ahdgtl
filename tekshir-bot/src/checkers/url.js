// Havola tekshiruvi (2-bosqich: tashqi API'siz, faqat qoidalar).
// Har bir qoida "sabab" qaytaradi: { code, points, vars }.  code — locales'dagi matn kaliti, points — xavf bali.
// Bot havolani O'ZI OCHMAYDI. Faqat qisqartirilgan havolalarda "qayerga yo'naltiradi?" degan
// sarlavhani (redirect) so'raydi — sahifaning ichini yuklab olmaydi va ishga tushirmaydi.

const TRUSTED = require("../../data/trusted-domains.json").domains;
const RULES = require("../../data/url-rules.json");

// ---------- 1. Matndan havolalarni topish ----------
// http:// bilan yoki usiz yozilgan havolalarni topadi ("https://click.uz@yomon.top" kabi aldovni ham butunligicha): "https://click.uz", "bit.ly/abc", "c1ick-uz.com/bonus"
const URL_RE = /\b((?:https?:\/\/(?:[^\s\/@]+@)?)?(?:(?:[a-z0-9¡-￿](?:[a-z0-9¡-￿-]*[a-z0-9¡-￿])?\.)+[a-z¡-￿]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d{2,5})?(?:[/?#][^\s<>"'«»]*)?)/gi;

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
  for (let i = 0; i < hops; i++) {
    const u = parse(cur);
    if (!u || !isShortener(hostOf(u))) return cur;     // endi qisqartiruvchi emas — oxirgi manzil topildi
    let res;
    try {
      res = await doFetch(cur, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(4000), headers: { "User-Agent": "TekshirBot/1.0 (link safety check)" } });
    } catch { return null; }
    const loc = res.headers.get("location");
    if (!loc) return null;
    cur = new URL(loc, cur).toString();
  }
  return cur;
}

// ---------- 5. Asosiy funksiya: xabardagi barcha havolalar ----------
async function checkUrls(urls) {
  const results = [];
  for (const url of urls) {
    const u = parse(url);
    if (u && isShortener(hostOf(u))) {
      const finalUrl = await expandShort(url);
      if (!finalUrl) { results.push({ url, host: hostOf(u), trusted: false, reasons: [{ code: "url_short_hidden", points: 35, vars: {} }] }); continue; }
      const r = analyzeUrl(finalUrl);
      if (!r.trusted) r.reasons.unshift({ code: "url_shortener", points: 15, vars: { host: r.host } });
      r.via = url;
      results.push(r);
    } else results.push(analyzeUrl(url));
  }
  return results;
}

module.exports = { extractUrls, analyzeUrl, checkUrls, expandShort, setFetch, levenshtein, normalize, registrable };
