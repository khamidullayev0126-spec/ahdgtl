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

test("engine.js eskirmagan, kengaytma va veb-ilovada bir xil (bot o'zgarsa — node build.js)", () => {
  const { build, OUTS } = require("../build.js");
  const before = OUTS.map(o => fs.existsSync(o) ? fs.readFileSync(o, "utf8") : "");
  build();
  OUTS.forEach((o, i) => assert.equal(fs.readFileSync(o, "utf8"), before[i],
    `${path.relative(path.join(__dirname, "..", ".."), o)} eskirgan — \`node build.js\` ni ishga tushiring`));
});

// iPhone (JavaScriptCore)da URL yo'q — o'rinbosar bilan natija AYNAN bir xil bo'lishi shart
test("URL'siz muhit (iPhone): o'rinbosar brauzer URL bilan bir xil", () => {
  const box = {};
  vm.createContext(box);
  vm.runInContext(ENGINE_SRC, box);
  const J = box.TekshirEngine;
  assert.notEqual(box.URL, URL, "o'rinbosar o'rnatilishi kerak edi");
  const hosts = ["https://сlick.uz/pay", "https://xn--lick-0nd.uz", "https://paymе.uz", "http://клик.уз/a?b=1#c", "https://user:pw@click.uz.evil.top:8080/x?y",
    "https://WWW.Click.UZ/", "http://185.22.33.44/login", "https://bit.ly/x", "https://mÿbank.uz/?bonus=1", "https://sub.domain.payme.uz.tk/karta"];
  for (const u of hosts) {
    const a = new box.URL(u), b = new URL(u);
    for (const k of ["protocol", "username", "password", "hostname", "port", "pathname", "search"]) assert.equal(a[k], b[k], `${u} → ${k}`);
  }
  assert.throws(() => new box.URL("salom"));
  for (const t of [...TEXTS, ...hosts]) {
    const a = plain(J.checkText(t)), b = plain(E.checkText(t));
    assert.deepEqual([a.level, a.score, a.reasons.map(r => r.code)], [b.level, b.score, b.reasons.map(r => r.code)], t);
  }
  assert.equal(J.checkText("https://сlick.uz/pay").level, "danger");
});

test("view(): iPhone ilovasi uchun tayyor natija", () => {
  const v = plain(E.view("Bank xodimi: kartangiz bloklandi, SMS kodni ayting https://c1ick-uz.com", "ru"));
  assert.equal(v.level, "danger");
  assert.match(v.title, /ОПАСНО/);
  assert.ok(v.reasons.length >= 3 && v.advice.length >= 2);
  assert.equal(v.online, "https://c1ick-uz.com");
});

test("iPhone ilovasidagi yordam va maslahat fayllari veb-ilovadagi bilan bir xil", () => {
  const { COPIES } = require("../build.js");
  for (const [from, to] of COPIES) assert.equal(fs.readFileSync(to, "utf8"), fs.readFileSync(from, "utf8"), to);
});

// Android'dagi HelpTest bilan bir xil holatlar
test("QR kod: Android QrCheck bilan bir xil", () => {
  const q = plain(E.qr("  https://c1ick-uz.com/pay "));
  assert.equal(q.kind, "url"); assert.equal(E.checkText(q.check).level, "danger"); assert.deepEqual(q.notes, []);
  assert.deepEqual(plain(E.qr("http://example.com")).notes, ["qr_http"]);
  const w = plain(E.qr("WIFI:T:WPA;S:Uy\\;tarmoq;P:juda-maxfiy;H:false;;"));
  assert.equal(w.kind, "wifi"); assert.equal(w.fields.ssid, "Uy;tarmoq"); assert.equal(w.fields.security, "wpa");
  assert.ok(!JSON.stringify(w).includes("juda-maxfiy"), "Wi-Fi paroli olinmasligi kerak");
  assert.equal(w.check, ""); assert.deepEqual(w.notes, ["qr_wifi"]);
  assert.deepEqual(plain(E.qr("WIFI:S:Kafe;T:nopass;;")).notes, ["qr_wifi_open"]);
  assert.deepEqual(plain(E.qr("WIFI:S:Kafe;;")).notes, ["qr_wifi_open"]);
  const s = plain(E.qr("SMSTO:+998901234567:Kartangiz bloklandi, SMS kodni ayting"));
  assert.equal(s.kind, "sms"); assert.equal(s.fields.to, "+998901234567"); assert.notEqual(E.checkText(s.check).level, "safe");
  assert.equal(E.qr("sms:+998901234567?body=Salom%20do%27stim").text, "Salom do'stim");
  const t = plain(E.qr("tel:+998 90 123 45 67")); assert.equal(t.kind, "tel"); assert.deepEqual(t.notes, ["qr_tel"]);
  assert.equal(E.qr("   ").kind, "empty"); assert.equal(E.qr("Salom").kind, "text");
});

test("serverga faqat havola va raqamlar ketadi", () => {
  const p = E.onlinePart("Salom! Kartangiz bloklandi, SMS kodni ayting. Tel: +998 90 123 45 67, sayt https://c1ick-uz.com");
  assert.ok(p.includes("c1ick-uz.com") && p.includes("+998901234567"));
  assert.ok(!/Salom|bloklandi|SMS/.test(p), "xabar matni yuborilmasligi kerak");
  assert.equal(E.onlinePart("Ertaga darsga kelasanmi?"), "");
});

test("internetga murojaat yo'q", () => {
  assert.ok(!/\bfetch\s*\(/.test(ENGINE_SRC.replace(/let doFetch = \(\.\.\.a\) => fetch\(\.\.\.a\);/g, "")),
    "engine.js ichida faqat ishlatilmaydigan doFetch qoladi");
});
