// iPhone ilovasi JavaScriptCore'da nima ko'rsa — shuni sinaymiz: URL yo'q, `window = this`,
// engine.js + yordam.js + maslahatlar.js yuklanadi va Swift (Engine.swift) kutgan JSON ko'rinishi tekshiriladi.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RES = path.join(__dirname, "..", "Resources");
const ctx = {};                                   // iPhone'dagidek: URL, fetch, document yo'q
vm.createContext(ctx);
vm.runInContext("var window = this;", ctx);
for (const f of ["engine.js", "yordam.js", "maslahatlar.js"]) vm.runInContext(fs.readFileSync(path.join(RES, f), "utf8"), ctx, { filename: f });
const js = expr => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, ctx));

const isStr = x => typeof x === "string";
const isStrArr = a => Array.isArray(a) && a.every(isStr);

test("URL yo'q muhitda ham mexanizm ishlaydi (o'rinbosar)", () => {
  assert.equal(typeof vm.runInContext("URL", ctx), "function");
  assert.equal(js('TekshirEngine.view("https://сlick.uz/pay", "uz-latn")').level, "danger");
});

test("view() — Swift Verdict tuzilmasiga mos", () => {
  for (const [text, lang] of [["Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com", "uz-latn"], ["Salom", "ru"], ["Rasmlar.apk", "uz-latn"]]) {
    const v = js(`TekshirEngine.view(${JSON.stringify(text)}, ${JSON.stringify(lang)})`);
    assert.ok(["safe", "suspicious", "danger"].includes(v.level));
    assert.ok(Number.isInteger(v.score), "score — Int");
    assert.ok(isStr(v.title) && isStrArr(v.reasons) && isStrArr(v.advice) && isStr(v.online) && typeof v.pending === "boolean", text);
  }
});

test("qr() — Swift QrInfo tuzilmasiga mos (fields faqat matn)", () => {
  for (const raw of ["WIFI:S:Kafe;T:nopass;;", "https://c1ick-uz.com", "SMSTO:+998901234567:salom", "tel:+998901234567", "Salom", ""]) {
    const q = js(`TekshirEngine.qr(${JSON.stringify(raw)})`);
    assert.ok(isStr(q.kind) && isStr(q.text) && isStr(q.check) && isStrArr(q.notes), raw);
    assert.ok(Object.values(q.fields).every(isStr), raw + ": fields qiymatlari matn bo'lishi kerak");
  }
});

test("yordam va maslahatlar — Swift Help, Tip tuzilmalariga mos", () => {
  const y = js("window.YORDAM");
  for (const l of ["uz", "ru"]) {
    assert.equal(y.rescue[l].length, 4);
    y.rescue[l].forEach(c => assert.ok(isStr(c.id) && isStr(c.icon) && isStr(c.title) && isStrArr(c.steps)));
    assert.ok(isStr(y.rescue.footer[l]));
    assert.equal(y.tg[l].length, 7);
    y.tg[l].forEach(i => assert.ok(isStr(i.id) && isStr(i.title) && isStr(i.how)));
    assert.ok(Object.values(y.qrNotes[l]).every(isStr));
  }
  assert.equal(y.quiz.length, 10);
  y.quiz.forEach(q => assert.ok(typeof q.scam === "boolean" && isStr(q.uz) && isStr(q.ru) && isStr(q.whyUz) && isStr(q.whyRu)));
  const tips = js("window.TIPS"), cats = js("window.TIP_CATS");
  assert.ok(tips.every(t => t.length === 4 && t.every(isStr)) && cats.every(c => c.length === 3));
  const security = ["firibgarlik", "parol", "telefon", "oila"];
  assert.ok(tips.filter(t => security.includes(t[0])).length >= 40, "xavfsizlik maslahatlari");
});

test("Swift kodidagi matn kalitlari Strings.swift'da bor (uz va ru)", () => {
  const src = fs.readdirSync(path.join(__dirname, "..", "Tekshir"), { recursive: true })
    .filter(f => f.endsWith(".swift")).map(f => fs.readFileSync(path.join(__dirname, "..", "Tekshir", f), "utf8")).join("\n");
  const strings = fs.readFileSync(path.join(__dirname, "..", "Tekshir", "Strings.swift"), "utf8");
  const uz = strings.slice(strings.indexOf("private static let uz"), strings.indexOf("private static let ru"));
  const ru = strings.slice(strings.indexOf("private static let ru"));
  const used = new Set([...src.matchAll(/\.t\("([a-z_0-9]+)"/g)].map(m => m[1]));
  ["on_1", "on_2", "on_3", "quiz_r1", "quiz_r2", "quiz_r3", "tg_good", "tg_mid", "tg_bad"].forEach(k => used.add(k));   // dinamik kalitlar
  const missing = [...used].filter(k => !uz.includes(`"${k}":`) || !ru.includes(`"${k}":`));
  assert.deepEqual(missing, [], "Strings.swift'da yo'q kalitlar");
});
