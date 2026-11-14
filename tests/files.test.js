// Fayllar tekshiruvi: barcha JavaScript fayllarda yozuv xatosi yo'qligi va tarjima lug'atlari to'g'ri ekani.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".js"));

test("barcha .js fayllarda sintaksis xatosi yo'q", () => {
  for (const f of jsFiles) {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(ROOT, f), "utf8"), { filename: f }), `${f} da xato bor`);
  }
});

test("tarjima lug'atlari: har bir yozuvda ruscha va inglizcha bor", () => {
  for (const f of ["i18n-app.js", "i18n-shartlar.js", "i18n-maxfiylik.js", "i18n-ishlar.js"]) {
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
    for (const [uz, tr] of Object.entries(ctx.window.I18N_EXTRA)) {
      assert.ok(Array.isArray(tr) && tr.length === 2, `${f}: "${uz}" uchun 2 ta tarjima kerak`);
    }
  }
});

test("har bir xizmat nomi rus va ingliz tiliga tarjima qilingan", () => {
  const services = require(path.join(ROOT, "services.js"));
  const i18n = fs.readFileSync(path.join(ROOT, "i18n.js"), "utf8");
  for (const s of services) {
    assert.ok(i18n.includes(JSON.stringify(s.name) + ":"), `"${s.name}" i18n.js lug'atida yo'q`);
    assert.ok(i18n.includes(JSON.stringify(s.desc) + ":"), `"${s.name}" tavsifi i18n.js lug'atida yo'q`);
    for (const k of ["time", "result"]) if (s[k]) assert.ok(i18n.includes(JSON.stringify(s[k]) + ":"), `"${s.name}" ${k} i18n.js lug'atida yo'q`);
    if (s.sample) assert.ok(i18n.includes(JSON.stringify((s.sampleText || "Namunani ko'rish") + " →") + ":"), `"${s.name}" namuna matni i18n.js da yo'q`);
  }
});

test("portfolio ishlari (works.js): har birida rasm/havola bor va matnlari tarjima qilingan", () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "works.js"), "utf8"), ctx);
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "i18n-ishlar.js"), "utf8"), ctx);
  const dict = ctx.window.I18N_EXTRA;
  for (const w of ctx.window.WORKS) {
    for (const k of ["title", "desc", "status", "linkText"]) assert.ok(dict[w[k]], `"${w.slug}" ${k} tarjimasi yo'q`);
    assert.ok(w.cat.every(c => ["sayt", "dizayn", "video", "ai"].includes(c)), `"${w.slug}" noto'g'ri turkum`);
    if (w.image) assert.ok(fs.existsSync(path.join(ROOT, w.image)), `"${w.slug}" rasmi topilmadi: ${w.image}`);
    if (w.link && !w.link.startsWith("#")) assert.ok(fs.existsSync(path.join(ROOT, w.link.split("#")[0])), `"${w.slug}" havolasi topilmadi: ${w.link}`);
  }
});

test("sahifalardagi rasm va video fayllari mavjud (src, srcset, poster)", () => {
  for (const page of ["index.html", "portfolio.html", "ishlar/ahdigital.html", "maxfiylik.html", "shartlar.html", "blog/index.html", "blog/ai-bilan-sayt.html", "blog/landing-page.html", "blog/landing-page.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const refs = [...html.matchAll(/\b(?:src|poster)="([^"]+)"|\bsrcset="([^"]+)"/g)]
      .flatMap(m => m[1] ? [m[1]] : m[2].split(",").map(x => x.trim().split(/\s+/)[0]))
      .filter(u => !/^(https?:|data:|\/\/)/.test(u) && /\.(webp|jpe?g|png|svg|mp4|webm)$/i.test(u));
    for (const u of refs) {
      const file = u.startsWith("/") ? path.join(ROOT, u) : path.join(ROOT, path.dirname(page), u);
      assert.ok(fs.existsSync(file), `${page}: "${u}" fayli topilmadi`);
    }
  }
});

// Cookie roziligi: rozilikdan oldin Google kodi yuklanmasligi kerak (Consent Mode v2, basic)
function runConsent({ stored = null, path = "/" } = {}) {
  const appended = [], store = {};
  if (stored) store["ahd-consent"] = JSON.stringify({ c: stored, t: Date.now() });
  const el = () => ({ setAttribute() {}, querySelector: () => ({}), remove() {}, style: {} });
  const document = {
    body: { appendChild: n => appended.push(n) }, head: { appendChild: n => appended.push(n) },
    documentElement: { lang: "uz" }, createElement: el, addEventListener() {}
  };
  const window = { AHD_ANALYTICS: {} };
  const ctx = { window, document, location: { pathname: path, search: "" }, URLSearchParams,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } };
  vm.runInNewContext(fs.readFileSync(path_join("analytics.js"), "utf8") + "\n" + fs.readFileSync(path_join("consent.js"), "utf8"),
    ctx, { filename: "consent.js" });
  return { window: ctx.window, dataLayer: ctx.window.dataLayer, appended };
}
const path_join = f => path.join(ROOT, f);

