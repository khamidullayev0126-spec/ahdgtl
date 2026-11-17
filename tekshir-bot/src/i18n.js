// Tarjimalar: barcha matnlar locales/ papkasidagi JSON fayllarda.
// Ishlatish: t("uz-latn", "salom", { ism: "Ali" })  →  matndagi {ism} o'rniga "Ali" qo'yiladi.

const fs = require("fs");
const path = require("path");

// Qo'llab-quvvatlanadigan tillar. Birinchisi — asosiy (standart) til.
const LANGS = ["uz-latn", "uz-cyrl", "ru"];
const DEFAULT_LANG = LANGS[0];

// Dastur ishga tushganda barcha til fayllarini bir marta o'qib, xotirada saqlaymiz
const dict = {};
for (const lang of LANGS) {
  const file = path.join(__dirname, "..", "locales", `${lang}.json`);
  dict[lang] = JSON.parse(fs.readFileSync(file, "utf8"));
}

function t(lang, key, vars = {}) {
  const l = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  // Kalit tanlangan tilda bo'lmasa — asosiy tildagi matn, u ham bo'lmasa — kalitning o'zi
  let text = dict[l][key] ?? dict[DEFAULT_LANG][key] ?? key;
  // {nom} ko'rinishidagi joylarni qiymat bilan almashtiramiz
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

module.exports = { t, LANGS, DEFAULT_LANG, dict };
