// AHdigital avtomatik testlari. Ishga tushirish:  npm test
// Har bir test saytning bitta muhim qismini tekshiradi. Biror narsa buzilsa — qaysi joy ekanini shu yerda ko'rasiz.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, telegramLogin, login, OWNER_ID, ADMIN_PASSWORD } = require("./helpers");

let srv, base;
const JSON_H = { "Content-Type": "application/json" };
const post = (url, body, headers = {}) => fetch(base + url, { method: "POST", headers: { ...JSON_H, ...headers }, body: JSON.stringify(body) });

before(async () => { srv = await startServer(); base = srv.base; });
after(async () => { await srv.stop(); });

// ---------- Sahifalar ----------
test("ochiq sahifalar kirmasdan ochiladi", async () => {
  for (const p of ["/", "/index.html", "/portfolio.html", "/shartlar.html", "/kabinet.html", "/admin.html"]) {
    const r = await fetch(base + p, { redirect: "manual" });
    assert.equal(r.status, 200, `${p} ochilmadi`);
  }
});

test("saytga kerakli fayllar ochiq (yashirinib qolmagan)", async () => {
  for (const p of ["/images/logo.svg", "/script.js", "/i18n.js", "/legends-app.js", "/services.js", "/style.css", "/manifest.json", "/sw.js"]) {
    assert.equal((await fetch(base + p)).status, 200, `${p} ochilmayapti`);
  }
});

test("bitta bosh sahifa: / xizmatlar va buyurtma formasini ko'rsatadi, eski welcome.html unga yo'naltiriladi", async () => {
  const html = await (await fetch(base + "/")).text();
  assert.match(html, /id="buyurtma"/);
  const old = await fetch(base + "/welcome.html", { redirect: "manual" });
  assert.equal(old.status, 301);
  assert.equal(old.headers.get("location"), "/");
});

test("ilova kirishni so'raydi", async () => {
  const r = await fetch(base + "/app.html", { redirect: "manual" });
  assert.equal(r.status, 302);
  assert.match(r.headers.get("location"), /kabinet\.html\?mode=signin/);
});

test("server fayllari va maxfiy fayllar internetdan ko'rinmaydi", async () => {
  for (const p of ["/server.js", "/auth.js", "/bot.js", "/agent.js", "/store.js", "/legends.js", "/package.json", "/.env", "/data/orders.json",
    "/payments.js", "/github-toliq/server.js", "/testlar/server.js", "/xavfsizlik/server.js", "/biror/papka/bot.js", "/tests/helpers.js", "/.github/workflows/test.yml", "/README.md"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 404, `${p} ochiq qolgan!`);
  }
});

test("xavfsizlik sarlavhalari bor", async () => {
  const r = await fetch(base + "/");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "SAMEORIGIN");
});

test("tezlik: rasmlar keshlanadi, sahifalar har safar yangilanadi, WebP bor", async () => {
  assert.match((await fetch(base + "/hero.jpg")).headers.get("cache-control"), /max-age=604800/);
  assert.equal((await fetch(base + "/hero.webp")).status, 200);
  assert.equal((await fetch(base + "/index.html")).headers.get("cache-control"), "no-cache");
  assert.equal((await fetch(base + "/script.js")).headers.get("cache-control"), "no-cache");
  const html = await (await fetch(base + "/index.html")).text();
  assert.match(html, /<source srcset="hero\.webp" type="image\/webp">/);
});

test("chiroyli havola (Open Graph) belgilari va rasmi bor", async () => {
  const html = await (await fetch(base + "/")).text();
  assert.match(html, /property="og:image"/);
  assert.equal((await fetch(base + "/og.jpg")).status, 200);
});

// ---------- Xizmatlar ----------
test("xizmatlar ro'yxati: 7 ta xizmat, narxlari musbat son", async () => {
  const list = await (await fetch(base + "/api/services")).json();
  assert.equal(list.length, 7);
  for (const s of list) assert.ok(Number.isInteger(s.price) && s.price > 0, `${s.id} narxi noto'g'ri`);
});

// ---------- Kirish ----------
test("Telegram bilan kirish: to'g'ri imzo qabul qilinadi, soxtasi rad etiladi", async () => {
  const good = telegramLogin(777);
  assert.equal((await post("/api/auth/telegram", good)).status, 200);
  const fake = { ...telegramLogin(777), hash: "0".repeat(64) };
  assert.equal((await post("/api/auth/telegram", fake)).status, 401);
  const forged = { ...telegramLogin(777), id: OWNER_ID };       // imzodan keyin ID o'zgartirilgan
  assert.equal((await post("/api/auth/telegram", forged)).status, 401);
});

test("soxta cookie bilan kabinetga kirib bo'lmaydi", async () => {
  const r = await fetch(base + "/api/me", { headers: { cookie: "ahd_sess=eyJpZCI6IjExMSJ9.soxta" } });
  assert.equal(r.status, 401);
});

// ---------- Buyurtma ----------
test("kirmagan mehmon ham buyurtma beradi, lekin AI chat uchun kirish kerak", async () => {
  const r = await post("/api/orders", { name: "Ali", contact: "@ali_test", serviceId: "video" });
  assert.equal(r.status, 201);
  assert.ok((await r.json()).id);
  assert.equal((await post("/api/chat", { message: "salom" })).status, 401);
});

