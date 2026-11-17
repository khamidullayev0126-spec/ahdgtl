// 7-bosqich testlari: raqamlarni topish, shikoyatlar, maxfiylik. Internetsiz.
const test = require("node:test");
const assert = require("node:assert");
const { extractNumbers, reportPoints } = require("../src/checkers/numbers");
const { openDb } = require("../src/db");
const { createBot } = require("../src/bot");
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
process.env.HASH_SALT = "test-salt";

const botInfo = { id: 1, is_bot: true, first_name: "T", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
function fakeBot(db) {
  const calls = [];
  const bot = createBot("123:TEST", { botInfo }, { db });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: method === "sendMessage" ? { message_id: 1, date: 0, chat: { id: 1, type: "private" } } : true }; });
  return { bot, calls };
}
let uid = 1;
const msg = (from, text) => ({ update_id: uid++, message: { message_id: uid, date: 0, chat: { id: from, type: "private" }, from: { id: from, is_bot: false, first_name: "U" }, text } });
const click = (from, data) => ({ update_id: uid++, callback_query: { id: "cb" + uid, from: { id: from, is_bot: false, first_name: "U" }, chat_instance: "1", data, message: { message_id: 5, date: 0, chat: { id: from, type: "private" }, text: "..." } } });
const lastAnswer = calls => calls.filter(c => c.method === "sendMessage").pop().payload;
const reportBtn = ans => ans.reply_markup.inline_keyboard.flat().find(b => (b.callback_data || "").startsWith("rep:"))?.callback_data;
const alerts = calls => calls.filter(c => c.method === "answerCallbackQuery").map(c => c.payload.text || "");

test("raqamlar topiladi: turli yozilish, karta va telefon ajratiladi", () => {
  assert.deepStrictEqual(extractNumbers("+998 90 123 45 67").map(x => x.masked), ["+998 90 *** ** 67"]);
  assert.deepStrictEqual(extractNumbers("(90) 123-45-67").map(x => x.digits), ["998901234567"]);
  assert.deepStrictEqual(extractNumbers("Karta 8600 1234 5678 9012 ga").map(x => x.kind), ["card"]);
  assert.deepStrictEqual(extractNumbers("9860123412341234 va 93 555 66 77").map(x => x.kind), ["card", "phone"]);
  assert.deepStrictEqual(extractNumbers("Narxi 100000 so'm, 2024-yil, ID 123456789"), []);
});

test("shikoyat ballari: shikoyatning o'zi hech qachon 🔴 bermaydi", () => {
  assert.strictEqual(reportPoints(0), 0);
  assert.strictEqual(reportPoints(1), 15);
  assert.strictEqual(reportPoints(3), 35);
  assert.ok(reportPoints(1000) < 70);
});

test("raqam yuborilsa: shikoyat yo'q deb yoziladi, raqam yashirilgan", async () => {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(1, "+998 90 123 45 67"));
  const ans = lastAnswer(calls);
  assert.match(ans.text, /\+998 90 \*\*\* \*\* 67<\/code> — shikoyat yo'q/);
  assert.ok(!ans.text.includes("123 45"), "raqam to'liq ko'rsatilmaydi");
  assert.ok(reportBtn(ans), "shikoyat tugmasi bor");
});

test("shikoyat: tasdiqlash → qabul qilinadi; ikkinchi marta — takror deb aytadi; boshqa odam — soni oshadi", async () => {
  const db = openDb(":memory:");
  for (const id of [1, 2, 3]) db.setLang(id, "uz-latn");
  const { bot, calls } = fakeBot(db);
  const N = "Pulni shu kartaga tashlang 8600 1234 5678 9012";

  await bot.handleUpdate(msg(1, N));
  let id = reportBtn(lastAnswer(calls)).slice(4);
  await bot.handleUpdate(click(1, "rep:" + id));                   // 1-qadam: so'raydi
  assert.strictEqual(db.reportCount(db.hash("8600123456789012")), 0, "tasdiqlanmaguncha yozilmaydi");
  await bot.handleUpdate(click(1, "repy:" + id));                  // 2-qadam: tasdiq
  assert.match(alerts(calls).pop(), /Rahmat/);
  assert.strictEqual(db.reportCount(db.hash("8600123456789012")), 1);

  await bot.handleUpdate(msg(1, N));                               // o'sha odam yana
  id = reportBtn(lastAnswer(calls)).slice(4);
  await bot.handleUpdate(click(1, "repy:" + id));
  assert.match(alerts(calls).pop(), /avval shikoyat/);
  assert.strictEqual(db.reportCount(db.hash("8600123456789012")), 1, "bir odam — bir shikoyat");

  for (const u of [2, 3]) {
    await bot.handleUpdate(msg(u, N));
    await bot.handleUpdate(click(u, "repy:" + reportBtn(lastAnswer(calls)).slice(4)));
  }
  await bot.handleUpdate(msg(1, N));
  const ans = lastAnswer(calls);
  assert.match(ans.text, /3 ta shikoyat/);
  assert.ok(!/firibgar/i.test(ans.text.split("📞")[1]), "bot odamni firibgar demaydi — faqat son");
});

test("boshqa odamning shikoyat tugmasini bosib bo'lmaydi", async () => {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn"); db.setLang(2, "uz-latn");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(1, "93 555 66 77"));
  const id = reportBtn(lastAnswer(calls)).slice(4);
  await bot.handleUpdate(click(2, "repy:" + id));
  assert.match(alerts(calls).pop(), /eskirgan/);
  assert.strictEqual(db.raw.prepare("SELECT COUNT(*) n FROM reports").get().n, 0);
});

test("MAXFIYLIK: bazada raqam ochiq ko'rinishda yo'q", async () => {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(1, "Karta 9860 1111 2222 3333, tel +998 99 765 43 21"));
  await bot.handleUpdate(click(1, "repy:" + reportBtn(lastAnswer(calls)).slice(4)));
  const dump = ["users", "checks", "domains", "reports", "cache"].map(tb => JSON.stringify(db.raw.prepare(`SELECT * FROM ${tb}`).all())).join("");
  for (const bad of ["9860", "3333", "765", "4321", "99765"]) assert.ok(!dump.includes(bad), `bazada "${bad}" bo'lmasligi kerak`);
  assert.strictEqual(db.raw.prepare("SELECT COUNT(*) n FROM reports").get().n, 2);
});

test("sayt ustidan shikoyat: keyingi tekshiruvda sabab sifatida chiqadi", async () => {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn"); db.setLang(2, "uz-latn");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(1, "https://yangi-aksiya.xyz"));
  await bot.handleUpdate(click(1, "repy:" + reportBtn(lastAnswer(calls)).slice(4)));
  await bot.handleUpdate(msg(2, "https://yangi-aksiya.xyz"));
  assert.match(lastAnswer(calls).text, /1 ta foydalanuvchi shikoyat qilgan/);
});

test("rasmiy saytga shikoyat qilib bo'lmaydi (tugma chiqmaydi)", async () => {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(msg(1, "https://click.uz"));
  assert.strictEqual(reportBtn(lastAnswer(calls)), undefined);
});

test("kunlik limit: 20 tadan ko'p shikoyat qabul qilinmaydi", () => {
  const db = openDb(":memory:");
  for (let i = 0; i < 20; i++) assert.strictEqual(db.addReport("h" + i, "phone", 9), "ok");
  assert.strictEqual(db.addReport("h99", "phone", 9), "limit");
});
