// Tanishtiruv videosi uchun ekran lavhalari (1920x1080, 30 fps): sayt aylantirish va «Sinab ko'ring» namoyishi.
// Ishlatish: server ishlab turganda  node kontent/youtube/manba/lavhalar.js http://localhost:4977
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const BASE = process.argv[2] || "https://www.ah-digital.uz";
const OUT = path.join(__dirname, "..", "lavhalar");
const FPS = 30, W = 1280, H = 720, SCALE = 1.5;   // 1280x720 sahifa × 1.5 = 1920x1080 video (matn kattaroq ko'rinadi)
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

async function record(page, name, steps) {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "lavha-"));
  let n = 0;
  const shot = async () => page.screenshot({ path: path.join(dir, `${String(n++).padStart(5, "0")}.png`) });
  for (const step of steps) await step(shot);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", path.join(OUT, name)]);
  fs.rmSync(dir, { recursive: true });
  console.log(`✅ ${name}: ${(n / FPS).toFixed(1)} s`);
}

const hold = sec => async shot => { for (let i = 0; i < sec * FPS; i++) await shot(); };
const scroll = (page, from, to, sec) => async shot => {
  for (let i = 0; i <= sec * FPS; i++) { await page.evaluate(y => window.scrollTo(0, y), from + (to - from) * ease(i / (sec * FPS))); await shot(); }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { try { localStorage.setItem("ahd-consent", JSON.stringify({ c: "denied", t: Date.now() })); } catch {} });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important} ::-webkit-scrollbar{display:none}" });

  // 1) Sayt bo'ylab tez aylantirish (~5 s)
  const ids = ["#xizmatlar", "#sinov", "#ishlar", "#men-haqimda"];
  const ys = [0, ...(await page.evaluate(sel => sel.map(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY - 40 : null; }).filter(v => v != null), ids))].sort((a, b) => a - b);
  const steps = [hold(0.6)];
  for (let i = 1; i < ys.length; i++) steps.push(scroll(page, ys[i - 1], ys[i], 0.8), hold(0.35));
  await record(page, "1-sayt-aylantirish.mp4", steps);

  // 2) «Sinab ko'ring»: biznes nomini yozish, turini va rangini almashtirish (~12 s)
  const sinovY = await page.evaluate(() => document.querySelector("#sinov").getBoundingClientRect().top + scrollY - 60);
  await page.evaluate(y => window.scrollTo(0, y), sinovY);
  await page.fill("#try-name", ""); await page.fill("#try-phone", "");
  await page.dispatchEvent("#try-name", "input");
  const type = (sel, text) => async shot => {
    for (const ch of text) { await page.type(sel, ch); for (let i = 0; i < 3; i++) await shot(); }
  };
  const act = fn => async shot => { await fn(); await page.waitForTimeout(80); for (let i = 0; i < FPS * 0.9; i++) await shot(); };
  await record(page, "2-sinab-koring.mp4", [
    hold(0.8),
    type("#try-name", "Lazzat kafe"), hold(0.6),
    type("#try-phone", "+998 90 000 00 00"), hold(0.8),
    act(() => page.click("#try-colors .swatch:nth-child(3)")),
    act(() => page.click("#try-colors .swatch:nth-child(2)")),
    act(async () => { await page.selectOption("#try-kind", "salon"); await page.fill("#try-name", "Gulnoza salon"); await page.dispatchEvent("#try-name", "input"); }),
    act(() => page.click("#try-colors .swatch:nth-child(4)")),
    hold(1.2)
  ]);
  await b.close();
})();
