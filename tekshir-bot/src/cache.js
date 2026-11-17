// Oddiy kesh (xotirada): bir xil savolni tashqi API'ga qayta-qayta yubormaslik uchun.
// Masalan, bitta domen 24 soat ichida VirusTotal'ga qayta so'ralmaydi — bepul limit tejaladi.
// 6-bosqichda bu SQLite'dagi "domains" jadvaliga o'tadi (bot qayta ishga tushsa ham saqlanadi).

const DAY = 24 * 60 * 60 * 1000;
const store = new Map();          // kalit -> { value, until }
const MAX = 5000;                 // xotira to'lib ketmasin

function get(key) {
  const x = store.get(key);
  if (!x) return undefined;
  if (Date.now() > x.until) { store.delete(key); return undefined; }
  return x.value;
}

function set(key, value, ttl = DAY) {
  if (store.size >= MAX) store.delete(store.keys().next().value);   // eng eskisini o'chiramiz
  store.set(key, { value, until: Date.now() + ttl });
}

function clear() { store.clear(); }

module.exports = { get, set, clear, DAY };
