// Jamoa obunasi: narx = har xodim narxi × kishi soni, kamida 3 kishi
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, login } = require("./helpers");

let srv, base, customer;
before(async () => { srv = await startServer(); base = srv.base; customer = await login(base, 5551); });
after(async () => { await srv.stop(); });

const order = (body) => fetch(base + "/api/orders", {
  method: "POST", headers: { "Content-Type": "application/json", cookie: customer },
  body: JSON.stringify({ name: "Kompaniya", contact: "@kompaniya", lang: "uz", ...body })
});

test("jamoa: 3 kishidan kam yoki kishi soni yo'q bo'lsa rad etiladi", async () => {
  for (const seats of [undefined, 6]) {
    const r = await order({ serviceId: "jamoa", seats });
    assert.equal(r.status, 400, `seats=${seats}`);
    assert.match((await r.json()).error, /3 tadan 5 tagacha/);
  }
});

test("jamoa: 2 kishi bo'lsa ham rad etiladi", async () => {
  // rateLimit (daqiqasiga 5 ta) — keyingi testlarga joy qolsin
  const r = await order({ serviceId: "jamoa", seats: 2 });
  assert.equal(r.status, 400);
});

test("jamoa: narx kishi soniga ko'paytiriladi, obuna bir martada to'lanadi", async () => {
  assert.equal((await order({ serviceId: "jamoa", seats: 4 })).status, 201);
  assert.equal((await order({ serviceId: "jamoa-yil", seats: 3 })).status, 201);
  // oddiy xizmatga kishi soni yuborilsa — e'tiborga olinmaydi
  const me = await (await fetch(base + "/api/me", { headers: { cookie: customer } })).json();
  const by = name => me.orders.find(o => o.serviceName === name);
  assert.equal(by("Jamoa · 4 kishi").price, 5600000);
  assert.equal(by("Jamoa · 4 kishi").seats, 4);
  assert.equal(by("Jamoa · 4 kishi").parts, 1);
  assert.equal(by("Jamoa (yillik) · 3 kishi").price, 29400000);
});
