// O'ng tugma menyusidan kelgan havola yoki matnni tekshiradi (matn shu oynada qoladi, hech qayerga yuborilmaydi).
const E = TekshirEngine, S = TekshirText, U = TekshirUI;
const q = new URLSearchParams(location.search).get("q") || "";
chrome.storage.local.get(S.DEFAULTS, s => {
  const lang = s.lang || S.defaultLang();
  document.documentElement.lang = lang === "ru" ? "ru" : "uz";
  document.getElementById("title").textContent = S.s(lang, "result_title");
  document.getElementById("k-q").textContent = S.s(lang, "checked_text");
  document.getElementById("q").textContent = q;
  document.getElementById("privacy").textContent = S.s(lang, "privacy");
  document.getElementById("bot").textContent = S.s(lang, "bot");
  if (q) document.getElementById("res").append(U.renderResult(E.checkText(q), lang));
});
