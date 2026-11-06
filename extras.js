// AHdigital — "Vizitkangizni ko'ring" sinovi va saytdagi AI suhbat oynasi

// ================= 1. Vizitka sinovi (hammasi brauzerda, server kerak emas) =================
(function () {
  const $ = id => document.getElementById(id);
  const preview = $("try-preview");
  if (!preview) return;

  const COLORS = [
    { name: "Terrakota", main: "#c67139", soft: "#fff2eb" },
    { name: "Zaytun", main: "#56633f", soft: "#f0fae1" },
    { name: "Dengiz", main: "#1f6f8b", soft: "#e6f4f8" },
    { name: "Olcha", main: "#a33a4a", soft: "#fbebee" },
    { name: "Ko'mir", main: "#2b2a33", soft: "#efeef3" }
  ];
  const KINDS = {
    kafe:  { tag: "Mazali taomlar har kuni", title: "Menyu", items: [["Osh", "35 000"], ["Lag'mon", "30 000"], ["Somsa", "8 000"]], icon: "🍽" },
    salon: { tag: "Go'zalligingiz — bizning ishimiz", title: "Xizmatlar", items: [["Soch turmagi", "80 000"], ["Manikyur", "60 000"], ["Makiyaj", "120 000"]], icon: "💇" },
    dokon: { tag: "Sifatli mahsulotlar, qulay narxlar", title: "Mahsulotlar", items: [["Yangi kolleksiya", "—"], ["Chegirmalar", "—"], ["Yetkazib berish", "—"]], icon: "🛍" },
    usta:  { tag: "Tez, sifatli, kafolat bilan", title: "Xizmatlar", items: [["Ta'mirlash", "kelishiladi"], ["O'rnatish", "kelishiladi"], ["Maslahat", "bepul"]], icon: "🛠" },
    talim: { tag: "Bilim — kelajak kaliti", title: "Kurslar", items: [["Ingliz tili", "oyiga"], ["Matematika", "oyiga"], ["IT asoslari", "oyiga"]], icon: "📚" }
  };
  let color = COLORS[0];

  // Rang tanlash tugmalari
  const sw = $("try-colors");
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch"; b.style.background = c.main;
    b.setAttribute("role", "radio"); b.setAttribute("aria-label", c.name); b.setAttribute("aria-checked", i === 0);
    b.addEventListener("click", () => {
      color = c;
      sw.querySelectorAll(".swatch").forEach(x => x.setAttribute("aria-checked", x === b));
      draw();
    });
    sw.appendChild(b);
  });

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function draw() {
    const name = $("try-name").value.trim() || "Biznesingiz nomi";
    const kind = KINDS[$("try-kind").value];
    const phone = $("try-phone").value.trim() || "+998 __ ___ __ __";
    preview.style.setProperty("--v-main", color.main);
    preview.style.setProperty("--v-soft", color.soft);
    preview.replaceChildren();

    const hero = el("div", "v-hero");
    hero.append(el("div", "v-icon", kind.icon), el("div", "v-name", name), el("div", "v-tag", kind.tag));
    const list = el("div", "v-list");
    list.append(el("div", "v-title", kind.title));
    kind.items.forEach(([n, p]) => { const row = el("div", "v-row"); row.append(el("span", "", n), el("b", "", p === "—" ? "" : p + (/\d/.test(p) ? " so'm" : ""))); list.append(row); });
    const btns = el("div", "v-btns");
    btns.append(el("div", "v-btn", "📞 " + phone), el("div", "v-btn v-btn-ghost", "✈️ Telegram"));
    const map = el("div", "v-map", "📍 Manzil · ish vaqti 9:00–21:00");
    preview.append(hero, list, btns, map);
    preview.classList.remove("pop"); void preview.offsetWidth; preview.classList.add("pop");
  }

  ["try-name", "try-phone"].forEach(id => $(id).addEventListener("input", draw));
  $("try-kind").addEventListener("change", draw);
  draw();

  // "Shuni buyurtma qilaman" — buyurtma formasini to'ldirib, unga olib boradi
  $("try-order").addEventListener("click", () => {
    const select = $("serviceId"), msg = $("message");
    if (select && [...select.options].some(o => o.value === "vizitka")) select.value = "vizitka";
    if (msg) msg.value = `Sinovdagi vizitka: "${$("try-name").value.trim()}", ${$("try-kind").selectedOptions[0].text.toLowerCase()}, rang — ${color.name.toLowerCase()}.`;
    const order = $("buyurtma");
    if (order) order.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("name") && $("name").focus({ preventScroll: true }), 600);
  });
})();

// ================= 2. AI suhbat oynasi =================
(async function () {
  try {
    const r = await fetch("api/chat");
    if (!r.ok || !(await r.json()).enabled) return;     // server yoki Claude kaliti yo'q — oyna ko'rinmaydi
  } catch { return; }

  const KEY = "ahd-chat-session";
  let session = "";
  try { session = sessionStorage.getItem(KEY) || ""; } catch {}

  const root = document.createElement("div");
  root.className = "chat";
  root.innerHTML = `
    <button class="chat-fab" type="button" aria-expanded="false" aria-controls="chat-panel"><span aria-hidden="true">💬</span> Savol bering</button>
    <div class="chat-panel" id="chat-panel" role="dialog" aria-label="AI yordamchi" hidden>
      <div class="chat-head">
        <div><b>AHdigital yordamchisi</b><small>Claude (AI) javob beradi · odam emas</small></div>
        <button class="chat-close" type="button" aria-label="Yopish">✕</button>
      </div>
      <div class="chat-log" aria-live="polite"></div>
      <div class="chat-quick"></div>
      <form class="chat-form">
        <label class="sr-only" for="chat-input">Savolingiz</label>
        <input id="chat-input" class="chat-input" maxlength="500" autocomplete="off" placeholder="Savolingizni yozing...">
        <button class="chat-send" type="submit" aria-label="Yuborish">➤</button>
      </form>
    </div>`;
  document.body.appendChild(root);

  const fab = root.querySelector(".chat-fab"), panel = root.querySelector(".chat-panel");
  const log = root.querySelector(".chat-log"), form = root.querySelector(".chat-form"), input = root.querySelector(".chat-input");
  const quick = root.querySelector(".chat-quick");

  function add(who, text) {
    const m = document.createElement("div");
    m.className = "chat-msg " + who; m.textContent = text;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    return m;
  }
  function toggle(open) {
    panel.hidden = !open; fab.setAttribute("aria-expanded", open);
    if (open) { if (!log.children.length) add("bot", "Salom! 👋 Men AHdigital'ning AI yordamchisiman. Narxlar, muddat yoki saytlar haqida so'rang."); input.focus(); }
  }
  fab.addEventListener("click", () => toggle(panel.hidden));
  root.querySelector(".chat-close").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) toggle(false); });

  ["Vizitka sayt qancha turadi?", "Pro tarifga nima kiradi?", "Qancha vaqtda tayyor bo'ladi?"].forEach(q => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = q;
    b.addEventListener("click", () => { input.value = q; form.requestSubmit(); });
    quick.appendChild(b);
  });

  let busy = false;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; input.value = ""; quick.hidden = true;
    add("me", text);
    const wait = add("bot typing", "Yozmoqda…");
    try {
      const r = await fetch("api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, session }) });
      const data = await r.json();
      wait.remove();
      if (data.session) { session = data.session; try { sessionStorage.setItem(KEY, session); } catch {} }
      add("bot", data.reply || data.error || "Xatolik yuz berdi.");
    } catch {
      wait.remove();
      add("bot", "Internet bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring.");
    }
    busy = false; input.focus();
  });
})();
