// store.js testlari: soxta Upstash bilan (haqiqiy bazaga ulanmaydi)
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createStore } = require("../store");

// Xotiradagi soxta Upstash: GET, SET, HGETALL, HSET, HDEL va /pipeline
function fakeUpstash() {
  const db = new Map(), log = [];
  let down = false;
  const run = ([cmd, key, ...a]) => {
    log.push([cmd, key, a[0]]);
    if (cmd === "GET") return db.has(key) ? db.get(key) : null;
    if (cmd === "SET") { db.set(key, a[0]); return "OK"; }
    const h = db.get(key) || new Map();
    if (cmd === "HGETALL") return [...h].flat();
    if (cmd === "HSET") { h.set(a[0], a[1]); db.set(key, h); return 1; }
    if (cmd === "HDEL") { h.delete(a[0]); return 1; }
    throw new Error("noma'lum buyruq " + cmd);
  };
  const fetchImpl = async (url, opt) => {
    if (down) return new Response(JSON.stringify({ error: "server ishlamayapti" }), { status: 500 });
    const body = JSON.parse(opt.body);
    const res = url.endsWith("/pipeline") ? body.map(c => ({ result: run(c) })) : { result: run(body) };
    return new Response(JSON.stringify(res), { headers: { "content-type": "application/json" } });
  };
  return { db, log, fetchImpl, setDown: v => (down = v) };
}

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ahd-store-"));
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
});
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });
const make = (up, extra = {}) => createStore({ dataDir: dir, fetchImpl: up.fetchImpl, retryDelay: 1, ...extra });

test("eski ko'rinishdagi buyurtmalar har biri alohida yozuvga ko'chiriladi, eskisi o'chmaydi", async () => {
  const up = fakeUpstash();
  const old = [{ id: "b", createdAt: "2026-11-02" }, { id: "a", createdAt: "2026-11-01" }];
  up.db.set("ahd:orders", JSON.stringify(old));
  const s = make(up);
  await s.init();
  assert.deepEqual(s.get("orders").map(o => o.id), ["b", "a"]);
  assert.equal(up.db.get("ahd:h:orders").size, 2);
  assert.ok(up.db.has("ahd:orders"), "eski yozuv zaxira sifatida qolishi kerak");
  // qayta ishga tushganda yangi ko'rinishdan o'qiydi va eng yangisi birinchi turadi
  const s2 = make(up);
  await s2.init();
  assert.deepEqual(s2.get("orders").map(o => o.id), ["b", "a"]);
});

test("bitta buyurtma o'zgarsa — faqat o'sha yoziladi, o'chirilgani bazadan ham o'chadi", async () => {
  const up = fakeUpstash();
  const s = make(up);
  await s.init();
  const list = [{ id: "1", createdAt: "1", status: "yangi" }, { id: "2", createdAt: "2", status: "yangi" }];
  s.set("orders", list); await s.flush();
  up.log.length = 0;
  list[0].status = "bajarildi";
  s.set("orders", list); await s.flush();
  assert.deepEqual(up.log, [["HSET", "ahd:h:orders", "1"]]);
  up.log.length = 0;
  s.set("orders", [list[0]]); await s.flush();
  assert.deepEqual(up.log, [["HDEL", "ahd:h:orders", "2"]]);
});

test("foydalanuvchilar (obyekt) ham har biri alohida saqlanadi", async () => {
  const up = fakeUpstash();
  const s = make(up);
  await s.init();
  s.set("foydalanuvchilar", { "111": { name: "A" }, "g:5": { name: "B" } }); await s.flush();
  const s2 = make(up);
  await s2.init();
  assert.deepEqual(s2.get("foydalanuvchilar"), { "111": { name: "A" }, "g:5": { name: "B" } });
});

test("ketma-ket ko'p yozuvda oxirgi holat albatta saqlanadi", async () => {
  const up = fakeUpstash();
  const s = make(up);
  await s.init();
  for (let i = 1; i <= 20; i++) s.set("agent-xotira", [{ id: i }]);
  await s.flush();
  assert.equal(up.db.get("ahd:agent-xotira"), JSON.stringify([{ id: 20 }]));
});

test("baza ishlamasa — egasiga xabar beriladi (onError), ma'lumot xotirada qoladi", async () => {
  const up = fakeUpstash();
  const errors = [];
  const s = make(up, { onError: m => errors.push(m) });
  await s.init();
  up.setDown(true);
  s.set("orders", [{ id: "x", createdAt: "1" }]); await s.flush();
  assert.equal(errors.length, 1);
  assert.match(errors[0], /orders/);
  assert.equal(s.get("orders")[0].id, "x");
  // baza qayta ishlasa, keyingi yozuvda hammasi yetib boradi
  up.setDown(false);
  s.set("orders", [{ id: "x", createdAt: "1" }, { id: "y", createdAt: "2" }]); await s.flush();
  assert.equal(up.db.get("ahd:h:orders").size, 2);
});

test("kunlik zaxira 14 kunlik muddat bilan saqlanadi va hamma ma'lumotni o'z ichiga oladi", async () => {
  const up = fakeUpstash();
  const s = make(up);
  await s.init();
  s.set("orders", [{ id: "1", createdAt: "1" }]); await s.flush();
  assert.equal(await s.backup(), true);
  const key = [...up.db.keys()].find(k => k.startsWith("ahd:backup:"));
  assert.ok(key, "zaxira yozilmadi");
  const setCmd = up.log.find(l => l[0] === "SET" && l[1] === key);
  assert.ok(setCmd);
  assert.equal(JSON.parse(up.db.get(key)).data.orders[0].id, "1");
});
