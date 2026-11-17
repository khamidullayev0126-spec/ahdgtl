// Instagram / Telegram story uchun muqova (1080x1920): yangi YouTube video e'loni. Havola stikeri uchun bo'sh joy bor.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../../..");
const b64 = f => fs.readFileSync(f).toString("base64");
const PHOTO = "data:image/jpeg;base64," + b64(path.join(ROOT, "hero.jpg"));
const LOGO = "data:image/svg+xml;base64," + b64(path.join(ROOT, "images/logo.svg"));
const page = dark => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@600;800&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:Figtree,sans-serif;
 background:${dark ? "#1f1c19" : "#f5ead8"};color:${dark ? "#f5ead8" : "#201e1d"}}
.blob{position:absolute;border-radius:50%}
.b1{width:900px;height:900px;right:-380px;top:-260px;background:${dark ? "#a3542a" : "#ffc6a5"}}
.b2{width:520px;height:520px;left:-240px;bottom:180px;background:${dark ? "#56633f" : "#ccdbb2"};opacity:.85}
.top{position:absolute;left:80px;right:80px;top:250px;display:flex;justify-content:space-between;align-items:center}
.pill{background:#e62117;color:#fff;font-weight:800;font-size:44px;padding:16px 34px;border-radius:999px;display:flex;gap:14px;align-items:center}
.pill i{display:inline-block;width:0;height:0;border-left:26px solid #fff;border-top:16px solid transparent;border-bottom:16px solid transparent}
.brand{display:flex;align-items:center;gap:14px;font-family:Caprasimo,serif;font-size:46px}.brand img{width:66px;height:66px}
.photo{position:absolute;left:50%;top:400px;width:600px;height:640px;margin-left:-300px;border-radius:48px;overflow:hidden;border:10px solid #f6a06b;transform:rotate(-2deg);box-shadow:0 30px 70px rgba(0,0,0,.35)}
.photo img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.title{position:absolute;left:0;right:0;top:1090px;text-align:center}
.from{display:inline-block;font-family:Caprasimo,serif;font-size:100px;line-height:1;padding:14px 34px 22px;border:7px dashed ${dark ? "#8a7f70" : "#b9ae9c"};border-radius:30px;transform:rotate(-2deg)}
.arrow{font-weight:800;font-size:110px;line-height:1;color:#c67139;margin:6px 0}
.to{font-family:Caprasimo,serif;font-size:150px;line-height:.95;color:${dark ? "#f6a06b" : "#c67139"}}
.sticker{position:absolute;left:50%;top:1560px;width:620px;height:120px;margin-left:-310px;border:5px dashed ${dark ? "#f6a06b" : "#c67139"};border-radius:999px;
 display:flex;align-items:center;justify-content:center;font-weight:800;font-size:40px;color:${dark ? "#f6a06b" : "#c67139"};opacity:.9}
</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div>
<div class="top"><span class="pill"><i></i>Yangi video</span><span class="brand"><img src="${LOGO}">AHdigital</span></div>
<div class="photo"><img src="${PHOTO}"></div>
<div class="title"><div class="from">SCRATCH</div><div class="arrow">↓</div><div class="to">BIZNES</div></div>
<div class="sticker">👆 havola shu yerda</div>
</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [dark, name] of [[true, "story-tanishtiruv-toq.png"], [false, "story-tanishtiruv-och.png"]]) {
    await p.setContent(page(dark), { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, "..", name) });
    console.log("✅", name);
  }
  await b.close();
})();
