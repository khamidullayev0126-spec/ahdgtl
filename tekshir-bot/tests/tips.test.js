// Kunlik maslahatlar — takrorlanmaslik, vaqt, o'chirish, admin/AI qo'shish
const test = require("node:test");
const assert = require("node:assert");
const Database = require("better-sqlite3");
const { createTips, toCyr, tkDay } = require("../src/tips");

function setup() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users (telegram_id INTEGER PRIMARY KEY, lang TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, checks INTEGER NOT NULL DEFAULT 0)");
  const tips = createTips(db, { log: { error() {} } });
  const addUser = (id, lang, seen = 0) => db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, 0)").run(id, lang, seen, seen);
  const sent = [];
  const api = { sendMessage: async (id, text, opt) => { if (id === 666) throw Object.assign(new Error("Forbidden: bot was blocked by the user"), { description: "Forbidden: bot was blocked by the user" }); sent.push({ id, text, opt }); } };
  return { db, tips, addUser, api, sent };
}
// 2026-11-21 10:05 Toshkent = 05:05 UTC
const AT = (d, h = 10, m = 5) => Date.UTC(2026, 10, d, h - 5, m);

test("50 ta asosiy maslahat; har kuni bittadan, hech biri takrorlanmaydi", async () => {
  const { tips, addUser, api, sent } = setup();
  addUser(1, "uz-latn");
  const seen = new Set();
  for (let d = 1; d <= 55; d++) {
    const r = await tips.runDaily({ api, now: AT(d < 31 ? d : d - 30) + (d > 30 ? 30 * 86400000 : 0), pause: 0 });
    if (d <= 50) assert.strictEqual(r.sent, 1, "kun " + d);
  }
  for (const m of sent) { assert.ok(!seen.has(m.text), "takror!"); seen.add(m.text); }
  assert.strictEqual(sent.length, 50, "50 tadan keyin to'xtaydi (takrorlamaydi)");
});

test("soat 10:00 dan oldin yubormaydi; bir kunda faqat bir marta", async () => {
  const { tips, addUser, api, sent } = setup();
  addUser(1, "uz-latn");
  assert.strictEqual((await tips.runDaily({ api, now: AT(21, 9, 50), pause: 0 })).skipped, "early");
  await tips.runDaily({ api, now: AT(21, 10, 0), pause: 0 });
  await tips.runDaily({ api, now: AT(21, 18, 0), pause: 0 });
  assert.strictEqual(sent.length, 1);
  await tips.runDaily({ api, now: AT(22, 10, 1), pause: 0 });
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(tkDay(AT(21, 23, 59)), "2026-11-21");
});

test("tillar: ruscha, kirill; o'chirish tugmasi; bloklaganlar o'chiriladi; yangi foydalanuvchi ertaga", async () => {
  const { tips, addUser, api, sent } = setup();
  addUser(1, "ru"); addUser(2, "uz-cyrl"); addUser(3, null); addUser(666, "uz-latn"); addUser(4, "uz-latn", AT(21, 9, 30));
  const r = await tips.runDaily({ api, now: AT(21), pause: 0 });
  assert.strictEqual(r.sent, 3); assert.strictEqual(r.off, 1);
  assert.match(sent.find(m => m.id === 1).text, /Совет дня/);
  assert.match(sent.find(m => m.id === 2).text, /Кунлик маслаҳат/);
  assert.match(sent.find(m => m.id === 2).text, /SMS/, "SMS lotincha qoladi");
  assert.match(sent.find(m => m.id === 3).text, /Kunlik maslahat/);
  assert.strictEqual(sent[0].opt.reply_markup.inline_keyboard[0][0].callback_data, "tipsub:off");
  assert.strictEqual(tips.isEnabled(666), false);
  tips.setEnabled(1, false);
  sent.length = 0;
  await tips.runDaily({ api, now: AT(22), pause: 0 });
  assert.deepStrictEqual(sent.map(m => m.id).sort(), [2, 3, 4]);
});

test("admin qo'shadi; o'xshash maslahat rad etiladi", () => {
  const { tips } = setup();
  assert.strictEqual(tips.add({ uz_t: "SMS kodni hech kimga aytmang", uz_x: "Bank xodimi hech qachon SMS kodni so'ramaydi, uni aytmang." }).reason, "dup");
  const r = tips.add({ icon: "🎫", uz_t: "Soxta chipta saytlari", uz_x: "Konsert va poyezd chiptasini faqat rasmiy kassa yoki ilovadan oling." });
  assert.ok(r.ok); assert.strictEqual(tips.stats().active, 51);
  assert.strictEqual(tips.add({ uz_t: "ab", uz_x: "qisqa" }).reason, "len");
});

test("AI taklifi faqat admin tasdiqlagach yuboriladi", async () => {
  const { tips, addUser, api, sent } = setup();
  addUser(1, "uz-latn"); addUser(99, "uz-latn");
  const ai = { messages: { create: async () => ({ content: [{ text: 'Mana: {"icon":"🎫","cat":"firibgarlik","uz_t":"Soxta chipta saytlari","uz_x":"Konsert va poyezd chiptasini faqat rasmiy kassa yoki ilovadan oling.","ru_t":"Фальшивые сайты билетов","ru_x":"Покупайте билеты только в официальной кассе или приложении."}' }] }) } };
  await tips.runDaily({ api, admins: [99], ai, now: AT(21), pause: 0 });
  const adm = sent.find(m => m.id === 99 && /AI yangi maslahat/.test(m.text));
  assert.ok(adm, "adminga taklif keldi");
  assert.strictEqual(tips.stats().pending, 1); assert.strictEqual(tips.stats().active, 50);
  const id = adm.opt.reply_markup.inline_keyboard[0][0].callback_data.split(":")[1];
  assert.ok(tips.approve(id)); assert.strictEqual(tips.approve(id), null);
  assert.strictEqual(tips.stats().active, 51);
});

test("lotin → kirill", () => {
  assert.strictEqual(toCyr("O'zbekiston"), "Ўзбекистон");
  assert.strictEqual(toCyr("g'alaba shoshilmang"), "ғалаба шошилманг");
  assert.strictEqual(toCyr("click.uz"), "click.uz");
  assert.strictEqual(toCyr("eshik"), "эшик");
});
