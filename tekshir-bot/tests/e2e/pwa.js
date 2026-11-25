// Tekshir veb-ilovasini iPhone ko'rinishida sinash (Playwright, Chromium + iPhone o'lchami va UA).
// Ishlatish: node tests/e2e/pwa.js [--shots papka]
const { chromium, devices } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const APP = path.join(__dirname, "..", "..", "app");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const sent = [];                       // serverga nima yuborilganini kuzatamiz
let apiDown = false;

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/check")) {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      sent.push(JSON.parse(body));
      if (apiDown) { res.writeHead(503); return res.end(); }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ level: "danger", title: "🔴 XAVFLI", reasons: ["Google Safe Browsing: firibgar sayt"], advice: ["❌ Havolani ochmang"],
        numbers: [{ masked: "+998 90 *** ** 67", count: 3 }] }));
    });
    return;
  }
  let p = req.url.split("?")[0]; if (p === "/" || p === "/share") p = "/index.html";
  const f = path.join(APP, p);
  if (!fs.existsSync(f) || p.includes("..")) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2, serviceWorkers: "block" });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", e => errors.push(e.message));
  const done = [];
  const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n), fullPage: true }); };

  // 1) Bosh ekran: iPhone'ga o'rnatish kartasi va Yordam bloki
  await p.goto(base + "/");
  await p.getByText("iPhone'ga o'rnating").waitFor();
  await p.locator("a.tile.sos").waitFor();
  await shot("1-bosh.png");
  done.push("bosh ekran: iPhone'ga o'rnatish yo'riqnomasi + 🆘 ✈️ 🎓");

  // 2) Xabar faqat havola bo'lmasa — serverga HECH NARSA ketmaydi, natija telefonda
  await p.goto(base + "/#tekshir");
  await p.fill("#tx", "Hurmatli mijoz, kartangiz bloklandi. SMS kodni ayting");
  await p.click("form#f button[type=submit]");
  await p.locator("#res.danger").waitFor();
  assert.equal(sent.length, 0, "havola/raqamsiz xabar serverga yuborilmasligi kerak");
  done.push("havolasiz firibgar xabar — telefonda 🔴, serverga hech narsa ketmadi");

  // 3) Havola + raqam — serverga FAQAT ular ketadi, natija birlashadi
  await p.fill("#tx", "Salom! Kartangiz bloklandi, qo'ng'iroq qiling +998 90 123 45 67 yoki https://c1ick-uz.com ga kiring");
  await p.click("form#f button[type=submit]");
  await p.getByText("shikoyatlar bazasida ham tekshirildi").waitFor();
  assert.equal(sent.length, 1);
  assert.ok(!/Salom|bloklandi|qo'ng'iroq/.test(sent[0].text), "xabar matni ketmasligi kerak: " + sent[0].text);
  assert.ok(sent[0].text.includes("c1ick-uz.com") && sent[0].text.includes("998901234567"));
  await p.getByText("Google Safe Browsing: firibgar sayt").waitFor();
  await shot("2-tekshirish.png");
  done.push("havola + raqam — serverga faqat ular ketdi, natijalar birlashdi");

  // 4) Internet yo'q — baribir telefondagi natija
  apiDown = true;
  await p.fill("#tx", "Ovoz bering iltimos https://ovoz-berish.xyz");
  await p.click("form#f button[type=submit]");
  await p.getByText("Internetsiz tekshirildi").waitFor();
  assert.ok(await p.locator("#res.suspicious, #res.danger").count());
  apiDown = false;
  done.push("server ishlamasa — telefondagi natija ko'rsatiladi");

  // 5) 🆘 Aldandim
  await p.goto(base + "/#aldandim");
  await p.locator("details.rescue").first().click();
  await p.getByText("Darhol bank ilovasida kartani bloklang").waitFor();
  assert.equal(await p.locator('a[href="tel:102"]').count(), 1);
  await shot("3-aldandim.png");
  done.push("🆘 Aldandim: 4 holat, qadamlar, 102 tugmasi");

  // 6) ✈️ Telegram: belgi saqlanadi
  await p.goto(base + "/#telegram");
  await p.locator('input[data-tg="tg_2fa"]').check();
  await p.getByText("1/7 bajarildi").waitFor();
  await p.reload();
  await p.getByText("1/7 bajarildi").waitFor();
  await shot("4-telegram.png");
  done.push("✈️ Telegram himoyasi: belgilar telefonda saqlanadi");

  // 7) 🎓 Mashq: 10 savol, hammasiga to'g'ri javob
  await p.goto(base + "/#mashq");
  const quiz = await p.evaluate(() => window.YORDAM.quiz.map(q => q.scam));
  for (let i = 0; i < quiz.length; i++) {
    await p.click(`[data-act="${quiz[i] ? "q-scam" : "q-safe"}"]`);
    await p.getByText("✅ To'g'ri!").waitFor();
    if (i === 3) await shot("5-mashq.png");
    await p.click('[data-act="q-next"]');
  }
  await p.getByText("10/10 to'g'ri").waitFor();
  await shot("6-mashq-natija.png");
  await p.goto(base + "/");
  await p.getByText("Eng yaxshi natija: 10/10").waitFor();
  done.push("🎓 Mashq: 10/10, eng yaxshi natija bosh ekranda");

  // 8) Ruscha
  await p.goto(base + "/#haqida");
  await p.click('[data-lang="ru"]');
  await p.goto(base + "/#aldandim");
  await p.getByText("Меня обманули — что делать?").first().waitFor();
  done.push("rus tili");

  assert.deepEqual(errors, [], "sahifada JS xatosi: " + errors.join("; "));
  console.log(done.map(x => "✅ " + x).join("\n"));
  await browser.close(); server.close();
})().catch(e => { console.error("❌", e.message); process.exit(1); });
