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
  for (const page of ["index.html", "portfolio.html", "ishlar/ahdigital.html", "maxfiylik.html", "shartlar.html", "blog/index.html", "blog/ai-bilan-sayt.html"]) {
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
