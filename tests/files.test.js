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
  for (const f of ["i18n-app.js", "i18n-shartlar.js"]) {
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
  }
});
