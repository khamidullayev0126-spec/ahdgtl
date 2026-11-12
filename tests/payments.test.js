// To'lov testlari: Payme Merchant API va Click Shop API so'rovlari soxtalashtiriladi (haqiqiy pul yo'q)
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { startServer, login, OWNER_ID } = require("./helpers");

const PAYME_KEY = "test-payme-key", CLICK_SECRET = "test-click-secret";
let srv, base, customer, order, sub;
const JSON_H = { "Content-Type": "application/json" };

before(async () => {
  srv = await startServer({ PAYME_MERCHANT_ID: "pm-merchant", PAYME_KEY, CLICK_SERVICE_ID: "111", CLICK_MERCHANT_ID: "222", CLICK_SECRET_KEY: CLICK_SECRET });
  base = srv.base;
  customer = await login(base, 7001);
  const mk = async serviceId => {
    const r = await fetch(base + "/api/orders", { method: "POST", headers: { ...JSON_H, cookie: customer }, body: JSON.stringify({ name: "Olga", contact: "@olga", serviceId, lang: "ru" }) });
    const { id, payUrl } = await r.json();
    const code = payUrl.split("o=")[1];
    return { id, code, payUrl };
  };
  order = await mk("vizitka");           // 30 000 so'm → 15 000 + 15 000
  sub = await mk("pro");                 // 1 000 000 so'm → bir martada
});
after(async () => { await srv.stop(); });

