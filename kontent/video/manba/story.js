const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const ROOT = "/home/user/ahdgtl", OUT = process.argv[2], FPS = 30, DUR = 12;
const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString("base64");
const LOGO = "data:image/svg+xml;base64," + b64("images/logo.svg");
const BANNER = "data:image/png;base64," + b64("kontent/youtube/banner-2560x1440.png");
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@600;800&display=swap"><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
body{background:#201e1d;color:#f5ead8;font-family:Figtree,sans-serif;position:relative}
.blob{position:absolute;border-radius:50%;animation:float 5s ease-in-out infinite alternate}
.b1{width:800px;height:800px;background:#a3542a;opacity:.5;right:-320px;top:-280px}
.b2{width:600px;height:600px;background:#56633f;opacity:.55;left:-280px;bottom:-240px;animation-delay:-2.5s}
@keyframes float{to{transform:translate(-40px,50px) scale(1.08)}}
h1{font-family:Caprasimo,serif;font-weight:400;margin:0;line-height:1.02}
.acc{color:#f6a06b}
.sc{position:absolute;left:0;right:0;top:260px;bottom:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px;opacity:0}
@keyframes show{0%{opacity:0}5%{opacity:1}95%{opacity:1}100%{opacity:0}}
@keyframes showlast{0%{opacity:0}8%{opacity:1}100%{opacity:1}}
.s1{animation:show 3.45s linear 0s both}.s2{animation:show 5.8s linear 3.3s both}.s3{animation:showlast 3s linear 9s both}
@keyframes punch{from{transform:scale(2.4);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes pop{from{transform:translateY(50px) scale(.85);opacity:0}to{transform:none;opacity:1}}
@keyframes slide{from{transform:translateX(-140px);opacity:0}to{transform:none;opacity:1}}
@keyframes pulse{50%{transform:scale(1.08)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(24px)}}
.tag{background:#c67139;color:#fff;font-weight:800;font-size:54px;padding:18px 44px;border-radius:999px;animation:pop .4s ease .1s both}
.play{width:300px;height:210px;border-radius:56px;background:#e5322d;display:grid;place-items:center;margin:70px 0 60px;animation:punch .55s cubic-bezier(.2,1.6,.4,1) .3s both;box-shadow:0 30px 70px rgba(229,50,45,.45)}
.play i{width:0;height:0;border-left:92px solid #fff;border-top:56px solid transparent;border-bottom:56px solid transparent;margin-left:18px}
.s1 h1{font-size:120px;animation:pop .45s ease .8s both}
.card{width:100%;border-radius:40px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5);border:8px solid #f5ead8;animation:pop .5s ease 3.35s both}
.card img{width:100%;display:block}
.chan{display:flex;align-items:center;gap:26px;margin-top:44px;animation:pop .4s ease 3.7s both}
.chan img{width:120px;height:120px}
.chan b{font-family:Caprasimo;font-size:72px;font-weight:400}
.chan span{display:block;font-size:40px;color:#d6ccbb;font-weight:600;text-align:left}
.list{display:flex;flex-direction:column;gap:22px;width:100%;margin-top:50px}
.row{background:#2c2822;border-radius:30px;padding:28px 36px;font-size:50px;font-weight:800;text-align:left;animation:slide .4s ease both}
.s3 h1{font-size:128px;animation:punch .5s cubic-bezier(.2,1.6,.4,1) 9.1s both}
.sub{font-size:52px;font-weight:800;margin-top:40px;color:#f6a06b;animation:pop .4s ease 9.5s both}
.bell{font-size:150px;margin-top:40px;animation:pop .4s ease 9.8s both}
.bell span{display:inline-block;animation:pulse 1s ease-in-out 10.3s infinite}
.arrow{position:absolute;left:0;right:0;bottom:430px;text-align:center;font-size:120px;opacity:0;animation:show2 .3s ease 10.3s both}
.arrow span{display:inline-block;animation:bounce .8s ease-in-out 10.6s infinite}
@keyframes show2{to{opacity:1}}
</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div>
<section class="sc s1"><span class="tag">🎉 YANGILIK</span><div class="play"><i></i></div><h1>AHdigital endi <span class="acc">YouTube'da!</span></h1></section>
<section class="sc s2"><div class="card"><img src="${BANNER}"></div><div class="chan"><img src="${LOGO}"><div><b>AHdigital</b><span>@ahdigital_01</span></div></div>
<div class="list"><div class="row" style="animation-delay:4.4s">💻 AI bilan sayt va botlar</div><div class="row" style="animation-delay:6.4s">🎞 «G'uvillovchi» serial</div><div class="row" style="animation-delay:7.7s">⚡ Har kuni Shorts</div></div></section>
<section class="sc s3"><h1>Obuna <span class="acc">bo'ling!</span></h1><div class="sub">Birinchilardan bo'ling 🙏</div><div class="bell"><span>🔔</span></div></section>
<div class="arrow"><span>👇</span></div>
</body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: "networkidle" }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause())); fs.mkdirSync(OUT, { recursive: true });
  for (let f = 0; f < FPS * DUR; f++) { await p.evaluate(t => document.getAnimations().forEach(a => { a.currentTime = t; }), f * 1000 / FPS);
    await p.screenshot({ path: path.join(OUT, String(f).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 92 }); }
  await b.close(); })();
