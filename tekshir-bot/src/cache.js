// Kesh: bir xil savolni tashqi API'ga qayta-qayta yubormaslik uchun.
// Masalan, bitta domen 24 soat ichida VirusTotal'ga qayta so'ralmaydi — bepul limit tejaladi.
// 6-bosqich: baza ulangan bo'lsa (attach), kesh SQLite'dagi "cache" jadvalida ham saqlanadi —
// bot qayta ishga tushsa ham yo'qolmaydi. Xotiradagi Map esa tezlik uchun qoladi.

const DAY = 24 * 60 * 60 * 1000;
const store = new Map();          // kalit -> { value, until }
const MAX = 5000;                 // xotira to'lib ketmasin
let db = null;                    // { cacheGet, cacheSet } — openDb() dan

function attach(database) { db = database; }

function get(key) {
  const x = store.get(key);
  if (x && Date.now() <= x.until) return x.value;
  if (x) store.delete(key);
  if (db) {
    const v = db.cacheGet(key);
    if (v !== undefined) { remember(key, v, DAY); return v; }
  }
  return undefined;
}

function remember(key, value, ttl) {
  if (store.size >= MAX) store.delete(store.keys().next().value);   // eng eskisini o'chiramiz
  store.set(key, { value, until: Date.now() + ttl });
}

function set(key, value, ttl = DAY) {
  remember(key, value, ttl);
  if (db) { try { db.cacheSet(key, value, ttl); } catch (e) { console.error("Kesh (baza):", e.message); } }
}

function clear() { store.clear(); if (db && db.raw) db.raw.exec("DELETE FROM cache"); }

module.exports = { get, set, clear, attach, DAY };
