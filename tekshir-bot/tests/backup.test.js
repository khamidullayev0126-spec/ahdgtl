// Baza zaxirasi (bepul server): Telegram kanalga yuborish va qayta tiklash. Telegram'ga ulanmaydi — soxta API.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { openDb } = require("../src/db");
const { restore, createBackup } = require("../src/backup");

// Soxta "kanal": pin qilingan xabar va undagi fayl xotirada turadi
function fakeChannel() {
  const files = new Map(); let pinned = null, nextId = 1, uploads = 0;
  const bytes = async f => { const raw = await f.toRaw(); if (raw instanceof Uint8Array) return Buffer.from(raw); const chunks = []; for await (const c of raw) chunks.push(Buffer.from(c)); return Buffer.concat(chunks); };
  const api = {
    getChat: async () => ({ id: -100, type: "channel", pinned_message: pinned }),
    sendDocument: async (chat, file) => { uploads++; const id = nextId++; const fid = "f" + id; files.set(fid, await bytes(file)); return { message_id: id, document: { file_id: fid } }; },
    pinChatMessage: async (chat, mid) => { pinned = { message_id: mid, document: { file_id: "f" + mid } }; return true; },
    editMessageMedia: async (chat, mid, media) => { uploads++; const fid = "f" + mid + "_" + nextId++; files.set(fid, await bytes(media.media)); pinned = { message_id: mid, document: { file_id: fid } }; return true; }
  };
  return { api, download: async id => files.get(id), uploads: () => uploads, pinnedId: () => pinned && pinned.message_id };
}
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tk-bk-")), "tekshir.db");

test("zaxira → server qayta ishga tushdi (disk bo'sh) → baza tiklandi", async () => {
  const ch = fakeChannel();
  const file1 = tmp();
  const db1 = openDb(file1);
  db1.setLang(42, "ru");
  db1.logCheck({ userId: 42, chatType: "private", result: { level: "danger", score: 80, hasUrl: true, hasFile: false, reasons: [] }, hasText: true });
  const bk = createBackup(ch.api, -100, db1);
  assert.strictEqual(await bk.run(), false, "yangi ochilganda hech narsa o'zgarmagan — yubormaydi");
  db1.setLang(7, "uz-cyrl");
  assert.strictEqual(await bk.run(), true);
  db1.close();

  const file2 = tmp();                                      // "yangi server" — bo'sh disk
  assert.strictEqual(await restore(ch.api, -100, file2, ch.download), true);
  const db2 = openDb(file2);
  assert.strictEqual(db2.getLang(42), "ru");
  assert.strictEqual(db2.getLang(7), "uz-cyrl");
  assert.strictEqual(db2.stats().checks, 1);
  db2.close();
});

test("kanal to'lib ketmaydi: bitta pin xabar yangilanadi; o'zgarish bo'lmasa yuborilmaydi", async () => {
  const ch = fakeChannel();
  const db = openDb(tmp());
  const bk = createBackup(ch.api, -100, db);
  db.setLang(1, "ru"); await bk.run();
  const first = ch.pinnedId();
  db.setLang(2, "ru"); await bk.run();
  assert.strictEqual(ch.pinnedId(), first, "yangi xabar emas — o'sha xabar yangilanadi");
  const n = ch.uploads();
  await bk.run();                                           // o'zgarish yo'q
  assert.strictEqual(ch.uploads(), n);
});

test("zaxira yo'q bo'lsa — false; buzilgan fayl bo'lsa — xato (eski nusxa ustidan yozilmasligi uchun)", async () => {
  const ch = fakeChannel();
  assert.strictEqual(await restore(ch.api, -100, tmp(), ch.download), false);
  const bad = { getChat: async () => ({ pinned_message: { message_id: 1, document: { file_id: "x" } } }) };
  await assert.rejects(restore(bad, -100, tmp(), async () => Buffer.from("bu baza emas".repeat(20))), /buzilgan/);
});
