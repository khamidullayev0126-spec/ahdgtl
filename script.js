// Frontend JavaScript: xizmatlarni serverdan olish, buyurtma formasini yuborish va mobil menyu

const groupsEl = document.getElementById("service-groups");
const selectEl = document.getElementById("serviceId");
const form = document.getElementById("order-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

// Xizmat guruhlari: kalit -> sarlavha
const GROUPS = {
  once: "Bir martalik xizmatlar",
  plan: "Obunalar",
  course: "O'quv kursi"
};

function formatPrice(n) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function renderCard(s) {
  const card = document.createElement("article");
  card.className = "card" + (s.featured ? " featured" : "") + (s.legend ? " legend" : "");
  card.innerHTML = `
    <div class="card-top">
      <span class="kicker"></span>
      ${s.featured ? '<span class="tag tag-accent">Mashhur</span>' : ""}
    </div>
    <h3></h3>
    <div class="price"><strong></strong><span></span></div>
    <p class="card-time"><span aria-hidden="true">⏱</span> <span class="t"></span></p>
    <p class="card-desc"></p>
    <p class="card-result"><b>Natija:</b> <span class="r"></span></p>
    <ul class="features"></ul>
    <button type="button" class="btn btn-block ${s.featured ? "btn-secondary" : "btn-primary"}">Tanlash</button>
  `;
  // Matnlarni textContent orqali qo'yamiz — bu xavfsizroq
  card.querySelector(".kicker").textContent = s.kicker;
  card.querySelector("h3").textContent = s.name;
  card.querySelector(".price strong").textContent = formatPrice(s.price);
  card.querySelector(".price span").textContent = `so'm / ${s.period}`;
  card.querySelector(".card-desc").textContent = s.desc;
  card.querySelector(".card-time .t").textContent = s.time || "";
  card.querySelector(".card-time").hidden = !s.time;
  card.querySelector(".card-result .r").textContent = s.result || "";
  card.querySelector(".card-result").hidden = !s.result;
  // Namuna havolasi faqat namuna bor xizmatlarda yaratiladi (bo'sh <a> bo'lmasin)
  if (s.sample) {
    const a = document.createElement("a");
    a.className = "card-sample";
    a.href = s.sample;
    a.textContent = (s.sampleText || "Namunani ko'rish") + " →";
    card.querySelector("button").before(a);
  }

  // Har bir imkoniyat uchun <li> yaratamiz
  const list = card.querySelector(".features");
  (s.features || []).forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    list.appendChild(li);
  });

  // "Tanlash" bosilsa — formaga o'tib, shu xizmatni tanlab qo'yamiz
  card.querySelector("button").addEventListener("click", () => {
    selectEl.value = s.id;
    selectEl.dispatchEvent(new Event("change"));
    document.getElementById("buyurtma").scrollIntoView({ behavior: "smooth" });
    document.getElementById("name").focus({ preventScroll: true });
  });
  return card;
}

function renderServices() {
  // Narxlar services.js faylidan keladi (window.SERVICES)
  const services = window.SERVICES;
  if (!services) {
    groupsEl.innerHTML = '<p class="section-lead">Narxlar topilmadi: services.js fayli joyida ekanini tekshiring.</p>';
    return;
  }
  groupsEl.innerHTML = "";

  // Har bir guruh uchun sarlavha, kartalar va <optgroup> yaratamiz
  Object.entries(GROUPS).forEach(([key, title]) => {
    const items = services.filter(s => s.group === key);
    if (items.length === 0) return;

    const h = document.createElement("h3");
    h.className = "group-title";
    h.textContent = title;
    const cards = document.createElement("div");
    cards.className = "cards";
    items.forEach(s => cards.appendChild(renderCard(s)));
    groupsEl.append(h, cards);

    const og = document.createElement("optgroup");
    og.label = title;
    items.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} — ${formatPrice(s.price)} so'm / ${s.period}`;
      og.appendChild(opt);
    });
    selectEl.appendChild(og);
  });
  const want = new URLSearchParams(location.search).get("xizmat");
  if (want && services.some(s => s.id === want)) {
    selectEl.value = want;
    selectEl.dispatchEvent(new Event("change"));
  }
}

