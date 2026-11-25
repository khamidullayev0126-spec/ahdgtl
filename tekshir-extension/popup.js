// Kengaytma oynasi: shu sayt natijasi, xabar/havola tekshirish, sozlamalar.
const E = TekshirEngine, S = TekshirText, U = TekshirUI;
const $ = id => document.getElementById(id);
let lang = S.defaultLang();
let pageResult = null, pageHost = "";

function paint() {
  document.documentElement.lang = lang === "ru" ? "ru" : "uz";
  const set = (id, key) => { $(id).textContent = S.s(lang, key); };
  set("active", "active"); set("k-current", "current"); set("k-check", "check_title"); set("go", "check_btn");
  set("k-settings", "settings"); set("l-warn", "s_warn"); set("l-badges", "s_badges"); set("l-lang", "s_lang");
  set("privacy", "privacy"); set("bot", "bot"); set("app", "app");
  $("q").placeholder = S.s(lang, "hint");
  const box = $("site-res"); box.textContent = "";
  if (pageResult) { $("host").textContent = pageHost; box.append(U.renderResult(pageResult, lang, pageResult.level !== "safe")); }
  else box.append(U.el("div", "muted", S.s(lang, "not_checked")));
  if ($("res").dataset.q) check();
}

function check() {
  const q = $("q").value.trim();
  $("err").hidden = !!q; $("err").textContent = S.s(lang, "empty");
  $("res").textContent = "";
  if (!q) return;
  $("res").dataset.q = "1";
  $("res").append(U.renderResult(E.checkText(q), lang));
}

$("go").addEventListener("click", check);
$("q").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) check(); });

chrome.storage.local.get(S.DEFAULTS, s => {
  lang = s.lang || S.defaultLang();
  $("lang").value = lang; $("warn").checked = s.warn; $("badges").checked = s.badges;
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0] && tabs[0].url;
    if (url && /^https?:/i.test(url)) { pageResult = E.checkPage(url); pageHost = pageResult.host; }
    paint();
  });
});
$("lang").addEventListener("change", e => { lang = e.target.value; chrome.storage.local.set({ lang }); paint(); });
$("warn").addEventListener("change", e => chrome.storage.local.set({ warn: e.target.checked }));
$("badges").addEventListener("change", e => chrome.storage.local.set({ badges: e.target.checked }));
