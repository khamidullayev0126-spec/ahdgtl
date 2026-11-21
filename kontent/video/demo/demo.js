// Tekshir — pitch uchun jonli demo (ovozsiz, 1080p). Haqiqiy ilova mahalliy serverda ishlaydi.
process.env.HASH_SALT = "demo"; process.env.BOT_TOKEN = "123:TEST";
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
const path = require("path"), fs = require("fs"), os = require("os"), { execFileSync } = require("child_process");
const BOT = path.join(__dirname, "../../../tekshir-bot");
const { createBot, startWebhook } = require(BOT + "/src/bot");
const { openDb } = require(BOT + "/src/db");
const { chromium } = require(require.resolve("playwright", { paths: ["/usr/local/lib/node_modules", "/usr/lib/node_modules", process.cwd()] }));
const SHOTS = path.join(__dirname, "../../../tekshir-android/play-screenshots");
const b64 = f => "data:image/png;base64," + fs.readFileSync(path.join(SHOTS, f)).toString("base64");

(async () => {
  const db = openDb(":memory:");
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot" } }, { db });
  bot.api.config.use(async () => ({ ok: true, result: true }));
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const APP = `http://127.0.0.1:${server.address().port}/`;
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Faqat shu demo uchun: ilovani ramka ichida ko'rsatish (serverdagi X-Frame-Options himoyasi o'zgarmaydi)
  await p.route(u => u.href.startsWith(APP), async route => { const r = await route.fetch(); const h = { ...r.headers() }; delete h["x-frame-options"]; await route.fulfill({ response: r, headers: h }); });
  await p.goto("file://" + path.join(__dirname, "stage.html"));
  await p.evaluate(u => { document.getElementById("app").src = u; }, APP);
  await p.waitForTimeout(1500);
  let app = p.frames().find(f => f.url().startsWith(APP));
  await app.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  let nth = 0;

  // Kadrlarni yozib olish (real vaqt)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-")), frames = []; let rec = true;
  const loop = (async () => { const t0 = Date.now(); while (rec) { const f = path.join(dir, String(frames.length).padStart(5, "0") + ".jpg"); await p.screenshot({ path: f, type: "jpeg", quality: 90 }); frames.push({ f, t: (Date.now() - t0) / 1000 }); } })();
  const wait = ms => p.waitForTimeout(ms);

  async function check(text) {
    await app.evaluate(() => { S.res = null; S.text = ""; S.err = ""; if (location.hash !== "#tekshir") location.hash = "tekshir"; else render(); scrollTo(0, 0); });
    await wait(700);
    await app.waitForSelector("#tx");
    await app.fill("#tx", "");
    await app.type("#tx", text, { delay: 28 });
    await wait(500);
    await app.click("form#f button[type=submit]");
    await wait(1500);
    await app.evaluate(() => { const r = document.getElementById("res"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" }); });
    await wait(4200);
  }

  // 0) Sarlavha
  await p.evaluate(() => { cap("", "Tekshir — <span style='color:#22c55e'>jonli demo</span>", "Firibgar xabar, havola va APK faylni bir soniyada aniqlaydi"); });
  await wait(3500);
  // 1) Firibgar SMS
  await p.evaluate(() => cap("1 / 3", "Firibgar SMS", "«Bank xodimi» SMS kodni so'rayapti"));
  await check("Hurmatli mijoz! Kartangiz bloklandi. Blokdan chiqarish uchun SMS kodni ayting yoki havolaga kiring: https://c1ick-uz.com/karta");
  // 2) Soxta APK havola
  await p.evaluate(() => cap("2 / 3", "Soxta ilova (APK)", "«Bonus» va'da qilib, APK ilova o'rnatishga undaydi — Tekshir ehtiyot bo'lishni maslahat beradi"));
  await check("Tabriklaymiz! Sizga 500 000 so'm bonus. Ilovani yuklab oling: https://uzb.bonus-linebet.com/app-free.apk");
  // 3) Oddiy xabar
  await p.evaluate(() => cap("3 / 3", "Oddiy xabar", "Xavfsiz xabarni ortiqcha qo'rqitmaydi"));
  await check("Salom! Ertaga soat 5 da maktab oldida ko'rishamiz, kitobni olib kel.");
  // 4) Android ilova
  await p.evaluate(s => { cap("📱", "Android ilova", "Xabarlarni telefonning o'zida tekshiradi — matn hech qayerga yuborilmaydi"); shot(s); }, b64("play-2-natija.png"));
  await wait(4500);
  await p.evaluate(s => { cap("👨‍👩‍👦", "Oila himoyasi", "Buvingizga firibgar yozsa — <b style='color:#f1f5f9'>sizga</b> Telegram'da darhol xabar keladi"); shot(s); }, b64("play-4-oila.png"));
  await wait(5000);
  // 5) Yakun
  await p.evaluate(() => big(`<div style="font-size:120px">🛡</div><div style="font-size:84px;font-weight:900;margin-top:10px">Tekshir</div>
    <div style="font-size:40px;color:#94a3b8;margin-top:18px">Bepul · O'zbekcha va ruscha · Android + Telegram</div>
    <div style="margin-top:44px;display:flex;gap:24px;justify-content:center"><span style="background:#22c55e;color:#04130a;font-weight:900;font-size:44px;border-radius:999px;padding:16px 40px">@tekshirbot_bot</span>
    <span style="border:3px solid #22c55e;font-weight:900;font-size:44px;border-radius:999px;padding:13px 40px">tekshir.ah-digital.uz</span></div>`));
  await wait(4500);
  rec = false; await loop;
  await br.close(); server.close();

  // Kadrlar → video (har kadr o'z haqiqiy davomiyligi bilan)
  const list = frames.map((x, i) => `file '${x.f}'\nduration ${((frames[i + 1] ? frames[i + 1].t : x.t + .1) - x.t).toFixed(3)}`).join("\n") + `\nfile '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, "list.txt"), list);
  const out = path.join(__dirname, "tekshir-demo.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", out]);
  fs.rmSync(dir, { recursive: true });
  console.log(`✅ ${path.basename(out)}: ${frames.length} kadr, ${frames[frames.length - 1].t.toFixed(1)} s (o'rtacha ${(frames.length / frames[frames.length - 1].t).toFixed(1)} fps)`);
  process.exit(0);
})();
