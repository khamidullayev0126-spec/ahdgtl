// Oila himoyasi: /oila kodi → ilova ulanadi → xavf aniqlansa ota-onaga xabar. Telegram'ga ulanmaydi.
const test = require("node:test");
const assert = require("node:assert");
const { createBot, startWebhook } = require("../src/bot");
const { openDb } = require("../src/db");
console.log = () => {};
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
process.env.HASH_SALT = "test-salt"; process.env.BOT_TOKEN = "123:TEST";

const PARENT = 777;
let uid = 1;
const msg = (from, text) => ({ update_id: uid++, message: { message_id: uid, date: 0, chat: { id: from, type: "private" }, from: { id: from, is_bot: false, first_name: "U" }, text, entities: text.startsWith("/") ? [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] : [] } });

async function withServer(fn) {
  const db = openDb(":memory:");
  const calls = [];
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot" } }, { db });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: method === "sendMessage" ? { message_id: 1, date: 0, chat: { id: 1, type: "private" } } : true }; });
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api/family/`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  try { await fn({ post, db, bot, calls }); } finally { server.close(); }
}
const sent = calls => calls.filter(c => c.method === "sendMessage").map(c => c.payload);

test("to'liq yo'l: /oila → kod → ulash → xavfli xabar → ota-onaga ogohlantirish (matnsiz)", async () => withServer(async ({ post, db, bot, calls }) => {
  db.setLang(PARENT, "uz-latn");
  await bot.handleUpdate(msg(PARENT, "/oila"));
  const intro = sent(calls).pop().text;
  const code = intro.match(/<code>(\d{6})<\/code>/)[1];

  const link = await post("link", { code, label: "Oyim" });
  assert.strictEqual(link.status, 200);
  const { token } = await link.json();
  assert.match(token, /^[0-9a-f]{48}$/);
  assert.match(sent(calls).pop().text, /Oyim.*ulandi/);
  // Bazada kalitning o'zi yo'q — faqat hash
  assert.ok(!JSON.stringify(db.raw.prepare("SELECT * FROM family").all()).includes(token));
  // Kod ikkinchi marta ishlamaydi
  assert.strictEqual((await post("link", { code, label: "x" })).status, 404);

  const a = await post("alert", { token, kind: "message", source: "Telegram", text: "SMS kodni ayting 8600 1234 5678 9012" });
  assert.strictEqual(a.status, 200);
  const alert = sent(calls).pop();
  assert.strictEqual(alert.chat_id, PARENT);
  assert.match(alert.text, /Oyim/);
  assert.match(alert.text, /xavfli xabar/);
  assert.match(alert.text, /Telegram/);
  assert.ok(!alert.text.includes("8600") && !alert.text.includes("SMS kodni"), "xabar matni yuborilmaydi");

  // /oila ro'yxatida ko'rinadi, /oila_ochir — hammasi uziladi
  await bot.handleUpdate(msg(PARENT, "/oila"));
  assert.match(sent(calls).pop().text, /Oyim — 🚨 1/);
  await bot.handleUpdate(msg(PARENT, "/oila_ochir"));
  assert.match(sent(calls).pop().text, /1 ta uzildi/);
  assert.strictEqual((await post("alert", { token, kind: "message" })).status, 404);
}));

test("himoya: noto'g'ri kod, noto'g'ri tur, brauzerdan so'rov, eskirgan kod, chegaralar", async () => withServer(async ({ post, db, bot }) => {
  assert.strictEqual((await post("link", { code: "12ab56" })).status, 404);
  assert.strictEqual((await post("link", { code: "123456" }, { origin: "https://yomon.com" })).status, 403);
  const old = db.familyCode(PARENT, Date.now() - 31 * 60 * 1000);
  assert.strictEqual((await post("link", { code: old })).status, 404, "30 daqiqadan eski kod ishlamaydi");
  const { token } = await bot.familyLink(db.familyCode(PARENT), "<b>Dadam</b>");
  assert.strictEqual(await bot.familyAlert({ token, kind: "hack" }), "bad");
  assert.strictEqual(await bot.familyAlert({ token: "yoq", kind: "app" }), "unknown");
  let last;
  for (let i = 0; i < 11; i++) last = await bot.familyAlert({ token, kind: "app" });
  assert.strictEqual(last, "limit", "soatiga 10 tadan ko'p emas");
}));
