// Tekshir mexanizmini Telegram botdan (tekshir-bot/) olib, brauzer uchun bitta engine.js fayliga yig'adi.
// Bot kodi O'ZGARMAYDI va qayta yozilmaydi — shunda bot va kengaytma doim bir xil javob beradi.
// Ishlatish:  node build.js
const fs = require("fs");
const path = require("path");

const BOT = path.join(__dirname, "..", "tekshir-bot");
const OUT = path.join(__dirname, "engine.js");

// Modul kaliti → manba fayl. Kalitlar bot papkasiga nisbatan yo'l (kengaytmaniki — "src/api").
const MODULES = {
  "src/checkers/text": path.join(BOT, "src/checkers/text.js"),
  "src/checkers/url": path.join(BOT, "src/checkers/url.js"),
  "src/checkers/file": path.join(BOT, "src/checkers/file.js"),
  "src/scoring": path.join(BOT, "src/scoring.js"),
  "api": path.join(__dirname, "src/api.js"),
};
// Brauzerda kerak bo'lmagan (internet, Node) modullar o'rniga bo'sh almashtirgichlar.
// Kengaytma Google/VirusTotal'ga murojaat qilmaydi: faqat ichki qoidalar.
const STUBS = {
  "src/checkers/external": "module.exports = { externalReasons: async () => ({ reasons: [], checked: [] }), virusTotalFile: async () => null };",
  "crypto": "module.exports = {};",
};
const JSONS = ["data/scam-keywords.json", "data/url-rules.json", "data/trusted-domains.json"];
// Faqat natija matnlari kerak (bot xabarlari emas)
const KEY_RE = /^(level_|url_|txt_|file_|adv_|why$|what_to_do$)/;

function resolve(fromKey, spec) {
  if (!spec.startsWith(".")) return spec;                       // "crypto"
  const r = path.posix.normalize(path.posix.join(path.posix.dirname(fromKey), spec)).replace(/\.js$/, "");
  return r;
}

function wrap(key, src) {
  const body = src.replace(/require\((["'])([^"']+)\1\)/g, (_, q, spec) => `require(${JSON.stringify(resolve(key, spec))})`);
  return `M[${JSON.stringify(key)}] = function (module, exports, require) {\n${body}\n};`;
}

function build() {
  const parts = [];
  for (const [key, file] of Object.entries(MODULES)) parts.push(wrap(key, fs.readFileSync(file, "utf8")));
  for (const [key, src] of Object.entries(STUBS)) parts.push(`M[${JSON.stringify(key)}] = function (module) { ${src} };`);
  for (const j of JSONS) parts.push(`M[${JSON.stringify(j)}] = function (module) { module.exports = ${fs.readFileSync(path.join(BOT, j), "utf8").trim()}; };`);
  const locales = {};
  for (const l of ["uz-latn", "uz-cyrl", "ru"]) {
    const all = JSON.parse(fs.readFileSync(path.join(BOT, "locales", l + ".json"), "utf8"));
    locales[l] = Object.fromEntries(Object.entries(all).filter(([k]) => KEY_RE.test(k)));
  }
  parts.push(`M["locales"] = function (module) { module.exports = ${JSON.stringify(locales)}; };`);

  const out = `// AVTOMATIK YARATILGAN FAYL — qo'lda tahrirlamang. Manba: tekshir-bot/src va src/api.js. Yangilash: node build.js
// Tekshir tekshiruv mexanizmi (Telegram bot bilan bir xil). Internetga hech narsa yubormaydi.
(function (g) {
"use strict";
const M = {}, C = {};
function require(k) {
  if (C[k]) return C[k].exports;
  if (!M[k]) throw new Error("Tekshir: modul topilmadi: " + k);
  const m = { exports: {} }; C[k] = m; M[k](m, m.exports, require);
  return m.exports;
}
${parts.join("\n")}
g.TekshirEngine = require("api");
})(typeof globalThis !== "undefined" ? globalThis : self);
`;
  // Chrome kengaytma fayllarida Unicode «noncharacter» belgilarni (masalan U+FFFF) qabul qilmaydi —
  // botdagi URL_RE ichida bor. Ularni \uXXXX ko'rinishiga o'tkazamiz (regex va matnda ma'nosi o'zgarmaydi).
  const safe = out.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  fs.writeFileSync(OUT, safe);
  return OUT;
}

if (require.main === module) console.log("✅ " + path.relative(process.cwd(), build()));
module.exports = { build };
