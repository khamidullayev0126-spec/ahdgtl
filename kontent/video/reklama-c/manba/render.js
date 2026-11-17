// Reklama C: kadrma-kadr render (30 fps). Har kadr faqat vaqtga bog'liq — natija har safar bir xil.
// Ishlatish: node render.js [boshi_s] [oxiri_s] [fps] [masshtab]   (tez ko'rish: node render.js 0 30 10 0.33)
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, "../../../..");
const [from = 0, to = 30.09, fps = 30, scale = 1] = process.argv.slice(2).map(Number);
const OUT = path.join(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rekc-"));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  await p.goto("file://" + path.join(__dirname, "sahna.html"), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(src => window.setLogo(src), "data:image/svg+xml;base64," + fs.readFileSync(path.join(ROOT, "images/logo.svg")).toString("base64"));
  let n = 0;
  for (let t = from; t < to; t += 1 / fps) {
    await p.evaluate(tt => window.render(tt), t);
    await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await b.close();
  const name = scale < 1 ? "oldindan-korish.mp4" : "kadrlar.mp4";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "28" : "17", path.join(OUT, name)]);
  fs.rmSync(dir, { recursive: true });
  console.log(`✅ ${name}: ${n} kadr`);
})();
