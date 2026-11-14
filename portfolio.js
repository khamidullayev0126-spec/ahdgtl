// Portfolio JavaScript
// Bu faylda: yozilayotgan matn effekti, o'quv yo'li, loyihalar va narx kalkulyatori.
// Loyihalar ro'yxati — works.js (window.WORKS). Yangi ish qo'shish uchun o'sha faylga obyekt qo'shing.

// ---------- 1. Ma'lumotlar (massiv va obyektlar) ----------

const ROLES = [
  "Junior dasturchi",
  "CoddyCamp o'quvchisi",
  "AI bilan kontent yaratuvchi",
  "Kelajakdagi Software Engineer"
];

// O'rgangan ketma-ketligim. done: true — o'rganib bo'ldim, false — hozir o'rganyapman
const JOURNEY = [
  { name: "Scratch", done: true },
  { name: "Pictoblox", done: true },
  { name: "AI", done: true },
  { name: "Figma", done: true },
  { name: "HTML", done: true },
  { name: "CSS", done: true },
  { name: "Bootstrap", done: true },
  { name: "JavaScript", done: false }
];


// ---------- 2. Yozilayotgan matn effekti ----------

const typedEl = document.getElementById("typed");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeLoop() {
  let i = 0;
  while (true) {
    const word = ROLES[i % ROLES.length];
    // harflarni bittadan yozamiz
    for (let n = 1; n <= word.length; n++) {
      typedEl.textContent = word.slice(0, n);
      await sleep(70);
    }
    await sleep(1600);
    // harflarni bittadan o'chiramiz
    for (let n = word.length; n >= 0; n--) {
      typedEl.textContent = word.slice(0, n);
      await sleep(35);
    }
    i++;
  }
}

if (!reduceMotion) typeLoop();

// ---------- 3. O'quv yo'lini chizish ----------

const timelineEl = document.getElementById("timeline");
JOURNEY.forEach((item, index) => {
  const li = document.createElement("li");
  if (!item.done) li.classList.add("now");
  li.innerHTML = `<span class="num"></span><strong></strong><span class="state"></span>`;
  li.querySelector(".num").textContent = String(index + 1).padStart(2, "0");
  li.querySelector("strong").textContent = item.name;
  li.querySelector(".state").textContent = item.done ? "✓ o'rgandim" : "● hozir";
  timelineEl.appendChild(li);
});

// ---------- 4. Loyihalarni chizish ----------

const projectsEl = document.getElementById("projects");
const WORKS = window.WORKS || [];
WORKS.forEach(p => {
  const card = document.createElement("article");
  card.className = "project";
  card.dataset.cat = p.cat.join(" ");
  card.innerHTML = `
    <div class="project-top"><span class="status"></span></div>
    <h3></h3>
    <p></p>
    <div class="tags"></div>
  `;
  // Rasm faqat rasmi bor ishlarda (bo'sh havola qolmasin). Rasm havolasi nomini alt matndan oladi.
  if (p.image) {
    const a = document.createElement("a");
    a.className = "project-img";
    a.href = p.link || "#";
    a.tabIndex = -1;            // klaviatura uchun pastdagi havola yetarli
    const img = document.createElement("img");
    img.src = p.image;
    if (p.image.startsWith("images/ishlar/")) {          // telefonga yengil 600px nusxa
      img.srcset = `${p.image.replace(".webp", "-600.webp")} 600w, ${p.image.replace(".webp", "-800.webp")} 800w, ${p.image} 1200w`;
      img.sizes = "(max-width: 700px) 92vw, 380px";
    }
    img.alt = p.title;
    img.loading = "lazy";
    img.width = 600; img.height = 375;
    a.appendChild(img);
    card.prepend(a);
  }
  card.querySelector(".status").textContent = "// " + p.status;
  card.querySelector("h3").textContent = p.title;
  card.querySelector("p").textContent = p.desc;

  const tagsEl = card.querySelector(".tags");
  p.tags.forEach(t => {
    const span = document.createElement("span");
    span.textContent = t;
    tagsEl.appendChild(span);
  });

  if (p.link) {
    const a = document.createElement("a");
    a.className = "more";
    a.href = p.link;
    a.textContent = p.linkText + " →";
    card.appendChild(a);
  }
  projectsEl.appendChild(card);
});

// Filtr: Hammasi / Sayt / Dizayn / Video / AI
document.querySelectorAll("#filters .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const f = btn.dataset.f;
    document.querySelectorAll("#filters .chip").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    projectsEl.querySelectorAll(".project").forEach(card => {
      card.hidden = f !== "all" && !card.dataset.cat.split(" ").includes(f);
    });
  });
});

// ---------- 5. Narx kalkulyatori (serverdan ma'lumot olish) ----------

const calcEl = document.getElementById("calc");
const totalEl = document.getElementById("total");
const counts = {}; // { video: 0, pro: 1, ... }
let services = [];

function formatPrice(n) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function updateTotal() {
  // reduce — massivdagi hamma narsani bitta songa yig'adi
  const total = services.reduce((sum, s) => sum + s.price * counts[s.id], 0);
  totalEl.textContent = formatPrice(total);
}

function renderCalc() {
  calcEl.innerHTML = "";
  services.forEach(s => {
    counts[s.id] = 0;
    const row = document.createElement("div");
    row.className = "calc-row";
    row.innerHTML = `
      <div><div class="name"></div><div class="price"></div></div>
      <div class="stepper">
        <button type="button" aria-label="Kamaytirish">−</button>
        <output>0</output>
        <button type="button" aria-label="Ko'paytirish">+</button>
      </div>
    `;
    row.querySelector(".name").textContent = s.name;
    row.querySelector(".price").textContent = `${formatPrice(s.price)} so'm / ${s.period}`;

    const [minus, plus] = row.querySelectorAll("button");
    const out = row.querySelector("output");
    minus.addEventListener("click", () => {
      counts[s.id] = Math.max(0, counts[s.id] - 1);
      out.textContent = counts[s.id];
      updateTotal();
    });
    plus.addEventListener("click", () => {
      counts[s.id] = Math.min(99, counts[s.id] + 1);
      out.textContent = counts[s.id];
      updateTotal();
    });
    calcEl.appendChild(row);
  });
  updateTotal();
}

// Narxlar services.js faylidan keladi (window.SERVICES)
if (window.SERVICES) {
  services = window.SERVICES;
  renderCalc();
} else {
  calcEl.innerHTML = '<p class="mono muted">Narxlar topilmadi: services.js fayli joyida ekanini tekshiring.</p>';
}

// ---------- 6. Mayda narsalar ----------

document.getElementById("year").textContent = new Date().getFullYear();
console.log("%cSalom! Kodimni o'qiyotganingiz uchun rahmat 👋", "color:#a99bff;font-size:16px;font-weight:bold");
