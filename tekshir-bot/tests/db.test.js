// 6-bosqich testlari: baza, maxfiylik, /stats, /export. Internetsiz, xotiradagi baza bilan.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { openDb, toCsv } = require("../src/db");
const { createBot } = require("../src/bot");
const { isAdmin, formatStats } = require("../src/admin");
const cache = require("../src/cache");
// Testlar internetga chiqmasin: kompyuterdagi .env kalitlari bo'lsa ham tashqi API chaqirilmaydi
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;

const botInfo = { id: 1, is_bot: true, first_name: "T", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
function fakeBot(db) {
  const calls = [];
  const bot = createBot("123:TEST", { botInfo }, { db });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }; });
  return { bot, calls };
}
let uid = 1;
const msg = (from, text) => ({ update_id: uid++, message: { message_id: uid, date: 0, chat: { id: from, type: "private" }, from: { id: from, is_bot: false, first_name: "U" }, text,
  ...(text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}) } });

test("til bazada saqlanadi va bot qayta ishga tushsa ham eslab qoladi", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tk-")), "t.db");
  let db = openDb(file);
  db.setLang(42, "ru");
  db.close();
  db = openDb(file);                       // "qayta ishga tushirish"
  assert.strictEqual(db.getLang(42), "ru");
  db.close();
});

test("MAXFIYLIK: xabar matni va to'liq havola bazaga yozilmaydi", async () => {
  const db = openDb(":memory:");
  db.setLang(500, "uz-latn");
  const { bot } = fakeBot(db);
  const secret = "Kartangiz 8600123412341234 bloklandi, SMS kodni yuboring http://paymee-uz.top/login?id=SIRLI";
  await bot.handleUpdate(msg(500, secret));
  const dump = JSON.stringify(db.raw.prepare("SELECT * FROM checks").all()) + JSON.stringify(db.raw.prepare("SELECT * FROM domains").all());
  assert.ok(!dump.includes("8600"), "karta raqami bazada bo'lmasligi kerak");
  assert.ok(!dump.includes("SIRLI"), "to'liq havola bazada bo'lmasligi kerak");
  assert.ok(!dump.includes("bloklandi"), "matn bazada bo'lmasligi kerak");
  assert.ok(dump.includes("paymee-uz.top"), "faqat domen saqlanadi");
  const row = db.raw.prepare("SELECT * FROM checks").get();
  assert.strictEqual(row.level, "danger");
  assert.strictEqual(row.has_url, 1);
  assert.strictEqual(row.has_text, 1);
});

test("hash: raqam o'zi saqlanmaydi, bir xil raqam — bir xil hash, formatdan qat'i nazar", () => {
  process.env.HASH_SALT = "test-salt";
  const db = openDb(":memory:");
  const a = db.hash("+998 90 123-45-67"), b = db.hash("998901234567");
  assert.strictEqual(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes("901234567"));
});

test("/stats: admin bo'lmasa — bot jim; admin bo'lsa — raqamlar chiqadi", async () => {
  process.env.ADMIN_IDS = "111, 222";
  const db = openDb(":memory:");
  db.setLang(9, "uz-latn"); db.setLang(111, "ru");
  db.logCheck({ userId: 9, chatType: "private", result: { level: "danger", score: 80, hasUrl: true, hasFile: false, reasons: [{ code: "url_lookalike" }] }, hasText: false, hosts: ["paymee.uz"] });
  db.logCheck({ userId: 9, chatType: "private", result: { level: "safe", score: 0, hasUrl: true, hasFile: false, reasons: [] }, hasText: false, hosts: ["kun.uz"] });
  const { bot, calls } = fakeBot(db);

  await bot.handleUpdate(msg(9, "/stats"));
  assert.strictEqual(calls.filter(c => c.method === "sendMessage").length, 0, "oddiy foydalanuvchiga javob yo'q");

  await bot.handleUpdate(msg(111, "/stats"));
  const text = calls.find(c => c.method === "sendMessage").payload.text;
  assert.match(text, /Jami: <b>2<\/b>/);              // 2 foydalanuvchi
  assert.match(text, /🔴 Xavfli: 1 \(50%\)/);
  assert.match(text, /paymee\.uz/);
  assert.ok(!text.includes("kun.uz"), "xavfsiz domen xavflilar ro'yxatida bo'lmaydi");
});

test("/export: CSV fayl yuboriladi, ichida foydalanuvchi ID'si yo'q", async () => {
  process.env.ADMIN_IDS = "111";
  const db = openDb(":memory:");
  db.logCheck({ userId: 987654, chatType: "private", result: { level: "suspicious", score: 40, hasUrl: false, hasFile: true, reasons: [{ code: "file_archive" }] }, hasText: false });
  const rows = db.exportRows(30);
  const csv = toCsv(rows);
  assert.ok(csv.startsWith("﻿\"sana\""));
  assert.match(csv, /"suspicious","40"/);
  assert.ok(!csv.includes("987654"), "foydalanuvchi ID'si eksportda bo'lmasligi kerak");

  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(111, "/export 7"));
  const doc = calls.find(c => c.method === "sendDocument");
  assert.ok(doc, "fayl yuborilishi kerak");
  assert.match(doc.payload.caption, /7 kun: 1 ta/);
});

test("isAdmin va formatStats bo'sh baza bilan ham ishlaydi", () => {
  process.env.ADMIN_IDS = "";
  assert.strictEqual(isAdmin(1), false);
  const text = formatStats(openDb(":memory:").stats());
  assert.match(text, /Jami: <b>0<\/b>/);
});

test("kesh bazada saqlanadi: xotira tozalansa ham bazadan topiladi", () => {
  const db = openDb(":memory:");
  cache.attach(db);
  cache.set("vt:test.uz", { malicious: 3 });
  cache.attach(null); cache.clear(); cache.attach(db);   // xotirani tozalaymiz, bazani emas
  assert.deepStrictEqual(cache.get("vt:test.uz"), { malicious: 3 });
  db.cacheSet("old", 1, -1000);                           // muddati o'tgan
  assert.strictEqual(cache.get("old"), undefined);
  assert.strictEqual(db.cachePurge(), 1);
  cache.attach(null);
});
