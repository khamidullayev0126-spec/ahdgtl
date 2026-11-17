// 3-bosqich: Safe Browsing va VirusTotal testlari (soxta internet bilan — haqiqiy kalit kerak emas).
const test = require("node:test");
const assert = require("node:assert");
const ext = require("../src/checkers/external");
const url = require("../src/checkers/url");
const cache = require("../src/cache");
const { combine } = require("../src/scoring");

// Soxta javoblar: Google "fishing" deydi; VirusTotal domenlar bo'yicha har xil son qaytaradi
let calls = [];
function fakeInternet({ gsbDown = false, vtDown = false } = {}) {
  calls = [];
  ext.setFetch(async (u, opt = {}) => {
    calls.push(u);
    if (u.startsWith("https://safebrowsing")) {
      if (gsbDown) throw new Error("timeout");
      const asked = JSON.parse(opt.body).threatInfo.threatEntries[0].url;
      const bad = asked.includes("fishing-sayt.com");
      return { ok: true, status: 200, json: async () => (bad ? { matches: [{ threatType: "SOCIAL_ENGINEERING" }] } : {}) };
    }
    if (u.startsWith("https://www.virustotal.com")) {
      if (vtDown) return { ok: false, status: 500 };
      const domain = decodeURIComponent(u.split("/domains/")[1]);
      const stats = { "virusli.net": { malicious: 7, suspicious: 1 }, "biroz.net": { malicious: 1, suspicious: 0 } }[domain] || { malicious: 0, suspicious: 0 };
      return { ok: true, status: 200, json: async () => ({ data: { attributes: { last_analysis_stats: stats } } }) };
    }
    throw new Error("kutilmagan so'rov " + u);
  });
}
const run = async text => combine(await url.checkUrls(url.extractUrls(text)));
test.beforeEach(() => { cache.clear(); ext._vtCalls.length = 0; process.env.SAFE_BROWSING_KEY = "test"; process.env.VIRUSTOTAL_KEY = "test"; });

test("Google fishing desa → 🔴, oddiy ko'rinadigan domen bo'lsa ham", async () => {
  fakeInternet();
  const r = await run("https://fishing-sayt.com/kirish");
  assert.strictEqual(r.level, "danger");
  assert.ok(r.reasons.some(x => x.code === "ext_gsb_phish"));
});
test("VirusTotal: 7 ta antivirus xavfli desa → 🔴, 1 ta desa → 🟡", async () => {
  fakeInternet();
  assert.strictEqual((await run("https://virusli.net")).level, "danger");
  assert.strictEqual((await run("https://biroz.net")).level, "suspicious");
});
test("toza sayt → ✅", async () => { fakeInternet(); assert.strictEqual((await run("https://oddiy-blog.uz")).level, "safe"); });
test("rasmiy saytlar tashqi API'ga yuborilmaydi (limit tejaladi)", async () => {
  fakeInternet(); await run("https://click.uz https://my.gov.uz");
  assert.strictEqual(calls.length, 0);
});
test("kesh: bir domen 24 soatda ikkinchi marta so'ralmaydi", async () => {
  fakeInternet(); await run("https://virusli.net/a"); await run("https://virusli.net/b");
  assert.strictEqual(calls.filter(c => c.includes("virustotal")).length, 1);
});
test("VirusTotal limiti: daqiqasiga 4 tadan ortiq so'rov yuborilmaydi", async () => {
  fakeInternet();
  for (let i = 0; i < 6; i++) await ext.virusTotalDomain(`sayt${i}.uz`);
  assert.strictEqual(calls.filter(c => c.includes("virustotal")).length, 4);
});
test("xizmatlar ishlamasa ham bot javob beradi (qoidalar bo'yicha)", async () => {
  fakeInternet({ gsbDown: true, vtDown: true });
  const r = await run("https://c1ick-uz.com/bonus");
  assert.strictEqual(r.level, "danger");                        // qoidalar o'zi yetarli
  assert.ok(!r.reasons.some(x => x.code.startsWith("ext_")));
});
test("kalitlar bo'lmasa — tashqi so'rov umuman yuborilmaydi", async () => {
  delete process.env.SAFE_BROWSING_KEY; delete process.env.VIRUSTOTAL_KEY;
  fakeInternet(); await run("https://yangi-sayt.uz");
  assert.strictEqual(calls.length, 0);
});
