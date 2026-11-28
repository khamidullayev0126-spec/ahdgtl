// Yangi firibgarlik turlari (2026-noyabr): «ish taklifi», «yaqiningiz yangi raqamdan», «bayram aksiyasi», kuryer.
const test = require("node:test");
const assert = require("node:assert");
const { analyzeText } = require("../src/checkers/text");
const { combineAll } = require("../src/scoring");
const { extractUrls, analyzeUrl } = require("../src/checkers/url");

const check = text => combineAll([], analyzeText(text));
const level = text => check(text).level;
const groups = text => analyzeText(text).groups;
const offline = text => combineAll(extractUrls(text).map(analyzeUrl), analyzeText(text));

// ---- «Ish taklifi»: layk bosib pul, boshlash uchun oldindan to'lov ----
test("ish + oldindan to'lov (uz) → 🔴", () => {
  const t = "Uydan ishlash! Layk bosib kuniga 300 000 so'm. Boshlash uchun 50 000 so'm oldindan to'lov qiling";
  assert.ok(groups(t).includes("job"));
  assert.strictEqual(level(t), "danger");
});
test("ish + pul o'tkazish (ru) → 🔴", () =>
  assert.strictEqual(level("Удалённая работа: ставить лайки, ежедневные выплаты. Для начала переведите 100 000 сум"), "danger"));
test("ish + pul o'tkazish (kirill o'zbekcha) → 🔴", () =>
  assert.strictEqual(level("Масофавий иш! Кунлик тўлов. Бошлаш учун 50 000 сўм ташланг"), "danger"));
test("ish taklifi + shubhali havola → kamida 🟡", () =>
  assert.notStrictEqual(offline("Telegramda ish! Topshiriq bajarib pul toping: https://ish-topish.click").level, "safe"));

// ---- «Yaqiningiz yangi raqamdan pul so'rayapti» ----
test("yangi raqam + pul so'rash (uz) → 🔴", () => {
  const t = "Assalomu alaykum, bu mening yangi raqamim. Telefonim buzildi, tezda 500 ming kartaga tashlang";
  assert.ok(groups(t).includes("relative"));
  assert.strictEqual(level(t), "danger");
});
test("yangi raqam + pul so'rash (ru) → 🔴", () =>
  assert.strictEqual(level("Мама, это мой новый номер. Скинь 300 000 на карту, срочно"), "danger"));
test("yangi raqam + pul so'rash (kirill o'zbekcha) → 🔴", () =>
  assert.strictEqual(level("Бу менинг янги рақамим, телефоним бузилди. 200 000 ташлаб беринг"), "danger"));

// ---- Bayram (Yangi yil) aksiyasi ----
test("Yangi yil aksiyasi + to'lov → kamida 🟡", () => {
  const t = "Yangi yil aksiyasi! Atigi 99 000 so'm to'lang va iPhone oling";
  assert.ok(groups(t).includes("holiday"));
  assert.notStrictEqual(level(t), "safe");
});
test("Yangi yil aksiyasi + SMS kod → 🔴", () =>
  assert.strictEqual(level("Yangi yil sovg'asi sizga! Olish uchun SMS kodni yuboring"), "danger"));
test("новогодняя акция + shubhali havola → kamida 🟡", () =>
  assert.notStrictEqual(offline("Новогодняя акция! Заберите подарок: https://yangi-yil.click").level, "safe"));

// ---- Kuryer / manzilni tasdiqlash ----
test("kuryer + manzilni tasdiqlang + to'lov → kamida 🟡", () => {
  const t = "Kuryer sizni topa olmadi. Manzilingizni tasdiqlang va yetkazib berish haqini to'lang";
  assert.ok(groups(t).includes("parcel"));
  assert.notStrictEqual(level(t), "safe");
});

// ---- Oddiy xabarlar xato signal bermasligi kerak ----
test("oddiy gaplar ✅ bo'lib qoladi", () => {
  for (const t of [
    "Yangi yil bilan tabriklayman! Baxt tilayman",
    "Bu mening yangi raqamim, saqlab qo'ying",
    "Masofaviy ish qidiryapman, maslahat bering",
    "Kuryer soat 5 da keladi",
    "Мой новый номер, сохрани пожалуйста",
  ]) assert.strictEqual(level(t), "safe", t);
});

// ---- Maslahat: yangi turlarda «pul o'tkazmang» ham chiqadi ----
test("yangi turlar uchun «pul o'tkazmang» maslahati", () => {
  const { advice } = require("../src/reply");
  // Bu xabarlarda «pul o'tkazing» so'zi yo'q — maslahat yangi guruhning o'zidan kelishi kerak
  for (const t of ["Bu mening yangi raqamim. SMS kodni ayt", "Layk bosib pul ishlang. SMS kodni yuboring"]) {
    const r = check(t);
    assert.strictEqual(r.level, "danger", t);
    assert.ok(!r.groups.includes("transfer"), t);
    assert.ok(advice("uz-latn", r).some(s => s.includes("pul o'tkazmang")), t);
  }
});
