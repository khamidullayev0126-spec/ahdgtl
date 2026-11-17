// AHdigital — Tijoriy taklif (KP) generatori
//
// Qanday ishlaydi:
//  1. Abdulhamid sayti yo'q kafe/salon/do'konni topadi va agentga yozadi: «Gul do'koni uchun taklif tuz, Instagram'da 3 000 obunachi, sayti yo'q».
//  2. Agent kp_tuzish bilan shaxsiy taklif sahifasini yaratadi: /taklif/<id>.
//  3. Abdulhamid havolani biznes egasiga yuboradi. Ochilganda va «Qiziqaman» bosilganda Telegramga xabar keladi.
//
// Xizmatlar, narxlar va muddatlar services.js'dan olinadi — AI narx yoki natija va'dasini to'qiy olmaydi.
// Ruscha tarjimalar saytning i18n.js lug'atidan olinadi.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const KEY = "takliflar";
const SITE = (process.env.SITE_URL || "https://www.ah-digital.uz").replace(/\/$/, "");
const KINDS = ["kafe", "salon", "dokon", "usta", "talim", "boshqa"];   // index.html «Sinab ko'ring» turlari
const MAX_LIST = 25;

// Saytning lug'ati: "o'zbekcha" -> [ruscha, inglizcha]
let DICT = {};
try {
  const file = [path.join(__dirname, "i18n.js"), path.join(__dirname, "public", "i18n.js")].find(f => fs.existsSync(f));
  const s = fs.readFileSync(file, "utf8");
  const a = s.indexOf("const D = {") + 10, b = s.indexOf("\n  };", a) + 4;
  DICT = vm.runInNewContext("(" + s.slice(a, b) + ")");
} catch (e) { console.error("KP: i18n lug'atini o'qib bo'lmadi:", e.message); }

const L = {
  uz: {
    title: "Tijoriy taklif", for: "uchun", date: "Sana", hello: n => `Assalomu alaykum${n ? ", " + n : ""}!`,
    why: "Bu sizga nima beradi", offer: "Taklifim", time: "Muddat", result: "Natija", price: "Narx", sum: "so'm",
    discount: "Chegirma", total: "Jami", sample: "Saytingiz qanday ko'rinishini hoziroq ko'ring",
    sampleBtn: "Namunani ochish (10 soniya)", works: "Ishlarim", worksBtn: "Portfolioni ko'rish",
    steps: "Qanday ishlaymiz", stepList: d => ["Yozasiz yoki qo'ng'iroq qilasiz — 10 daqiqada kelishamiz", "Texnik topshiriq (TZ) — nima qilinishi yozma kelishiladi", "50% oldindan to'lov", `${d} — tayyor ishni ko'rasiz, 2 marta bepul tuzatish`, "Qolgan 50% — ishni qabul qilgandan keyin"],
    cta: "Qiziqtirdimi?", ctaBtn: "Qiziqaman", ctaDone: "Rahmat! Abdulhamid tez orada siz bilan bog'lanadi. Hoziroq yozishingiz ham mumkin:",
    write: "Telegram'da yozish", call: "Qo'ng'iroq qilish", who: "Abdulhamid Xamidullayev · AHdigital — AI yordamida sayt va video",
    note: "Taklif narxlari saytdagi narxlar bilan bir xil. Yashirin to'lov yo'q.", terms: "Xizmat shartlari", print: "PDF qilib saqlash"
  },
  ru: {
    title: "Коммерческое предложение", for: "для", date: "Дата", hello: n => `Здравствуйте${n ? ", " + n : ""}!`,
    why: "Что это вам даст", offer: "Моё предложение", time: "Срок", result: "Результат", price: "Цена", sum: "сум",
    discount: "Скидка", total: "Итого", sample: "Посмотрите, как будет выглядеть ваш сайт",
    sampleBtn: "Открыть пример (10 секунд)", works: "Мои работы", worksBtn: "Смотреть портфолио",
    steps: "Как мы работаем", stepList: d => ["Пишете или звоните — договариваемся за 10 минут", "Техническое задание (ТЗ) — всё фиксируем письменно", "Предоплата 50%", `${d} — вы видите готовую работу, 2 бесплатные правки`, "Остальные 50% — после приёмки"],
    cta: "Заинтересовало?", ctaBtn: "Интересно", ctaDone: "Спасибо! Абдулхамид скоро свяжется с вами. Можно написать и сейчас:",
    write: "Написать в Telegram", call: "Позвонить", who: "Абдулхамид Хамидуллаев · AHdigital — сайты и видео с помощью AI",
    note: "Цены в предложении совпадают с ценами на сайте. Скрытых платежей нет.", terms: "Условия услуг", print: "Сохранить в PDF"
  }
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n || 0).toLocaleString("ru-RU").replace(/ /g, " ");
const clean = (s, max = 300) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const dateOf = iso => new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" });

