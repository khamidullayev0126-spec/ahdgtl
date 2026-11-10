// To'lov kodi: noto'g'ri kodni ko'p marta sinagan IP bloklanadi (kodni taxmin qilib topishga qarshi)
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./helpers");

let srv, base;
before(async () => { srv = await startServer(); base = srv.base; });
after(async () => { await srv.stop(); });

test("to'lov kodi: 20 ta noto'g'ri urinishdan keyin 429", async () => {
  for (let i = 0; i < 20; i++) assert.equal((await fetch(`${base}/api/pay/${String(i).padStart(8, "0")}`)).status, 404);
  assert.equal((await fetch(base + "/api/pay/ffffffff")).status, 429);
});

test("topilmagan sahifa: o'z 404 sahifamiz, API — JSON", async () => {
  const page = await fetch(base + "/bunday-sahifa-yoq");
  assert.equal(page.status, 404);
  assert.match(await page.text(), /Bu sahifa topilmadi/);
  const api = await fetch(base + "/api/bunday-yoq");
  assert.equal(api.status, 404);
  assert.equal((await api.json()).error, "Topilmadi.");
  for (const p of ["/robots.txt", "/sitemap.xml", "/favicon.ico"]) assert.equal((await fetch(base + p)).status, 200, p);
});
