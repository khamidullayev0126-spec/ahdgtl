// Cookie roziligi + Google Consent Mode v2 (basic rejim).
// 1) Boshida hamma narsa "denied". 2) Foydalanuvchi «Roziman» ni bossa — faqat statistika (analytics_storage) yoqiladi
//    va Google tag yuklanadi. Reklama cookie'lari hech qachon yoqilmaydi. 3) «Rad etaman» — hech narsa yuklanmaydi.
// Tanlov localStorage'da 180 kun saqlanadi. Footerdagi [data-cookie-settings] havolasi bannerni qayta ochadi.
(function () {
  const KEY = "ahd-consent", DAYS = 180;
  const cfg = window.AHD_ANALYTICS || {};
  const ID = /^GTM-[A-Z0-9]+$/.test(cfg.gtm || "") ? cfg.gtm : "";
  if (/^\/(admin|kabinet|tolov|app)(\.html)?$/.test(location.pathname)) return;   // xizmat sahifalarida statistika yo'q

  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });

  let loaded = false;
  function load() {
    if (loaded || !ID) return;
    loaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    gtag("js", new Date());
    const s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + ID;
    document.head.appendChild(s);
  }

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && (v.c === "granted" || v.c === "denied") && Date.now() - v.t < DAYS * 864e5) return v.c;
    } catch {}
    return null;
  }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify({ c, t: Date.now() })); } catch {} }

  const TXT = {
    uz: ["Saytni yaxshilash uchun statistika (Google Analytics) ishlatamiz: qaysi sahifalar ko'rilgani va qayerdan kelinganini. Reklama cookie'lari yo'q.", "Batafsil", "Roziman", "Rad etaman", "Cookie roziligi"],
    ru: ["Мы используем статистику (Google Analytics), чтобы улучшать сайт: какие страницы смотрят и откуда приходят. Рекламных cookie нет.", "Подробнее", "Согласен", "Отказаться", "Согласие на cookie"],
    en: ["We use analytics (Google Analytics) to improve the site: which pages are viewed and where visitors come from. No advertising cookies.", "Learn more", "Accept", "Decline", "Cookie consent"]
  };
  function lang() {
    let l = window.I18N_LANG || document.documentElement.lang;
    try { l = new URLSearchParams(location.search).get("lang") || localStorage.getItem("ahd-lang") || l; } catch {}
    return TXT[l] ? l : "uz";
  }

  let box = null;
  function show() {
    if (box || !ID) return;
    const t = TXT[lang()];
    const st = document.createElement("style");
    st.textContent = `.ahd-cookie{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:420px;background:var(--bg,#fffaf3);color:var(--text,#2b211b);border-radius:20px;padding:18px 18px 16px;box-shadow:0 12px 40px rgba(0,0,0,.22);font:15px/1.5 var(--font-body,system-ui,sans-serif)}
.ahd-cookie p{margin:0 0 12px}.ahd-cookie a{color:var(--link-strong,#8e4824)}
.ahd-cookie .row{display:flex;gap:8px;flex-wrap:wrap}.ahd-cookie button{flex:1 1 auto;min-height:44px;border-radius:999px;border:0;font:inherit;font-weight:700;cursor:pointer;padding:0 18px}
.ahd-cookie .ok{background:var(--btn-bg,#a3542a);color:#fff}.ahd-cookie .ok:hover{background:var(--btn-bg-hover,#8e4824)}
.ahd-cookie .no{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}
@media (max-width:560px){.ahd-cookie{left:12px;right:12px;bottom:12px;max-width:none}}`;
    document.head.appendChild(st);
    box = document.createElement("div");
    box.className = "ahd-cookie";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", t[4]);
    box.setAttribute("data-no-i18n", "");
    box.innerHTML = `<p>${t[0]} <a href="/maxfiylik.html#cookie">${t[1]}</a></p><div class="row"><button type="button" class="ok">${t[2]}</button><button type="button" class="no">${t[3]}</button></div>`;
    box.querySelector(".ok").onclick = () => { save("granted"); close(); load(); };
    box.querySelector(".no").onclick = () => {
      const was = loaded;
      save("denied"); close();
      if (was) location.reload();   // allaqachon yuklangan kodni to'xtatish uchun
    };
    document.body.appendChild(box);
  }
  function close() { if (box) { box.remove(); box = null; } }

  const c = read();
  if (c === "granted") load();
  else if (c === null) {
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show, { once: true });
  }
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("[data-cookie-settings]");
    if (a) { e.preventDefault(); show(); }
  });
})();
