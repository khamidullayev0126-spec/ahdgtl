// 8-bosqich testlari: guruh rejimi. Internetsiz.
const test = require("node:test");
const assert = require("node:assert");
const { openDb } = require("../src/db");
const { createBot } = require("../src/bot");
delete process.env.VIRUSTOTAL_KEY; delete process.env.SAFE_BROWSING_KEY;
process.env.HASH_SALT = "test-salt";

const GID = -100123;
const botInfo = { id: 1, is_bot: true, first_name: "T", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
// admins — guruh adminlarining ID'lari (getChatMember soxtasi uchun)
function fakeBot(db, admins = [10]) {
  const calls = [];
  const bot = createBot("123:TEST", { botInfo }, { db });
  bot.api.config.use(async (prev, method, payload) => {
    calls.push({ method, payload });
    if (method === "getChatMember") return { ok: true, result: { status: admins.includes(payload.user_id) ? "administrator" : "member", user: { id: payload.user_id } } };
    return { ok: true, result: method === "sendMessage" ? { message_id: 99, date: 0, chat: { id: GID, type: "supergroup" } } : true };
  });
  return { bot, calls };
}
let uid = 1;
const chat = { id: GID, type: "supergroup", title: "Mahalla" };
const gmsg = (from, text, extra = {}) => ({ update_id: uid++, message: { message_id: uid, date: 0, chat, from: { id: from, is_bot: false, first_name: "Ali" }, text,
  ...(text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}), ...extra } });
const gclick = (from, data) => ({ update_id: uid++, callback_query: { id: "cb" + uid, from: { id: from, is_bot: false, first_name: "A" }, chat_instance: "1", data, message: { message_id: 99, date: 0, chat, text: "..." } } });
const added = { update_id: 0, my_chat_member: { chat, from: { id: 10, is_bot: false, first_name: "Admin" }, date: 0,
  old_chat_member: { status: "left", user: { id: 1, is_bot: true, first_name: "T" } }, new_chat_member: { status: "member", user: { id: 1, is_bot: true, first_name: "T" } } } };
const sent = calls => calls.filter(c => c.method === "sendMessage");

test("bot guruhga qo'shilganda salomlashadi va guruh bazaga yoziladi", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate({ ...added, update_id: uid++ });
  assert.match(sent(calls)[0].payload.text, /admini/);
  assert.strictEqual(db.getGroup(GID).enabled, 1);
});

test("guruhda xavfsiz xabarga bot JIM turadi", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "Ertaga majlis soat 18:00 da, hamma kelsin"));
  await bot.handleUpdate(gmsg(5, "https://kun.uz/news"));
  assert.strictEqual(sent(calls).length, 0);
  assert.strictEqual(db.getGroup(GID).checks, 2);
});

test("guruhda xavfli havola — qisqa ogohlantirish, javob sifatida, shikoyat tugmasi bilan", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "Tabriklaymiz! Yutuq oling: https://c1ick-uz.com/bonus"));
  const ans = sent(calls)[0].payload;
  assert.match(ans.text, /XAVFLI/);
  assert.ok(ans.reply_parameters, "xabarga javob qilib yoziladi");
  assert.ok(ans.text.split("\n").length < 10, "guruhda qisqa bo'lishi kerak");
  const btns = ans.reply_markup.inline_keyboard.flat();
  assert.ok(btns.some(b => (b.callback_data || "").startsWith("rep:")));
  assert.strictEqual(db.getGroup(GID).warnings, 1);
});

test("guruhda istalgan a'zo shikoyat qila oladi, har biri bir marta", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "Pulni 8600 1234 5678 9012 ga tashlang, SMS kodni ham yuboring"));
  const id = sent(calls)[0].payload.reply_markup.inline_keyboard.flat().find(b => (b.callback_data || "").startsWith("rep:")).callback_data.slice(4);
  await bot.handleUpdate(gclick(6, "repy:" + id));
  await bot.handleUpdate(gclick(7, "repy:" + id));
  await bot.handleUpdate(gclick(7, "repy:" + id));
  assert.strictEqual(db.reportCount(db.hash("8600123456789012")), 2);
});

test("/tekshir — javob qilingan xabarni tekshiradi va ✅ bo'lsa ham javob beradi", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "/tekshir", { reply_to_message: { message_id: 3, date: 0, chat, from: { id: 8, is_bot: false, first_name: "B" }, text: "Salom, qalaysiz?" } }));
  assert.match(sent(calls)[0].payload.text, /Xavf topilmadi/);
  await bot.handleUpdate(gmsg(5, "/tekshir"));                           // reply'siz
  assert.match(sent(calls)[1].payload.text, /javob \(reply\)/);
});

