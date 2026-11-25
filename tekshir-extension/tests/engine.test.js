// Kengaytma mexanizmi Telegram bot bilan BIR XIL javob berishini tekshiradi.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BOT = path.join(__dirname, "..", "..", "tekshir-bot", "src");
const { analyzeText } = require(path.join(BOT, "checkers/text"));
const { extractUrls, analyzeUrl } = require(path.join(BOT, "checkers/url"));
const { combine, combineAll } = require(path.join(BOT, "scoring"));
const RULES = require(path.join(BOT, "..", "data/url-rules.json"));

// engine.js brauzerdagidek alohida muhitda yuklanadi (Node modullari yo'q)
const ENGINE_SRC = fs.readFileSync(path.join(__dirname, "..", "engine.js"), "utf8");
const sandbox = { URL };                      // brauzerda URL doim bor
vm.createContext(sandbox);
vm.runInContext(ENGINE_SRC, sandbox);
const E = sandbox.TekshirEngine;
const plain = x => JSON.parse(JSON.stringify(x));

const TEXTS = [
  "Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com",
  "Tabriklaymiz! Siz yutdingiz, sovg'ani olish uchun karta raqamingizni yozing",
  "Posilkangiz bojxonada. To'lang: https://uzpost-delivery.top/pay",
  "Ovoz bering iltimos https://ovoz-berish.xyz",
  "Salom, ertaga darsga kelasanmi?",
  "Rasmiy sayt: https://click.uz va https://payme.uz",
  "SMS kodni hech kimga aytmang!",
  "https://bit.ly/3abcd",
  "Уважаемый клиент, ваша карта заблокирована. Назовите код из SMS",
  "Кликни сюда http://185.22.33.44/login",
  "Ҳурматли мижоз, картангиз блокланди, СМС кодни айтинг",
];
const URLS = ["https://click.uz", "https://c1ick-uz.com/bonus", "https://paymee.uz", "https://xn--clck-g0a.uz",
  "https://my.click.uz.secure-pay.top/karta", "https://google.com/search?q=bonus", "http://185.22.33.44/", "https://bit.ly/x"];

function botText(text) {
  const urls = extractUrls(text);
  const parts = urls.map(u => {
    const h = new URL(u).hostname.toLowerCase().replace(/^www\./, "");
    return RULES.shorteners.includes(h) ? { url: u, host: h, trusted: false, pending: true, reasons: [{ code: "url_shortener_wait", points: 15, vars: {} }] } : analyzeUrl(u);
  });
  return combineAll(parts, analyzeText(text), null);
}

test("matn tekshiruvi bot bilan bir xil", () => {
  for (const t of TEXTS) {
    const a = plain(E.checkText(t)), b = plain(botText(t));
    assert.equal(a.level, b.level, t);
    assert.equal(a.score, b.score, t);
    assert.deepEqual(a.reasons.map(r => r.code), b.reasons.map(r => r.code), t);
  }
});

test("sahifa manzili bot bilan bir xil", () => {
  for (const u of URLS) {
    if (u.includes("bit.ly")) { assert.equal(E.checkPage(u).level, "safe"); continue; }   // internetsiz ochilmaydi — kutiladi
    const a = plain(E.checkPage(u)), b = plain(combine([analyzeUrl(u)]));
    assert.equal(a.level, b.level, u); assert.equal(a.score, b.score, u);
  }
  assert.equal(E.checkPage("https://c1ick-uz.com/bonus").level, "danger");
  assert.equal(E.checkPage("https://click.uz/").trusted, true);
});

test("matndagi APK fayl nomi", () => {
  assert.equal(E.fileInText("Salom, bu rasmlarni ko'r Rasmlar.apk"), "Rasmlar.apk");
  assert.equal(E.fileInText("Sayt: https://example.com/apkinfo"), null);
  const r = E.checkText("Salom, bu rasmlarni ko'r 😂 Rasmlar.apk");
  assert.equal(r.level, "danger");
  assert.ok(E.adviceKeys(r).includes("adv_no_install"));
});

test("maslahatlar va matnlar uch tilda", () => {
  const r = E.checkText(TEXTS[0]);
  assert.deepEqual([...E.adviceKeys(r)], ["adv_no_open", "adv_no_code", "adv_call_bank"]);
  assert.deepEqual([...E.adviceKeys(E.checkText("Salom"))], ["adv_safe"]);
  for (const l of ["uz-latn", "uz-cyrl", "ru"]) {
    for (const k of ["level_danger", "level_suspicious", "level_safe", "url_brand", "txt_secret", "adv_no_open", "why", "what_to_do"])
      assert.notEqual(E.t(l, k), k, `${l}/${k}`);
  }
  assert.match(E.t("ru", "url_brand", { name: "Click", real: "click.uz" }), /click\.uz/);
});

test("engine.js eskirmagan (bot o'zgarsa — node build.js)", () => {
  const { build } = require("../build.js");
  const before = ENGINE_SRC;
  build();
  assert.equal(fs.readFileSync(path.join(__dirname, "..", "engine.js"), "utf8"), before,
    "engine.js botdagi koddan farq qilyapti — `node build.js` ni ishga tushiring");
});

test("internetga murojaat yo'q", () => {
  assert.ok(!/\bfetch\s*\(/.test(ENGINE_SRC.replace(/let doFetch = \(\.\.\.a\) => fetch\(\.\.\.a\);/g, "")),
    "engine.js ichida faqat ishlatilmaydigan doFetch qoladi");
});
