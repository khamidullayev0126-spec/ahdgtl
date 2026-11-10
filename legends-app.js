// AI LEGENDS — o'quvchi sahifasi
const app = document.getElementById("app");
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const OYLAR = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const fmtDate = iso => {   // Toshkent vaqti: "9-noyabr, 09:00"
  const d = new Date(new Date(iso).getTime() + 5 * 3600000);
  return `${d.getUTCDate()}-${OYLAR[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
const left = iso => { const ms = new Date(iso) - Date.now(); if (ms <= 0) return "tugadi"; const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h ? `${h} soat ${m} daq qoldi` : `${m} daqiqa qoldi`; };

// Ko'rilgan darslar — faqat shu brauzerda (qulaylik uchun)
const DONE_KEY = "legends-done";
const getDone = () => { try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]")); } catch { return new Set(); } };
const setDone = s => { try { localStorage.setItem(DONE_KEY, JSON.stringify([...s])); } catch {} };

let me = null;

async function load() {
  const r = await fetch("/api/legends/me", { credentials: "same-origin" });
  if (r.status === 401) return showLocked();
  me = await r.json();
  $("logout").hidden = false;
  render();
}

function showLocked() {
  const bad = new URLSearchParams(location.search).get("xato") === "havola";
  app.replaceChildren();
  const box = el("section", "lg-locked");
  box.append(el("span", "lg-chip gold", "Yopiq kurs"), el("h1", "", "AI LEGENDS darslari faqat o'quvchilar uchun"));
  if (bad) box.append(el("p", "lg-warn", "Havola noto'g'ri yoki muddati tugagan. Ustozingizdan yangi havola so'rang."));
  const steps = el("ol", "lg-steps");
  ["Kursga yoziling: Telegram @Abdulkhamid_2905", "To'lovni amalga oshiring — oyiga 500 000 so'm", "To'lov qabul qilingach, sizga shaxsiy maxfiy havola yuboriladi", "Havolani oching — profilingiz va darslaringiz shu yerda"].forEach(t => steps.append(el("li", "", t)));
  const a = el("a", "lg-btn", "Telegram'da yozish"); a.href = "https://t.me/Abdulkhamid_2905"; a.target = "_blank"; a.rel = "noopener";
  box.append(steps, a);
  app.append(box);
}

function render() {
  const done = getDone();
  app.replaceChildren();

  // Profil
  const head = el("section", "lg-profile");
  const who = el("div", "lg-who");
  who.append(el("span", "lg-chip gold", me.guruhNom), el("h1", "", `Salom, ${me.ism}!`),
    el("p", "lg-muted", `Obuna ${fmtDate(me.tugaydi)} gacha faol.`));
  const total = me.darslar.length, seen = me.darslar.filter(d => done.has(`${me.guruh}${d.n}`)).length;
  const prog = el("div", "lg-progress");
  const bar = el("div", "lg-bar"); const fill = el("i"); fill.style.width = `${Math.round(seen / total * 100)}%`; bar.append(fill);
  prog.append(el("span", "", `${seen} / ${total} dars ko'rildi`), bar);
  head.append(who, prog);

  // Darslar
  const list = el("section", "lg-lessons");
  list.append(el("h2", "", "Darslar"), el("p", "lg-muted", me.oynaSoat ? `Har bir dars ochilgandan keyin ${me.oynaSoat} soat davomida ko'rinadi — o'zingizga qulay vaqtda ko'ring.` : "Ochilgan darslarni istalgan vaqtda ko'rishingiz mumkin."));
  const grid = el("div", "lg-grid");
  me.darslar.forEach(d => {
    const isDone = done.has(`${me.guruh}${d.n}`);
    const card = el(d.holat === "ochiq" ? "button" : "div", `lg-card ${d.holat}${isDone ? " seen" : ""}`);
    if (d.holat === "ochiq") { card.type = "button"; card.addEventListener("click", () => openLesson(d.n)); }
    const top = el("div", "lg-card-top");
    top.append(el("span", "lg-num", String(d.n).padStart(2, "0")),
      el("span", `lg-chip ${d.holat}`, d.holat === "ochiq" ? (d.yopiladi ? "Ochiq · " + left(d.yopiladi) : "Ochiq") : d.holat === "kutilmoqda" ? "Ochiladi: " + fmtDate(d.ochiladi) : "Muddati tugagan"));
    card.append(top, el("h3", "", d.nom), el("p", "", d.maqsad));
    if (isDone) card.append(el("span", "lg-seen", "✓ Ko'rildi"));
    grid.append(card);
  });
  list.append(grid);
  app.append(head, list);
}

