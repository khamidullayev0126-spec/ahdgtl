// AHdigital — doimiy ma'lumotlar ombori
// Render'ning bepul tarifida disk vaqtinchalik: server qayta ishga tushsa yoki deploy bo'lsa, data/ papkasi o'chadi.
// Shuning uchun ma'lumotlar Upstash Redis'da (bepul) saqlanadi. Kalitlar bo'lmasa — data/ papkasidagi fayllarda.
//
// Render → Environment: UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN (upstash.com → Redis → REST API).
//
// Ishlatish: await store.init()  →  store.get("orders", [])  /  store.set("orders", list)
// get/set darhol ishlaydi (xotiradan); set ma'lumotni orqa fonda bazaga yozadi.
//
// Qanday saqlanadi:
//  • "To'plamlar" (buyurtmalar, foydalanuvchilar, chatlar, o'quvchilar) — Redis HASH'da, HAR BIR YOZUV ALOHIDA.
//    Bitta buyurtma o'zgarsa — faqat o'sha buyurtma yoziladi (butun ro'yxat emas).
//  • Kichik sozlamalar (xotira, eslatmalar, sozlama) — bitta yozuv sifatida.
//  • Kunlik zaxira: ahd:backup:YYYY-MM-DD (14 kun saqlanadi). backup() orqali.

const fs = require("fs");
const path = require("path");

const PREFIX = "ahd:";
// kalit -> qanday to'plam: list (massiv, id maydoni va tartiblash) yoki map (obyekt: kalit -> yozuv)
const COLLECTIONS = {
  orders: { type: "list", id: "id", sort: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) },
  "legends-oquvchilar": { type: "list", id: "id", sort: (a, b) => String(a.yaratildi).localeCompare(String(b.yaratildi)) },
  foydalanuvchilar: { type: "map" },
  "biznes-chatlar": { type: "map" },
  tolovlar: { type: "map" }          // Click / Payme tranzaksiyalari
};
const BLOBS = ["agent-xotira", "agent-eslatmalar", "biznes-sozlama", "zaxira-holat"];
const KEYS = [...Object.keys(COLLECTIONS), ...BLOBS];
const BACKUP_DAYS = 14;

