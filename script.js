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
    <p></p>
    <ul class="features"></ul>
    <button type="button" class="btn btn-block ${s.featured ? "btn-secondary" : "btn-primary"}">Tanlash</button>
  `;
  // Matnlarni textContent orqali qo'yamiz — bu xavfsizroq
  card.querySelector(".kicker").textContent = s.kicker;
  card.querySelector("h3").textContent = s.name;
  card.querySelector(".price strong").textContent = formatPrice(s.price);
  card.querySelector(".price span").textContent = `so'm / ${s.period}`;
  card.querySelector("p").textContent = s.desc;

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
  if (data.name.trim().length < 2 || data.contact.trim().length < 5 || !data.serviceId) {
    statusEl.classList.add("error");
    statusEl.textContent = "Ismingiz, telefon yoki Telegram va xizmatni to'ldiring.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Yuborilmoqda...";

  try {
    let message;
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
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Xatolik yuz berdi.");
        form.reset();
        message = "Rahmat! Buyurtmangiz qabul qilindi. Tez orada bog'lanaman.";
      }
    }
    statusEl.classList.add("ok");
    statusEl.textContent = message;
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
