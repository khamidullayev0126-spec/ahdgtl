// Veb-ilovadagi 🆘 / ✈️ / 🎓 matnlari Android ilovadagi bilan bir xilmi va mashq javoblari mexanizm bilan mosmi.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const APP = path.join(__dirname, "..", "app");
const KOTLIN = path.join(__dirname, "..", "..", "tekshir-android", "engine", "src", "main", "kotlin", "uz", "ahdigital", "tekshir", "engine", "Help.kt");

const ctx = { window: {}, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(APP, "yordam.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(APP, "engine.js"), "utf8"), ctx);
const Y = ctx.window.YORDAM, E = ctx.TekshirEngine;

function strings() {
  const out = [];
  for (const l of ["uz", "ru"]) {
    for (const c of Y.rescue[l]) out.push(c.title, ...c.steps);
    out.push(Y.rescue.footer[l]);
    for (const i of Y.tg[l]) out.push(i.title, i.how);
  }
  for (const q of Y.quiz) out.push(q.uz, q.ru, q.whyUz, q.whyRu);
  return out;
}

test("matnlar Android ilova (Help.kt) bilan aynan bir xil", { skip: !fs.existsSync(KOTLIN) && "Android papkasi yo'q" }, () => {
  const kt = fs.readFileSync(KOTLIN, "utf8").replace(/\\"/g, '"');
  const missing = strings().filter(s => !kt.includes(s));
  assert.deepEqual(missing, [], "Help.kt da yo'q (yoki farq qiladi):\n" + missing.join("\n"));
});

test("tuzilma: 4 holat, 7 band, 10 savol; ikki tilda bir xil", () => {
  assert.deepEqual(Y.rescue.uz.map(c => c.id), ["code", "money", "apk", "telegram"]);
  assert.deepEqual(Y.rescue.ru.map(c => c.id), Y.rescue.uz.map(c => c.id));
  Y.rescue.uz.forEach((c, i) => assert.equal(c.steps.length, Y.rescue.ru[i].steps.length, c.id));
  assert.equal(Y.tg.uz.length, 7); assert.deepEqual(Y.tg.ru.map(x => x.id), Y.tg.uz.map(x => x.id));
  assert.equal(Y.quiz.length, 10);
});

test("mashq javoblari Tekshir mexanizmi bilan mos (firibgar → ogohlantiradi, oddiy → xavfsiz)", () => {
  const bad = [];
  for (const q of Y.quiz) for (const text of [q.uz, q.ru]) {
    const lv = E.checkText(text).level;
    if ((lv !== "safe") !== q.scam) bad.push(`${text} → ${lv}`);
  }
  assert.deepEqual(bad, []);
});