// Server bo'lmasa (fayl kompyuterda ochilgan bo'lsa) — buyurtmani Telegram orqali yuboramiz
async function sendViaTelegram(data) {
  const s = window.SERVICES.find(x => x.id === data.serviceId);
  const text = `Salom! Buyurtma:\nIsm: ${data.name}\nAloqa: ${data.contact}\nXizmat: ${s.name} (${formatPrice(s.price)} so'm)\nIzoh: ${data.message || "—"}`;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {}
  window.open("https://t.me/Abdulkhamid_2905", "_blank");
  return copied
    ? "Buyurtma matni nusxalandi. Ochilgan Telegram chatiga joylab (Ctrl+V) yuboring."
    : "Telegram ochildi. Buyurtmangizni @Abdulkhamid_2905 ga yozib yuboring.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";
  statusEl.textContent = "";

  const data = Object.fromEntries(new FormData(form));
  data.lang = document.documentElement.lang || "uz";
  if (data.name.trim().length < 2 || data.contact.trim().length < 5 || !data.serviceId) {
    statusEl.classList.add("error");
    statusEl.textContent = "Ismingiz, telefon yoki Telegram va xizmatni to'ldiring.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Yuborilmoqda...";

  try {
    let message, tgLink = "", payUrl = "";
    if (location.protocol === "file:") {
      message = await sendViaTelegram(data);
    } else {
      let res;
      try {
        res = await fetch("api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } catch {
        res = null; // internet yoki server yo'q
      }
      if (!res || res.status === 404) {
        message = await sendViaTelegram(data);
      } else {
        const result = await res.json().catch(() => ({}));
        if (res.status === 401 && result.login) {
          // Kirmagan — yozganlarini saqlab, kirish sahifasiga yuboramiz; qaytganda forma qayta to'ladi
          try { sessionStorage.setItem("ahd-order-draft", JSON.stringify(data)); } catch {}
          location.href = "kabinet.html?mode=signin&next=" + encodeURIComponent("/index.html#buyurtma");
          return;
        }
        if (!res.ok) throw new Error(result.error || "Xatolik yuz berdi.");
        form.reset();
        tgLink = result.telegramLink || "";
        payUrl = result.payUrl || "";
        message = tgLink
          ? "Rahmat! Buyurtmangiz qabul qilindi. Telegram'da tasdiqlang — bot 1 daqiqada yozadi:"
          : "Rahmat! Buyurtmangiz qabul qilindi. Tez orada bog'lanaman.";
      }
    }
    statusEl.classList.add("ok");
    statusEl.textContent = message;
    // Bot havolasi: mijoz botni ochsa, bot unga tasdiq uchun yoza oladi
    if (tgLink) {
      const a = document.createElement("a");
      a.href = tgLink;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "btn btn-primary tg-confirm";
      a.textContent = "Telegram'da tasdiqlash →";
      statusEl.appendChild(a);
    }
    if (payUrl) {
      const p = document.createElement("a");
      p.href = payUrl;
      p.className = "btn btn-primary tg-confirm";
      p.textContent = "💳 To'lash →";
      statusEl.appendChild(p);
    }
  } catch (err) {
    statusEl.classList.add("error");
    statusEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Buyurtmani yuborish";
  }
});

// Mobil menyu: tugma bosilganda havolalarni ochib-yopamiz
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
menuBtn.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.textContent = open ? "Yopish" : "Menyu";
});
navLinks.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "Menyu";
  })
);

renderServices();

// Kirishdan qaytgan bo'lsa — buyurtma formasini qayta to'ldiramiz
(function restoreDraft() {
  let d = null;
  try { d = JSON.parse(sessionStorage.getItem("ahd-order-draft") || "null"); sessionStorage.removeItem("ahd-order-draft"); } catch {}
  if (!d) return;
  const fill = () => {
    for (const [k, v] of Object.entries(d)) { const el = form.elements[k]; if (el) el.value = v; }
    statusEl.className = "form-status ok";
    statusEl.textContent = "Ma'lumotlaringiz saqlandi — endi «Buyurtmani yuborish»ni bosing.";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  setTimeout(fill, 300);
})();

// Boshqa sahifadan "index.html#xizmatlar" kabi havola bilan kelinganda brauzer bo'limga yetmay
// tepada qolib ketishi mumkin (sahifa yuklanayotganda o'lchami o'zgaradi). Yuklanib bo'lgach, bo'limga qayta o'tamiz.
(function fixHashJump() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  let userScrolled = false;                    // foydalanuvchi o'zi aylantirgan bo'lsa — tegmaymiz
  const mark = () => { userScrolled = true; };
  ["wheel", "touchmove", "keydown"].forEach(ev => addEventListener(ev, mark, { once: true, passive: true }));
  const go = () => {
    const el = document.getElementById(id);
    if (!el || userScrolled || Math.abs(el.getBoundingClientRect().top) < 4) return;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: "instant" });
  };
  if (document.readyState === "complete") setTimeout(go, 0);
  else addEventListener("load", () => setTimeout(go, 0), { once: true });
})();

// ---------- Tez aloqa: Telegram / WhatsApp / qo'ng'iroq (raqamlar contact.js da) ----------
// Tanlangan xizmatga qarab tayyor xabar yoziladi — mijoz faqat "Yuborish"ni bosadi.
(function quickContact() {
  const C = window.AHD_CONTACT || {};
  const tg = document.getElementById("q-tg"), wa = document.getElementById("q-wa"), call = document.getElementById("q-call");
  if (!tg || !selectEl) return;
  const MSG = {
    uz: ["Salom! Menga «{x}» kerak.", "Salom! Sayt yoki kontent buyurtma qilmoqchiman."],
    ru: ["Здравствуйте! Интересует «{x}».", "Здравствуйте! Хочу заказать сайт или контент."],
    en: ["Hi! I'm interested in “{x}”.", "Hi! I'd like to order a website or content."]
  };
  function update() {
    const m = MSG[window.I18N_LANG] || MSG.uz;
    const s = (window.SERVICES || []).find(x => x.id === selectEl.value);
    const text = s ? m[0].replace("{x}", s.name) : m[1];
    if (C.telegram) tg.href = `https://t.me/${C.telegram}?text=${encodeURIComponent(text)}`;
    const num = String(C.whatsapp || "").replace(/\D/g, "");
    wa.hidden = !num;
    if (num) wa.href = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    if (C.phone) call.href = "tel:" + C.phone;
  }
  selectEl.addEventListener("change", update);
  update();
})();
