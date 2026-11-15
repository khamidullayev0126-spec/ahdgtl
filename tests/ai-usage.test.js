// AI xarajatlari: narx hisobi, yozish va hisobot (ai-usage.js) hamda admin API
const { test } = require("node:test");
const assert = require("node:assert/strict");
const aiUsage = require("../ai-usage");
const { startServer, ADMIN_PASSWORD } = require("./helpers");

function fakeStore() {
  const m = new Map();
  return { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v) };
}

test("narx: Sonnet 5.5 va Opus 5.5 rasmiy narxlar bo'yicha hisoblanadi", () => {
  // Sonnet 5.5: 1 mln kirish $2 + 1 mln chiqish $10
  assert.equal(aiUsage.costOf("claude-sonnet-5-5", { in: 1e6, out: 1e6 }), 12);
  // Opus 5.5: kirish $4, chiqish $20, keshdan o'qish $0.20, keshga yozish 1.25×$4, veb-qidiruv $0.01
  assert.equal(aiUsage.costOf("claude-opus-5-5", { in: 1e6, out: 1e6, cr: 1e6, cw: 1e6, ws: 2 }), 4 + 20 + 0.2 + 5 + 0.02);
  // noma'lum model — eng qimmat narx (Opus 5.5) bilan, kam ko'rsatib yubormaslik uchun
  assert.equal(aiUsage.costOf("claude-yangi-model", { in: 1e6 }), 4);
  assert.equal(aiUsage.priceOf("claude-yangi-model").known, false);
});

test("yozish va hisobot: kunlar, manbalar, bugungi xarajat va jadval", () => {
  aiUsage.init(fakeStore());
  aiUsage.record("chat", { model: "claude-sonnet-5-5", usage: { input_tokens: 1000, output_tokens: 500 } });
  aiUsage.record("chat", { model: "claude-sonnet-5-5", usage: { input_tokens: 1000, output_tokens: 500 } });
  aiUsage.record("agent", { model: "claude-opus-5-5", usage: { input_tokens: 2000, output_tokens: 1000, cache_read_input_tokens: 10000, server_tool_use: { web_search_requests: 1 } } });
  aiUsage.record("bot", null);                       // buzuq javob — jim o'tadi
  const r = aiUsage.report(30);
  assert.equal(r.days.length, 30);
  const chat = 2 * (1000 * 2 + 500 * 10) / 1e6, agent = (2000 * 4 + 1000 * 20 + 10000 * 0.2) / 1e6 + 0.01;
  assert.ok(Math.abs(r.today - (chat + agent)) < 1e-9, `bugun: ${r.today}`);
  assert.ok(Math.abs(r.days.at(-1).by.chat - chat) < 1e-9);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].source, "agent", "eng qimmati birinchi");
  assert.equal(r.rows.find(x => x.source === "chat").n, 2);
  assert.ok(r.forecast >= r.month);
});

test("admin API: parolsiz 401, parol bilan hisobot qaytadi", async () => {
  const { base, stop } = await startServer();
  try {
    assert.equal((await fetch(base + "/api/admin/ai-usage")).status, 401);
    const res = await fetch(base + "/api/admin/ai-usage?days=7", { headers: { "x-admin-password": ADMIN_PASSWORD } });
    assert.equal(res.status, 200);
    const d = await res.json();
    assert.equal(d.days.length, 7);
    assert.ok(d.rate > 0 && d.sources.chat);
    assert.equal((await fetch(base + "/ai-usage.js")).status, 404, "server kodi internetdan ko'rinmasin");
  } finally { await stop(); }
});
