// Kengaytmani haqiqiy Chromium'da yuklab sinash (internetsiz: saytlar soxta javob bilan almashtiriladi).
// Ishlatish: node tests/e2e.js  [--shots papka]   — Playwright o'rnatilgan bo'lishi kerak.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT = path.join(__dirname, "..");
const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;

const PAGE = (title, body = "") => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:sans-serif;padding:40px"><h1>${title}</h1><p>Karta raqamingizni kiriting:</p><input placeholder="8600 ...">${body}</body></html>`;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tekshir-ext-"));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium", headless: true, viewport: { width: 1100, height: 720 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: ["--enable-unsafe-extension-debugging"],
  });
  // Yangi Chromium'da --load-extension o'chirilgan — kengaytma DevTools protokoli orqali yuklanadi
  const cdp = await ctx.browser().newBrowserCDPSession();
  const { id } = await cdp.send("Extensions.loadUnpacked", { path: EXT });
  await ctx.route(/^https?:\/\//, route => {
    const u = new URL(route.request().url());
    const body = u.hostname === "web.telegram.org"
      ? `<div id="chat"></div>`
      : "";
    route.fulfill({ status: 200, contentType: "text/html", body: PAGE(u.hostname, body) });
  });
  const results = [];
  const ok = (name) => { results.push("✅ " + name); };

  // 1) Soxta Click sayti → butun ekranli ogohlantirish
  const p = await ctx.newPage();
  await p.goto("https://c1ick-uz.com/bonus");
  const wall = p.locator("tekshir-guard#tekshir-wall");
  await wall.waitFor({ state: "attached", timeout: 5000 });
  // Ekranning to'rt burchagi va markazi ogohlantirish bilan qoplangan
  const covered = await p.evaluate(() => [[5, 5], [1095, 5], [550, 360], [5, 715], [1095, 715]]
    .every(([x, y]) => document.elementFromPoint(x, y)?.tagName === "TEKSHIR-GUARD"));
  assert.ok(covered, "ogohlantirish butun ekranni qoplashi kerak");
  // Sayt skripti «Baribir ochish»ni o'zi bosa olmaydi (yopiq Shadow DOM + faqat haqiqiy bosish)
  assert.equal(await p.evaluate(() => document.querySelector("tekshir-guard").shadowRoot), null);
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "1-xavfli-sayt.png") });
  ok("soxta c1ick-uz.com — butun ekranli ogohlantirish");

  // «Baribir ochish» ikki bosqichli; keyin shu seansda qayta chiqmaydi
  // Klaviatura bilan (haqiqiy bosish): fokus «Orqaga»da → Tab → «Baribir ochish» → Enter → Enter
  await p.keyboard.press("Tab");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  assert.equal(await wall.count(), 1, "birinchi bosishda hali ochilmasligi kerak");
  await p.keyboard.press("Enter");
  await wall.waitFor({ state: "detached" });
  await p.reload();
  await p.waitForTimeout(800);
  assert.equal(await p.locator("tekshir-guard#tekshir-wall").count(), 0, "ruxsatdan keyin qayta chiqmasligi kerak");
  ok("«Baribir ochish» — 2 bosqich, shu seansda eslab qoladi");

  // 2) Rasmiy click.uz → hech narsa
  await p.goto("https://click.uz/");
  await p.waitForTimeout(600);
  assert.equal(await p.locator("tekshir-guard").count(), 0);
  ok("rasmiy click.uz — ogohlantirish yo'q");

  // 3) Shubhali (IP manzil) → yuqorida sariq chiziq
  await p.goto("http://185.22.33.44/login");
  await p.locator("tekshir-guard#tekshir-banner").waitFor({ state: "attached", timeout: 5000 });
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "2-shubhali-sayt.png") });
  ok("IP manzilli sayt — sariq ogohlantirish chizig'i");

  // 4) Telegram Web: xabardagi soxta havola yonida belgi, xavfsiz havolada yo'q
  await p.goto("https://web.telegram.org/k/");
  await p.evaluate(() => {
    const c = document.getElementById("chat");
    c.innerHTML = `<p>Xabar 1: <a href="https://paymee.uz/karta">paymee.uz/karta</a></p>
                   <p>Xabar 2: <a href="https://payme.uz">payme.uz</a></p>`;
  });
  await p.locator('[data-tekshir="danger"]').waitFor({ timeout: 5000 });
  assert.equal(await p.locator("[data-tekshir]").count(), 1, "faqat soxta havola belgilanadi");
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "3-telegram-web.png"), clip: { x: 0, y: 0, width: 700, height: 330 } });
  ok("Telegram Web — soxta havola yonida 🔴 belgi, rasmiy havolada yo'q");

  // 5) Popup oynasi: matn tekshiruvi
  const pop = await ctx.newPage();
  await pop.setViewportSize({ width: 370, height: 900 });
  await pop.goto(`chrome-extension://${id}/popup.html`);
  await pop.fill("#q", "Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com");
  await pop.click("#go");
  await pop.locator("#res .res.danger").waitFor();
  if (SHOTS) await pop.screenshot({ path: path.join(SHOTS, "4-oyna.png"), fullPage: true });
  ok("oyna (popup) — firibgar xabar 🔴");

  // 6) O'ng tugma menyusi natija oynasi
  const chk = await ctx.newPage();
  await chk.setViewportSize({ width: 440, height: 640 });
  await chk.goto(`chrome-extension://${id}/check.html?q=` + encodeURIComponent("Salom, bu rasmlarni ko'r Rasmlar.apk"));
  await chk.locator("#res .res.danger").waitFor();
  if (SHOTS) await chk.screenshot({ path: path.join(SHOTS, "5-natija.png"), fullPage: true });
  ok("o'ng tugma natija oynasi — Rasmlar.apk 🔴");

  // 7) Ruscha interfeys
  await pop.selectOption("#lang", "ru");
  assert.match(await pop.locator("#go").textContent(), /Проверить/);
  ok("rus tili");

  console.log(results.join("\n"));
  await ctx.close();
})().catch(e => { console.error("❌", e.message); process.exit(1); });