test("/sozlama: oddiy a'zoga ruxsat yo'q, admin rejimni o'zgartira oladi", async () => {
  const db = openDb(":memory:");
  const { bot, calls } = fakeBot(db, [10]);
  await bot.handleUpdate(gmsg(5, "/sozlama"));
  assert.match(sent(calls)[0].payload.text, /faqat guruh adminlari/);
  await bot.handleUpdate(gmsg(10, "/sozlama"));
  assert.match(sent(calls)[1].payload.text, /Guruh sozlamalari/);
  await bot.handleUpdate(gclick(5, "gs:enabled:0"));                     // a'zo — o'zgarmaydi
  assert.strictEqual(db.getGroup(GID).enabled, 1);
  await bot.handleUpdate(gclick(10, "gs:mode:danger"));
  await bot.handleUpdate(gclick(10, "gs:lang:ru"));
  const g = db.getGroup(GID);
  assert.strictEqual(g.mode, "danger");
  assert.strictEqual(g.lang, "ru");
  await bot.handleUpdate(gclick(10, "gs:mode:hack'; DROP TABLE groups;--"));   // noto'g'ri qiymat
  assert.strictEqual(db.getGroup(GID).mode, "danger");
});

test("rejim 'faqat 🔴': shubhali xabarga jim, xavfliga ogohlantiradi (tanlangan tilda)", async () => {
  const db = openDb(":memory:");
  db.addGroup(GID, "Mahalla"); db.setGroup(GID, "mode", "danger"); db.setGroup(GID, "lang", "ru");
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "Shoshiling! Bugun oxirgi kun"));      // faqat shoshiltirish — 🟡 yoki ✅
  assert.strictEqual(sent(calls).length, 0);
  await bot.handleUpdate(gmsg(5, "Bank xodimi: SMS kodni ayting, kartangiz bloklandi"));
  assert.match(sent(calls)[0].payload.text, /ОПАСНО/);
});

test("🔴 xabarni o'chirish yoqilgan bo'lsa — o'chiradi va kim yuborganini aytadi", async () => {
  const db = openDb(":memory:");
  db.addGroup(GID, "Mahalla"); db.setGroup(GID, "delete_danger", 1);
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "Bank xodimi: SMS kodni ayting, kartangiz bloklandi"));
  assert.ok(calls.some(c => c.method === "deleteMessage"));
  const ans = sent(calls)[0].payload;
  assert.match(ans.text, /Ali yuborgan xavfli xabar o'chirildi/);
  assert.ok(!ans.reply_parameters, "o'chirilgan xabarga javob qilib bo'lmaydi");
});

test("to'xtatilgan guruhda bot hech narsa qilmaydi; botlar xabari tekshirilmaydi", async () => {
  const db = openDb(":memory:");
  db.addGroup(GID, "Mahalla"); db.setGroup(GID, "enabled", 0);
  const { bot, calls } = fakeBot(db);
  await bot.handleUpdate(gmsg(5, "SMS kodni ayting https://c1ick-uz.com"));
  assert.strictEqual(sent(calls).length, 0);
  db.setGroup(GID, "enabled", 1);
  const m = gmsg(5, "SMS kodni ayting https://c1ick-uz.com"); m.message.from.is_bot = true;
  await bot.handleUpdate(m);
  assert.strictEqual(sent(calls).length, 0);
});

test("/stats guruhda ishlamaydi (statistika begonalarga ko'rinmasin)", async () => {
  process.env.ADMIN_IDS = "10";
  const { bot, calls } = fakeBot(openDb(":memory:"));
  await bot.handleUpdate(gmsg(10, "/stats"));
  assert.strictEqual(sent(calls).length, 0);
});

test("eski bazaga yangi ustunlar qo'shiladi (ma'lumot yo'qolmaydi)", () => {
  const Database = require("better-sqlite3");
  const path = require("path"), os = require("os"), fs = require("fs");
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tk-")), "old.db");
  const old = new Database(file);
  old.exec("CREATE TABLE groups (chat_id INTEGER PRIMARY KEY, title TEXT, lang TEXT, enabled INTEGER NOT NULL DEFAULT 1, added_at INTEGER NOT NULL); INSERT INTO groups VALUES (-1, 'Eski', 'ru', 1, 0);");
  old.close();
  const db = openDb(file);
  const g = db.getGroup(-1);
  assert.strictEqual(g.title, "Eski");
  assert.strictEqual(g.mode, "suspicious");
  db.close();
});
