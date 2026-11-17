// QABUL TESTLARI (10-bosqich): bot to'liq ishlashini foydalanuvchi ko'zi bilan tekshiradi.
// Har bir test — real vaziyat: "odam X yubordi → bot Y javob berishi kerak". Internetsiz.
const test = require("node:test");
const assert = require("node:assert");
const { createBot } = require("../src/bot");
const { openDb } = require("../src/db");
const { dict, LANGS } = require("../src/i18n");
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
process.env.HASH_SALT = "test-salt";
process.env.ADMIN_IDS = "";

const botInfo = { id: 1, is_bot: true, first_name: "T", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
function setup(lang = "uz-latn") {
  const db = openDb(":memory:");
  if (lang) db.setLang(1, lang);
  const calls = [];
  const bot = createBot("123:TEST", { botInfo }, { db, download: async () => Buffer.from("fake") });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }; });
  const say = async (text, extra = {}) => { await bot.handleUpdate({ update_id: Math.random() * 1e9 | 0, message: { message_id: 1, date: 0, chat: { id: 1, type: "private" }, from: { id: 1, is_bot: false, first_name: "U" }, text, ...(text && text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}), ...extra } }); };
  const click = async data => bot.handleUpdate({ update_id: Math.random() * 1e9 | 0, callback_query: { id: "c", from: { id: 1, is_bot: false, first_name: "U" }, chat_instance: "1", data, message: { message_id: 9, date: 0, chat: { id: 1, type: "private" }, text: "." } } });
  const last = () => calls.filter(c => c.method === "sendMessage").pop()?.payload;
  const all = () => calls.filter(c => c.method === "sendMessage").map(c => c.payload.text);
  return { db, bot, calls, say, click, last, all };
}

test("Q1. Soxta bank SMS → 🔴 XAVFLI, sabab va maslahat bilan, 5 soniyadan tez", async () => {
  const { say, last } = setup();
  const t0 = Date.now();
  await say("Hurmatli mijoz! Kartangiz bloklandi. SMS kodni yuboring, aks holda pulingiz yo'qoladi");
  assert.ok(Date.now() - t0 < 5000);
  const a = last().text;
  assert.match(a, /🔴 XAVFLI/);
  assert.match(a, /Nima uchun:/);
  assert.match(a, /SMS kod/);
});

test("Q2. Rasmiy sayt havolasi → ✅ va rasmiy sayt deb aytiladi", async () => {
  const { say, last } = setup();
  await say("https://click.uz");
  assert.match(last().text, /Xavf topilmadi/);
  assert.match(last().text, /rasmiy sayti/);
});

test("Q3. Soxta Click havolasi → 🔴 va haqiqiy manzil ko'rsatiladi, havola bosiladigan bo'lmaydi", async () => {
  const { say, last } = setup();
  await say("https://c1ick-uz.com/bonus");
  const p = last();
  assert.match(p.text, /XAVFLI/);
  assert.match(p.text, /<code>click\.uz<\/code>/);
  assert.strictEqual(p.link_preview_options.is_disabled, true);
});

test("Q4. APK fayl → 🔴 «faylni o'rnatmang»", async () => {
  const { say, last } = setup();
  await say(undefined, { document: { file_id: "f", file_unique_id: "u", file_name: "Rasmlar.apk", mime_type: "application/vnd.android.package-archive", file_size: 195 } });
  assert.match(last().text, /XAVFLI/);
  assert.match(last().text, /o'rnatmang/);
});

test("Q5. Oddiy xabar → ✅, lekin «100% kafolat yo'q» eslatmasi bilan", async () => {
  const { say, last } = setup();
  await say("Ertaga soat 10 da darsga kelasanmi?");
  assert.match(last().text, /Xavf topilmadi/);
  assert.match(last().text, /100% kafolat/);
});

test("Q6. Raqam → shikoyatlar SONI, «firibgar» so'zi ishlatilmaydi", async () => {
  const { say, click, last } = setup();
  await say("8600 1234 5678 9012");
  const id = last().reply_markup.inline_keyboard.flat().find(b => (b.callback_data || "").startsWith("rep:")).callback_data.slice(4);
  await click("repy:" + id);
  await say("8600 1234 5678 9012");
  assert.match(last().text, /1 ta shikoyat/);
  assert.ok(!/firibgar/i.test(last().text.split("📞")[1]));
});

test("Q7. MAXFIYLIK: hech qaysi jadvalda xabar matni, karta yoki telefon yo'q", async () => {
  const { db, say } = setup();
  await say("Maxfiy-gap-777: kartam 9860 5555 6666 7777, tel +998 93 111 22 33, https://sirli-sayt.xyz/a?token=QWERTY");
  const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  const dump = tables.map(tb => JSON.stringify(db.raw.prepare(`SELECT * FROM "${tb}"`).all())).join("");
  for (const bad of ["Maxfiy-gap", "9860", "7777", "111 22 33", "QWERTY", "/a?"]) assert.ok(!dump.includes(bad), `bazada "${bad}" topildi`);
});

test("Q8. So'rovlar chegarasi: 10 tadan keyin bir marta ogohlantiradi, keyin jim", async () => {
  const { say, all } = setup();
  for (let i = 0; i < 13; i++) await say("Salom " + i);
  const texts = all();
  assert.strictEqual(texts.filter(x => /Juda tez/.test(x)).length, 1);
  assert.strictEqual(texts.length, 11);                // 10 ta javob + 1 ogohlantirish
});

test("Q9. /demo: 3 ta namuna, har biri 🔴, statistikaga yozilmaydi", async () => {
  const { db, say, click, all } = setup();
  await say("/demo");
  assert.match(all()[0], /Namunalar/);
  for (const k of ["sms", "link", "file"]) await click("demo:" + k);
  const results = all().filter(x => /XAVFLI|SHUBHALI/.test(x));
  assert.strictEqual(results.length, 3);
  assert.ok(results.every(x => /XAVFLI/.test(x)), "hamma namunalar 🔴 bo'lishi kerak");
  assert.strictEqual(db.stats().checks, 0);
});

test("Q10. /maslahat: maslahat va «yana bir» tugmasi; barcha tillarda maslahatlar soni bir xil", async () => {
  const { say, last } = setup();
  await say("/maslahat");
  assert.match(last().text, /💡 \d+\/\d+/);
  assert.match(last().reply_markup.inline_keyboard[0][0].callback_data, /^tip:\d+$/);
  const n = dict["uz-latn"].tips.length;
  for (const l of LANGS) assert.strictEqual(dict[l].tips.length, n);
});

test("Q11. Rus tilini tanlagan odamga javob rus tilida", async () => {
  const { say, last } = setup("ru");
  await say("Срочно! Ваша карта заблокирована, сообщите SMS-код");
  assert.match(last().text, /ОПАСНО|ПОДОЗРИТЕЛЬНО/);
});

test("Q12. Til tanlanmagan yangi foydalanuvchi — avval til so'raladi", async () => {
  const { say, last } = setup(null);
  await say("https://c1ick-uz.com");
  assert.ok(last().reply_markup.inline_keyboard.flat().some(b => b.callback_data === "lang:ru"));
});
