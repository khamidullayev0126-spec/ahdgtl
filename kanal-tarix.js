// Kanal postlari tarixi: agent yangi post tayyorlashdan oldin o'xshash post bo'lganmi — tekshiradi.
// Saqlanadi: store → "kanal-postlar" = [{ sana, matn, manba }] (oxirgi 300 ta).
// Boshlang'ich tarix: kontent/agent/kanal-tarix.json (Telegram eksportidan, 2026-sentabr — noyabr).

const fs = require("fs");
const path = require("path");

const KEY = "kanal-postlar";
const MAX = 300;
const SEED = path.join(__dirname, "kontent", "agent", "kanal-tarix.json");
// Har postda uchraydigan, mavzu haqida hech narsa demaydigan so'zlar
const STOP = new Set(("bilan uchun yoki lekin agar hamma faqat yana endi bugun ertaga sizning sizga siz bizning juda eng ham deb degan qilib qiling qilish " +
  "bo'ladi bo'lsa bo'lib kerak mumkin nima qanday nega shunday bunday ushbu kabi orqali keyin oldin hozir hozirgi kanal kanalga post " +
  "sinab ko'ring ko'rish bugunoq natija natijada ahdigital abdulhamid").split(/\s+/));

const words = text => new Set(String(text || "").toLowerCase()
  .replace(/[ʻʼ‘’`´]/g, "'").split(/[^\p{L}\p{N}'-]+/u)
  .map(w => w.replace(/^['-]+|['-]+$/g, ""))
  .filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w) && !/^(https?|www)$/.test(w))
  .map(w => w.slice(0, 5)));   // o'zak: o'zbekcha qo'shimchalar (-lar, -ni, -dagi...) farqini yo'qotadi

// 0..1: kichikroq to'plamning qancha qismi kattasida bor (birinchi 600 belgi — sarlavha va asosiy fikr)
function similarity(a, b) {
  const A = words(String(a).slice(0, 600)), B = words(String(b).slice(0, 600));
  if (A.size < 6 || B.size < 6) return 0;   // juda qisqa postlarni solishtirmaymiz
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / Math.min(A.size, B.size);
}

function createChannelHistory(store) {
  const all = () => store.get(KEY, []) || [];

  // Ombor bo'sh bo'lsa — eksportdan boshlang'ich tarixni yuklaymiz
  function seed() {
    if (all().length) return;
    try { store.set(KEY, JSON.parse(fs.readFileSync(SEED, "utf8")).slice(-MAX)); }
    catch (e) { if (e.code !== "ENOENT") console.error("Kanal tarixi:", e.message); }
  }

  function add(matn, manba = "agent", sana = new Date().toISOString().slice(0, 10)) {
    const t = String(matn || "").trim();
    if (t.length < 20) return;
    const list = all();
    if (list.some(p => p.matn === t.slice(0, 1500))) return;
    store.set(KEY, [...list, { sana, matn: t.slice(0, 1500), manba }].slice(-MAX));
  }

  // O'xshash postlar (eng o'xshashi birinchi)
  function similar(text, threshold = 0.38) {
    return all().map(p => ({ ...p, oxshash: similarity(text, p.matn) }))
      .filter(p => p.oxshash >= threshold).sort((a, b) => b.oxshash - a.oxshash).slice(0, 3);
  }

  const firstLine = t => String(t).split("\n").find(l => l.trim()) || "";
  function recent(n = 30, query = "") {
    const q = words(query);
    let list = all();
    if (q.size) list = list.filter(p => { const w = words(p.matn); return [...q].some(x => w.has(x)); });
    return list.slice(-n).map(p => `${p.sana}: ${firstLine(p.matn).slice(0, 110)}`);
  }

  return { seed, add, similar, recent, all };
}

module.exports = { createChannelHistory, similarity, words };