function createKp({ store, services, notifyOwner = () => {} }) {
  const all = () => store.get(KEY, {}) || {};
  const sellable = () => services.filter(s => !s.hidden && s.group === "once" && s.price > 0);
  const tr = (text, lang) => (lang === "ru" && DICT[text] && DICT[text][0]) || text;
  const save = kp => store.set(KEY, { ...all(), [kp.id]: kp });
  const say = text => Promise.resolve(notifyOwner(text)).catch(() => {});

  function create(input) {
    const ids = [...new Set(Array.isArray(input.xizmatlar) ? input.xizmatlar : [])].slice(0, 3);
    const chosen = ids.map(id => sellable().find(s => s.id === id));
    if (!ids.length || chosen.some(s => !s)) return { error: `xizmatlar noto'g'ri. Mumkin: ${sellable().map(s => s.id).join(", ")} (1–3 ta)` };
    const biznes = clean(input.biznes, 80);
    if (!biznes) return { error: "biznes nomi kerak." };
    const foydalar = (Array.isArray(input.foydalar) ? input.foydalar : []).map(x => clean(x, 200)).filter(Boolean).slice(0, 5);
    if (foydalar.length < 2) return { error: "kamida 2 ta foyda kerak (shu biznesga mos, raqamli va'dasiz)." };
    const narx = chosen.reduce((a, s) => a + s.price, 0);
    const chegirma = Math.max(0, Math.round(Number(input.chegirma) || 0));
    if (chegirma >= narx) return { error: "chegirma narxdan kichik bo'lishi kerak." };

    const n = Object.keys(all()).length + 1;
    const kp = {
      id: crypto.randomBytes(9).toString("base64url"), raqam: `KP-${String(n).padStart(3, "0")}`,
      til: input.til === "ru" ? "ru" : "uz", yaratildi: new Date().toISOString(),
      biznes, kimga: clean(input.kimga, 60), tur: KINDS.includes(input.tur) ? input.tur : "boshqa",
      kirish: clean(input.kirish, 500), foydalar, xizmatlar: ids, narx, chegirma, jami: narx - chegirma,
      chegirmaIzoh: clean(input.chegirma_izoh, 120), ochildi: 0, birinchiOchilish: null, qiziqdi: null
    };
    save(kp);
    return { kp, url: `${SITE}/taklif/${kp.id}`, preview: `${SITE}/taklif/${kp.id}?tekshir=1` };
  }

  function list() {
    return Object.values(all()).sort((a, b) => b.yaratildi.localeCompare(a.yaratildi)).slice(0, MAX_LIST);
  }

  // Ochilganini sanaymiz; birinchi ochilishda egasiga xabar (botlar va havola oldindan ko'rishlarini hisobga olmaymiz)
  function opened(id, userAgent) {
    const kp = all()[id];
    if (!kp || /bot|crawl|spider|preview|TelegramBot|WhatsApp|facebookexternalhit/i.test(userAgent || "")) return;
    kp.ochildi = (kp.ochildi || 0) + 1;
    const first = !kp.birinchiOchilish;
    if (first) kp.birinchiOchilish = new Date().toISOString();
    save(kp);
    if (first) say(`👀 Taklif ochildi: ${kp.raqam} · ${kp.biznes}\nHozir yozish uchun yaxshi payt.`);
  }

  function interested(id) {
    const kp = all()[id];
    if (!kp) return 404;
    if (kp.qiziqdi) return 200;
    kp.qiziqdi = new Date().toISOString();
    save(kp);
    say(`🔥 «Qiziqaman» bosildi: ${kp.raqam} · ${kp.biznes}\nUlarga hoziroq yozing yoki qo'ng'iroq qiling.`);
    return 200;
  }

  function page(kp) {
    const t = L[kp.til] || L.uz, lang = kp.til;
    const chosen = kp.xizmatlar.map(id => services.find(s => s.id === id)).filter(Boolean);
    const maxTime = chosen.map(s => tr(s.time, lang)).sort((a, b) => (parseInt(b.match(/\d+(?!.*\d)/)) || 0) - (parseInt(a.match(/\d+(?!.*\d)/)) || 0))[0];
    const cards = chosen.map(s => `<div class="card"><div class="row"><h3>${esc(tr(s.name, lang))}</h3><b>${fmt(s.price)} ${t.sum}</b></div>
      <p>${esc(tr(s.desc, lang))}</p><ul>${s.features.map(f => `<li>${esc(tr(f, lang))}</li>`).join("")}</ul>
      <p class="small"><b>${t.time}:</b> ${esc(tr(s.time, lang))} · <b>${t.result}:</b> ${esc(tr(s.result, lang))}</p></div>`).join("");
    const total = kp.chegirma || chosen.length > 1
      ? `<table>${chosen.length > 1 ? `<tr><td>${t.price}</td><td>${fmt(kp.narx)} ${t.sum}</td></tr>` : ""}${kp.chegirma ? `<tr><td>${t.discount}${kp.chegirmaIzoh ? " — " + esc(kp.chegirmaIzoh) : ""}</td><td>−${fmt(kp.chegirma)} ${t.sum}</td></tr>` : ""}<tr class="total"><td>${t.total}</td><td>${fmt(kp.jami)} ${t.sum}</td></tr></table>` : "";
    const hasSite = kp.xizmatlar.includes("vizitka");
    const sampleUrl = `/?nom=${encodeURIComponent(kp.biznes.slice(0, 32))}&tur=${kp.tur === "boshqa" ? "kafe" : kp.tur}${lang === "ru" ? "&lang=ru" : ""}#sinov`;
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(kp.biznes)} — ${t.title} · AHdigital</title>
<style>
:root{--bg:#f5ecdc;--card:#fffaf2;--ink:#2b2420;--muted:#6f6259;--acc:#a8552f;--sage:#56633f;--line:#e4d6c1}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}
.hero{background:var(--sage);color:#fff;border-radius:24px;padding:26px 22px}.hero .brand{font-weight:800;letter-spacing:.02em;opacity:.9}
.hero h1{font-size:28px;line-height:1.2;margin:10px 0 6px;overflow-wrap:anywhere}.hero .meta{opacity:.8;font-size:14px}
section{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px 20px;margin-top:14px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.04em;color:var(--acc);margin:0 0 10px}h3{margin:0;font-size:18px}
ul{margin:8px 0 0;padding-left:20px}li{margin:4px 0}p{margin:0 0 8px}.small{font-size:14px;color:var(--muted);margin-top:10px}
.card{border:1px solid var(--line);border-radius:16px;padding:16px;margin-top:10px;background:#fff}.card:first-of-type{margin-top:0}
.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap}.row b{color:var(--acc);font-size:18px;white-space:nowrap}
table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:7px 0;border-bottom:1px solid var(--line)}td:last-child{text-align:right;white-space:nowrap;padding-left:12px}
.total td{font-weight:800;font-size:18px;border-bottom:0}
.btn{display:inline-block;margin:6px 8px 0 0;padding:12px 22px;border:0;border-radius:99px;background:var(--acc);color:#fff;font:600 16px system-ui;cursor:pointer;text-decoration:none}
.btn.light{background:transparent;color:var(--acc);border:1.5px solid var(--acc)}.btn.sage{background:var(--sage)}
ol{margin:0;padding-left:22px}ol li{margin:6px 0}.cta{text-align:center}.cta h2{font-size:20px;text-transform:none;letter-spacing:0;color:var(--ink)}
#done{display:none}.foot{margin-top:18px;color:var(--muted);font-size:14px;text-align:center}.foot a{color:var(--acc)}
@media print{body{background:#fff}.noprint{display:none!important}section,.hero{break-inside:avoid}}
</style></head><body><main>
<div class="hero"><div class="brand">AHdigital</div><h1>${t.title} ${lang === "ru" ? t.for + " «" + esc(kp.biznes) + "»" : "«" + esc(kp.biznes) + "» " + t.for}</h1>
<div class="meta">${kp.raqam} · ${t.date}: ${dateOf(kp.yaratildi)}</div></div>
<section><p><b>${esc(t.hello(kp.kimga))}</b></p>${kp.kirish ? `<p>${esc(kp.kirish)}</p>` : ""}
<h2 style="margin-top:14px">${t.why}</h2><ul>${kp.foydalar.map(f => `<li>${esc(f)}</li>`).join("")}</ul></section>
<section><h2>${t.offer}</h2>${cards}${total}<p class="small">${t.note}</p></section>
${hasSite ? `<section class="noprint"><h2>${t.sample}</h2><a class="btn sage" href="${esc(sampleUrl)}">${t.sampleBtn}</a></section>` : ""}
<section><h2>${t.steps}</h2><ol>${t.stepList(esc(maxTime)).map(s => `<li>${s}</li>`).join("")}</ol>
<p class="small noprint">${t.works}: <a href="/portfolio.html${lang === "ru" ? "?lang=ru" : ""}" style="color:var(--acc)">${t.worksBtn}</a> · <a href="/shartlar.html" style="color:var(--acc)">${t.terms}</a></p></section>
<section class="cta noprint"><h2>${t.cta}</h2>
<div id="ask"><button class="btn" id="yes" type="button">${t.ctaBtn}</button></div>
<div id="done"><p>${t.ctaDone}</p></div>
<a class="btn light" href="https://t.me/Abdulkhamid_2905">${t.write}</a><a class="btn light" href="tel:+998956322905">${t.call}</a></section>
<p class="foot">${t.who}<br>ah-digital.uz · <a href="#" class="noprint" onclick="print();return false">${t.print}</a></p>
</main><script>
document.getElementById("yes").addEventListener("click", async () => {
  try { await fetch(location.pathname.replace(/^\\/taklif\\//, "/api/taklif/") + "/qiziqaman", { method: "POST" }); } catch {}
  document.getElementById("ask").style.display = "none"; document.getElementById("done").style.display = "block";
});
</script></body></html>`;
  }

  function mount(app, { rateLimit = (q, s, n) => n() } = {}) {
    const valid = id => /^[A-Za-z0-9_-]{8,20}$/.test(id);
    app.get("/taklif/:id", (req, res) => {
      const kp = valid(req.params.id) && all()[req.params.id];
      if (!kp) return res.status(404).type("html").send("<p style='font:16px system-ui;padding:24px'>Taklif topilmadi.</p>");
      if (req.query.tekshir !== "1") opened(kp.id, req.get("user-agent"));   // ?tekshir=1 — egasining o'zi ko'rishi, sanalmaydi
      res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" }).type("html").send(page(all()[kp.id]));
    });
    app.post("/api/taklif/:id/qiziqaman", rateLimit, (req, res) => {
      if (!valid(req.params.id)) return res.sendStatus(404);
      res.sendStatus(interested(req.params.id));
    });
  }

  return { create, list, page, mount, opened, interested, sellable };
}

module.exports = { createKp, KINDS };
