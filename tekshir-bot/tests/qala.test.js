// «Parol qal'asi» o'yini — server testlari
const test = require("node:test");
const assert = require("node:assert");
const Database = require("better-sqlite3");
const { createQala, checkPassword, strength } = require("../src/qala");
const { createBot, startWebhook } = require("../src/bot");
const { openDb } = require("../src/db");
console.log = () => {};
process.env.HASH_SALT = "test-salt"; process.env.BOT_TOKEN = "123:TEST";

const fresh = () => createQala(new Database(":memory:"), { key: "k" });

test("username: format, band, katta-kichik harf farqsiz, takliflar", () => {
  const q = fresh();
  assert.strictEqual(q.nameFree("ab").ok, false);
  assert.strictEqual(q.nameFree("ali vali").ok, false);
  assert.strictEqual(q.nameFree("admin").reason, "taken");
  const j = q.join("Kamon_7");
  assert.ok(j.ok && j.token.length === 48);
  const again = q.join("kamon_7");
  assert.strictEqual(again.ok, false); assert.strictEqual(again.reason, "taken");
  assert.strictEqual(again.suggest.length, 3);
  assert.ok(again.suggest.every(s => q.nameFree(s).ok));
});

test("parol qoidalari va kuchi", () => {
  assert.strictEqual(checkPassword("ABC1234"), "short");
  assert.strictEqual(checkPassword("A".repeat(17)), "long");
  assert.strictEqual(checkPassword("abcdefgh"), "chars");
  assert.strictEqual(checkPassword("AAAABBBB"), "same");
  assert.strictEqual(checkPassword("QALA2026!"), null);
  assert.ok(strength("Q7#W2$ZX9!K") > strength("QALAQALA1"));
});

test("parol bazada shifrlangan, brauzerga hujum tugaguncha berilmaydi", () => {
  const db = new Database(":memory:"), q = createQala(db, { key: "k" });
  const a = q.join("ega_1"), b = q.join("hujumchi");
  const pa = q.auth(a.token), pb = q.auth(b.token);
  assert.strictEqual(q.setCastle(pa, "oltin@qala7").ok, true);        // kichik harf — katta qilinadi
  assert.strictEqual(q.setCastle(pa, "EGA_1XYZ9").reason, "name");      // parolda o'z ismi bo'lmasin
  const raw = JSON.stringify(db.prepare("SELECT * FROM qala_castles").all());
  assert.ok(!raw.includes("OLTIN"), "parol ochiq saqlanmasin");
  assert.ok(!JSON.stringify(db.prepare("SELECT * FROM qala_players").all()).includes(a.token), "token ochiq saqlanmasin");
  const s = q.startAttack(pb, "ega_1");
  assert.ok(s.ok); assert.strictEqual(s.len, 11); assert.strictEqual(s.password, undefined);
  assert.deepStrictEqual(s.slots, Array(11).fill(null));
  assert.strictEqual(q.startAttack(pa, "ega_1").reason, "self");
  assert.strictEqual(q.list(pb).length, 1); assert.strictEqual(q.list(pa).length, 0);
});

test("hujum: to'g'ri/xato, maslahatlar 3-6-9, g'alaba va ballar", () => {
  const q = fresh();
  const a = q.auth(q.join("ega_1").token), b = q.auth(q.join("hujumchi").token);
  q.setCastle(a, "OLTIN@QALA7");
  const s = q.startAttack(b, "ega_1");
  let r = q.guess(b, s.id, "A");
  assert.ok(r.hit); assert.deepStrictEqual(r.positions, [7, 9]); assert.strictEqual(r.password, undefined);
  assert.strictEqual(q.guess(b, s.id, "A").reason, "used");
  for (const ch of "ZXJ") r = q.guess(b, s.id, ch);
  assert.strictEqual(r.lives, 7); assert.strictEqual(r.hint.n, 1); assert.match(r.hint.text, /1 ta raqam/);
  // sahifa yangilansa — hujum davom etadi (yangisi ochilmaydi)
  const again = q.startAttack(b, "ega_1");
  assert.strictEqual(again.id, s.id); assert.strictEqual(again.lives, 7);
  for (const ch of "OLTIN@Q7") r = q.guess(b, s.id, ch);
  assert.strictEqual(r.state, "won"); assert.strictEqual(r.password, "OLTIN@QALA7");
  const me = q.me(b); assert.strictEqual(me.wins, 1); assert.strictEqual(me.atk_score, 50 + 7*10);
  assert.strictEqual(q.me(a).castle.falls, 1);
  assert.strictEqual(q.list(b)[0].my, "won");
  assert.strictEqual(q.guess(b, s.id, "1").reason, "over");
});

test("mag'lubiyat: himoyachi ball oladi; 9-jonda sehrli o'q belgi ochadi", () => {
  const q = fresh();
  const a = q.auth(q.join("ega_1").token), b = q.auth(q.join("hujumchi").token);
  q.setCastle(a, "OLTIN@QALA7");
  const s = q.startAttack(b, "ega_1");
  let r, reveals = 0;
  for (const ch of "BCDEFGHJK") { r = q.guess(b, s.id, ch); if (r.hint && r.hint.reveal) reveals++; }
  assert.strictEqual(reveals, 1); assert.strictEqual(r.lives, 1);
  r = q.guess(b, s.id, "M");
  assert.strictEqual(r.state, "lost"); assert.strictEqual(r.password, "OLTIN@QALA7");
  assert.ok(q.me(a).def_score > 30); assert.strictEqual(q.me(a).castle.holds, 1);
});

