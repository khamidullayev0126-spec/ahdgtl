// 10-bosqich: webhook rejimi (serverda). Telegram'ga ulanmaydi — soxta so'rovlar yuboramiz.
const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const { createBot, startWebhook } = require("../src/bot");
const { openDb } = require("../src/db");
// Server loglari test natijalari bilan aralashib ketmasin (Node test runner shunga sezgir)
console.log = () => {};
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
delete process.env.WEBHOOK_SECRET;

test("webhook: /health ishlaydi, maxfiy kalitsiz so'rov rad etiladi, to'g'risi qabul qilinadi", async () => {
  process.env.BOT_TOKEN = "123:TEST";
  const db = openDb(":memory:");
  db.setLang(5, "uz-latn");
  const sent = [];
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false } }, { db });
  bot.api.config.use(async (prev, method, payload) => { sent.push(method); return { ok: true, result: true }; });
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const secret = crypto.createHash("sha256").update("tekshir:123:TEST").digest("hex").slice(0, 48);
  const hook = url + "/telegram/" + secret.slice(0, 16);
  try {
    assert.match(await (await fetch(url + "/health")).text(), /ishlayapti/);
    assert.strictEqual((await fetch(url + "/telegram/boshqa", { method: "POST", body: "{}" })).status, 404);
    const update = { update_id: 1, message: { message_id: 1, date: 0, chat: { id: 5, type: "private" }, from: { id: 5, is_bot: false, first_name: "U" }, text: "SMS kodni ayting, kartangiz bloklandi" } };
    const bad = await fetch(hook, { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": "notogri" }, body: JSON.stringify(update) });
    assert.strictEqual(bad.status, 401);
    const ok = await fetch(hook, { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret }, body: JSON.stringify(update) });
    assert.strictEqual(ok.status, 200);
    assert.ok(sent.includes("sendMessage"), "bot javob yuborgan bo'lishi kerak");
  } finally { server.close(); }
});