const info = code => fetch(base + "/api/pay/" + code).then(r => r.json());
const payme = (method, params, auth = "Basic " + Buffer.from("Paycom:" + PAYME_KEY).toString("base64")) =>
  fetch(base + "/api/payme", { method: "POST", headers: { ...JSON_H, authorization: auth }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then(r => r.json());
const md5 = s => crypto.createHash("md5").update(s).digest("hex");
function click(step, f) {
  const b = { click_trans_id: f.id, service_id: "111", click_paydoc_id: "9", merchant_trans_id: f.payId, amount: f.amount, action: step === "prepare" ? "0" : "1", error: f.error || "0", error_note: "ok", sign_time: "2026-11-09 12:00:00" };
  if (step === "complete") b.merchant_prepare_id = String(f.prepare);
  b.sign_string = f.badSign ? "0".repeat(32) : md5(b.click_trans_id + b.service_id + CLICK_SECRET + b.merchant_trans_id + (step === "complete" ? b.merchant_prepare_id : "") + b.amount + b.action + b.sign_time);
  return fetch(base + "/api/click/" + step, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(b) }).then(r => r.json());
}

test("bir martalik xizmat 50/50 ga bo'linadi, obuna bir martada", async () => {
  const d = await info(order.code);
  assert.deepEqual(d.parts.map(p => p.amount), [15000, 15000]);
  assert.equal(d.due.n, 1);
  assert.equal(d.due.locked, false);
  assert.deepEqual(d.methods, { payme: true, click: true });
  const s = await info(sub.code);
  assert.deepEqual(s.parts.map(p => p.amount), [1000000]);
});

test("to'lov havolasi: 2-qismni hali to'lab bo'lmaydi, 1-qism Payme sahifasiga olib boradi", async () => {
  assert.equal((await fetch(`${base}/api/pay/${order.code}/2/payme`, { redirect: "manual" })).status, 409);
  const r = await fetch(`${base}/api/pay/${order.code}/1/payme?lang=ru`, { redirect: "manual" });
  assert.equal(r.status, 302);
  const loc = r.headers.get("location");
  assert.match(loc, /^https:\/\/checkout\.paycom\.uz\//);
  const params = Buffer.from(loc.split("/").pop(), "base64").toString();
  assert.match(params, new RegExp(`m=pm-merchant;ac.order_id=${order.code}-1;a=1500000;`));
  const c = await fetch(`${base}/api/pay/${order.code}/1/click`, { redirect: "manual" });
  assert.match(c.headers.get("location"), /my\.click\.uz\/services\/pay\?service_id=111&merchant_id=222&amount=15000&transaction_param=/);
});

test("Payme: noto'g'ri kalit va noto'g'ri summa rad etiladi", async () => {
  assert.equal((await payme("CheckPerformTransaction", { amount: 1500000, account: { order_id: order.code + "-1" } }, "Basic xato")).error.code, -32504);
  assert.equal((await payme("CheckPerformTransaction", { amount: 999, account: { order_id: order.code + "-1" } })).error.code, -31001);
  assert.equal((await payme("CheckPerformTransaction", { amount: 1500000, account: { order_id: "yoq-1" } })).error.code, -31050);
  assert.equal((await payme("CheckPerformTransaction", { amount: 1500000, account: { order_id: order.code + "-1" } })).result.allow, true);
});

test("Payme: to'liq to'lov jarayoni — 1-qism to'lanadi, buyurtma tasdiqlanadi, xabarlar ketadi", async () => {
  const time = Date.now();
  const c1 = await payme("CreateTransaction", { id: "pm-tx-1", time, amount: 1500000, account: { order_id: order.code + "-1" } });
  assert.equal(c1.result.state, 1);
  const again = await payme("CreateTransaction", { id: "pm-tx-1", time, amount: 1500000, account: { order_id: order.code + "-1" } });
  assert.equal(again.result.transaction, c1.result.transaction);
  const other = await payme("CreateTransaction", { id: "pm-tx-2", time, amount: 1500000, account: { order_id: order.code + "-1" } });
  assert.equal(other.error.code, -31051, "bitta qismga ikkita to'lov ochilmasligi kerak");

  const p = await payme("PerformTransaction", { id: "pm-tx-1" });
  assert.equal(p.result.state, 2);
  assert.equal((await payme("PerformTransaction", { id: "pm-tx-1" })).result.perform_time, p.result.perform_time);
  assert.equal((await payme("CheckTransaction", { id: "pm-tx-1" })).result.state, 2);

  const d = await info(order.code);
  assert.equal(d.parts[0].paid, true);
  assert.equal(d.status, "tasdiqlandi");
  assert.equal(d.due.n, 2);
  assert.equal(d.due.locked, true, "2-qism ish tayyor bo'lmaguncha yopiq");

  const tg = srv.telegram().filter(x => x.method === "sendMessage");
  assert.ok(tg.some(x => String(x.body.chat_id) === OWNER_ID && /To'lov keldi/.test(x.body.text)), "egasiga xabar ketmadi");
  assert.ok(tg.some(x => String(x.body.chat_id) === "7001" && /Оплата получена/.test(x.body.text)), "mijozga (ruscha) xabar ketmadi");
  const st = await payme("GetStatement", { from: time - 1000, to: time + 1000 });
  assert.ok(st.result.transactions.some(t => t.id === "pm-tx-1"));
});

test("ish 'bajarildi' bo'lgach mijozga qolgan to'lov havolasi boradi va 2-qism ochiladi", async () => {
  const owner = await login(base, OWNER_ID);
  await fetch(base + "/api/orders/" + order.id, { method: "PATCH", headers: { ...JSON_H, cookie: owner }, body: JSON.stringify({ status: "bajarildi" }) });
  const msg = srv.telegram().filter(x => x.method === "sendMessage" && String(x.body.chat_id) === "7001").pop();
  assert.match(msg.body.text, /К оплате: 15 000 сум/);
  assert.match(msg.body.text, new RegExp(`tolov\\.html\\?o=${order.code}`));
  const d = await info(order.code);
  assert.equal(d.due.locked, false);
});

test("Click: noto'g'ri imzo rad etiladi, to'g'ri to'lov 2-qismni yopadi, takrori rad etiladi", async () => {
  const payId = order.code + "-2";
  assert.equal((await click("prepare", { id: "ck-1", payId, amount: "15000.00", badSign: true })).error, -1);
  assert.equal((await click("prepare", { id: "ck-1", payId, amount: "500.00" })).error, -2);
  const prep = await click("prepare", { id: "ck-1", payId, amount: "15000.00" });
  assert.equal(prep.error, 0);
  const done = await click("complete", { id: "ck-1", payId, amount: "15000.00", prepare: prep.merchant_prepare_id });
  assert.equal(done.error, 0);
  const d = await info(order.code);
  assert.equal(d.due, null, "buyurtma to'liq to'langan bo'lishi kerak");
  assert.equal(d.parts.every(p => p.paid), true);
  assert.equal((await click("prepare", { id: "ck-2", payId, amount: "15000.00" })).error, -4);
});

test("Click: bank tomonida xato bo'lsa — to'lov hisoblanmaydi", async () => {
  const payId = sub.code + "-1";
  const prep = await click("prepare", { id: "ck-3", payId, amount: "1000000" });
  assert.equal(prep.error, 0);
  const c = await click("complete", { id: "ck-3", payId, amount: "1000000", prepare: prep.merchant_prepare_id, error: "-5017" });
  assert.equal(c.error, -9);
  assert.equal((await info(sub.code)).parts[0].paid, false);
});

test("Payme: yaratilgan, lekin to'lanmagan tranzaksiyani bekor qilish", async () => {
  const c = await payme("CreateTransaction", { id: "pm-tx-9", time: Date.now(), amount: 100000000, account: { order_id: sub.code + "-1" } });
  assert.equal(c.result.state, 1);
  const x = await payme("CancelTransaction", { id: "pm-tx-9", reason: 3 });
  assert.equal(x.result.state, -1);
  assert.equal((await payme("CheckTransaction", { id: "pm-tx-9" })).result.reason, 3);
  assert.equal((await payme("PerformTransaction", { id: "pm-tx-9" })).error.code, -31008);
  assert.equal((await info(sub.code)).parts[0].paid, false);
});

test("kabinetda to'lov holati ko'rinadi", async () => {
  const me = await (await fetch(base + "/api/me", { headers: { cookie: customer } })).json();
  const o = me.orders.find(x => x.code === order.code);
  assert.equal(o.paid, 2);
  assert.equal(o.parts, 2);
  assert.equal(o.due, null);
  const s = me.orders.find(x => x.code === sub.code);
  assert.equal(s.due.amount, 1000000);
});

test("admin pulni qo'lda (naqd) olganini belgilaydi, xato bo'lsa bekor qiladi", async () => {
  const owner = await login(base, OWNER_ID);
  const r = await fetch(base + "/api/orders", { method: "POST", headers: { ...JSON_H, cookie: customer }, body: JSON.stringify({ name: "Olga", contact: "@olga", serviceId: "slayd", lang: "ru" }) });
  const { id } = await r.json();
  const mark = (body, cookie = owner) => fetch(`${base}/api/orders/${id}/paid`, { method: "POST", headers: { ...JSON_H, cookie }, body: JSON.stringify(body) });

  assert.equal((await mark({ part: 1, method: "naqd" }, customer)).status, 401, "oddiy mijoz belgilay olmaydi");
  assert.equal((await mark({ part: 1, method: "bitcoin" })).status, 400);
  assert.equal((await mark({ part: 3, method: "naqd" })).status, 400);

  const ok = await (await mark({ part: 1, method: "naqd", notify: true })).json();
  assert.equal(ok.paid[1].amount, 30000);
  assert.equal(ok.paid[1].manual, true);
  assert.equal(ok.status, "tasdiqlandi");
  assert.equal(ok.notified.ok, true);
  const msg = srv.telegram().filter(x => x.method === "sendMessage" && String(x.body.chat_id) === "7001").pop();
  assert.match(msg.body.text, /Оплата получена: 30 000 сум \(наличными\)/);
  assert.equal((await mark({ part: 1, method: "karta" })).status, 409, "ikki marta belgilab bo'lmaydi");

  const del = await fetch(`${base}/api/orders/${id}/paid/1`, { method: "DELETE", headers: { cookie: owner } });
  assert.equal(del.status, 200);
  assert.equal((await del.json()).paid[1], undefined);
  // Click orqali kelgan haqiqiy to'lovni qo'lda o'chirib bo'lmaydi
  assert.equal((await fetch(`${base}/api/orders/${order.id}/paid/2`, { method: "DELETE", headers: { cookie: owner } })).status, 409);
});
