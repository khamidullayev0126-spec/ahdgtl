// «Parol qal'asi» o'yinidan haqiqiy kadrlar yozib olish (Reels 10 uchun).
// O'yin vaqti qo'lda boshqariladi (rAF o'chirilgan, Math.random — urug'li) → har safar bir xil natija.
// Ishlatish: node oyin/kadrlar.js   → oyin/kadr/<klip>/00000.jpg ... va oyin/ekran-*.png
process.env.HASH_SALT = "reels"; process.env.BOT_TOKEN = "123:TEST";
const path = require("path"), fs = require("fs");
const BOT = path.join(__dirname, "../../../../../tekshir-bot");
const { createBot, startWebhook } = require(BOT + "/src/bot");
const { openDb } = require(BOT + "/src/db");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), "/usr/local/lib/node_modules", "/usr/lib/node_modules"] }));
const OUT = path.join(__dirname, "kadr");

const INIT = `
  (() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
  window.requestAnimationFrame = () => 0;
  try { localStorage.setItem("pq_tut", "true"); localStorage.setItem("pq_mute", "true"); } catch (e) {}
`;

(async () => {
  const db = openDb(":memory:");
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot" } }, { db });
  bot.api.config.use(async () => ({ ok: true, result: true }));
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const URL = `http://127.0.0.1:${server.address().port}/qala`;
  const br = await chromium.launch();
  fs.rmSync(OUT, { recursive: true, force: true });

  // ---------- 1) O'yin kliplari (gorizontal) ----------
  const ctx = await br.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(INIT);
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => {
    window.FRAME = () => { update(1 / 30); draw(); };
    // Shu tomonga otilsa — qayerga tegadi? (shamol va qalqon harakati hisobga olinadi)
    window.where = (angle, power, wait) => {
      const st = G.shieldT + wait / 30 * (0.7 + G.level * 0.32);
      let x = BOW.x + Math.cos(angle) * 30, y = BOW.y + Math.sin(angle) * 30, vx = Math.cos(angle) * MAXV * power, vy = Math.sin(angle) * MAXV * power, t = 0;
      for (let i = 0; i < 2000; i++) {
        const h = 1 / 120; t += h; vx += G.wind * 80 * h; vy += GRAV * h; x += vx * h; y += vy * h;
        const sy = 290 + 112 * Math.sin(st + t * (0.7 + G.level * 0.32));
        if (x >= SHIELD.x && x <= SHIELD.x + SHIELD.w && Math.abs(y - sy) < SHIELD.h / 2) return "shield";
        if (x >= 640) return (y >= 190 && y <= 330) ? "castle" : "edge";
        if (y >= groundY(x)) return "ground";
      }
      return "none";
    };
    window.plan = (want) => {
      for (let wait = 0; wait < 90; wait++) for (let pw = .55; pw < .9; pw += .01) if (where(-.75, pw, wait + 18) === want) return { wait, pw };
      return null;
    };
  });
  let clip = "", n = 0;
  async function frames(k) {
    for (let i = 0; i < k; i++) {
      await p.evaluate(() => FRAME());
      await p.evaluate(() => new Promise(r => setTimeout(r, 0)));        // va'dalar (engine) bajarilsin
      await p.locator("canvas").screenshot({ path: path.join(OUT, clip, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 88 });
    }
  }
  function start(name) { clip = name; n = 0; fs.mkdirSync(path.join(OUT, name), { recursive: true }); }
  // Bitta otish: belgi tanlash → tortish animatsiyasi → qo'yib yuborish → tushishini kutish
  async function shoot(ch, want, after = 24) {
    const pl = await p.evaluate(w => { G.wind = 0; return plan(w); }, want);
    if (!pl) throw new Error("reja topilmadi: " + want);
    await p.evaluate(c => selectChar(c), ch);
    await frames(pl.wait);
    for (let i = 1; i <= 18; i++) { await p.evaluate(([pw, k]) => { G.wind = 0; Object.assign(G.aim, { on: true, angle: -.75, power: pw * k / 18 }); }, [pl.pw, i]); await frames(1); }
    await p.evaluate(pw => { G.aim.on = false; G.aim.power = pw; G.wind = 0; fire(); }, pl.pw);
    for (let i = 0; i < 80 && await p.evaluate(() => !!G.arrow); i++) await frames(1);
    await p.evaluate(() => { G.wind = 0; });
    await frames(after);
  }
  const PW = "AHDIGITAL#2026";
  // a) to'g'ri zarba: A (2 ta tosh), keyin I (2 ta)
  await p.evaluate(async (pw) => { G.mode = "practice"; G.cname = "AHdigital qal'asi"; G.engine = localEngine(pw); G.score = 0; resetRound(1, await G.engine.start()); G.toasts = []; }, PW);
  start("urish"); await frames(6); await shoot("A", "castle", 20); await shoot("I", "castle", 26);
  // b) xato: Z → jon ketadi
  start("xato"); await shoot("Z", "castle", 34);
  // c) qalqon to'sadi
  start("qalqon"); await shoot("H", "shield", 30);
  // d) g'alaba: qolganlarini ochib, oxirgi belgi bilan qal'ani qulatish
  await p.evaluate(async () => { for (const c of "HDGTL#20") { const r = await G.engine.guess(c); if (r.ok && r.slots) applyState(r); } G.stuck = []; G.toasts = []; G.hint = ""; window.showModal = () => {}; });
  start("qulash"); await shoot("6", "castle", 75);
  await ctx.close();

  // ---------- 2) Menyu ekranlari (telefon, tik) ----------
  const q = require(BOT + "/src/qala").createQala;  // to'g'ridan-to'g'ri bazaga namuna o'yinchilar
  const ph = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const m = await ph.newPage(); m.on("pageerror", e => errs.push(e.message));
  await m.goto(URL);
  await m.fill("#uname", "AHdigital_01"); await m.waitForTimeout(500); await m.click("#enter"); await m.waitForTimeout(500);
  await m.click("#toBuild"); await m.type("#pwIn", "AHDIGITAL#2026"); await m.waitForTimeout(200);
  await m.screenshot({ path: path.join(__dirname, "ekran-qurish.png") });
  await m.click("#pwSave"); await m.waitForTimeout(400);
  // namuna hujumchilar (bittasi yutqazadi — himoya balli va xabar)
  for (const [nm, seq] of [["kamonchi_07", "BCEFJKMNOP"], ["mergan_uz", "QRSUVWXYZ5"]]) {
    const c2 = await br.newContext({ viewport: { width: 390, height: 844 } }); const pg = await c2.newPage();
    await pg.goto(URL); await pg.fill("#uname", nm); await pg.waitForTimeout(500); await pg.click("#enter"); await pg.waitForTimeout(500);
    await pg.click("#castles .item button"); await pg.waitForTimeout(400);
    for (const ch of seq) { await pg.evaluate(c => testChar(c, 760, 250, false), ch); await pg.waitForTimeout(60); }
    await c2.close();
  }
  await m.reload(); await m.waitForTimeout(600);
  await m.click("#tEv"); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(__dirname, "ekran-xabar.png") });
  await br.close(); server.close();
  console.log("kliplar:", fs.readdirSync(OUT).map(d => d + "=" + fs.readdirSync(path.join(OUT, d)).length).join(" "), "| xatolar:", errs);
  process.exit(0);
})();
