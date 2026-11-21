// Jamoa obunasi (2-bosqich): jamoa ochilishi, taklif havolasi, a'zolar, jamoa hisobidan buyurtma va oylik hajm
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, login, OWNER_ID } = require("./helpers");
const { createTeams, limitsFor } = require("../team");
const SERVICES = require("../services.js");

let srv, base, boss, ali, vali, sardor, invite;
const J = { "Content-Type": "application/json" };
before(async () => {
  srv = await startServer(); base = srv.base;
  boss = await login(base, 7001, { first_name: "Boss" });
  ali = await login(base, 7002, { first_name: "Ali" });
  vali = await login(base, 7003, { first_name: "Vali" });
  sardor = await login(base, 7004, { first_name: "Sardor" });
});
after(async () => { await srv.stop(); });

const get = (url, cookie) => fetch(base + url, { headers: { cookie } }).then(async r => ({ status: r.status, body: await r.json() }));
const post = (url, cookie, body = {}) => fetch(base + url, { method: "POST", headers: { ...J, cookie }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
const order = (cookie, body) => post("/api/orders", cookie, { name: "Test", contact: "@test", lang: "uz", ...body });

test("hajm: 3 kishiga 18 ta ish va 1 sayt, har qo'shimcha xodimga +4, 5 kishida 2 ta sayt", () => {
  assert.deepEqual(limitsFor(3), { items: 18, sites: 1 });
  assert.deepEqual(limitsFor(4), { items: 22, sites: 1 });
  assert.deepEqual(limitsFor(5), { items: 26, sites: 2 });
});

test("jamoa obunasini faqat kirgan odam oladi", async () => {
  const r = await order("", { serviceId: "jamoa", seats: 3 });
  assert.equal(r.status, 401);
  assert.equal(r.body.login, true);
});

test("to'lanmagan obuna — jamoa hali ochilmaydi; to'langach ochiladi va ega taklif havolasini ko'radi", async () => {
  const r = await order(boss, { serviceId: "jamoa", seats: 3 });
  assert.equal(r.status, 201);
  assert.equal((await get("/api/team", boss)).body.team, null);

  const admin = await login(base, OWNER_ID);
  assert.equal((await post(`/api/orders/${r.body.id}/paid`, admin, { part: 1, method: "naqd" })).status, 200);

  const t = (await get("/api/team", boss)).body.team;
  assert.ok(t && t.active && t.owner);
  assert.equal(t.seats, 3);
  assert.equal(t.members.length, 1);
  assert.deepEqual(t.usage.items, { used: 0, limit: 18 });
  assert.match(t.invite, /\/kabinet\.html\?jamoa=[\w-]{10,}$/);
  invite = t.invite.split("jamoa=")[1];
});

test("taklif havolasi: a'zo qo'shiladi, joy tugasa rad etiladi, noto'g'ri havola ishlamaydi", async () => {
  assert.equal((await get("/api/team/invite/xato-havola", ali)).status, 404);
  const info = (await get(`/api/team/invite/${invite}`, ali)).body;
  assert.equal(info.seats, 3);
  assert.equal(info.member, false);

  assert.equal((await post("/api/team/join", ali, { token: invite })).status, 200);
  assert.equal((await post("/api/team/join", ali, { token: invite })).body.already, true);
  assert.equal((await post("/api/team/join", vali, { token: invite })).status, 200);
  const full = await post("/api/team/join", sardor, { token: invite });
  assert.equal(full.status, 409, "3 kishilik jamoaga 4-odam qo'shilmaydi");

  const t = (await get("/api/team", ali)).body.team;
  assert.equal(t.members.length, 3);
  assert.equal(t.owner, false);
  assert.equal(t.invite, undefined, "oddiy a'zo taklif havolasini ko'rmaydi");
});

test("jamoa hisobidan: video bepul (to'lov yo'q), katta sayt 30% chegirma, jamoaga kirmagan xizmat va begona rad etiladi", async () => {
  const v = await order(ali, { serviceId: "video", team: true });
  assert.equal(v.status, 201);
  assert.equal(v.body.payUrl, "", "bepul buyurtmaga to'lov havolasi kerak emas");
  const k = await order(vali, { serviceId: "katta-sayt", team: true });
  assert.equal(k.status, 201);

  const t = (await get("/api/team", boss)).body.team;
  assert.deepEqual(t.usage.items, { used: 1, limit: 18 });
  const byName = n => t.orders.find(o => o.serviceName === n);
  assert.equal(byName("Claude Video · Jamoa").price, 0);
  assert.equal(byName("Claude Video · Jamoa").by, "Ali");
  assert.equal(byName("Katta haqiqiy sayt · Jamoa").price, 1050000);

  assert.equal((await order(sardor, { serviceId: "video", team: true })).status, 403, "jamoada bo'lmagan odam");
});

test("a'zoni faqat ega chiqaradi; a'zo o'zi chiqib keta oladi", async () => {
  const me = (await get("/api/team", boss)).body.team;
  const valiId = me.members.find(m => m.name === "Vali").id;
  assert.equal((await post("/api/team/remove", ali, { userId: valiId })).status, 403);
  assert.equal((await post("/api/team/remove", boss, { userId: valiId })).status, 200);
  assert.equal((await post("/api/team/remove", ali)).status, 200);
  assert.equal((await get("/api/team", ali)).body.team, null);
  assert.equal((await get("/api/team", boss)).body.team.members.length, 1);
});

test("oylik limit: 18 ta ishdan keyin video rad etiladi, vizitka limiti alohida", () => {
  const now = new Date().toISOString();
  const users = {};
  const data = { jamoalar: [], foydalanuvchilar: users };
  const store = { get: (k, d) => data[k] ?? d, set: (k, v) => { data[k] = v; } };
  const orders = [{ code: "t1", serviceId: "jamoa", seats: 3, status: "tasdiqlandi", tgUserId: 1, createdAt: now }];
  const teams = createTeams({ store, services: SERVICES, readOrders: () => orders });
  const vid = SERVICES.find(s => s.id === "video"), viz = SERVICES.find(s => s.id === "vizitka");
  for (let i = 0; i < 18; i++) {
    const p = teams.forOrder({ id: 1 }, vid);
    assert.equal(p.price, 0, `${i + 1}-ish`);
    orders.push({ code: "v" + i, serviceId: "video", teamId: "t1", status: "yangi", createdAt: now });
  }
  assert.equal(teams.forOrder({ id: 1 }, vid).status, 409);
  assert.equal(teams.forOrder({ id: 1 }, viz).price, 0);
  orders.push({ code: "z", serviceId: "vizitka", teamId: "t1", status: "yangi", createdAt: now });
  assert.equal(teams.forOrder({ id: 1 }, viz).status, 409);
  // bekor qilingan buyurtma limitdan qaytadi
  orders[1].status = "bekor";
  assert.equal(teams.forOrder({ id: 1 }, vid).price, 0);
  // o'tgan oy buyurtmalari hisobga kirmaydi
  orders.forEach(o => { if (o.teamId) o.createdAt = "2020-01-15T10:00:00Z"; });
  assert.equal(teams.forOrder({ id: 1 }, viz).price, 0);
});

test("muddati tugagan jamoa hisobidan buyurtma berib bo'lmaydi", () => {
  const data = { jamoalar: [{ id: "old", ownerId: "1", serviceId: "jamoa", seats: 3, period: "oy", startedAt: "2020-01-01T00:00:00Z", expiresAt: "2020-02-01T00:00:00Z", invite: "x", members: [{ id: "1" }] }] };
  const store = { get: (k, d) => data[k] ?? d, set: (k, v) => { data[k] = v; } };
  const teams = createTeams({ store, services: SERVICES, readOrders: () => [] });
  const r = teams.forOrder({ id: 1 }, SERVICES.find(s => s.id === "video"));
  assert.equal(r.status, 403);
  assert.match(r.error, /muddati tugagan/);
});
