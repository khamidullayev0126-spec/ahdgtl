// Tezlik testlari: Google/VirusTotal sekin bo'lsa ham bot DARHOL javob beradi, keyin xabarni yangilaydi.
const test = require("node:test");
const assert = require("node:assert");
const { createBot } = require("../src/bot");
const { openDb } = require("../src/db");
const ext = require("../src/checkers/external");
const cache = require("../src/cache");
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
process.env.HASH_SALT = "test-salt";

const botInfo = { id: 1, is_bot: true, first_name: "T", username: "t_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
function setup() {
  const db = openDb(":memory:"); db.setLang(1, "uz-latn");
  const calls = [], t0 = { v: 0 };
  const bot = createBot("123:TEST", { botInfo }, { db });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload, at: Date.now() - t0.v }); return { ok: true, result: { message_id: 50, date: 0, chat: { id: 1, type: "private" } } }; });
  const say = async text => { t0.v = Date.now(); await bot.handleUpdate({ update_id: Math.random() * 1e9 | 0, message: { message_id: 1, date: 0, chat: { id: 1, type: "private" }, from: { id: 1, is_bot: false, first_name: "U" }, text } }); };
  return { db, calls, say };
}
// Sekin "Google": har bir so'rovga 1.5 soniyada javob beradi va saytni fishing deb belgilaydi
let fetchCount = 0;
const slowFetch = async () => { fetchCount++; await new Promise(r => setTimeout(r, 1500)); return { ok: true, status: 200, json: async () => ({ matches: [{ threatType: "SOCIAL_ENGINEERING" }] }) }; };
test.beforeEach(() => { cache.clear(); fetchCount = 0; ext._vtCalls.length = 0; process.env.SAFE_BROWSING_KEY = "test"; delete process.env.VIRUSTOTAL_KEY; ext.setFetch(slowFetch); });
test.after(() => { delete process.env.SAFE_BROWSING_KEY; });

test("tashqi xizmat sekin bo'lsa ham birinchi javob 1 soniyadan tez, keyin xabar yangilanadi", async () => {
  const { calls, say } = setup();
  await say("https://yangi-aksiya-sayt.com/page");
  const first = calls.find(c => c.method === "sendMessage");
  assert.ok(first.at < 1000, `birinchi javob ${first.at} ms — juda sekin`);
  assert.match(first.payload.text, /qo'shimcha tekshirilmoqda/);
  const edit = calls.find(c => c.method === "editMessageText");
  assert.ok(edit, "xabar yangilanishi kerak");
  assert.match(edit.payload.text, /XAVFLI/);
  assert.match(edit.payload.text, /Google bu saytni firibgar/);
  assert.ok(!/tekshirilmoqda/.test(edit.payload.text));
});

test("qoidalar o'zi 🔴 topsa — tashqi xizmatni kutmaydi va xabar yangilanmaydi", async () => {
  const { calls, say } = setup();
  await say("https://c1ick-uz.com/bonus");
  assert.match(calls.find(c => c.method === "sendMessage").payload.text, /XAVFLI/);
  assert.ok(!calls.some(c => c.method === "editMessageText"));
  assert.strictEqual(fetchCount, 0);
});

test("oddiy matn — bitta tez javob, yangilanish yo'q", async () => {
  const { calls, say } = setup();
  await say("Ertaga soat 10 da uchrashamiz");
  const first = calls.find(c => c.method === "sendMessage");
  assert.ok(first.at < 500);
  assert.ok(!/tekshirilmoqda/.test(first.payload.text));
  assert.ok(!calls.some(c => c.method === "editMessageText"));
});

test("rasmiy sayt — tashqi xizmat chaqirilmaydi", async () => {
  const { calls, say } = setup();
  await say("https://click.uz");
  assert.match(calls.find(c => c.method === "sendMessage").payload.text, /Xavf topilmadi/);
  assert.strictEqual(fetchCount, 0);
});
