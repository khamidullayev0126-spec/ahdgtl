// Instagram karusel-blog: blog maqolasidan 1080x1350 karusel rasmlar yasaydi.
// Ishlatish (loyiha papkasida): node kontent/karusel/yasash.js            — hammasini
//                               node kontent/karusel/yasash.js 1-insta     — nomi shu bilan boshlanganini
// Yangi karusel qo'shish: pastdagi SETS ichiga yangi nom va slaydlar yozing. Playwright kerak.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../.."), OUT = __dirname;
const SV = require(path.join(ROOT, "services.js"));
const sv = id => SV.find(s => s.id === id);
const sum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString("base64");
const LOGO = "data:image/svg+xml;base64," + b64("images/logo.svg");
const SITE = "data:image/webp;base64," + b64("images/ishlar/ahdigital-bosh-800.webp");
const MENU = "data:image/webp;base64," + b64("images/blog/menyu-namuna.webp");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const CSS = `
*{box-sizing:border-box}html,body{margin:0}
body{width:W;height:H;overflow:hidden;background:#f5ead8;font-family:Figtree,sans-serif;color:#201e1d;position:relative}
.blob{position:absolute;border-radius:50%}
.b1{width:520px;height:520px;background:#ffc6a5;right:-170px;top:-190px}
.b2{width:360px;height:360px;background:#ccdbb2;left:-150px;bottom:-150px;opacity:.8}
.dark{background:#201e1d;color:#f5ead8}.dark .b1{background:#a3542a;opacity:.55}.dark .b2{background:#56633f;opacity:.6}
.top{position:absolute;left:72px;right:72px;top:64px;display:flex;justify-content:space-between;align-items:center}
.tag{align-self:flex-start;background:#c67139;color:#fff;font-weight:700;font-size:28px;padding:10px 24px;border-radius:999px}
.brand{display:flex;align-items:center;gap:12px;font-family:Caprasimo,serif;font-size:34px}
.brand img{width:52px;height:52px}
.main{position:absolute;left:72px;right:72px;top:150px;bottom:130px;display:flex;flex-direction:column;justify-content:center}
.main > *{flex:none}
h1{font-family:Caprasimo,serif;font-weight:400;font-size:92px;line-height:1.02;margin:0 0 28px;letter-spacing:-.01em}
h1 span,.acc{color:#c67139}.dark h1 span{color:#f6a06b}
.lead{font-size:38px;line-height:1.4;color:#474238;margin:0}.dark .lead{color:#d6ccbb}
.price{font-family:Caprasimo,serif;font-size:120px;line-height:1;margin:24px 0 8px}
.price small{font-family:Figtree;font-weight:700;font-size:40px;color:#645c50;margin-left:10px}
.time{align-self:flex-start;display:inline-block;background:#ebddc5;font-weight:700;font-size:32px;padding:12px 26px;border-radius:999px;margin:18px 0 30px}
.list{display:flex;flex-direction:column;gap:18px;margin-top:10px}
.row{background:#ebddc5;border-radius:26px;padding:24px 30px;font-size:34px;font-weight:600;display:flex;gap:20px;align-items:center;line-height:1.3}
.dark .row{background:#2c2822}
.n{flex:none;width:58px;height:58px;border-radius:50%;background:#c67139;color:#fff;display:grid;place-items:center;font-family:Caprasimo;font-size:30px}
.ok{flex:none;font-size:36px}
.foot{position:absolute;left:72px;right:72px;bottom:56px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:28px;color:#474238}
.dark .foot{color:#d6ccbb}
.page{background:#201e1d;color:#f5ead8;padding:8px 18px;border-radius:999px;font-size:24px}
.dark .page{background:#f5ead8;color:#201e1d}
.swipe{position:absolute;right:72px;bottom:140px;font-weight:700;font-size:34px;color:#c67139}
.cta{background:#c67139;color:#fff;border-radius:30px;padding:34px 40px;font-size:40px;font-weight:700;line-height:1.35;margin-top:30px}
.big{font-size:52px}
.shot{border-radius:28px;overflow:hidden;box-shadow:0 20px 50px rgba(46,43,37,.25)}
.shot img{width:100%;display:block}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px}
.col h3{font-family:Caprasimo;font-weight:400;font-size:46px;margin:0 0 16px}
.old{background:#fff;border:3px dashed #b9ae9c;border-radius:24px;height:470px;padding:30px;display:flex;flex-direction:column;gap:16px;font-size:28px;color:#645c50}
.old b{color:#201e1d;font-size:32px}.old i{display:block;height:22px;background:#e7dccb;border-radius:8px}
.box{height:460px;margin-top:40px}
.flow{display:flex;flex-direction:column;gap:14px;margin-top:20px}
.step{background:#ebddc5;border-radius:26px;padding:22px 28px;font-size:34px;font-weight:700;display:flex;gap:18px;align-items:center}
.step small{display:block;font-weight:500;font-size:26px;color:#645c50}
.arrow{font-size:40px;color:#c67139;text-align:center;line-height:1}
.chips{display:flex;flex-wrap:wrap;gap:16px;margin-top:26px}.chip{background:#ebddc5;border-radius:999px;padding:16px 28px;font-size:34px;font-weight:600}
.dark .chip{background:#2c2822}
.quote{font-family:Caprasimo,serif;font-size:56px;line-height:1.15;color:#c67139;margin:10px 0 26px}
`;

