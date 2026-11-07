// AHdigital — doimiy ma'lumotlar ombori
// Render'ning bepul tarifida disk vaqtinchalik: server qayta ishga tushsa yoki deploy bo'lsa, data/ papkasi o'chadi.
// Shuning uchun ma'lumotlar Upstash Redis'da (bepul) saqlanadi. Kalitlar bo'lmasa — eskicha, data/ papkasidagi fayllarda.
//
// Render → Environment: UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN (upstash.com → Redis → REST API).
//
// Ishlatish: await store.init()  →  store.get("orders", [])  /  store.set("orders", list)
// get/set darhol ishlaydi (xotiradan); set ma'lumotni orqa fonda bazaga yozadi.

const fs = require("fs");
const path = require("path");

const KEYS = ["orders", "legends-oquvchilar", "agent-xotira", "agent-eslatmalar", "foydalanuvchilar"];
const PREFIX = "ahd:";

function createStore({ dataDir }) {
  const URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const remote = !!(URL && TOKEN);
  const cache = new Map();
  const pending = new Map();   // kalit -> yozish kutilmoqda
  let ready = false;

  const file = key => path.join(dataDir, key + ".json");
  const readFile = key => { try { return JSON.parse(fs.readFileSync(file(key), "utf8")); } catch { return undefined; } };
  const writeFile = (key, val) => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(key), JSON.stringify(val, null, 2)); } catch (e) { console.error("Fayl:", e.message); } };

  async function redis(cmd) {
    const r = await fetch(URL, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
    return data.result;
  }

  async function init() {
    // Eski fayl nomlari (orders.json va h.k.) ham o'qiladi
    const legacy = { orders: "orders", "legends-oquvchilar": "legends-oquvchilar", "agent-xotira": "agent-xotira", "agent-eslatmalar": "agent-eslatmalar", foydalanuvchilar: "foydalanuvchilar" };
    for (const key of KEYS) {
      let val;
      if (remote) {
        for (let attempt = 1; attempt <= 3 && val === undefined; attempt++) {
          try { const raw = await redis(["GET", PREFIX + key]); val = raw == null ? null : JSON.parse(raw); }
          catch (e) { console.error(`Baza (${key}), ${attempt}-urinish:`, e.message); await new Promise(r => setTimeout(r, 1500 * attempt)); }
        }
        if (val === undefined) throw new Error("Upstash bazasiga ulanib bo'lmadi — UPSTASH_REDIS_REST_URL va TOKEN ni tekshiring.");
        if (val === null) {                        // bazada yo'q — diskdagi eski ma'lumotni ko'chiramiz
          const local = readFile(legacy[key]);
          if (local !== undefined) { await redis(["SET", PREFIX + key, JSON.stringify(local)]); val = local; console.log(`📦 ${key}: diskdagi ma'lumot bazaga ko'chirildi`); }
        }
      } else {
        val = readFile(legacy[key]);
      }
      if (val !== undefined && val !== null) cache.set(key, val);
    }
    ready = true;
    console.log(remote ? "🗄  Ma'lumotlar Upstash Redis'da saqlanadi (doimiy)" : "⚠️  Ma'lumotlar data/ papkasida — Render'da deploydan keyin o'chadi! UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN qo'shing.");
  }

  function get(key, def) {
    if (!ready) console.error(`store.get("${key}") init() dan oldin chaqirildi`);
    return cache.has(key) ? cache.get(key) : def;
  }

  function set(key, val) {
    cache.set(key, val);
    writeFile(key, val);                           // zaxira nusxa (bir xil server ichida)
    if (!remote) return;
    // Bir vaqtda bir nechta yozuv bo'lsa — faqat oxirgisini yuboramiz
    if (pending.has(key)) { pending.get(key).again = true; return; }
    const job = { again: false };
    pending.set(key, job);
    (async () => {
      do {
        job.again = false;
        const body = JSON.stringify(cache.get(key));
        for (let attempt = 1; attempt <= 5; attempt++) {
          try { await redis(["SET", PREFIX + key, body]); break; }
          catch (e) { console.error(`Bazaga yozib bo'lmadi (${key}), ${attempt}-urinish:`, e.message); await new Promise(r => setTimeout(r, 2000 * attempt)); }
        }
      } while (job.again);
      pending.delete(key);
    })();
  }

  return { init, get, set, remote: () => remote };
}

module.exports = { createStore };
