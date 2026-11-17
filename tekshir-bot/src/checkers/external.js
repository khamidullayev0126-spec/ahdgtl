// Tashqi xizmatlar: Google Safe Browsing va VirusTotal (3-bosqich).
// Kalitlar .env da: SAFE_BROWSING_KEY, VIRUSTOTAL_KEY. Kalit bo'lmasa — bu tekshiruv shunchaki o'tkazib yuboriladi.
// Xizmat ishlamasa yoki sekin bo'lsa — xato log'ga yoziladi, bot esa qolgan tekshiruvlar bilan javob beraveradi.
// MUHIM: biz faqat HAVOLANING O'ZINI (matn sifatida) yuboramiz, foydalanuvchi xabari yoki ma'lumoti yuborilmaydi.

const cache = require("../cache");

const TIMEOUT = 4000;               // 4 soniyadan ko'p kutmaymiz — foydalanuvchi 5 soniyada javob olishi kerak
let doFetch = (...a) => fetch(...a);
function setFetch(f) { doFetch = f; }  // testlarda internetsiz ishlash uchun

// ---------- Google Safe Browsing (v4 Lookup API) ----------
// Javob: { matches: [{ threatType: "SOCIAL_ENGINEERING" | "MALWARE" | ... }] } yoki bo'sh {}
async function safeBrowsing(url) {
  const key = process.env.SAFE_BROWSING_KEY;
  if (!key) return null;
  const ck = "gsb:" + url;
  const cached = cache.get(ck);
  if (cached !== undefined) return cached;
  try {
    const res = await doFetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT),
      body: JSON.stringify({
        client: { clientId: "tekshir-bot", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const types = [...new Set((data.matches || []).map(m => m.threatType))];
    cache.set(ck, types);
    return types;                     // [] — toza, ["SOCIAL_ENGINEERING"] — fishing va h.k.
  } catch (e) {
    console.error("Safe Browsing xatosi:", e.message);
    return null;                      // null — "bilmadik" (xato), [] — "toza"
  }
}

// ---------- VirusTotal (v3, domen hisoboti) ----------
// Bepul kalit: daqiqasiga 4 ta, kuniga 500 ta so'rov. Shuning uchun domen bo'yicha keshlaymiz va limitni o'zimiz kuzatamiz.
const vtCalls = [];                   // oxirgi so'rovlar vaqti
function vtAllowed() {
  const now = Date.now();
  while (vtCalls.length && now - vtCalls[0] > 60_000) vtCalls.shift();
  if (vtCalls.length >= 4) return false;   // limit tugadi — bu safar VirusTotal'siz javob beramiz
  vtCalls.push(now);
  return true;
}

async function virusTotalDomain(domain) {
  const key = process.env.VIRUSTOTAL_KEY;
  if (!key) return null;
  const ck = "vt:" + domain;
  const cached = cache.get(ck);
  if (cached !== undefined) return cached;
  if (!vtAllowed()) return null;
  try {
    const res = await doFetch(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`, {
      headers: { "x-apikey": key },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 404) { cache.set(ck, { malicious: 0, suspicious: 0, unknown: true }); return { malicious: 0, suspicious: 0, unknown: true }; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const s = data?.data?.attributes?.last_analysis_stats || {};
    const out = { malicious: s.malicious || 0, suspicious: s.suspicious || 0 };
    cache.set(ck, out);
    return out;
  } catch (e) {
    console.error("VirusTotal xatosi:", e.message);
    return null;
  }
}

// ---------- Bitta havola uchun ikkala xizmat, parallel ----------
// Natija — 2-bosqichdagi kabi "sabablar" ro'yxati
async function externalReasons(url, host) {
  const [gsb, vt] = await Promise.all([safeBrowsing(url), virusTotalDomain(host)]);
  const reasons = [];
  if (gsb && gsb.length) {
    const phish = gsb.includes("SOCIAL_ENGINEERING");
    reasons.push({ code: phish ? "ext_gsb_phish" : "ext_gsb_malware", points: 90, vars: {} });
  }
  if (vt) {
    if (vt.malicious >= 2) reasons.push({ code: "ext_vt_bad", points: 80, vars: { n: vt.malicious } });
    else if (vt.malicious === 1 || vt.suspicious >= 2) reasons.push({ code: "ext_vt_some", points: 35, vars: { n: vt.malicious + vt.suspicious } });
  }
  return { reasons, checked: { gsb: gsb !== null, vt: vt !== null } };
}

module.exports = { safeBrowsing, virusTotalDomain, externalReasons, setFetch, _vtCalls: vtCalls };
