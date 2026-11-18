// /api/check — ilovalar uchun tekshiruv API'si. Telegram'ga ulanmaydi.
const test = require("node:test");
const assert = require("node:assert");
const { createBot, startWebhook } = require("../src/bot");
const { openDb } = require("../src/db");
// Server loglari test natijalari bilan aralashib ketmasin (Node test runner shunga sezgir)
console.log = () => {};
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
process.env.HASH_SALT = "test-salt"; process.env.BOT_TOKEN = "123:TEST";

const ORIGIN = "https://ah-digital.uz";
async function withServer(fn) {
  const db = openDb(":memory:");
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot" } }, { db });
  bot.api.config.use(async () => ({ ok: true, result: true }));
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}/api/check`;
  const post = (body, origin = ORIGIN, ip) => fetch(url, { method: "POST", headers: { "content-type": "application/json", origin, ...(ip ? { "x-forwarded-for": ip } : {}) }, body: JSON.stringify(body) });
  try { await fn({ post, url, db }); } finally { server.close(); }
}

test("matn: 🔴, sabablar va maslahat oddiy matnda (HTML'siz), tanlangan tilda", async () => withServer(async ({ post, db }) => {
  const r = await post({ text: "Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com", lang: "uz-latn" }, ORIGIN, "1.1.1.1");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get("access-control-allow-origin"), ORIGIN);
  const j = await r.json();
  assert.strictEqual(j.level, "danger");
  assert.match(j.title, /XAVFLI/);
  assert.ok(j.reasons.length >= 2);
  assert.ok(j.reasons.every(x => !/[<>]/.test(x)), "HTML teglari bo'lmasin");
  assert.ok(j.advice.some(x => /SMS kod/.test(x)));
  const ru = await (await post({ text: "Срочно сообщите SMS-код", lang: "ru" }, ORIGIN, "1.1.1.1")).json();
  assert.match(ru.title, /ОПАСНО|ПОДОЗРИТЕЛЬНО/);
  // statistika: "app" sifatida yoziladi, matn saqlanmaydi
  const rows = db.raw.prepare("SELECT * FROM checks").all();
  assert.ok(rows.every(x => x.chat_type === "app"));
  assert.ok(!JSON.stringify(rows).includes("bloklandi"));
}));

test("APK: fayl o'zi yuborilmaydi — nomi va hash'i bo'yicha 🔴", async () => withServer(async ({ post }) => {
  const j = await (await post({ file: { name: "Hujjat.jpg.apk", size: 1200, mime: "application/vnd.android.package-archive", sha256: "a".repeat(64) }, lang: "uz-latn" }, ORIGIN, "2.2.2.2")).json();
  assert.strictEqual(j.level, "danger");
  assert.ok(j.reasons.some(x => /aldamchi/.test(x)));
}));

test("begona sayt (CORS) — 403; bo'sh so'rov — 400; noto'g'ri JSON — 400", async () => withServer(async ({ post, url }) => {
  assert.strictEqual((await post({ text: "salom" }, "https://boshqa-sayt.com", "3.3.3.3")).status, 403);
  assert.strictEqual((await post({ text: "  " }, ORIGIN, "3.3.3.4")).status, 400);
  const bad = await fetch(url, { method: "POST", headers: { origin: ORIGIN, "x-forwarded-for": "3.3.3.5" }, body: "{xato" });
  assert.strictEqual(bad.status, 400);
  const pre = await fetch(url, { method: "OPTIONS", headers: { origin: ORIGIN } });
  assert.strictEqual(pre.status, 204);
}));

test("bitta IP'dan daqiqasiga 10 tadan ko'p — 429", async () => withServer(async ({ post }) => {
  let last;
  for (let i = 0; i < 11; i++) last = await post({ text: "Salom " + i }, ORIGIN, "9.9.9.9");
  assert.strictEqual(last.status, 429);
}));

test("Tekshir ilovasi: sahifa, /share, manifest; o'z manzilidan API'ga ruxsat; begona fayl yo'q", async () => withServer(async ({ url }) => {
  const base = url.replace("/api/check", "");
  const home = await fetch(base + "/");
  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /<title>Tekshir/);
  assert.strictEqual((await fetch(base + "/share?text=salom")).status, 200);
  const m = await (await fetch(base + "/manifest.webmanifest")).json();
  assert.strictEqual(m.share_target.action, "/share");
  for (const bad of ["/..%2Fsrc%2Fbot.js", "/../package.json", "/.env", "/src/bot.js"]) assert.strictEqual((await fetch(base + bad)).status, 404, bad);
  const host = new URL(base).host;
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", origin: "http://" + host, "x-forwarded-for": "7.7.7.7" }, body: JSON.stringify({ text: "SMS kodni ayting", app: "tekshir" }) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await fetch(base + "/health")).status, 200);
}));

test("ilova maslahatlari sayt bilan bir xil (nusxa eskirmasin)", () => {
  const fs = require("fs"), path = require("path");
  const site = path.join(__dirname, "..", "..", "app-maslahatlar.js");
  if (!fs.existsSync(site)) return;                       // faqat repozitoriy to'liq bo'lsa
  assert.strictEqual(fs.readFileSync(path.join(__dirname, "..", "app", "maslahatlar.js"), "utf8"), fs.readFileSync(site, "utf8"));
});
