// 5-bosqich: fayl tekshiruvi testlari (internetsiz).
const test = require("node:test");
const assert = require("node:assert");
const { analyzeFileName, checkFile, sha256 } = require("../src/checkers/file");
const ext = require("../src/checkers/external");
const cache = require("../src/cache");
const { combineAll } = require("../src/scoring");
const { createBot } = require("../src/bot");
// Testlar haqiqiy AI'ga murojaat qilmasin (pul sarflanmasin) — .env da kalit bo'lsa ham
delete process.env.AI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
const { openDb } = require("../src/db");
// 6-bosqich: til endi bazada. Testlar uchun xotiradagi baza va eski "userLang" ko'rinishidagi yordamchi
const testDb = openDb(":memory:");
const userLang = { clear: () => testDb.raw.exec("DELETE FROM users"), set: (id, l) => testDb.setLang(id, l), get: id => testDb.getLang(id) };


const levelOf = async (meta, buf) => combineAll([], null, await checkFile(meta, buf ? async () => buf : null)).level;
// Soxta VirusTotal: "virus" degan matnli fayl — 12 ta antivirus xavfli deydi
const VIRUS = Buffer.from("virus"), CLEAN = Buffer.from("oddiy pdf");
let vtCalls = [];
test.beforeEach(() => {
  cache.clear(); ext._vtCalls.length = 0; vtCalls = []; process.env.VIRUSTOTAL_KEY = "test";
  ext.setFetch(async u => {
    vtCalls.push(u);
    const sha = u.split("/files/")[1];
    if (sha === sha256(VIRUS)) return { ok: true, status: 200, json: async () => ({ data: { attributes: { last_analysis_stats: { malicious: 12, suspicious: 0 } } } }) };
    if (sha === sha256(CLEAN)) return { ok: true, status: 200, json: async () => ({ data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } } }) };
    return { ok: false, status: 404 };
  });
});

// ---- Qabul mezonlari ----
test("Rasmlar.apk → 🔴 (faylni ochmasdan ham)", async () => assert.strictEqual(await levelOf({ name: "Rasmlar.apk", size: 3e6 }), "danger"));
test("hujjat.pdf, VirusTotal'da toza → ✅", async () => assert.strictEqual(await levelOf({ name: "hujjat.pdf", mime: "application/pdf", size: 9 }, CLEAN), "safe"));

// ---- Qo'shimcha ----
test("ikki kengaytma: rasm.jpg.apk → 🔴 va 'aldamchi nom' sababi", () => {
  const r = analyzeFileName("rasm.jpg.apk");
  assert.ok(r.some(x => x.code === "file_double"));
});
test(".exe, .scr, .bat → 🔴", async () => {
  for (const n of ["dastur.exe", "foto.scr", "ishga.bat"]) assert.strictEqual(await levelOf({ name: n, size: 100 }), "danger", n);
});
test("APK nomi yashirilgan (turi APK, nomi .pdf) → 🔴", async () =>
  assert.strictEqual(await levelOf({ name: "Hujjat.pdf", mime: "application/vnd.android.package-archive", size: 100 }), "danger"));
test("oddiy nomli, lekin VirusTotal'da virusli fayl → 🔴", async () =>
  assert.strictEqual(await levelOf({ name: "kitob.pdf", size: 5 }, VIRUS), "danger"));
test("arxiv (.zip) o'zi → ✅ (faqat 15 ball), makrosli hujjat (.docm) → 🟡", async () => {
  assert.strictEqual(await levelOf({ name: "fayllar.zip", size: 10 }), "safe");
  assert.strictEqual(await levelOf({ name: "shartnoma.docm", size: 10 }), "suspicious");
});
test("20 MB dan katta fayl yuklanmaydi — faqat nomiga qarab baho", async () => {
  let downloaded = false;
  const r = await checkFile({ name: "kino.mp4", size: 50 * 1024 * 1024 }, async () => { downloaded = true; return CLEAN; });
  assert.strictEqual(downloaded, false);
  assert.ok(r.reasons.some(x => x.code === "file_big"));
});
test("VirusTotal'ga faylning o'zi emas, faqat SHA-256 yuboriladi", async () => {
  await checkFile({ name: "hujjat.pdf", size: 9 }, async () => CLEAN);
  assert.strictEqual(vtCalls.length, 1);
  assert.ok(vtCalls[0].endsWith("/files/" + sha256(CLEAN)));
});
test("yuklab bo'lmasa ham bot javob beradi (nomiga qarab)", async () => {
  const r = await checkFile({ name: "Rasmlar.apk", size: 100 }, async () => { throw new Error("tarmoq yo'q"); });
  assert.strictEqual(combineAll([], null, r).level, "danger");
});

// ---- Bot orqali ----
test("bot: APK fayl yuborilsa → 🔴 va 'faylni o'rnatmang' maslahati", async () => {
  userLang.clear(); userLang.set(777, "uz-latn");
  const calls = [];
  const bot = createBot("123:TEST", { botInfo: { id: 1, is_bot: true, first_name: "T", username: "tekshir_test_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false } }, { download: async () => VIRUS, db: testDb });
  bot.api.config.use(async (prev, method, payload) => { calls.push({ method, payload }); return { ok: true, result: { message_id: 1, date: 0, chat: { id: 777, type: "private" } } }; });
  await bot.handleUpdate({ update_id: 1, message: { message_id: 9, date: 0, chat: { id: 777, type: "private" }, from: { id: 777, is_bot: false, first_name: "T" }, document: { file_id: "F1", file_unique_id: "U1", file_name: "Rasmlar.apk", mime_type: "application/vnd.android.package-archive", file_size: 2048 } } });
  const ans = calls.find(c => c.method === "sendMessage").payload.text;
  assert.match(ans, /XAVFLI/); assert.match(ans, /o'rnatmang/); assert.match(ans, /Android ilova/);
});