test("kirgan mijoz buyurtma beradi va u kabinetda ko'rinadi", async () => {
  const cookie = await login(base, 888);
  const r = await post("/api/orders", { name: "Aziz", contact: "+998901112233", serviceId: "vizitka", lang: "ru" }, { cookie });
  assert.equal(r.status, 201);
  const me = await (await fetch(base + "/api/me", { headers: { cookie } })).json();
  assert.equal(me.orders.length, 1);
  assert.equal(me.orders[0].serviceName, "Vizitka va Menyu sayt");
});

test("noto'g'ri buyurtma ma'lumotlari rad etiladi", async () => {
  const cookie = await login(base, 889);
  assert.equal((await post("/api/orders", { name: "A", contact: "@ali", serviceId: "video" }, { cookie })).status, 400);
  assert.equal((await post("/api/orders", { name: "Ali", contact: "@ali", serviceId: "yoq-xizmat" }, { cookie })).status, 400);
});

// ---------- Admin ----------
test("admin: egasi Telegram bilan kiradi, oddiy mijoz kira olmaydi", async () => {
  const owner = await login(base, OWNER_ID);
  const customer = await login(base, 999);
  assert.equal((await fetch(base + "/api/orders", { headers: { cookie: owner } })).status, 200);
  assert.equal((await fetch(base + "/api/orders", { headers: { cookie: customer } })).status, 401);
  assert.equal((await fetch(base + "/api/orders")).status, 401);
});

test("admin: to'g'ri parol ishlaydi, admin123 ishlamaydi", async () => {
  assert.equal((await fetch(base + "/api/orders", { headers: { "x-admin-password": ADMIN_PASSWORD } })).status, 200);
  assert.equal((await fetch(base + "/api/orders", { headers: { "x-admin-password": "admin123" } })).status, 401);
});

test("holat o'zgarsa, mijozga uning tilida Telegram xabari boradi", async () => {
  const cookie = await login(base, 555);
  const { id } = await (await post("/api/orders", { name: "Olga", contact: "@olga", serviceId: "video", lang: "ru" }, { cookie })).json();
  const owner = await login(base, OWNER_ID);
  const r = await fetch(base + "/api/orders/" + id, { method: "PATCH", headers: { ...JSON_H, cookie: owner }, body: JSON.stringify({ status: "bajarildi" }) });
  const data = await r.json();
  assert.equal(data.notified.ok, true);
  const msg = srv.telegram().find(x => x.method === "sendMessage" && String(x.body.chat_id) === "555");
  assert.ok(msg, "mijozga xabar yuborilmadi");
  assert.match(msg.body.text, /готов/);
});

test("to'lov kalitlari bo'lmasa — onlayn to'lov o'chiq, sayt avvalgidek ishlaydi", async () => {
  // (yangi buyurtma bermaymiz — bitta IP'dan daqiqasiga 5 tadan ortiq buyurtma bloklanadi; avvalgi testdagi buyurtmadan foydalanamiz)
  const cookie = await login(base, 888);
  const me = await (await fetch(base + "/api/me", { headers: { cookie } })).json();
  const code = me.orders[0].code;
  assert.equal(me.orders[0].due, null, "kalitsiz to'lov qismi ko'rsatilmasligi kerak");
  const info = await (await fetch(base + "/api/pay/" + code)).json();
  assert.deepEqual(info.methods, { payme: false, click: false });
  assert.equal((await fetch(`${base}/api/pay/${code}/1/payme`, { redirect: "manual" })).status, 400);
  assert.equal((await fetch(base + "/tolov.html")).status, 200);
});

test("egasi botga /zaxira yozsa — zaxira fayli keladi", async () => {
  const crypto = require("crypto");
  const secret = crypto.createHash("sha256").update("123456:TEST-TOKEN").digest("hex").slice(0, 32);
  const r = await fetch(base + "/telegram/webhook", { method: "POST", headers: { ...JSON_H, "X-Telegram-Bot-Api-Secret-Token": secret },
    body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: Number(OWNER_ID), type: "private" }, from: { id: Number(OWNER_ID) }, text: "/zaxira" } }) });
  assert.equal(r.status, 200);
  let doc;
  for (let i = 0; i < 30 && !doc; i++) { await new Promise(r => setTimeout(r, 100)); doc = srv.telegram().find(x => x.method === "sendDocument"); }
  assert.ok(doc, "zaxira fayli yuborilmadi");
  assert.equal(doc.body.chat_id, OWNER_ID);
  assert.match(doc.body.caption, /Zaxira/);
});

// Bu test oxirida turadi: IP'ni 15 daqiqaga bloklaydi
// (oldingi testdagi "admin123" urinishi ham hisoblanadi — shuning uchun "ko'pi bilan 5 ta" deb tekshiramiz)
test("admin: 5 marta noto'g'ri paroldan keyin bloklanadi (to'g'ri parol bilan ham)", async () => {
  let wrong = 0, status;
  while ((status = (await fetch(base + "/api/orders", { headers: { "x-admin-password": "xato-" + wrong } })).status) === 401) wrong++;
  assert.equal(status, 429);
  assert.ok(wrong >= 4 && wrong <= 5, `blok ${wrong} ta xatodan keyin ishladi`);
  assert.equal((await fetch(base + "/api/orders", { headers: { "x-admin-password": ADMIN_PASSWORD } })).status, 429);
  const owner = await login(base, OWNER_ID);               // egasi Telegram orqali baribir kira oladi
  assert.equal((await fetch(base + "/api/orders", { headers: { cookie: owner } })).status, 200);
});
