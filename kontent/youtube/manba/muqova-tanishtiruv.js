// YouTube muqovasi: «SCRATCH → BIZNES» (1280x720). Ishlatish: node kontent/youtube/manba/muqova-tanishtiruv.js [rasm.jpg]
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../../..");
const photo = process.argv[2] || path.join(ROOT, "hero.jpg");
const b64 = f => fs.readFileSync(f).toString("base64");
const PHOTO = `data:image/${/png$/i.test(photo) ? "png" : "jpeg"};base64,${b64(photo)}`;
const LOGO = "data:image/svg+xml;base64," + b64(path.join(ROOT, "images/logo.svg"));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@600;800&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1280px;height:720px;overflow:hidden;background:#1f1c19;font-family:Figtree,sans-serif;color:#f5ead8;position:relative}
.glow{position:absolute;border-radius:50%}
.g1{width:760px;height:760px;right:-200px;top:-160px;background:#a3542a}
.g2{width:300px;height:300px;right:380px;bottom:-150px;background:#56633f;opacity:.85}
.photo{position:absolute;right:40px;top:50px;width:520px;height:640px;border-radius:40px;overflow:hidden;border:8px solid #f6a06b;box-shadow:0 30px 70px rgba(0,0,0,.45);transform:rotate(2deg)}
.photo img{width:100%;height:100%;object-fit:cover;object-position:50% 22%}
.text{position:absolute;left:64px;top:70px;width:640px}
.from{display:inline-block;font-family:Caprasimo,serif;font-size:96px;line-height:1;color:#f5ead8;padding:14px 30px 20px;border:6px dashed #8a7f70;border-radius:28px;transform:rotate(-3deg)}
.arrow{font-family:Figtree;font-weight:800;font-size:150px;line-height:.9;color:#f6a06b;margin:18px 0 0 90px}
.to{font-family:Caprasimo,serif;font-size:150px;line-height:.95;color:#f6a06b;letter-spacing:-.01em;margin-top:6px;text-shadow:0 6px 0 #7a3a18}
.tag{display:inline-block;margin-top:26px;background:#f5ead8;color:#1f1c19;font-weight:800;font-size:38px;padding:12px 28px;border-radius:999px}
.brand{position:absolute;left:64px;bottom:48px;display:flex;align-items:center;gap:14px;font-family:Caprasimo,serif;font-size:40px}
.brand img{width:58px;height:58px}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="photo"><img src="${PHOTO}"></div>
<div class="text"><div class="from">SCRATCH</div><div class="arrow">↓</div><div class="to">BIZNES</div><div class="tag">Men kimman? 👋</div></div>
<div class="brand"><img src="${LOGO}">AHdigital</div>
</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, "..", "2-tanishtiruv-muqova-1280x720.png");
  await p.screenshot({ path: out });
  await b.close();
  console.log("✅", out, Math.round(fs.statSync(out).size / 1024) + " KB");
})();
