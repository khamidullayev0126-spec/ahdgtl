// Ovozga moslangan reklama video: node make2.js <A|B> <kadrlar papkasi>
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = "/home/user/ahdgtl", V = process.argv[2], OUT = process.argv[3];
const SV = require(ROOT + "/services.js"), sv = id => SV.find(s => s.id === id);
const sum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString("base64");
const LOGO = "data:image/svg+xml;base64," + b64("images/logo.svg");
const MENU = "data:image/webp;base64," + b64("images/blog/menyu-namuna.webp");
const FPS = 30;
const T = n => n.toFixed(2) + "s";

// sahna: {from, to, cls, html}; elementlarga d(t) bilan kechikish beriladi
const d = t => `style="animation-delay:${T(t)}"`;
const hook = (from, to, l1, l2, pill, pillAt, big = 230, small = 150) => ({ from, to, html: `<div class="shake" style="animation-delay:${T(from + 1.3)}"><h1 class="big" style="font-size:${small}px;animation-delay:${T(from + .1)}">${l1}</h1><h1 class="q acc" style="font-size:${big}px;animation-delay:${T(from + .45)}">${l2}</h1></div><span class="pill yes" ${d(pillAt)}>${pill}</span>` });
const chips = (from, to, items) => ({ from, to, html: `<h1 class="ttl" ${d(from + .05)}>Kimga <span class="acc">kerak?</span></h1><div class="chips">${items.map(([c, t]) => `<span class="chip" ${d(t)}>${c}</span>`).join("")}</div>` });
const phone = (from, to, title, badge, badgeAt) => ({ from, to, html: `<h1 class="ttl" ${d(from + .05)}>${title}</h1><div class="phone" ${d(from + .2)}><div class="screen"><img src="${MENU}" style="animation-delay:${T(from + 1.2)}"></div><span class="pill badge" ${d(badgeAt)}>${badge}</span></div>` });
const rows = (from, to, title, items) => ({ from, to, html: `<h1 class="ttl" ${d(from + .05)}>${title}</h1><div class="list">${items.map(([t, at]) => `<div class="row" ${d(at)}>${t}</div>`).join("")}</div>` });
const more = (from, to, items, aiAt) => ({ from, to, html: `<h1 class="ttl" ${d(from + .05)}>Yana <span class="acc">nimalar?</span></h1><div class="grid">${items.map(([t, p, at]) => `<div class="card" ${d(at)}>${t}<b>${sum(p)}</b></div>`).join("")}</div><div class="ai" ${d(aiAt)}>Hammasi Claude (AI) yordamida — tez va arzon</div>` });
const problem = (from, to) => ({ from, to, html: `<div class="emoji" ${d(from + .1)}>😕</div><h1 class="ttl" ${d(from + .3)}>Mijozlar menyuingizni <span class="acc">internetda topa olmaydi</span></h1>` });
const cta = (from, to, title, webAt, tgAt, hintAt) => ({ from, to, dark: true, html: `<img class="logo" src="${LOGO}" ${d(from + .05)}><h1 class="ttl" ${d(from + .2)}>${title}</h1><div class="cta"><div class="btn web" ${d(webAt)}>🌐 ah-digital.uz</div><div class="btn tg" ${d(tgAt)}><span class="pulse" style="animation-delay:${T(tgAt + .8)}">✈️ t.me/ahdigital_01</span></div></div><div class="hint" ${d(hintAt)}>Kanalga obuna bo'ling — har hafta foydali postlar</div>` });

