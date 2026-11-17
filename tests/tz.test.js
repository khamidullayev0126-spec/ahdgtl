// TZ generatori sinovlari
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const { createTz } = require("../tz");
const SERVICES = require("../services");

function makeStore() { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d), set: (k, v) => m.set(k, v) }; }
const base = { xizmat: "vizitka", mijoz: "Dilnoza", biznes: "Lazzat kafe", til: "uz", bolimlar: ["Menyu", "Aloqa"], funksiyalar: ["QR kod"] };
const vizitka = SERVICES.find(s => s.id === "vizitka");

test("narx services.js'dan olinadi, qo'shimcha va chegirma hisoblanadi", () => {
  const tz = createTz({ store: makeStore(), services: SERVICES });
  const r = tz.create({ ...base, narx: 1, qoshimcha: [{ nomi: "Logo", narx: 20000 }], chegirma: 5000 });
  assert.ok(!r.error, r.error);
  assert.strictEqual(r.tz.asosiyNarx, vizitka.price);
  assert.strictEqual(r.tz.jami, vizitka.price + 20000 - 5000);
  assert.strictEqual(r.tz.muddatKun, 3);                       // "2–3 ish kuni" → 3
  assert.match(r.url, /^https:\/\/www\.ah-digital\.uz\/tz\/[A-Za-z0-9_-]{12}$/);
  assert.strictEqual(r.tz.raqam, "TZ-001");
});

test("noto'g'ri ma'lumot rad etiladi", () => {
  const tz = createTz({ store: makeStore(), services: SERVICES });
  assert.match(tz.create({ ...base, xizmat: "legends" }).error, /xizmat/);          // yashirin kurs
  assert.match(tz.create({ ...base, xizmat: "pro" }).error, /xizmat/);              // obuna — TZ emas
  assert.match(tz.create({ ...base, biznes: "" }).error, /biznes/);
  assert.match(tz.create({ ...base, bolimlar: [], funksiyalar: [] }).error, /bo'lim/);
  assert.match(tz.create({ ...base, qoshimcha: [{ nomi: "Logo" }] }).error, /narx/);  // narxsiz qo'shimcha
  assert.match(tz.create({ ...base, chegirma: 10 ** 9 }).error, /chegirma/);
});

test("sahifa: HTML xavfsiz, tasdiqlash bir marta ishlaydi, egasiga xabar boradi", async () => {
  const sent = [];
  const tz = createTz({ store: makeStore(), services: SERVICES, notifyOwner: t => sent.push(t) });
  const { tz: doc } = tz.create({ ...base, biznes: "<script>alert(1)</script> kafe", til: "ru" });
  const app = express(); app.use(express.json()); tz.mount(app);
  const srv = app.listen(0); const url = `http://127.0.0.1:${srv.address().port}`;
  try {
    let r = await fetch(`${url}/tz/${doc.id}`);
    const html = await r.text();
    assert.strictEqual(r.status, 200);
    assert.match(r.headers.get("x-robots-tag"), /noindex/);
    assert.ok(!html.includes("<script>alert(1)"), "biznes nomi escape qilinishi kerak");
    assert.match(html, /Техническое задание/);
    assert.match(html, /Подтверждаю/);

    assert.strictEqual((await fetch(`${url}/tz/yoqidmeni123`)).status, 404);
    r = await fetch(`${url}/api/tz/${doc.id}/tasdiq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ism: "" }) });
    assert.strictEqual(r.status, 400);
    r = await fetch(`${url}/api/tz/${doc.id}/tasdiq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ism: "Dilnoza" }) });
    assert.strictEqual(r.status, 200);
    r = await fetch(`${url}/api/tz/${doc.id}/tasdiq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ism: "Boshqa" }) });
    assert.strictEqual(r.status, 409);                                 // ikkinchi marta o'zgartirib bo'lmaydi
    assert.strictEqual(sent.length, 1);
    assert.match(sent[0], /Dilnoza/);
    const after = await (await fetch(`${url}/tz/${doc.id}`)).text();
    assert.match(after, /Подтверждено: Dilnoza/);
    assert.ok(!after.includes('id="f"'), "tasdiqdan keyin forma yo'q");
  } finally { srv.close(); }
});