test("cookie roziligi: boshida hammasi denied, Google kodi yuklanmaydi; «Roziman» saqlangan bo'lsa yuklanadi", () => {
  const fresh = runConsent();
  const first = [...fresh.dataLayer[0]];
  assert.equal(first.slice(0, 2).join(), "consent,default");
  for (const k of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) assert.equal(first[2][k], "denied");
  assert.ok(!fresh.appended.some(n => String(n.src || "").includes("googletagmanager")), "rozilikdan oldin yuklanmasin");

  const denied = runConsent({ stored: "denied" });
  assert.equal(denied.appended.length, 0, "rad etilganda hech narsa yuklanmasin");

  const ok = runConsent({ stored: "granted" });
  assert.ok(ok.appended.some(n => /googletagmanager\.com\/gtm\.js\?id=GTM-/.test(n.src)), "rozilikdan keyin Google tag yuklansin");
  const upd = ok.dataLayer.map(a => [...a]).find(a => a[0] === "consent" && a[1] === "update");
  assert.equal(JSON.stringify(upd[2]), JSON.stringify({ analytics_storage: "granted" }), "faqat statistika yoqilsin, reklama yo'q");

  assert.equal(runConsent({ stored: "granted", path: "/admin.html" }).appended.length, 0, "admin sahifada statistika yo'q");
});

test("ochiq sahifalarda consent.js bor, xizmat sahifalarida yo'q", () => {
  for (const f of ["index.html", "portfolio.html", "maxfiylik.html", "shartlar.html", "blog/index.html", "blog/ai-bilan-sayt.html", "blog/landing-page.html", "blog/landing-page.html", "ishlar/ahdigital.html", "404.html"]) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(s.includes("consent.js") && s.includes("analytics.js"), `${f} da consent.js/analytics.js yo'q`);
  }
  for (const f of ["admin.html", "kabinet.html", "tolov.html", "app.html"]) {
    assert.ok(!fs.readFileSync(path.join(ROOT, f), "utf8").includes("consent.js"), `${f} da statistika bo'lmasin`);
  }
});

test("blog: landing page maqolasidagi narx va muddatlar services.js bilan bir xil", () => {
  const services = require(path.join(ROOT, "services.js"));
  const html = fs.readFileSync(path.join(ROOT, "blog/landing-page.html"), "utf8");
  const fmt = n => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " so'm";
  for (const id of ["vizitka", "katta-sayt"]) {
    const s = services.find(x => x.id === id);
    assert.ok(html.includes(fmt(s.price)), `${id} narxi (${fmt(s.price)}) maqolada eskirgan`);
    assert.ok(html.includes(s.time), `${id} muddati (${s.time}) maqolada eskirgan`);
  }
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes("/blog/landing-page.html"), "sitemap'da yo'q");
  assert.ok(fs.readFileSync(path.join(ROOT, "blog/index.html"), "utf8").includes("/blog/landing-page.html"), "blog ro'yxatida yo'q");
});

test("blog: landing page maqolasidagi narx va muddatlar services.js bilan bir xil", () => {
  const services = require(path.join(ROOT, "services.js"));
  const html = fs.readFileSync(path.join(ROOT, "blog/landing-page.html"), "utf8");
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
  for (const id of ["vizitka", "katta-sayt"]) {
    const s = services.find(x => x.id === id);
    assert.ok(html.includes(fmt(s.price)), `${id} narxi (${fmt(s.price)}) maqolada eskirgan`);
    assert.ok(html.includes(s.time), `${id} muddati (${s.time}) maqolada eskirgan`);
  }
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes("/blog/landing-page.html"), "sitemap'da yo'q");
  assert.ok(fs.readFileSync(path.join(ROOT, "blog/index.html"), "utf8").includes("/blog/landing-page.html"), "blog ro'yxatida yo'q");
});

test("AI LEGENDS: darslar hali boshlanmagani yozilgan va tarjima qilingan", () => {
  const services = require(path.join(ROOT, "services.js"));
  const l = services.find(s => s.id === "legends");
  const i18n = fs.readFileSync(path.join(ROOT, "i18n.js"), "utf8");
  if (!l.soon) return;   // kurs boshlangach soon olib tashlanadi — test ham o'tadi
  for (const t of [l.soon, l.cta, "Tez orada"]) assert.ok(i18n.includes(JSON.stringify(t) + ":"), `"${t}" i18n.js da yo'q`);
  assert.match(fs.readFileSync(path.join(ROOT, "chat.js"), "utf8"), /s\.soon/, "AI yordamchi ham bilishi kerak");
});