test("bonuslar: har biri ko'pi bilan 2 marta; yangi parol eski hujumni bekor qiladi", () => {
  const q = fresh();
  const a = q.auth(q.join("ega_1").token), b = q.auth(q.join("hujumchi").token);
  q.setCastle(a, "Q7#W2$ZX9!KMN");
  const s = q.startAttack(b, "ega_1");
  q.guess(b, s.id, "A");
  assert.strictEqual(q.power(b, s.id, "heart").lives, 10);
  assert.ok(q.power(b, s.id, "lupa").reveal.ch);
  q.power(b, s.id, "lupa");
  assert.strictEqual(q.power(b, s.id, "lupa").reason, "limit");
  assert.strictEqual(q.power(b, s.id, "bomb").reason, "kind");
  q.setCastle(a, "YANGI#PAROL5");
  assert.strictEqual(q.guess(b, s.id, "Y").reason, "no_attack");
  assert.notStrictEqual(q.startAttack(b, "ega_1").id, s.id);
});

test("HTTP: /qala sahifasi, API token talab qiladi, begona sayt bloklanadi", async () => {
  const db = openDb(":memory:");
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "t_bot" } }, { db });
  bot.api.config.use(async () => ({ ok: true, result: true }));
  const server = startWebhook(bot, db, "https://example.test", 0);
  await new Promise(r => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (a, body, headers = {}) => fetch(`${base}/api/qala/${a}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  try {
    const page = await fetch(base + "/qala");
    assert.strictEqual(page.status, 200); assert.match(await page.text(), /Parol qal'asi/);
    assert.strictEqual((await post("me", {})).status, 401);
    assert.strictEqual((await post("name", { name: "x" }, { origin: "https://evil.example" })).status, 403);
    const j = await (await post("join", { name: "test_ok" })).json();
    assert.ok(j.ok);
    const c = await (await post("castle", { token: j.token, password: "QALA2026!" })).json();
    assert.ok(c.ok && c.strength > 0);
    const me = await (await post("me", { token: j.token })).json();
    assert.strictEqual(me.castle.len, 9);
    assert.strictEqual((await post("nope", {})).status, 404);
    const man = await fetch(base + "/qala/manifest.webmanifest");
    assert.strictEqual(man.status, 200); assert.strictEqual((await man.json()).start_url, "/qala");
    assert.match(await (await fetch(base + "/qala/icon.svg")).text(), /<svg/);
    assert.strictEqual((await fetch(base + "/qala/../src/qala.js")).status, 404);
  } finally { server.close(); }
});

// ---------- 3-bosqich ----------
function battle(q, owner, attacker, win) {
  const s = q.startAttack(attacker, owner.name);
  const pw = "OLTIN@QALA7";
  if (win) for (const ch of new Set(pw)) q.guess(attacker, s.id, ch);
  else for (const ch of "BCDEFGHJKM") q.guess(attacker, s.id, ch);
}
test("reyting: umumiy/hujum/himoya, o'z o'rnim; 0 ballilar ko'rinmaydi", () => {
  const q = fresh();
  const A = q.auth(q.join("ega_1").token), B = q.auth(q.join("hujumchi").token), C = q.auth(q.join("yangi_c").token);
  q.setCastle(A, "OLTIN@QALA7");
  battle(q, A, B, true);
  const t = q.top(B, "atk");
  assert.strictEqual(t.top[0].name, "hujumchi"); assert.strictEqual(t.me.rank, 1);
  assert.strictEqual(q.top(C).me.rank, null, "0 ball — o'rin yo'q");
  assert.ok(!q.top(C).top.some(r => r.name === "yangi_c"));
  q.setCastle(A, "OLTIN@QALA7");                       // yangi qal'a
  battle(q, A, C, false);                              // C yutqazdi — A himoya balli oladi
  const d = q.top(A, "def");
  assert.strictEqual(d.top[0].name, "ega_1"); assert.strictEqual(d.me.rank, 1);
  assert.strictEqual(q.top(A, "nonsense").kind, "total");
});

test("bildirishnomalar: qal'a egasiga keladi, o'qilgach unread 0", () => {
  const q = fresh();
  const A = q.auth(q.join("ega_1").token), B = q.auth(q.join("hujumchi").token);
  q.setCastle(A, "OLTIN@QALA7");
  battle(q, A, B, false);
  assert.strictEqual(q.me(A).unread, 1);
  const ev = q.events(A);
  assert.strictEqual(ev[0].kind, "held"); assert.strictEqual(ev[0].actor, "hujumchi"); assert.ok(ev[0].points > 0);
  assert.strictEqual(q.me(A).unread, 0);
  assert.strictEqual(q.me(B).unread, 0);
});

test("tiklash kodi: yangi qurilmada kirish, eski kod/token bekor, noto'g'ri kod rad etiladi", () => {
  const q = fresh();
  const j = q.join("ega_1"), A = q.auth(j.token);
  assert.strictEqual(q.recover("ega_1", "AAAA-BBBB-CCCC").reason, "recover");     // kod hali yo'q
  const r1 = q.newRecovery(A);
  assert.match(r1.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.strictEqual(q.me(A).has_recovery, true);
  const r2 = q.newRecovery(A);
  assert.strictEqual(q.recover("ega_1", r1.code).ok, false, "eski kod ishlamasin");
  const ok = q.recover("EGA_1", r2.code.toLowerCase().replace(/-/g, " "));      // katta-kichik, bo'sh joy — farqi yo'q
  assert.ok(ok.ok); assert.strictEqual(ok.name, "ega_1");
  assert.strictEqual(q.auth(j.token), null, "eski qurilma chiqariladi");
  assert.ok(q.auth(ok.token));
  assert.strictEqual(q.recover("nobody", r2.code).reason, "recover");
});