function page({ w = 1080, h = 1350, dark = false, tag, pageNo, body, swipe }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap">
<style>${CSS.replace("W", w + "px").replace("H", h + "px")}</style></head>
<body class="${dark ? "dark" : ""}"><div class="blob b1"></div><div class="blob b2"></div>
<div class="top">${tag ? `<span class="tag">${tag}</span>` : "<span></span>"}<span class="brand"><img src="${LOGO}">AHdigital</span></div>
<div class="main">${body}</div>
${swipe ? `<div class="swipe">Suring →</div>` : ""}
<div class="foot"><span>t.me/ahdigital_01</span>${pageNo ? `<span class="page">${pageNo}</span>` : ""}<span>@ah.digital_01</span></div>
</body></html>`;
}
const svc = (id, title, items) => { const s = sv(id); return `<h1>${title}</h1>
<div class="price">${sum(s.price)}<small>so'm / ${esc(s.period)}</small></div><div class="time">⏱ ${esc(s.time)}</div>
<div class="list">${items.map(t => `<div class="row"><span class="ok">✅</span>${t}</div>`).join("")}</div>`; };


const problem = (n, title, text, quote) => ({ tag: `${n}-sabab`, body: `<div class="n" style="width:110px;height:110px;font-size:56px;margin:0 0 36px">${n}</div><h1 style="font-size:80px">${title}</h1>${quote ? `<div class="quote">${quote}</div>` : ""}<p class="lead">${text}</p>` });

const SETS = {
  "1-instagram-yetarlimi": [
    { tag: "Biznes uchun", swipe: true, body: `<h1>Instagram bor. <span>Sayt nega kerak?</span></h1><p class="lead">Biznes egalaridan eng ko'p eshitadigan savolim. Javob — 4 ta sabab 👇</p>` },
    problem(1, "Narx va manzilni topish qiyin", "Mijoz 50 ta post orasidan narx qidirmaydi — boshqa sahifaga o'tib ketadi.", ""),
    problem(2, "Google'da chiqmaysiz", "Qidirgan odam Instagram postlaringizni deyarli ko'rmaydi. Sayt esa qidiruvda chiqishi mumkin.", "«Chilonzorda tort buyurtma»"),
    problem(3, "O'z nomingiz — ko'proq ishonch", "sizning-nomingiz.uz kabi manzili bor biznes jiddiyroq ko'rinadi.", ""),
    problem(4, "Sahifa bloklansa-chi?", "Instagram sizniki emas. Akkaunt buzilsa yoki bloklansa — mijozlar sizni topa olmay qoladi.", ""),
    { tag: "Eng yaxshi yo'l", body: `<h1 style="font-size:80px">Ikkalasi <span>birga</span></h1><div class="flow">
      <div class="step">📸<span>Instagram<small>kontent va yangiliklar</small></span></div><div class="arrow">↓</div>
      <div class="step">🔗<span>Bio'dagi havola<small>bitta bosish</small></span></div><div class="arrow">↓</div>
      <div class="step">🌐<span>Sizning saytingiz<small>narxlar, rasmlar, manzil, ish vaqti</small></span></div><div class="arrow">↓</div>
      <div class="step">📞<span>Qo'ng'iroq yoki Telegram<small>mijoz darhol bog'lanadi</small></span></div></div>` },
    { tag: "Kimga foydali", body: `<h1 style="font-size:80px">Ayniqsa <span>kimlarga</span> kerak</h1><div class="chips">
      <span class="chip">☕️ Kafe va restoran</span><span class="chip">💇 Salon va sartaroshxona</span><span class="chip">📚 O'quv markaz</span>
      <span class="chip">🛠 Ustalar</span><span class="chip">🎂 Uy tortlari</span><span class="chip">🛍 Instagram do'kon</span></div>
      <p class="lead" style="margin-top:34px">Tanishingiz shulardan biri bo'lsa — ularga ulashing 🙏</p>` },
    { tag: "Sinab ko'ring", dark: true, body: `<h1>Saytingiz <span>10 soniyada</span> 👀</h1><p class="lead">Biznes nomini yozing — tayyor ko'rinishini bepul ko'rasiz.</p><div class="cta"><span class="big">ah-digital.uz</span><br>→ «Sinab ko'ring»<br>Vizitka sayt — 30 000 so'mdan</div>` }
  ]
};

(async () => {
  const only = process.argv[2] || "";
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [name, slides] of Object.entries(SETS)) {
    if (!name.startsWith(only)) continue;
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < slides.length; i++) {
      await p.setContent(page({ ...slides[i], pageNo: `${i + 1}/${slides.length}` }), { waitUntil: "networkidle" });
      await p.evaluate(() => document.fonts.ready);
      const over = await p.evaluate(() => { const m = document.querySelector(".main"); return m.scrollHeight > m.clientHeight + 2; });
      if (over) console.warn(`⚠️ ${name}/${i + 1}: matn sig'madi`);
      await p.screenshot({ path: path.join(dir, `${i + 1}.png`) });
    }
    console.log(`✅ ${name}: ${slides.length} ta rasm`);
  }
  await b.close();
})();