// ---------- Dars oynasi ----------
let slides = [], idx = 0, current = null, lastFocus = null;

function ytEmbed(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : "";
}

async function openLesson(n) {
  const r = await fetch(`/api/legends/dars/${n}`, { credentials: "same-origin" });
  const d = await r.json();
  if (!r.ok) { alertBox(d.error || "Darsni ochib bo'lmadi."); load(); return; }
  current = d; lastFocus = document.activeElement;
  $("lesson-title").textContent = `${String(d.n).padStart(2, "0")} · ${d.nom}`;
  const info = me.darslar.find(x => x.n === n);
  $("lesson-timer").textContent = info && info.yopiladi ? "⏳ " + left(info.yopiladi) : "";

  const v = $("lesson-video"); v.replaceChildren();
  const src = ytEmbed(d.video);
  if (src) {
    const f = document.createElement("iframe");
    f.src = src; f.title = d.nom; f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.loading = "lazy";
    v.append(f);
  } else v.append(el("div", "video-empty", "🎬 Video dars tez orada shu yerda bo'ladi. Hozircha slaydlarni ko'rib chiqing."));

  slides = [
    { t: d.nom, b: [`Maqsad: ${d.maqsad}`], kind: "cover" },
    ...d.slaydlar.map(([t, b]) => ({ t, b })),
    { t: "Darsdagi mashq", b: [d.mashq], kind: "task" },
    { t: "Uy ishi", b: [d.uyIshi, "Bajarib, guruh chatiga yoki ustozga yuboring."], kind: "home" }
  ];
  idx = 0; drawSlide();
  $("lesson").hidden = false; document.body.style.overflow = "hidden";
  $("deck").focus();
}

function drawSlide() {
  const s = slides[idx], box = $("slide");
  box.className = "slide " + (s.kind || "");
  box.replaceChildren();
  if (s.kind === "task") box.append(el("span", "lg-chip gold", "Mashq"));
  if (s.kind === "home") box.append(el("span", "lg-chip gold", "Uy ishi"));
  box.append(el("h3", "", s.t));
  const ul = el("ul");
  s.b.forEach(t => ul.append(el("li", "", t)));
  box.append(ul);
  $("counter").textContent = `${idx + 1} / ${slides.length}`;
  $("prev").disabled = idx === 0; $("next").disabled = idx === slides.length - 1;
}
const go = d => { idx = Math.max(0, Math.min(slides.length - 1, idx + d)); drawSlide(); };
$("prev").addEventListener("click", () => go(-1));
$("next").addEventListener("click", () => go(1));
$("deck").addEventListener("keydown", e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
$("full").addEventListener("click", () => { const d = $("deck"); (document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen?.())?.catch?.(() => {}); });
function closeLesson() { $("lesson").hidden = true; document.body.style.overflow = ""; $("lesson-video").replaceChildren(); render(); lastFocus?.focus?.(); }
$("lesson-back").addEventListener("click", closeLesson);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("lesson").hidden && !document.fullscreenElement) closeLesson(); });
$("done").addEventListener("click", () => { const s = getDone(); s.add(`${me.guruh}${current.n}`); setDone(s); closeLesson(); });

$("logout").addEventListener("click", async () => { await fetch("/api/legends/chiqish", { method: "POST" }); location.href = "/legends"; });

function alertBox(text) {
  const b = el("div", "lg-toast", text); document.body.append(b); setTimeout(() => b.remove(), 4000);
}

// Ochiq dars taymerlarini har daqiqada yangilaymiz
setInterval(() => { if (me && $("lesson").hidden) render(); }, 60000);
load().catch(() => { app.replaceChildren(el("p", "lg-warn", "Server bilan bog'lanib bo'lmadi. Sahifani yangilang.")); });