const VARIANTS = {
  A: { dur: 28, scenes: [
    hook(0, 3.33, `${sum(sv("vizitka").price)} so'mga`, "SAYT?", "Ha, rost 👇", 1.76),
    chips(3.33, 7.3, [["☕ Kafe", 3.43], ["🛍 Do'kon", 4.08], ["💇 Salon", 4.8], ["🔧 Usta", 5.6], ["📚 O'quv markaz", 6.24], ["🎂 Tortchi", 6.6]]),
    phone(7.3, 12.0, `Mana <span class="acc">shunday</span> 👇`, `${sv("vizitka").time} ⚡`, 10.4),
    rows(12.0, 17.15, `Mijoz <span class="acc">nima qiladi?</span>`, [["📞 Bir bosishda qo'ng'iroq", 12.64], ["✈️ Telegram'ga yozadi", 14.43], ["🔎 Google'da topadi", 15.52]]),
    more(17.15, 19.62, [["🎬 Reels video", sv("video").price, 17.2], ["🎨 Slayd va post", sv("slayd").price, 17.76], ["🌐 Katta sayt", sv("katta-sayt").price, 18.4]], 18.9),
    cta(19.62, 28, `Saytingiz qanday ko'rinadi? <span class="acc">10 soniyada</span> bepul ko'ring`, 23.12, 25.36, 26.24)
  ] },
  B: { dur: 27, scenes: [
    hook(0, 3.05, "Kafengizning", "sayti bormi?", "Yo'qmi? 🤔", 2.16, 180, 118),
    problem(3.05, 6.3),
    phone(6.3, 10.42, `Menyu sayt<br><span class="acc">${sum(sv("vizitka").price).replace(/ /g, "\u00a0")}\u00a0so'm</span>`, `${sv("vizitka").time} ⚡`, 8.92),
    rows(10.42, 15.62, `Mijoz <span class="acc">nima qiladi?</span>`, [["📱 Menyuni telefonda ko'radi", 10.84], ["📞 Bir bosishda qo'ng'iroq", 12.56], ["✈️ Telegram'ga yozadi", 14.24]]),
    more(15.62, 18.0, [["🎬 Reels video", sv("video").price, 15.76], ["🎨 Slayd va post", sv("slayd").price, 16.16], ["🌐 Katta sayt", sv("katta-sayt").price, 16.8]], 17.3),
    cta(18.0, 27, `Kafengiz nomi bilan <span class="acc">10 soniyada</span> bepul ko'ring`, 22.08, 24.2, 25.0)
  ] }
};
const { dur, scenes } = VARIANTS[V];
const sceneCss = scenes.map((s, i) => `.s${i}{animation:show ${T(s.to - s.from)} linear ${T(s.from)} both}`).join("\n").replace(new RegExp(`\\.s${scenes.length - 1}\\{animation:show `), `.s${scenes.length - 1}{animation:showlast `);
const lastFrom = scenes[scenes.length - 1].from;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@500;700;800&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
body{background:#f5ead8;font-family:Figtree,sans-serif;color:#201e1d;position:relative}
.blob{position:absolute;border-radius:50%;animation:float 6s ease-in-out infinite alternate}
.b1{width:760px;height:760px;background:#ffc6a5;right:-300px;top:-260px}
.b2{width:560px;height:560px;background:#ccdbb2;left:-260px;bottom:-200px;animation-delay:-3s}
@keyframes float{to{transform:translate(-40px,50px) scale(1.06)}}
@keyframes hideb{to{opacity:0}}
.brand{animation:hideb .3s linear ${T(lastFrom)} both;position:absolute;top:90px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:16px;font-family:Caprasimo,serif;font-size:46px;z-index:5}
.brand img{width:72px;height:72px}
.sc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 110px 300px;opacity:0}
.dark{background:#201e1d;color:#f5ead8}
h1{font-family:Caprasimo,serif;font-weight:400;margin:0;line-height:1.04;letter-spacing:-.01em}
.acc{color:#c67139}.dark .acc{color:#f6a06b}
.pill{display:inline-block;background:#c67139;color:#fff;font-weight:800;border-radius:999px}
.prog{position:absolute;left:0;bottom:0;height:12px;background:#c67139;animation:prog ${dur}s linear forwards;z-index:6}
@keyframes prog{from{width:0}to{width:100%}}
@keyframes show{0%{opacity:0}3%{opacity:1}97%{opacity:1}100%{opacity:0}}
@keyframes showlast{0%{opacity:0}4%{opacity:1}100%{opacity:1}}
${sceneCss}
@keyframes punch{from{transform:scale(2.2);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes pop{from{transform:translateY(40px) scale(.8);opacity:0}to{transform:none;opacity:1}}
@keyframes slide{from{transform:translateX(-120px);opacity:0}to{transform:none;opacity:1}}
@keyframes shake{25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
@keyframes rise{from{transform:translateY(300px);opacity:0}to{transform:none;opacity:1}}
@keyframes scroll{to{transform:translateY(-12%)}}
@keyframes stamp{from{transform:rotate(6deg) scale(2.5);opacity:0}to{transform:rotate(6deg) scale(1);opacity:1}}
@keyframes pulse{50%{transform:scale(1.06)}}
.big{font-size:150px;animation:punch .5s cubic-bezier(.2,1.6,.4,1) both}
.q{animation:punch .5s cubic-bezier(.2,1.6,.4,1) both;line-height:1}
.yes{margin-top:50px;font-size:64px;padding:22px 54px;animation:pop .4s ease both}
.shake{animation:shake .35s linear 2 both}
.ttl{font-size:100px;margin-bottom:50px;animation:pop .4s ease both}
.emoji{font-size:220px;margin-bottom:30px;animation:punch .5s ease both}
.chips{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;max-width:900px}
.chip{font-size:58px;font-weight:800;background:#fff;border-radius:999px;padding:22px 42px;box-shadow:0 14px 34px rgba(46,43,37,.14);animation:pop .35s ease both}
.phone{width:500px;height:930px;border-radius:70px;background:#201e1d;padding:20px;box-shadow:0 40px 90px rgba(46,43,37,.35);animation:rise .6s cubic-bezier(.2,1.2,.4,1) both;position:relative}
.screen{width:100%;height:100%;border-radius:54px;overflow:hidden;background:#fff;position:relative}
.screen img{width:100%;position:absolute;top:0;left:0;animation:scroll 2.6s ease-in-out both}
.badge{position:absolute;right:-70px;top:110px;font-size:52px;padding:22px 40px;transform:rotate(6deg);animation:stamp .4s cubic-bezier(.2,1.6,.4,1) both}
.list{display:flex;flex-direction:column;gap:30px;width:100%}
.row{background:#fff;border-radius:34px;padding:36px 42px;font-size:58px;font-weight:700;text-align:left;box-shadow:0 14px 34px rgba(46,43,37,.12);animation:slide .4s ease both}
.grid{display:grid;gap:28px;width:100%}
.card{background:#201e1d;color:#f5ead8;border-radius:36px;padding:36px 44px;display:flex;justify-content:space-between;align-items:center;font-size:56px;font-weight:800;animation:pop .4s ease both}
.card b{font-family:Caprasimo;font-weight:400;color:#f6a06b;font-size:64px}
.ai{margin-top:46px;font-size:48px;font-weight:700;color:#474238;animation:pop .4s ease both}
.logo{width:150px;height:150px;margin-bottom:40px;animation:punch .5s ease both}
.cta{width:100%;margin-top:60px;display:flex;flex-direction:column;gap:30px}
.btn{border-radius:36px;padding:38px 30px;font-size:62px;font-weight:800;display:flex;align-items:center;justify-content:center;animation:pop .45s cubic-bezier(.2,1.5,.4,1) both}
.web{background:#c67139;color:#fff}.tg{background:#2aa3e0;color:#fff}
.pulse{display:inline-block;animation:pulse 1s ease-in-out infinite both}
.hint{margin-top:50px;font-size:46px;font-weight:700;color:#f6a06b;animation:pop .4s ease both}
</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div>
<div class="brand"><img src="${LOGO}">AHdigital</div>
${scenes.map((s, i) => `<section class="sc s${i}${s.dark ? " dark" : ""}">${s.html}</section>`).join("\n")}
<div class="prog"></div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  fs.mkdirSync(OUT, { recursive: true });
  for (let f = 0; f < FPS * dur; f++) {
    await p.evaluate(t => document.getAnimations().forEach(a => { a.currentTime = t; }), f * 1000 / FPS);
    await p.screenshot({ path: path.join(OUT, String(f).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await b.close();
})();
