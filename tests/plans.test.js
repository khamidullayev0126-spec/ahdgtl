// Pro va Max obunachilari kabineti: tabrik, limitlar, obuna hisobidan buyurtma, eslatma va oylik hisobot
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, login, OWNER_ID } = require("./helpers");
const { createPlans } = require("../plans");
const SERVICES = require("../services.js");

let srv, base, pro, guest;
const J = { "Content-Type": "application/json" };
before(async () => {
  srv = await startServer(); base = srv.base;
  pro = await login(base, 8001, { first_name: "Jasur", last_name: "Karimov" });
  guest = await login(base, 8002, { first_name: "Mehmon" });
});
after(async () => { await srv.stop(); });

const get = (url, cookie) => fetch(base + url, { headers: { cookie } }).then(async r => ({ status: r.status, body: await r.json() }));
const post = (url, cookie, body = {}) => fetch(base + url, { method: "POST", headers: { ...J, cookie }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
const order = (cookie, body) => post("/api/orders", cookie, { name: "Test", contact: "@test", lang: "uz", ...body });

test("Pro to'langach: kabinetda obuna, tabrik bir marta, limitlar", async () => {
  const r = await order(pro, { serviceId: "pro" });
  assert.equal(r.status, 201);
  assert.equal((await get("/api/plan", pro)).body.plan, null, "to'lanmaguncha obuna yo'q");
  const admin = await login(base, OWNER_ID);
  assert.equal((await post(`/api/orders/${r.body.id}/paid`, admin, { part: 1, method: "naqd" })).status, 200);

  const p = (await get("/api/plan", pro)).body.plan;
  assert.equal(p.kind, "pro");
  assert.equal(p.active, true);
  assert.equal(p.welcome, true);
  assert.equal(p.firstName, "Jasur");
  assert.ok(p.daysLeft >= 28 && p.daysLeft <= 31);
  assert.deepEqual(p.usage.items, { used: 0, limit: 15 });
  assert.deepEqual(p.usage.big, { used: 0, limit: 1, per: "month" });

  assert.equal((await post("/api/plan/welcomed", pro)).status, 200);
  assert.equal((await get("/api/plan", pro)).body.plan.welcome, false, "tabrik ikkinchi marta chiqmaydi");
});

test("obuna hisobidan: bepul, to'lov havolasi yo'q, hisoblagich oshadi; obunasizga ruxsat yo'q", async () => {
  const v = await order(pro, { serviceId: "video", plan: "1" });
  assert.equal(v.status, 201);
  assert.equal(v.body.payUrl, "");
  const k = await order(pro, { serviceId: "katta-sayt", plan: true });
  assert.equal(k.status, 201);
  const p = (await get("/api/plan", pro)).body.plan;
  assert.equal(p.usage.items.used, 1);
  assert.equal(p.usage.big.used, 1);
  assert.equal(p.usage.open.used, 2);
  assert.ok(p.orders.some(o => o.serviceName === "Claude Video · Pro"));
  assert.equal((await order(pro, { serviceId: "katta-sayt", plan: true })).status, 409, "oyiga 1 ta katta sayt");
  assert.equal((await order(guest, { serviceId: "video", plan: true })).status, 403);
  const me = await get("/api/me", pro);
  assert.equal(me.body.orders.find(o => o.serviceName === "Claude Video · Pro").price, 0);
});

test("oylik hisobot API: faqat o'z obunasi", async () => {
  const r = (await get("/api/plan/report", pro)).body;
  assert.equal(r.report.total, 2);
  assert.equal(r.report.value, 30000 + 1500000);
  assert.equal((await get("/api/plan/report", guest)).status, 404);
});

function fake(orders, subs = []) {
  const data = { obunalar: subs };
  const store = { get: (k, d) => data[k] ?? d, set: (k, v) => { data[k] = v; } };
  return { data, plans: createPlans({ store, services: SERVICES, readOrders: () => orders, publicUrl: () => "https://sayt.uz" }) };
}

test("Pro limiti: 15 ta ishdan keyin rad etiladi; Max'da cheksiz, katta sayt butun muddatga 2 ta", () => {
  const now = new Date().toISOString();
  const orders = [{ code: "p1", serviceId: "pro", status: "tasdiqlandi", tgUserId: 1, createdAt: now }];
  const { plans } = fake(orders);
  const video = SERVICES.find(s => s.id === "video"), big = SERVICES.find(s => s.id === "katta-sayt");
  for (let i = 0; i < 15; i++) { assert.equal(plans.forOrder({ id: 1 }, video).price, 0); orders.push({ code: "v" + i, serviceId: "video", planId: "p1", status: "bajarildi", createdAt: now }); }
  assert.equal(plans.forOrder({ id: 1 }, video).status, 409);

  const mo = [{ code: "m1", serviceId: "max", status: "tasdiqlandi", tgUserId: 2, createdAt: now }];
  const m = fake(mo).plans;
  for (let i = 0; i < 40; i++) mo.push({ code: "x" + i, serviceId: "slayd", planId: "m1", status: "bajarildi", createdAt: now });
  assert.equal(m.forOrder({ id: 2 }, video).price, 0, "Max — cheksiz");
  mo.push({ code: "b1", serviceId: "katta-sayt", planId: "m1", status: "bajarildi", createdAt: "2026-01-10T10:00:00Z" });
  mo.push({ code: "b2", serviceId: "katta-sayt", planId: "m1", status: "bajarildi", createdAt: now });
  assert.equal(m.forOrder({ id: 2 }, big).status, 409, "Max — muddat davomida 2 ta katta sayt");
});

test("eslatma: tugashiga 3 kun qolganda bir marta; uzaytirilgan bo'lsa yo'q", async () => {
  const day = 864e5, now = Date.parse("2026-11-20T10:00:00Z");
  const sub = (id, user, start, end) => ({ id, userId: String(user), serviceId: "pro", period: "oy", startedAt: new Date(start).toISOString(), expiresAt: new Date(end).toISOString(), welcomed: true, remindedAt: null });
  const orders = [{ code: "a", serviceId: "pro", lang: "ru", tgUserId: 1, status: "tasdiqlandi" }, { code: "b", serviceId: "pro", tgUserId: 2, status: "tasdiqlandi" }, { code: "c", serviceId: "pro", tgUserId: 2, status: "tasdiqlandi" }];
  const { plans } = fake(orders, [
    sub("a", 1, now - 27 * day, now + 2 * day),
    sub("b", 2, now - 27 * day, now + 2 * day), sub("c", 2, now + 2 * day, now + 32 * day)   // b uzaytirilgan
  ]);
  const sent = [];
  const send = async (o, t) => sent.push({ code: o.code, t });
  assert.equal(await plans.remind(send, now - 2 * day), 0, "5 kun qolganda — hali erta");
  assert.equal(await plans.remind(send, now), 1);
  assert.equal(await plans.remind(send, now + 3600_000), 0, "ikkinchi marta yo'q");
  assert.equal(sent[0].code, "a");
  assert.match(sent[0].t.ru, /Pro закончится через 2 дн/);
  assert.match(sent[0].t.ru, /https:\/\/sayt\.uz\/index\.html\?xizmat=pro#buyurtma/);
});

test("oylik hisobot Telegram'ga: 1-sanada bir marta", async () => {
  const orders = [
    { code: "p", serviceId: "pro", lang: "uz", tgUserId: 1, status: "tasdiqlandi" },
    { code: "v", serviceId: "video", planId: "p", status: "bajarildi", createdAt: "2026-10-12T10:00:00Z" },
    { code: "s", serviceId: "vizitka", planId: "p", status: "jarayonda", createdAt: "2026-10-15T10:00:00Z" }
  ];
  const { plans } = fake(orders, [{ id: "p", userId: "1", serviceId: "pro", period: "oy", startedAt: "2026-10-10T00:00:00Z", expiresAt: "2026-11-10T00:00:00Z", welcomed: true }]);
  const sent = [];
  assert.equal(await plans.sendMonthly(async (o, t) => sent.push(t), Date.parse("2026-11-01T06:00:00Z")), 1);
  assert.equal(await plans.sendMonthly(async (o, t) => sent.push(t), Date.parse("2026-11-01T08:00:00Z")), 0);
  assert.match(sent[0].uz, /2026 oktyabr oyi hisoboti/);
  assert.match(sent[0].uz, /Video, slayd va post: 1 \/ 15/);
  assert.match(sent[0].uz, /oddiy narxi: 95 000 so'm/);
});
