// Tekshir — har bir sahifada ishlaydi.
// 1) Ochilgan sayt MANZILINI tekshiradi (sahifaning ichi, parollar, yozganlaringiz o'qilmaydi).
//    🔴 xavfli → butun ekranli ogohlantirish, 🟡 shubhali → yuqorida ingichka chiziq.
// 2) Telegram Web va WhatsApp Web'da xabarlardagi havolalar yoniga 🔴/🟡 belgi qo'yadi.
// Hammasi kompyuterda: internetga hech narsa yuborilmaydi.
(() => {
  if (window.top !== window) return;                         // faqat asosiy oyna (reklama ramkalari emas)
  if (!/^https?:$/.test(location.protocol)) return;
  const E = globalThis.TekshirEngine, S = globalThis.TekshirText;
  if (!E || !S) return;

  const host = location.hostname.toLowerCase().replace(/^www\./, "");
  if (isLocal(host)) return;
  const CHAT_HOSTS = ["web.telegram.org", "web.whatsapp.com"];

  const r = E.checkPage(location.href);
  send({ type: "verdict", level: r.level });

  chrome.storage.local.get(S.DEFAULTS, s => {
    const lang = s.lang || S.defaultLang();
    if (s.warn && r.level === "danger") {
      send({ type: "allowed?", host }, ok => { if (!ok) showWall(r, lang); });
    } else if (s.warn && r.level === "suspicious" && !s.quiet.includes(host)) {
      onReady(() => showBanner(r, lang));
    }
    if (s.badges && CHAT_HOSTS.includes(host)) onReady(() => watchLinks(lang));
  });

  // ---------- yordamchilar ----------
  function isLocal(h) {
    return h === "localhost" || h.endsWith(".local") || h.endsWith(".localhost") || h === "[::1]" ||
      /^(127|10)\.\d+\.\d+\.\d+$/.test(h) || /^192\.168\.\d+\.\d+$/.test(h) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h);
  }
  function send(msg, cb) {
    try { chrome.runtime.sendMessage(msg, cb || (() => void chrome.runtime.lastError)); } catch { /* kengaytma yangilangan */ }
  }
  function onReady(fn) {
    if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  function reasonsOf(res, lang) {
    return res.reasons.filter(x => x.points > 0).map(x => E.t(lang, x.code, x.vars));
  }
  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === "text" ? (e.textContent = v) : e.setAttribute(k, v);
    for (const k of kids) e.append(k);
    return e;
  }
  // Sahifa uslublari aralashmasligi uchun — yopiq Shadow DOM
  function shadowHost(id) {
    const h = document.createElement("tekshir-guard");
    h.id = id;
    const root = h.attachShadow({ mode: "closed" });
    return { h, root };
  }

  // ---------- 🔴 Butun ekranli ogohlantirish ----------
  function showWall(res, lang) {
    if (document.getElementById("tekshir-wall")) return;
    const { h, root } = shadowHost("tekshir-wall");
    root.innerHTML = `<style>
      :host{all:initial}
      .bg{position:fixed;inset:0;z-index:2147483647;background:#0A1020;display:flex;align-items:center;justify-content:center;
          font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#E8EEFC;padding:16px;box-sizing:border-box;overflow:auto}
      .card{max-width:560px;width:100%;background:#16213A;border:2px solid #EF4444;border-radius:22px;padding:28px;box-sizing:border-box}
      .k{color:#EF4444;font-weight:800;font-size:12px;letter-spacing:.08em}
      h1{font-size:26px;line-height:1.2;margin:8px 0 6px}
      .host{font:600 15px ui-monospace,Menlo,monospace;color:#8B97B5;word-break:break-all}
      ul{margin:16px 0;padding-left:20px;font-size:15px;line-height:1.5}
      .do{background:rgba(239,68,68,.13);border-radius:12px;padding:12px 14px;font-weight:700;font-size:15px}
      .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;align-items:center}
      button{font:inherit;cursor:pointer;border-radius:14px;padding:12px 18px;font-weight:800;font-size:15px;border:0}
      .back{background:#22C55E;color:#0A1020}
      .go{background:transparent;color:#8B97B5;border:1px solid #24314F;font-weight:600;font-size:13px}
      .note{color:#F5B301;font-size:13px;margin-top:10px;display:none}
      .shield{font-size:40px}
    </style>
    <div class="bg" role="alertdialog" aria-modal="true" aria-labelledby="t">
      <div class="card">
        <div class="shield">🛡</div>
        <div class="k"></div>
        <h1 id="t"></h1>
        <div class="host"></div>
        <ul></ul>
        <div class="do"></div>
        <div class="row"><button class="back"></button><button class="go"></button></div>
        <div class="note"></div>
      </div>
    </div>`;
    root.querySelector(".k").textContent = S.s(lang, "wall_kicker");
    root.querySelector("h1").textContent = "🔴 " + S.s(lang, "wall_title");
    root.querySelector(".host").textContent = res.host;
    const ul = root.querySelector("ul");
    reasonsOf(res, lang).forEach(t => ul.append(el("li", { text: t })));
    root.querySelector(".do").textContent = "❌ " + S.s(lang, "wall_do");
    const back = root.querySelector(".back"), go = root.querySelector(".go"), note = root.querySelector(".note");
    back.textContent = S.s(lang, "wall_back");
    go.textContent = S.s(lang, "wall_go");
    note.textContent = S.s(lang, "wall_go_note");
    back.addEventListener("click", () => { if (history.length > 1) history.back(); else send({ type: "close" }); });
    let step = 0;                                   // ikki bosqichli: avval ogohlantirish, keyin ochish
    let released = false;
    go.addEventListener("click", e => {
      if (!e.isTrusted) return;                     // sayt skripti o'zi «bosib» yopolmasin — faqat odamning bosishi
      if (step === 0) { step = 1; go.textContent = S.s(lang, "wall_go2"); note.style.display = "block"; return; }
      released = true;
      send({ type: "allow", host });                // faqat shu seans uchun (brauzer yopilsa — yana ogohlantiradi)
      h.remove();
      document.documentElement.style.removeProperty("overflow");
    });
    document.documentElement.append(h);
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    setTimeout(() => back.focus(), 0);
    // Sahifa skriptlari ogohlantirishni o'chirib yuborsa — qayta qo'yamiz
    new MutationObserver(() => { if (!released && !h.isConnected) document.documentElement.append(h); })
      .observe(document.documentElement, { childList: true });
  }

  // ---------- 🟡 Shubhali sayt: yuqorida ingichka chiziq ----------
  function showBanner(res, lang) {
    if (document.getElementById("tekshir-banner")) return;
    const { h, root } = shadowHost("tekshir-banner");
    root.innerHTML = `<style>
      :host{all:initial}
      .b{position:fixed;top:0;left:0;right:0;z-index:2147483646;background:#16213A;color:#E8EEFC;border-bottom:2px solid #F5B301;
         font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;
         box-shadow:0 6px 20px rgba(0,0,0,.35)}
      .t{flex:1;min-width:220px} b{color:#F5B301}
      button{font:inherit;cursor:pointer;border-radius:10px;padding:6px 12px;border:1px solid #24314F;background:transparent;color:#E8EEFC}
      .ok{background:#F5B301;color:#0A1020;border:0;font-weight:700}
    </style>
    <div class="b" role="status"><div class="t"><b></b> <span class="r"></span> <span class="d"></span></div>
      <button class="ok"></button><button class="q"></button></div>`;
    root.querySelector("b").textContent = "🟡 " + S.s(lang, "banner") + ":";
    const why = reasonsOf(res, lang)[0];
    root.querySelector(".r").textContent = why ? why.replace(/[.!]?$/, ".") : "";
    root.querySelector(".d").textContent = S.s(lang, "banner_do");
    root.querySelector(".ok").textContent = S.s(lang, "ok");
    root.querySelector(".q").textContent = S.s(lang, "quiet");
    root.querySelector(".ok").addEventListener("click", () => h.remove());
    root.querySelector(".q").addEventListener("click", e => {
      if (!e.isTrusted) return;
      chrome.storage.local.get({ quiet: [] }, s => chrome.storage.local.set({ quiet: [...new Set([...s.quiet, host])].slice(-500) }));
      h.remove();
    });
    document.documentElement.append(h);
  }

  // ---------- Telegram Web / WhatsApp Web: havolalar yonida belgi ----------
  function watchLinks(lang) {
    const seen = new WeakSet();
    const cache = new Map();                      // manzil → natija (bir xil havola qayta hisoblanmaydi)
    const verdict = href => { if (!cache.has(href)) cache.set(href, E.checkPage(href)); return cache.get(href); };
    function scan() {
      for (const a of document.querySelectorAll('a[href^="http"]')) {
        if (seen.has(a)) continue;
        seen.add(a);
        let v;
        try { v = verdict(a.href); } catch { continue; }
        if (v.level === "safe") continue;
        const danger = v.level === "danger";
        const why = reasonsOf(v, lang).join("\n");
        const tag = el("span", { text: S.s(lang, danger ? "badge_danger" : "badge_susp"), title: why, "data-tekshir": v.level });
        tag.style.cssText = `display:inline-block;margin:0 4px;padding:1px 7px;border-radius:999px;font:700 11px/1.6 system-ui,sans-serif;` +
          `background:${danger ? "#EF4444" : "#F5B301"};color:#0A1020;vertical-align:middle;white-space:nowrap`;
        a.insertAdjacentElement("afterend", tag);
        if (danger) {
          a.style.setProperty("text-decoration", "line-through", "important");
          a.addEventListener("click", e => {
            if (!confirm(S.s(lang, "link_confirm", { why }))) { e.preventDefault(); e.stopImmediatePropagation(); }
          }, true);
        }
      }
    }
    let queued = false;
    const later = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 400); };
    scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  }
})();
