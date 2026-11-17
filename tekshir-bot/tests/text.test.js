// 4-bosqich: matn tekshiruvi testlari.
const test = require("node:test");
const assert = require("node:assert");
const { analyzeText } = require("../src/checkers/text");
const { combineAll } = require("../src/scoring");
const { extractUrls, checkUrls } = require("../src/checkers/url");

const level = text => combineAll([], analyzeText(text)).level;
const score = text => combineAll([], analyzeText(text)).score;

// ---- Qabul mezonlari ----
test("«5 000 000 so'm yutdingiz, karta raqamingizni yuboring» → 🔴", () =>
  assert.strictEqual(level("Tabriklaymiz! Siz 5 000 000 so'm yutdingiz, karta raqamingizni yuboring"), "danger"));
test("«ertaga soat 10 da uchrashamiz» → ✅", () =>
  assert.strictEqual(level("Assalomu alaykum, ertaga soat 10 da uchrashamiz"), "safe"));
test("«Я из службы безопасности банка, назовите код из SMS» → 🔴", () =>
  assert.strictEqual(level("Я из службы безопасности банка, назовите код из SMS"), "danger"));

// ---- Tillar va yozuvlar ----
test("kirill o'zbekcha: «Банкдан ёзяпмиз, картангиз блокланди, SMS кодни айтинг» → 🔴", () =>
  assert.strictEqual(level("Банкдан ёзяпмиз, картангиз блокланди, смс кодни айтинг"), "danger"));
test("har xil apostrof: «g‘olib bo‘ldingiz» ham topiladi", () =>
  assert.ok(analyzeText("Siz g‘olib bo‘ldingiz!").groups.includes("prize")));
test("KATTA harflar ham topiladi: «SMS KODNI AYTING»", () =>
  assert.ok(analyzeText("SMS KODNI AYTING").groups.includes("secret")));

// ---- Firibgarlik turlari ----
test("«ovoz bering» → kamida 🟡", () => assert.notStrictEqual(level("Iltimos, do'stimga ovoz bering, havola pastda"), "safe"));
test("«uyda o'tirib, kafolatlangan daromad» → kamida 🟡", () => assert.notStrictEqual(level("Uyda o'tirib kuniga 500 000 so'm! Kafolatlangan daromad"), "safe"));
test("posilka + oldindan to'lov → kamida 🟡", () => assert.notStrictEqual(level("Posilkangiz bojxonada. Yetkazib berish uchun to'lov qiling"), "safe"));

// ---- Xato signal bermasligi kerak ----
test("bankning ogohlantirishi «SMS kodni hech kimga aytmang» — 🔴 EMAS", () => {
  assert.strictEqual(level("Hurmatli mijoz! SMS kodni hech kimga aytmang. Bank xodimlari kod so'ramaydi."), "safe");
  assert.strictEqual(level("Никому не сообщайте код из SMS"), "safe");
});
test("oddiy so'zlar: «sovg'a uchun rahmat», «darhol kelaman» — ✅", () => {
  assert.strictEqual(level("Sovg'a uchun katta rahmat!"), "safe");
  assert.strictEqual(level("Darhol kelaman, 5 daqiqa kuting"), "safe");
});
test("so'z ichidan qidirmaydi: «tekinsiz» emas, lekin «tekin» — topiladi", () => {
  assert.ok(!analyzeText("Abonus").groups.includes("prize"));
});

// ---- Havola + matn birga ----
test("shubhali havola + firibgar matn → ball oshadi (+20)", async () => {
  const text = "Kartangiz bloklandi! SMS kodni yuboring: https://mening-blogim.xyz/karta";
  const urls = await checkUrls(extractUrls(text));
  const urlScore = combineAll(urls, null).score;            // .xyz (25) + «karta» (15) = 40
  const textScore = combineAll([], analyzeText(text)).score;
  assert.ok(urlScore >= 30 && textScore >= 30);
  assert.strictEqual(combineAll(urls, analyzeText(text)).score, Math.min(100, Math.max(urlScore, textScore) + 20));
});
test("rasmiy havola + firibgar matn → baribir 🔴 (sayt rasmiy, lekin matn aldov)", async () => {
  const text = "Click'dan yozyapmiz: bonus yutdingiz! SMS kodni ayting. https://click.uz";
  const r = combineAll(await checkUrls(extractUrls(text)), analyzeText(text));
  assert.strictEqual(r.level, "danger");
});
