// 2-bosqich: havola tekshiruvi testlari (internetsiz — qisqartirilgan havolalar uchun soxta "fetch").
const test = require("node:test");
const assert = require("node:assert");
const { extractUrls, analyzeUrl, checkUrls, setFetch, levenshtein, normalize } = require("../src/checkers/url");
const { combine, levelOf } = require("../src/scoring");

// Soxta internet: bit.ly/xxxx → paymee-uz.top ga yo'naltiradi
setFetch(async url => {
  const map = { "http://bit.ly/xxxx": "https://paymee-uz.top/login", "https://bit.ly/toza": "https://click.uz/" };
  const loc = map[url];
  return { status: loc ? 301 : 404, headers: { get: h => (h === "location" ? loc : null) } };
});
const level = async text => combine(await checkUrls(extractUrls(text))).level;

// ---- Qabul mezonlari (topshiriqdagi jadval) ----
test("https://click.uz → ✅ xavfsiz", async () => assert.strictEqual(await level("https://click.uz"), "safe"));
test("https://c1ick-uz.com/bonus → 🔴 (brendga o'xshatilgan)", async () => assert.strictEqual(await level("https://c1ick-uz.com/bonus"), "danger"));
test("bit.ly/xxxx soxta saytga olib boradi → 🔴", async () => {
  const r = combine(await checkUrls(extractUrls("Tez kiring: bit.ly/xxxx")));
  assert.strictEqual(r.level, "danger");
  assert.ok(r.reasons.some(x => x.code === "url_shortener"));
});

// ---- Qo'shimcha holatlar ----
test("o'xshatilgan domenlar 🔴: paymee.uz, uzum-bonus.com, kapitalbank-uz.net", async () => {
  for (const u of ["paymee.uz", "https://uzum-bonus.com", "http://kapitalbank-uz.net/karta"]) assert.strictEqual(await level(u), "danger", u);
});
test("rasmiy saytning subdomeni ham ✅: my.gov.uz, www.payme.uz, checkout.paycom.uz emas", async () => {
  assert.strictEqual(await level("https://my.gov.uz/oz"), "safe");
  assert.strictEqual(await level("https://www.payme.uz"), "safe");
});
test("bitta harfi boshqa, uzunligi bir xil (clock.uz ~ click) → faqat 🟡, 🔴 emas", async () => assert.strictEqual(await level("https://clock.uz"), "suspicious"));
test("punycode (boshqa alifbo harfi bilan) domen → kamida 🟡", async () => {
  assert.notStrictEqual(await level("https://сlick.uz"), "safe");   // birinchi "с" — kirill harfi!
});
test("IP manzilli havola + login → 🟡 yoki 🔴", async () => assert.notStrictEqual(await level("http://185.22.11.4/login"), "safe"));
test("@ bilan aldov: https://click.uz@yomon.top → 🔴", async () => assert.strictEqual(await level("https://click.uz@yomon.top/"), "danger"));
test("shubhali domen oxiri (.xyz) bitta o'zi → 🟡 emas, ✅ (faqat 25 ball)", async () => {
  const r = combine(await checkUrls(extractUrls("https://mening-blogim.xyz")));
  assert.strictEqual(r.score, 25); assert.strictEqual(r.level, "safe");
});
test("qisqartirilgan havola rasmiy saytga olib borsa → ✅", async () => assert.strictEqual(await level("https://bit.ly/toza"), "safe"));
test("qisqartirilgan havola ochilmasa → 🟡", async () => assert.strictEqual(await level("https://bit.ly/nomalum"), "suspicious"));
test("havolasiz oddiy xabar — havola topilmaydi", () => {
  assert.deepStrictEqual(extractUrls("Assalomu alaykum, ertaga soat 10 da uchrashamiz"), []);
  assert.deepStrictEqual(extractUrls("Narxi 5.000 so'm, 10.30 da kelaman"), []);
});
test("Telegram yashirin havolasi (text_link) ham topiladi", () => {
  const u = extractUrls("Bu yerni bosing", [{ type: "text_link", offset: 0, length: 15, url: "https://paymee.uz/x" }]);
  assert.deepStrictEqual(u, ["https://paymee.uz/x"]);
});
test("oddiy saytlar xato signal bermaydi: google.com, kun.uz, wikipedia.org", async () => {
  for (const u of ["https://google.com", "https://kun.uz/news", "https://uz.wikipedia.org/wiki/Toshkent"]) assert.strictEqual(await level(u), "safe", u);
});

// ---- Yordamchi funksiyalar ----
test("levenshtein va o'xshash belgilar", () => {
  assert.strictEqual(levenshtein("paymee", "payme"), 1);
  assert.strictEqual(normalize("c1ick"), "click");
  assert.strictEqual(normalize("paym0"), "paymo");
});
test("xavf darajasi chegaralari", () => {
  assert.strictEqual(levelOf(29), "safe"); assert.strictEqual(levelOf(30), "suspicious");
  assert.strictEqual(levelOf(69), "suspicious"); assert.strictEqual(levelOf(70), "danger");
});
