// Kirmagan mehmon buyurtmasi: soatiga 3 tagacha; ORDER_LOGIN=1 bo'lsa — kirish majburiy
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, login } = require("./helpers");

const order = (base, headers = {}) => fetch(base + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ name: "Mehmon", contact: "+998901234567", serviceId: "vizitka" }) });

test("mehmon: 3 ta buyurtmadan keyin 429, kirgan mijozga cheklov yo'q", async () => {
  const srv = await startServer();
  try {
    for (let i = 0; i < 3; i++) assert.equal((await order(srv.base)).status, 201);
    assert.equal((await order(srv.base)).status, 429);
    const cookie = await login(srv.base, 5005);
    assert.equal((await order(srv.base, { cookie })).status, 201);
  } finally { await srv.stop(); }
});

test("ORDER_LOGIN=1: kirmagan mehmon buyurtma bera olmaydi", async () => {
  const srv = await startServer({ ORDER_LOGIN: "1" });
  try {
    const r = await order(srv.base);
    assert.equal(r.status, 401);
    assert.equal((await r.json()).login, true);
  } finally { await srv.stop(); }
});
