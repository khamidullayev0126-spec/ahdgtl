// Admin panel: ADMIN_PASSWORD_LOGIN=0 bo'lsa parol bilan kirib bo'lmaydi, egasi Telegram orqali kiradi.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, login, OWNER_ID, ADMIN_PASSWORD } = require("./helpers");

let srv, base;
before(async () => { srv = await startServer({ ADMIN_PASSWORD_LOGIN: "0" }); base = srv.base; });
after(async () => { await srv.stop(); });

test("parol o'chirilgan: to'g'ri parol ham rad etiladi", async () => {
  const me = await (await fetch(base + "/api/admin/me")).json();
  assert.equal(me.password, false);
  assert.equal(me.telegram, true);
  assert.equal((await fetch(base + "/api/orders", { headers: { "x-admin-password": ADMIN_PASSWORD } })).status, 401);
});

test("parol o'chirilgan: egasi Telegram bilan kiradi", async () => {
  const owner = await login(base, OWNER_ID);
  assert.equal((await fetch(base + "/api/orders", { headers: { cookie: owner } })).status, 200);
});
