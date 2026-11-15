// AI xarajatlari: har bir Claude so'rovidan keyin javobdagi usage (tokenlar) yoziladi va narxi hisoblanadi.
// Admin panel → «AI xarajatlari» shu ma'lumotdan grafik chizadi.
//
// Qayerdan chaqiriladi: chat.js (saytdagi AI yordamchi), bot.js (mijozlar bilan Telegram bot), agent.js (egasining agenti).
// Saqlanadi: store → "ai-xarajat" = { "YYYY-MM-DD": { "manba|model": { n, in, out, cw, cr, ws } } }, 120 kun.
//
// Narxlar — 1 mln token uchun AQSh dollarida (Anthropic rasmiy narxlari, 2026-noyabr).
// Narx o'zgarsa, faqat shu jadvalni yangilang.

const PRICES = {
  "claude-opus-5-5":   { in: 4,    out: 20,  cr: 0.20 },
  "claude-sonnet-5-5": { in: 2,    out: 10,  cr: 0.10 },
  "claude-haiku-5-5":  { in: 0.10, out: 0.50, cr: 0.01 },
  "claude-opus-5":     { in: 5,    out: 25,  cr: 0.50 },
  "claude-sonnet-5":   { in: 2,    out: 10,  cr: 0.20 },
  "claude-opus-4-8":   { in: 5,    out: 25,  cr: 0.50 }
};
const CACHE_WRITE = 1.25;            // keshga yozish: kirish narxining 1.25 baravari (5 daqiqalik kesh)
const WEB_SEARCH_USD = 10 / 1000;    // veb-qidiruv: 1000 ta so'rov uchun $10
const UNKNOWN = PRICES["claude-opus-5-5"];   // ro'yxatda yo'q model — ehtiyot uchun eng qimmat narx bilan hisoblanadi
const KEY = "ai-xarajat";
const KEEP_DAYS = 120;
const SOURCES = { chat: "Saytdagi AI yordamchi", bot: "Telegram bot (mijozlar)", agent: "Agent (sizning yordamchingiz)" };

let store = null;
function init(s) { store = s; }

// Toshkent vaqti bo'yicha sana (UTC+5)
const dayOf = (t = Date.now()) => new Date(t + 5 * 3600_000).toISOString().slice(0, 10);

function priceOf(model) {
  const m = String(model || "");
  const key = Object.keys(PRICES).filter(k => m === k || m.startsWith(k + "-")).sort((a, b) => b.length - a.length)[0];
  return { p: key ? PRICES[key] : UNKNOWN, known: !!key };
}

// Bitta yozuv narxi (dollarda)
function costOf(model, u) {
  const { p } = priceOf(model);
  return ((u.in || 0) * p.in + (u.out || 0) * p.out + (u.cw || 0) * p.in * CACHE_WRITE + (u.cr || 0) * p.cr) / 1e6
    + (u.ws || 0) * WEB_SEARCH_USD;
}

// Claude javobini yozib qo'yish. Xato bo'lsa jim o'tadi — AI javobi buzilmasin.
function record(source, response) {
  try {
    if (!store || !response || !response.usage) return;
    const u = response.usage;
    const model = String(response.model || "noma'lum");
    const all = { ...(store.get(KEY, {}) || {}) };
    const day = dayOf();
    const bucket = { ...(all[day] || {}) };
    const k = `${source}|${model}`;
    const prev = bucket[k] || { n: 0, in: 0, out: 0, cw: 0, cr: 0, ws: 0 };
    bucket[k] = {
      n: prev.n + 1,
      in: prev.in + (u.input_tokens || 0),
      out: prev.out + (u.output_tokens || 0),
      cw: prev.cw + (u.cache_creation_input_tokens || 0),
      cr: prev.cr + (u.cache_read_input_tokens || 0),
      ws: prev.ws + ((u.server_tool_use && u.server_tool_use.web_search_requests) || 0)
    };
    all[day] = bucket;
    const cutoff = dayOf(Date.now() - KEEP_DAYS * 86400_000);
    for (const d of Object.keys(all)) if (d < cutoff) delete all[d];
    store.set(KEY, all);
  } catch (e) {
    console.error("AI xarajatini yozib bo'lmadi:", e.message);
  }
}

// Admin panel uchun hisobot: oxirgi `days` kun, kunlar bo'yicha va manba/model bo'yicha
function report(days = 30, now = Date.now()) {
  const all = (store && store.get(KEY, {})) || {};
  const list = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayOf(now - i * 86400_000);
    const by = {};
    let total = 0;
    for (const [k, u] of Object.entries(all[d] || {})) {
      const [src, model] = k.split("|");
      const c = costOf(model, u);
      by[src] = (by[src] || 0) + c;
      total += c;
    }
    list.push({ date: d, total, by });
  }
  const today = dayOf(now), month = today.slice(0, 7);
  const rows = {}, unknown = new Set();
  let monthUsd = 0, monthDays = 0;
  for (const [d, bucket] of Object.entries(all)) {
    const inMonth = d.startsWith(month);
    const inRange = d >= list[0].date;
    for (const [k, u] of Object.entries(bucket)) {
      const [src, model] = k.split("|");
      const c = costOf(model, u);
      if (inMonth) monthUsd += c;
      if (!inRange) continue;
      if (!priceOf(model).known) unknown.add(model);
      const r = rows[k] || (rows[k] = { source: src, sourceName: SOURCES[src] || src, model, n: 0, in: 0, out: 0, cw: 0, cr: 0, ws: 0, usd: 0 });
      for (const f of ["n", "in", "out", "cw", "cr", "ws"]) r[f] += u[f] || 0;
      r.usd += c;
    }
  }
  // Oy oxirigacha taxmin: shu oyning o'tgan kunlaridagi o'rtacha × oydagi kunlar soni
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  monthDays = Number(today.slice(8, 10));
  const forecast = monthDays ? monthUsd / monthDays * daysInMonth : 0;
  return {
    days: list,
    today: list[list.length - 1].total,
    month: monthUsd,
    forecast,
    period: list.reduce((a, x) => a + x.total, 0),
    rows: Object.values(rows).sort((a, b) => b.usd - a.usd),
    sources: SOURCES,
    unknownModels: [...unknown]
  };
}

module.exports = { init, record, report, costOf, priceOf, PRICES, SOURCES };
