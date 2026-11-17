// Tijoriy taklif (KP) sinovlari
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const { createKp } = require("../kp");
const SERVICES = require("../services");

function makeStore() { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d), set: (k, v) => m.set(k, v) }; }
const base = { biznes: "Gul olami", tur: "dokon", til: "uz", xizmatlar: ["vizitka"], foydalar: ["Mijoz narxlarni bir joyda ko'radi", "Bir bosishda qo'ng'iroq"] };
const price = id => SERVICES.find(s => s.id === id).price;

test("narx saytdagi narxlardan, chegirma hisoblanadi", () => {
  const kp = createKp({ store: makeStore(), services: SERVICES });
  const r = kp.create({ ...base, xizmatlar: ["vizitka", "video"], chegirma: 5000 });
  assert.ok(!r.error, r.error);
  assert.strictEqual(r.kp.narx, price("vizitka") + price("video"));
  assert.strictEqual(r.kp.jami, r.kp.narx - 5000);
  assert.match(r.preview, /\?tekshir=1$/);
});

test("noto'g'ri ma'lumot rad etiladi", () => {
  const kp = createKp({ store: makeStore(), services: SERVICES });
  assert.match(kp.create({ ...base, xizmatlar: ["legends"] }).error, /xizmat/);
  assert.match(kp.create({ ...base, xizmatlar: [] }).error, /xizmat/);
  assert.match(kp.create({ ...base, foydalar: ["bitta"] }).error, /foyda/);
  assert.match(kp.create({ ...base, chegirma: 10 ** 7 }).error, /chegirma/);
  assert.match(kp.create({ ...base, biznes: " " }).error, /biznes/);
});

test("sahifa: ruscha tarjima, xavfsiz HTML, ochilish va «Qiziqaman» xabarlari", async () => {
  const sent = [];
  const kp = createKp({ store: makeStore(), services: SERVICES, notifyOwner: t => sent.push(t) });
  const { kp: doc } = kp.create({ ...base, til: "ru", biznes: "<img src=x onerror=alert(1)>" });
  const app = express(); kp.mount(app);
  const srv = app.listen(0); const url = `http://127.0.0.1:${srv.address().port}`;
  try {
    let html = await (await fetch(`${url}/taklif/${doc.id}?tekshir=1`)).text();
    assert.strictEqual(sent.length, 0, "egasining tekshiruvi sanalmaydi");
    assert.ok(!html.includes("<img src=x"), "escape");
    assert.match(html, /Коммерческое предложение/);
    assert.match(html, /Красивый одностраничный сайт/);      // services.js matni i18n.js'dan tarjima qilingan
    assert.match(html, /tur=dokon&amp;lang=ru#sinov/);

    await fetch(`${url}/taklif/${doc.id}`, { headers: { "user-agent": "TelegramBot (like TwitterBot)" } });
    assert.strictEqual(sent.length, 0, "Telegram havola ko'rinishi sanalmaydi");
    await fetch(`${url}/taklif/${doc.id}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } });
    await fetch(`${url}/taklif/${doc.id}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } });
    assert.strictEqual(sent.length, 1, "faqat birinchi ochilishda xabar");
    assert.match(sent[0], /Taklif ochildi/);

    assert.strictEqual((await fetch(`${url}/api/taklif/${doc.id}/qiziqaman`, { method: "POST" })).status, 200);
    await fetch(`${url}/api/taklif/${doc.id}/qiziqaman`, { method: "POST" });
    assert.strictEqual(sent.length, 2, "Qiziqaman xabari bir marta");
    assert.match(kp.list()[0].ochildi + "", /^2$/);
    assert.strictEqual((await fetch(`${url}/taklif/nomalum12345`)).status, 404);
  } finally { srv.close(); }
});
