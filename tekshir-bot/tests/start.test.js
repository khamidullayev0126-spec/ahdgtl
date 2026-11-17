// 1-bosqich testlari. Internetga ulanmaydi: Telegram'ga ketadigan so'rovlarni "ushlab" olamiz.
// Ishga tushirish: npm test

const test = require("node:test");
const assert = require("node:assert");
const { createBot, userLang } = require("../src/bot");
const { dict, LANGS } = require("../src/i18n");

// Soxta bot: botInfo beramiz (aks holda grammY Telegram'dan so'raydi) va har bir API so'rovini yozib olamiz
function fakeBot() {
  const calls = [];
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "Tekshir", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false } });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: method === "sendMessage" ? { message_id: 1, date: 0, chat: { id: payload.chat_id, type: "private" } } : true }; });
  return { bot, calls };
}
const user = { id: 777, is_bot: false, first_name: "Test" };
let uid = 1;
const msg = text => ({ update_id: uid++, message: { message_id: uid, date: 0, chat: { id: 777, type: "private" }, from: user, text, ...(text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}) } });
const click = data => ({ update_id: uid++, callback_query: { id: "cb" + uid, from: user, chat_instance: "1", data, message: { message_id: 5, date: 0, chat: { id: 777, type: "private" }, text: "..." } } });

test("har bir tilda bir xil kalitlar bor (tarjima unutilmagan)", () => {
  const keys = Object.keys(dict["uz-latn"]).sort();
  for (const l of LANGS) assert.deepStrictEqual(Object.keys(dict[l]).sort(), keys, `${l} tilida kalitlar farq qiladi`);
});

test("/start: til tanlanmagan bo'lsa — 3 ta til tugmasi chiqadi", async () => {
  userLang.clear();
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(msg("/start"));
  const send = calls.find(c => c.method === "sendMessage");
  const buttons = send.payload.reply_markup.inline_keyboard.flat().map(b => b.callback_data);
  assert.deepStrictEqual(buttons, ["lang:uz-latn", "lang:uz-cyrl", "lang:ru"]);
});

test("til tugmasi bosilganda: til saqlanadi va salomlashuv shu tilda yuboriladi", async () => {
  userLang.clear();
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(click("lang:ru"));
  assert.strictEqual(userLang.get(777), "ru");
  const welcome = calls.filter(c => c.method === "sendMessage").pop();
  assert.match(welcome.payload.text, /Здравствуйте/);
  assert.ok(calls.some(c => c.method === "answerCallbackQuery"));
});

test("noto'g'ri til qiymati qabul qilinmaydi", async () => {
  userLang.clear();
  const { bot } = fakeBot();
  await bot.handleUpdate(click("lang:xx"));
  assert.strictEqual(userLang.get(777), undefined);
});

test("til tanlangandan keyin /start darhol salomlashadi (kirillda)", async () => {
  userLang.clear(); userLang.set(777, "uz-cyrl");
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(msg("/start"));
  assert.match(calls.find(c => c.method === "sendMessage").payload.text, /Ассалому алайкум/);
});

test("havola yuborilsa — bot tekshirib, natija va tugmalar bilan javob beradi", async () => {
  userLang.clear(); userLang.set(777, "uz-latn");
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(msg("https://c1ick-uz.com/bonus"));
  const ans = calls.find(c => c.method === "sendMessage").payload;
  assert.match(ans.text, /XAVFLI/);
  assert.match(ans.text, /<code>click\.uz<\/code>/);                 // rasmiy sayt manzili ko'rsatiladi
  const btns = ans.reply_markup.inline_keyboard.flat();
  assert.ok(btns.some(b => b.callback_data === "report"));
  assert.ok(btns.some(b => (b.url || "").startsWith("https://t.me/share/url")));
});

test("oddiy xabar — ✅ xavf topilmadi (shikoyat tugmasisiz)", async () => {
  userLang.clear(); userLang.set(777, "uz-latn");
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(msg("Assalomu alaykum, ertaga soat 10 da uchrashamiz"));
  const ans = calls.find(c => c.method === "sendMessage").payload;
  assert.match(ans.text, /Xavf topilmadi/);
  assert.ok(!ans.reply_markup.inline_keyboard.flat().some(b => b.callback_data === "report"));
});

test("firibgar matn — 🔴, maslahatda 'havolani ochmang' YO'Q (havola yo'q), 'pul o'tkazmang' BOR", async () => {
  userLang.clear(); userLang.set(777, "uz-latn");
  const { bot, calls } = fakeBot();
  await bot.handleUpdate(msg("Tabriklaymiz! Siz 5 000 000 so'm yutdingiz, karta raqamingizni yuboring"));
  const t = calls.find(c => c.method === "sendMessage").payload.text;
  assert.match(t, /XAVFLI/); assert.doesNotMatch(t, /Havolani ochmang/); assert.match(t, /pul o'tkazmang/);
});