function createStore({ dataDir, onError = () => {}, fetchImpl, retryDelay = 1500 }) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const remote = !!(URL && TOKEN);
  const cache = new Map();
  const saved = new Map();     // to'plam kaliti -> Map(maydon -> bazadagi JSON) — nima o'zgarganini bilish uchun
  const pending = new Map();   // kalit -> { again, promise }
  let ready = false;

  const file = key => path.join(dataDir, key + ".json");
  const readFile = key => { try { return JSON.parse(fs.readFileSync(file(key), "utf8")); } catch { return undefined; } };
  const writeFile = (key, val) => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(key), JSON.stringify(val, null, 2)); } catch (e) { console.error("Fayl:", e.message); } };
  const hashKey = key => PREFIX + "h:" + key;

  async function call(pathPart, body) {
    const r = await doFetch(URL + pathPart, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }
  const redis = async cmd => (await call("", cmd)).result;
  async function pipeline(cmds) {
    if (!cmds.length) return [];
    const out = await call("/pipeline", cmds);
    const bad = out.find(x => x && x.error);
    if (bad) throw new Error(bad.error);
    return out.map(x => x.result);
  }
  async function retry(what, fn, tries = 3) {
    for (let attempt = 1; ; attempt++) {
      try { return await fn(); }
      catch (e) {
        console.error(`Baza (${what}), ${attempt}-urinish:`, e.message);
        if (attempt >= tries) throw e;
        await new Promise(r => setTimeout(r, retryDelay * attempt));
      }
    }
  }

  // To'plamni maydon -> JSON ko'rinishiga keltirish
  function entries(key, val) {
    const c = COLLECTIONS[key];
    const m = new Map();
    if (c.type === "list") (val || []).forEach(x => { if (x && x[c.id] != null) m.set(String(x[c.id]), JSON.stringify(x)); });
    else Object.entries(val || {}).forEach(([k, v]) => m.set(String(k), JSON.stringify(v)));
    return m;
  }
  function fromHash(key, flat) {
    const c = COLLECTIONS[key];
    const pairs = [];
    for (let i = 0; i < flat.length; i += 2) pairs.push([flat[i], JSON.parse(flat[i + 1])]);
    if (c.type === "list") return pairs.map(p => p[1]).sort(c.sort);
    return Object.fromEntries(pairs);
  }

  async function init() {
    for (const key of KEYS) {
      let val;
      if (!remote) {
        val = readFile(key);
      } else if (COLLECTIONS[key]) {
        const flat = await retry(key, () => redis(["HGETALL", hashKey(key)])).catch(() => { throw new Error("Upstash bazasiga ulanib bo'lmadi — UPSTASH_REDIS_REST_URL va TOKEN ni tekshiring."); });
        if (flat && flat.length) {
          val = fromHash(key, flat);
        } else {
          // Yangi ko'rinishda hali yo'q — eski (bitta yozuv) yoki diskdagi ma'lumotni ko'chiramiz. Eski yozuv o'chirilmaydi (zaxira).
          const raw = await retry(key, () => redis(["GET", PREFIX + key]));
          const old = raw != null ? JSON.parse(raw) : readFile(key);
          if (old != null) {
            const m = entries(key, old);
            await retry(key, () => pipeline([...m].map(([f, j]) => ["HSET", hashKey(key), f, j])));
            val = old;
            console.log(`📦 ${key}: ${m.size} ta yozuv yangi ko'rinishga (har biri alohida) ko'chirildi`);
          }
        }
        saved.set(key, entries(key, val));
      } else {
        const raw = await retry(key, () => redis(["GET", PREFIX + key]));
        val = raw != null ? JSON.parse(raw) : readFile(key);
        if (raw == null && val != null) await retry(key, () => redis(["SET", PREFIX + key, JSON.stringify(val)]));
      }
      if (val !== undefined && val !== null) cache.set(key, val);
    }
    ready = true;
    console.log(remote ? "🗄  Ma'lumotlar Upstash Redis'da saqlanadi (doimiy, har bir yozuv alohida)" : "⚠️  Ma'lumotlar data/ papkasida — Render'da deploydan keyin o'chadi! UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN qo'shing.");
  }

  function get(key, def) {
    if (!ready) console.error(`store.get("${key}") init() dan oldin chaqirildi`);
    return cache.has(key) ? cache.get(key) : def;
  }

  // Bazaga bitta yozish: to'plamda faqat o'zgargan yozuvlar (HSET) va o'chirilganlar (HDEL)
  async function persist(key) {
    const val = cache.get(key);
    if (!COLLECTIONS[key]) return redis(["SET", PREFIX + key, JSON.stringify(val)]);
    const now = entries(key, val), before = saved.get(key) || new Map();
    const cmds = [];
    for (const [f, j] of now) if (before.get(f) !== j) cmds.push(["HSET", hashKey(key), f, j]);
    for (const f of before.keys()) if (!now.has(f)) cmds.push(["HDEL", hashKey(key), f]);
    await pipeline(cmds);
    saved.set(key, now);
  }

  function set(key, val) {
    cache.set(key, val);
    writeFile(key, val);                           // qo'shimcha nusxa (bir xil server ichida)
    if (!remote) return;
    // Bir vaqtda bir nechta yozuv bo'lsa — navbat bilan, oxirgi holat albatta yoziladi
    if (pending.has(key)) { pending.get(key).again = true; return; }
    const job = { again: false };
    job.promise = (async () => {
      do {
        job.again = false;
        try { await retry(key, () => persist(key), 5); }
        catch (e) { onError(`Bazaga yozib bo'lmadi (${key}): ${e.message}`); }
      } while (job.again);
      pending.delete(key);
    })();
    pending.set(key, job);
  }

  // Hamma yozuvlar bazaga yetib borguncha kutish (server to'xtashidan oldin)
  async function flush() {
    while (pending.size) await Promise.all([...pending.values()].map(j => j.promise));
  }

  // Hamma ma'lumotning nusxasi (zaxira uchun)
  function snapshot() {
    return { olingan: new Date().toISOString(), data: Object.fromEntries(KEYS.filter(k => cache.has(k)).map(k => [k, cache.get(k)])) };
  }

  // Kunlik zaxira bazaning o'zida (14 kun saqlanadi)
  async function backup() {
    if (!remote) return false;
    const day = new Date().toISOString().slice(0, 10);
    await redis(["SET", `${PREFIX}backup:${day}`, JSON.stringify(snapshot()), "EX", String(BACKUP_DAYS * 86400)]);
    return true;
  }

  return { init, get, set, flush, snapshot, backup, remote: () => remote };
}

module.exports = { createStore, KEYS };
