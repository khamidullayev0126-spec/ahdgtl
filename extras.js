// AHdigital — "Vizitkangizni ko'ring" sinovi va saytdagi AI suhbat oynasi

// ================= 1. Vizitka sinovi (hammasi brauzerda, server kerak emas) =================
(function () {
  const $ = id => document.getElementById(id);
  const preview = $("try-preview");
  if (!preview) return;

  const COLORS = [
    { name: "Terrakota", main: "#a3542a", soft: "#fff2eb" },
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
    if (open) { if (!log.children.length) add("bot", (window.T || (x => x))("Salom! 👋 Men AHdigital'ning AI yordamchisiman. Narxlar, muddat yoki saytlar haqida so'rang.")); input.focus(); }
  }
  fab.addEventListener("click", () => toggle(panel.hidden));
  root.querySelector(".chat-close").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) toggle(false); });

  ["Vizitka sayt qancha turadi?", "Pro tarifga nima kiradi?", "Qancha vaqtda tayyor bo'ladi?"].forEach(q => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = q;
    b.addEventListener("click", () => { input.value = b.textContent; form.requestSubmit(); });
    quick.appendChild(b);
  });

  let busy = false;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; input.value = ""; quick.hidden = true;
    add("me", text);
    const T = window.T || (x => x);
    const wait = add("bot typing", T("Yozmoqda…"));
    try {
      const r = await fetch("api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, session }) });
      const data = await r.json();
      wait.remove();
      if (data.session) { session = data.session; try { sessionStorage.setItem(KEY, session); } catch {} }
      add("bot", data.reply || T(data.error || "Xatolik yuz berdi."));
    } catch {
      wait.remove();
      add("bot", T("Internet bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring."));
    }
    busy = false; input.focus();
  });
})();

// ================= 3. Statistika (Google tag consent.js da, faqat rozilikdan keyin yuklanadi) =================
const track = (name, params = {}) => { try { if (window.gtag) window.gtag("event", name, params); } catch {} };
document.getElementById("try-order")?.addEventListener("click", () => track("vizitka_sinov_buyurtma"));
document.addEventListener("click", e => { if (e.target.closest(".chat-fab")) track("ai_chat_ochildi"); });
document.getElementById("order-form")?.addEventListener("submit", () => track("generate_lead", { form: "buyurtma" }));
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("#q-tg, #q-wa, #q-call, a[href^='https://t.me/'], a[href^='tel:'], a[href^='https://wa.me/']");
  if (!a) return;
  const method = /wa\.me|q-wa/.test(a.href + a.id) ? "whatsapp" : /^tel:|q-call/.test(a.getAttribute("href") + a.id) ? "telefon" : "telegram";
  track("contact_click", { method, place: a.id || "boshqa" });
});

// ================= 4. Reels: ko'ringanda o'zi aylanadi, bosilsa to'xtaydi =================
(function () {
  const vids = [...document.querySelectorAll(".reel video")];
  if (!vids.length) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paused = new WeakSet();               // foydalanuvchi o'zi to'xtatganlari
  vids.forEach(v => v.addEventListener("click", () => {
    if (v.paused) { paused.delete(v); v.play().catch(() => {}); } else { paused.add(v); v.pause(); }
    track("reels_bosildi");
  }));
  if (still || !("IntersectionObserver" in window)) return;   // harakatni kamaytirish yoqilgan — avtomatik ijro yo'q
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !paused.has(v)) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.4 });
  vids.forEach(v => io.observe(v));
})();

// ================= 5. Oldin / hozir slayderi =================
(function () {
  const ba = document.getElementById("ba"), range = document.getElementById("ba-range");
  if (!ba || !range) return;
  const set = v => ba.style.setProperty("--pos", v + "%");
  range.addEventListener("input", () => set(range.value));
  set(range.value);
})();

