// Agent sinovlari: soxta Claude mijozi bilan — haqiqiy API chaqirilmaydi.
const test = require("node:test");
const assert = require("node:assert");

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-kalit";
const { createAgent, nextTime } = require("../agent");

function makeStore() {
  const m = new Map();
  return { get: (k, d) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d), set: (k, v) => m.set(k, v), m };
}

// Claude javoblarini ketma-ket qaytaruvchi soxta mijoz. Har bir tool_result keyingi so'rovda ko'rinadi.
function fakeClient(script) {
  const seen = [];
  return {
    seen,
    beta: { messages: { create: async req => {
      seen.push(req.messages[req.messages.length - 1]);
      const next = script.shift();
      if (!next) return { model: "claude-opus-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "tamom" }], usage: {} };
      return { model: "claude-opus-5-5", usage: {}, ...next };
    } } }
  };
}
const tool = (name, input) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t" + Math.random(), name, input }] });

function setup(script) {
  const store = makeStore(), sent = [], client = fakeClient(script);
  const agent = createAgent({
    api: async () => ({}), send: async (_c, t) => { sent.push(t); }, ownerChatId: 1, services: [],
    readOrders: () => [], writeOrders: () => {}, store, client
  });
  agent.start();
  return { agent, store, sent, client };
}
const until = async (fn, ms = 2000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error("kutish tugadi"); await new Promise(r => setTimeout(r, 5)); } };
const lastResult = client => client.seen.at(-1).content[0].content;

test("nextTime: kunlik, haftalik, oylik, yillik", () => {
  const b = "2026-11-16T03:00:00.000Z";
  assert.strictEqual(nextTime(b, "kunlik"), "2026-11-17T03:00:00.000Z");
  assert.strictEqual(nextTime(b, "haftalik"), "2026-11-23T03:00:00.000Z");
  assert.strictEqual(nextTime(b, "oylik"), "2026-12-16T03:00:00.000Z");
  assert.strictEqual(nextTime(b, "yillik"), "2027-11-16T03:00:00.000Z");
  assert.strictEqual(nextTime(b, null), null);
});

test("moliya: kirim/chiqim yoziladi va oylik foyda to'g'ri hisoblanadi", async () => {
  const { agent, store, sent, client } = setup([
    tool("moliya_yozish", { turi: "kirim", summa: 30000, izoh: "vizitka sayt", sana: "2026-11-10" }),
    tool("moliya_yozish", { turi: "chiqim", summa: 32000, izoh: "domen", sana: "2026-11-11" }),
    tool("moliya_yozish", { turi: "kirim", summa: 25000, izoh: "reels", sana: "2026-10-05" }),
    tool("moliya_hisobot", { oy: "2026-11" })
  ]);
  agent.onOwnerMessage("hisobla");
  await until(() => sent.length);
  assert.strictEqual(store.get("agent-moliya").length, 3);
  const rep = lastResult(client);
  assert.match(rep, /kirim 30\s000 so'm, chiqim 32\s000 so'm, sof -2\s000 so'm/);
  assert.match(rep, /domen/);
});

test("moliya: manfiy yoki nol summa rad etiladi", async () => {
  const { agent, store, sent, client } = setup([tool("moliya_yozish", { turi: "chiqim", summa: 0, izoh: "x" })]);
  agent.onOwnerMessage("x");
  await until(() => sent.length);
  assert.match(lastResult(client), /^Xato:/);
  assert.strictEqual(store.get("agent-moliya", []).length, 0);
});

test("g'oyalar va xatolar kundaligi: saqlash va qidirish", async () => {
  const { agent, store, sent, client } = setup([
    tool("goya_saqlash", { matn: "Kafe uchun 10 soniyali menyu video", joy: "shorts" }),
    tool("xato_yozish", { xato: "CORS policy blocked fetch", yechim: "server.js da cors() qo'shdim", texnologiya: "Node.js" }),
    tool("xato_qidirish", { soz: "cors xatosi" })
  ]);
  agent.onOwnerMessage("x");
  await until(() => sent.length);
  assert.strictEqual(store.get("agent-goyalar")[0].joy, "shorts");
  assert.match(lastResult(client), /cors\(\) qo'shdim/);
});

test("eslatma: 24,8 kundan uzoq eslatma oldinroq ishlab ketmaydi", async t => {
  const far = new Date(Date.now() + 40 * 86400e3).toISOString();
  const { agent, store, sent } = setup([tool("eslatma_qoyish", { vaqt: far, matn: "Domen to'lovi", takror: "yillik" })]);
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });
  agent.onOwnerMessage("x");
  for (let i = 0; i < 50 && !sent.length; i++) await new Promise(r => setImmediate(r));
  assert.ok(sent.length, "agent javob berdi");
  t.mock.timers.tick(25 * 86400e3);                    // 25 kun — eski kodda shu yerda ishlab ketardi
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  assert.ok(!sent.some(x => /Eslatma: Domen/.test(x)), "25-kuni eslatma kelmasligi kerak");
  t.mock.timers.tick(15 * 86400e3 + 1000);             // 40 kun
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  assert.ok(sent.some(x => /Eslatma: Domen/.test(x)), "40-kuni eslatma kelishi kerak");
  const r = store.get("agent-eslatmalar")[0];
  assert.strictEqual(r.takror, "yillik");
  assert.ok(new Date(r.vaqt).getTime() > new Date(far).getTime() + 360 * 86400e3, "keyingi yilga surildi");
});

test("eslatma: takrorlanadigani ishlagach keyingi vaqtga suriladi", async () => {
  const soon = new Date(Date.now() + 30).toISOString();
  const { agent, store, sent } = setup([tool("eslatma_qoyish", { vaqt: soon, matn: "Suv ich", takror: "kunlik" })]);
  agent.onOwnerMessage("x");
  await until(() => sent.some(t => /Eslatma: Suv ich/.test(t)));
  await new Promise(r => setTimeout(r, 20));
  const left = store.get("agent-eslatmalar");
  assert.strictEqual(left.length, 1);
  assert.ok(new Date(left[0].vaqt) > Date.now() + 23 * 3600e3);
});

test("agent: tz_tuzish havola qaytaradi, tz_royxati ko'rsatadi", async () => {
  const { createTz } = require("../tz");
  const SERVICES = require("../services");
  const store = makeStore(), sent = [];
  const client = fakeClient([
    tool("tz_tuzish", { xizmat: "vizitka", mijoz: "Dilnoza", biznes: "Lazzat kafe", til: "uz", bolimlar: ["Menyu"] }),
    tool("tz_royxati", {})
  ]);
  const tz = createTz({ store, services: SERVICES });
  const agent = createAgent({ api: async () => ({}), send: async (_c, t) => { sent.push(t); }, ownerChatId: 1, services: SERVICES,
    readOrders: () => [], writeOrders: () => {}, store, client, tz });
  agent.start();
  agent.onOwnerMessage("TZ tuz");
  await until(() => sent.length);
  const prev = client.seen.at(-2).content[0].content;
  assert.match(prev, /TZ-001 · Lazzat kafe/);
  assert.match(prev, /\/tz\//);
  assert.match(lastResult(client), /⏳ kutilmoqda/);
});
