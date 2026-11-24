// Hook videosi (40 s, 1920×1080, 30 fps) — ovozsiz. Ovozni Abdulhamid o'zi yozadi.
// Ishlatish: node render.js [fps] [masshtab]   — tez ko'rish: node render.js 10 0.4
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, "../../../../..");
const [fps = 30, scale = 1] = process.argv.slice(2).map(Number);
const END = 40;

(async () => {
  const b64 = f => fs.readFileSync(f).toString("base64");
  const sitePng = path.join(__dirname, "dilnoza-full.png");
  const siteH = +execFileSync("python3", ["-c", `from PIL import Image;print(Image.open(${JSON.stringify(sitePng)}).height)`]).toString();
  const asset = { logo: "data:image/svg+xml;base64," + b64(path.join(ROOT, "images/logo.svg")), site: "data:image/png;base64," + b64(sitePng), siteH };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hook-"));
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "hook.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(a => window.setup(a), asset);
  await p.evaluate(() => window.__wait);
  let n = 0;
  for (let t = 0; t < END; t += 1 / fps) {
    await p.evaluate(tt => window.render(tt), t);
    await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await br.close();
  if (errs.length) console.log("⚠️", errs.slice(0, 3));
  const out = path.join(__dirname, "..", (scale < 1 ? "korish-" : "") + "hook-ovozsiz.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.jpg"),
    "-f", "lavfi", "-t", String(END), "-i", "anullsrc=r=48000:cl=stereo",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "28" : "18", "-c:a", "aac", "-shortest", "-movflags", "+faststart", out]);
  fs.rmSync(dir, { recursive: true });
  console.log("✅", path.basename(out), n, "kadr");
})();