// ================= 6. Narx kalkulyatori =================
(function () {
  const box = document.getElementById("calc"), rows = document.getElementById("calc-rows");
  const services = window.SERVICES;
  if (!box || !rows || !Array.isArray(services) || !services.length) return;
  const fmt = n => n.toLocaleString("ru-RU");
  const count = {};
  services.forEach(s => {
    count[s.id] = 0;
    const row = document.createElement("div"); row.className = "calc-row";
    const name = document.createElement("div"); name.className = "calc-name";
    const b = document.createElement("b"); b.textContent = s.name;
    const small = document.createElement("small"); small.textContent = `${fmt(s.price)} so'm / ${s.period}`;
    name.append(b, small);
    const step = document.createElement("div"); step.className = "stepper";
    const minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", s.name + " — kamaytirish");
    const val = document.createElement("output"); val.textContent = "0"; val.setAttribute("aria-live", "polite");
    const plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", s.name + " — ko'paytirish");
    const change = d => { count[s.id] = Math.max(0, Math.min(20, count[s.id] + d)); val.textContent = count[s.id]; row.classList.toggle("on", count[s.id] > 0); update(); };
    minus.addEventListener("click", () => change(-1)); plus.addEventListener("click", () => change(1));
    step.append(minus, val, plus);
    row.append(name, step);
    rows.appendChild(row);
  });
  const sumEl = document.getElementById("calc-sum"), hint = document.getElementById("calc-hint");
  function picked() { return services.filter(s => count[s.id] > 0); }
  function update() {
    const total = picked().reduce((a, s) => a + s.price * count[s.id], 0);
    sumEl.textContent = fmt(total) + " so'm";
    // Pro tarifga kiradigan bir martalik xizmatlar (FAQ'dagi ta'rif bo'yicha)
    const pro = services.find(s => s.id === "pro");
    const inPro = ["video", "slayd", "vizitka", "katta-sayt"];
    const onceSum = picked().filter(s => inPro.includes(s.id)).reduce((a, s) => a + s.price * count[s.id], 0);
    const media = (count.video || 0) + (count.slayd || 0);
    hint.textContent = pro && !count.pro && onceSum > pro.price && media <= 15
      ? `💡 Bu xizmatlar Pro tarifga kiradi — 1 oy ${fmt(pro.price)} so'm. Abdulhamid bilan aniqlashtiring.` : "";
  }
  document.getElementById("calc-order").addEventListener("click", () => {
    const list = picked();
    if (!list.length) { hint.textContent = "Avval kamida bitta xizmatni tanlang."; return; }
    const select = document.getElementById("serviceId"), msg = document.getElementById("message");
    if (select) select.value = list[0].id;
    if (msg) msg.value = "Kalkulyator: " + list.map(s => `${s.name} × ${count[s.id]}`).join(", ") + ` — jami ${sumEl.textContent}.`;
    track("kalkulyator_buyurtma", { value: list.reduce((a, s) => a + s.price * count[s.id], 0), currency: "UZS" });
    document.getElementById("buyurtma")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("name")?.focus({ preventScroll: true }), 600);
  });
  box.hidden = false;
  update();
})();

// ================= 7. Aylantirganda yumshoq chiqib kelish =================
// Kontent doim ko'rinib turadi; faqat ekranga kirganda ozgina siljib joyiga keladi.
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const sel = ".section-title, .section-lead, .card, .step, .perk, .reel, .ba, .calc, .faq details, .about-img";
  const els = [...document.querySelectorAll(sel)].filter(el => el.getBoundingClientRect().top > innerHeight);   // faqat pastdagilar
  els.forEach(el => el.classList.add("rise"));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach(el => io.observe(el));
  // xizmat kartalari keyinroq chiziladi — ularni ham kuzatamiz
  new MutationObserver(() => document.querySelectorAll(".card:not(.rise)").forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rise"); io.observe(el); }
  })).observe(document.getElementById("service-groups") || document.body, { childList: true, subtree: true });
})();

// ================= 8. Telefonda pastki "Buyurtma berish" tugmasi =================
(function () {
  const order = document.getElementById("buyurtma");
  if (!order) return;
  const bar = document.createElement("a");
  bar.href = "#buyurtma"; bar.className = "m-cta"; bar.textContent = "Buyurtma berish";
  document.body.appendChild(bar);
  document.body.classList.add("has-m-cta");
  const hero = document.getElementById("top");
  let pastHero = false, atOrder = false;
  const sync = () => bar.classList.toggle("show", pastHero && !atOrder);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { atOrder = e.isIntersecting; sync(); }, { threshold: 0.1 }).observe(order);
    if (hero) new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }).observe(hero);
  }
})();
