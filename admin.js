// Admin panel: kirish, bosh sahifa (statistika va grafiklar), buyurtmalar, to'lovlar, mijozlar.
// AI LEGENDS bo'limi — admin-legends.js (shu fayldagi api() dan foydalanadi).

const STATUSES = ["yangi", "tasdiqlandi", "jarayonda", "bajarildi", "bekor"];
const STATUS_NAME = { yangi: "Yangi", tasdiqlandi: "Tasdiqlandi", jarayonda: "Jarayonda", bajarildi: "Bajarildi", bekor: "Bekor" };
const STATUS_COLOR = { yangi: "--info", tasdiqlandi: "--violet", jarayonda: "--warn", bajarildi: "--ok", bekor: "--bad" };
const VIEWS = {
  dashboard: ["Bosh sahifa", "Bugungi holat bir qarashda"],
  orders: ["Buyurtmalar", "Hamma buyurtmalar va ularning holati"],
  payments: ["To'lovlar", "Click va Payme orqali tushgan pullar"],
  clients: ["Mijozlar", "Buyurtma bergan odamlar"],
  legends: ["AI LEGENDS", "Kurs o'quvchilari va ularning havolalari"]
};
const SERVICES_LIST = window.SERVICES || [];
const OYLAR = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

let password = sessionStorage.getItem("adminPassword") || "";
let owner = false;          // Telegram bilan kirgan egasi — parol kerak emas
let orders = [];
let filter = "all";
let query = "";

const $ = id => document.getElementById(id);
const loginBox = $("login-box"), ordersBox = $("orders-box"), loginStatus = $("login-status");

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: password ? { "Content-Type": "application/json", "x-admin-password": password } : { "Content-Type": "application/json" }
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "Xatolik"), { status: res.status });
  return data;
}

// ---------- Yordamchilar ----------
const sum = n => Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/[\s,]/g, " ");
const short = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".0", "") + " mln" : n >= 1e3 ? Math.round(n / 1e3) + " ming" : String(n);
const fmtDate = iso => new Date(iso).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
const fmtDay = iso => new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter(x => x !== null && x !== undefined && x !== false));
  return e;
}
const ICON = {
  bag: '<svg viewBox="0 0 24 24"><path d="M19 6h-2a5 5 0 0 0-10 0H5a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2m-7-3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3m0 10a5 5 0 0 1-5-5h2a3 3 0 0 0 6 0h2a5 5 0 0 1-5 5"/></svg>',
  cash: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.3-.6-3-1.2-3-2.1 0-1.1 1-1.9 2.7-1.9 1.8 0 2.4.8 2.5 2.1h2.2a4 4 0 0 0-3.2-3.8V3h-3v2.2C8.1 5.6 6.5 6.9 6.5 8.8c0 2.3 1.9 3.4 4.7 4.1 2.5.6 3 1.5 3 2.4 0 .7-.5 1.8-2.7 1.8-2 0-2.8-.9-3-2.1H6.3c.1 2.2 1.8 3.5 3.7 3.9V21h3v-2.1c1.9-.4 3.5-1.5 3.5-3.6 0-2.8-2.4-3.8-4.7-4.4"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
  card: '<svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 14H4v-6h16zm0-10H4V6h16z"/></svg>'
};

// To'lov qismlari (payments.js dagi partsOf bilan bir xil): bir martalik xizmat — 50/50, obuna va kurs — bir martada
function partsOf(o) {
  const s = SERVICES_LIST.find(x => x.id === o.serviceId);
  const price = Number(o.price) || 0;
  if (s && s.group !== "once") return [{ n: 1, amount: price }];
  const first = Math.ceil(price / 2);
  return [{ n: 1, amount: first }, { n: 2, amount: price - first }];
}
const paidOf = o => Object.values(o.paid || {}).reduce((a, p) => a + (Number(p.amount) || 0), 0);
function payBadge(o) {
  const parts = partsOf(o), n = Object.keys(o.paid || {}).length;
  if (!n) return h("span", { class: "badge pay-none" }, "To'lanmagan");
  if (n >= parts.length) return h("span", { class: "badge s-bajarildi" }, "To'liq to'langan");
  return h("span", { class: "badge s-jarayonda" }, `${n}/${parts.length} qism`);
}
const statusBadge = s => h("span", { class: "badge s-" + s }, STATUS_NAME[s] || s);

function toast(text) {
  const t = h("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 4000);
}

// ---------- Bo'limlar (yon menyu) ----------
function currentView() { const v = location.hash.slice(1); return VIEWS[v] ? v : "dashboard"; }
function showView() {
  const v = currentView();
  for (const k of Object.keys(VIEWS)) $("view-" + k).hidden = k !== v;
  document.querySelectorAll(".side-nav a").forEach(a => a.classList.toggle("active", a.dataset.view === v));
  $("view-title").textContent = VIEWS[v][0];
  $("view-sub").textContent = VIEWS[v][1];
  $("search-wrap").hidden = !["orders", "clients", "payments"].includes(v);
  ordersBox.classList.remove("nav-open");
  render();
}
window.addEventListener("hashchange", showView);
$("menu-btn").addEventListener("click", () => ordersBox.classList.toggle("nav-open"));
$("scrim").addEventListener("click", () => ordersBox.classList.remove("nav-open"));
$("search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });
const matches = o => !query || [o.name, o.contact, o.code, o.serviceName, o.message].some(x => String(x || "").toLowerCase().includes(query));

// ---------- Chizish ----------
function render() {
  const v = currentView();
  const newCount = orders.filter(o => o.status === "yangi").length;
  $("badge-new").hidden = !newCount;
  $("badge-new").textContent = newCount;
  if (v === "dashboard") renderDashboard();
  if (v === "orders") renderOrders();
  if (v === "payments") renderPayments();
  if (v === "clients") renderClients();
}

function kpi({ label, value, unit, sub, icon, tone }) {
  const k = h("div", { class: "kpi" });
  k.innerHTML = `<div class="kpi-top"><span class="kpi-label"></span><span class="kpi-ico ${tone}">${ICON[icon]}</span></div>
    <div class="kpi-val"></div><div class="kpi-sub"></div>`;
  k.querySelector(".kpi-label").textContent = label;
  k.querySelector(".kpi-val").append(value, unit ? h("small", {}, unit) : "");
  k.querySelector(".kpi-sub").innerHTML = sub;
  return k;
}

function renderDashboard() {
  const live = orders.filter(o => o.status !== "bekor");
  const now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = orders.filter(o => new Date(o.createdAt) >= monthStart).length;
  const received = orders.reduce((a, o) => a + paidOf(o), 0);
  const expected = live.reduce((a, o) => a + Math.max(0, (Number(o.price) || 0) - paidOf(o)), 0);
  const active = orders.filter(o => ["yangi", "tasdiqlandi", "jarayonda"].includes(o.status)).length;
  const done = orders.filter(o => o.status === "bajarildi").length;
  $("kpis").replaceChildren(
    kpi({ label: "Jami buyurtmalar", value: String(orders.length), icon: "bag", tone: "t-accent", sub: `Bu oy: <b>+${thisMonth}</b>` }),
    kpi({ label: "Tushgan pul", value: sum(received), unit: "so'm", icon: "cash", tone: "t-ok", sub: "Click va Payme orqali" }),
    kpi({ label: "Kutilayotgan to'lov", value: sum(expected), unit: "so'm", icon: "clock", tone: "t-warn", sub: "Bekor qilinmaganlar bo'yicha" }),
    kpi({ label: "Faol ishlar", value: String(active), icon: "bolt", tone: "t-info", sub: `Bajarilgan: <b>${done}</b>` })
  );
  renderChart();
  renderDonut();
  const recent = orders.slice(0, 6);
  $("recent").replaceChildren(...(recent.length ? recent.map(o => h("div", { class: "mini", onclick: () => openOrder(o.id) },
    h("span", { class: "avatar" }, initials(o.name)),
    h("div", { class: "mini-main" }, h("b", {}, o.name), h("span", {}, `${o.serviceName} · ${fmtDate(o.createdAt)}`)),
    h("div", { class: "mini-r" }, sum(o.price) + " so'm", statusBadge(o.status))
  )) : [h("p", { class: "empty" }, "Hozircha buyurtma yo'q.")]));
  // Xizmatlar reytingi (bekor qilinmaganlar summasi bo'yicha)
  const by = {};
  live.forEach(o => { const k = o.serviceName; by[k] = by[k] || { n: 0, total: 0 }; by[k].n++; by[k].total += Number(o.price) || 0; });
  const top = Object.entries(by).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const max = Math.max(1, ...top.map(t => t[1].total));
  $("top-services").replaceChildren(...(top.length ? top.map(([name, t]) => h("div", { class: "bar-row" },
    h("div", { class: "bar-row-h" }, h("b", {}, name), h("span", {}, `${t.n} ta · ${short(t.total)} so'm`)),
    h("div", { class: "track" }, h("i", { style: `width:${Math.max(4, t.total / max * 100)}%` }))
  )) : [h("p", { class: "empty" }, "Ma'lumot yo'q.")]));
}

function renderChart() {
  const days = 14, W = 640, H = 240, P = { l: 30, r: 12, t: 12, b: 26 };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    data.push({ d, key: d.toDateString(), n: 0, money: 0 });
  }
  const idx = Object.fromEntries(data.map((x, i) => [x.key, i]));
  orders.forEach(o => { const k = new Date(o.createdAt); k.setHours(0, 0, 0, 0); const i = idx[k.toDateString()]; if (i !== undefined) data[i].n++; });
  orders.forEach(o => Object.values(o.paid || {}).forEach(p => { const k = new Date(p.at); k.setHours(0, 0, 0, 0); const i = idx[k.toDateString()]; if (i !== undefined) data[i].money += Number(p.amount) || 0; }));
  const maxN = Math.max(4, ...data.map(x => x.n)), maxM = Math.max(1, ...data.map(x => x.money));
  const iw = W - P.l - P.r, ih = H - P.t - P.b, step = iw / days, bw = Math.min(22, step * .5);
  const y = v => P.t + ih - v / maxN * ih, ym = v => P.t + ih - v / maxM * ih * .9;
  let s = "";
  for (let g = 0; g <= 4; g++) { const v = Math.round(maxN / 4 * g), yy = y(maxN / 4 * g); s += `<line class="grid-l" x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}"/><text class="ax" x="${P.l - 8}" y="${yy + 4}" text-anchor="end">${v}</text>`; }
  const pts = data.map((x, i) => [P.l + step * i + step / 2, ym(x.money)]);
  if (maxM > 1) {
    s += `<path class="area" d="M${pts[0][0]},${P.t + ih} L${pts.map(p => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${P.t + ih}Z"/>`;
    s += `<path class="line" d="M${pts.map(p => p.join(",")).join(" L")}"/>`;
  }
  data.forEach((x, i) => {
    const cx = P.l + step * i + step / 2, bh = Math.max(x.n ? 3 : 0, ih - (y(x.n) - P.t));
    const lbl = x.d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
    s += `<g class="col" data-i="${i}"><rect class="hit" x="${cx - step / 2}" y="${P.t}" width="${step}" height="${ih}" rx="6"/>`
      + `<rect class="bar" x="${cx - bw / 2}" y="${P.t + ih - bh}" width="${bw}" height="${bh}" rx="5"/>`
      + (maxM > 1 ? `<circle class="pt" cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.5"/>` : "")
      + (i % 2 === (days - 1) % 2 ? `<text class="ax" x="${cx}" y="${H - 6}" text-anchor="middle">${lbl}</text>` : "") + `</g>`;
  });
  const box = $("chart");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Oxirgi 14 kundagi buyurtmalar">${s}</svg>`;
  const tip = h("div", { class: "tip", hidden: true });
  box.append(tip);
  box.querySelectorAll(".col").forEach(g => {
    g.addEventListener("mouseenter", () => {
      const x = data[g.dataset.i], r = g.querySelector(".hit").getBoundingClientRect(), br = box.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(x.d.getDate() + "-" + OYLAR[x.d.getMonth()])}</b>Buyurtma: ${x.n}<br>Tushum: ${sum(x.money)} so'm`;
      tip.style.left = (r.left - br.left + r.width / 2) + "px";
      tip.style.top = (g.querySelector(".bar").getBoundingClientRect().top - br.top - 4) + "px";
      tip.hidden = false;
    });
    g.addEventListener("mouseleave", () => (tip.hidden = true));
  });
}

function renderDonut() {
  const total = orders.length, R = 60, C = 2 * Math.PI * R;
  const css = getComputedStyle(document.documentElement);
  let off = 0, arcs = "";
  STATUSES.forEach(s => {
    const n = orders.filter(o => o.status === s).length;
    if (!n) return;
    const len = n / total * C;
    arcs += `<circle cx="85" cy="85" r="${R}" fill="none" stroke="${css.getPropertyValue(STATUS_COLOR[s]).trim()}" stroke-width="20" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}"/>`;
    off += len;
  });
  const ring = `<circle cx="85" cy="85" r="${R}" fill="none" stroke="${css.getPropertyValue("--panel-2").trim()}" stroke-width="20"/>`;
  $("donut").innerHTML = `<div class="donut"><svg viewBox="0 0 170 170">${ring}${arcs}</svg><div class="donut-c"><b>${total}</b><span>buyurtma</span></div></div>`;
  $("donut").append(h("div", { class: "d-legend" }, STATUSES.map(s => h("div", {},
    h("i", { class: "dot", style: `background:var(${STATUS_COLOR[s]})` }), STATUS_NAME[s],
    h("b", {}, String(orders.filter(o => o.status === s).length))))));
}

// ---------- Buyurtmalar jadvali ----------
function renderOrders() {
  const count = s => s === "all" ? orders.length : orders.filter(o => o.status === s).length;
  $("status-chips").replaceChildren(...["all", ...STATUSES].map(s => h("button", {
    class: "chip" + (filter === s ? " on" : ""), type: "button", role: "tab", "aria-selected": String(filter === s),
    onclick: () => { filter = s; renderOrders(); }
  }, s === "all" ? "Hammasi" : STATUS_NAME[s], h("em", {}, String(count(s))))));

  const list = orders.filter(o => (filter === "all" || o.status === filter) && matches(o));
  $("empty").hidden = list.length > 0;
  $("orders-body").replaceChildren(...list.map(o => {
    const select = h("select", { class: "st-select s-" + o.status, "aria-label": "Holat" },
      STATUSES.map(s => { const op = h("option", { value: s }, STATUS_NAME[s]); op.selected = s === o.status; return op; }));
    select.addEventListener("change", () => setStatus(o, select.value));
    return h("tr", {},
      h("td", { class: "nowrap" }, fmtDate(o.createdAt)),
      h("td", { class: "who" }, h("b", {}, o.name), h("span", {}, o.contact)),
      h("td", {}, o.serviceName, o.message ? h("div", { class: "muted", title: o.message }, o.message.length > 40 ? o.message.slice(0, 40) + "…" : o.message) : null),
      h("td", { class: "num" }, sum(o.price)),
      h("td", {}, payBadge(o)),
      h("td", {}, select),
      h("td", {}, h("div", { class: "row-act" },
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => openOrder(o.id) }, "Batafsil"),
        delButton(o)))
    );
  }));
}

function delButton(o, after) {
  const b = h("button", { class: "btn btn-ghost btn-sm btn-danger", type: "button" }, "O'chirish");
  b.addEventListener("click", async () => {
    // Ikki marta bosish kerak — tasodifan o'chmasin
    if (b.dataset.confirm !== "1") {
      b.dataset.confirm = "1"; b.textContent = "Rostdanmi?";
      setTimeout(() => { b.dataset.confirm = ""; b.textContent = "O'chirish"; }, 3000);
      return;
    }
    try { await api(`api/orders/${o.id}`, { method: "DELETE" }); toast("Buyurtma o'chirildi"); if (after) after(); loadOrders(); }
    catch (e) { toast("Xatolik: " + e.message); }
  });
  return b;
}

async function setStatus(o, status) {
  try {
    const r = await api(`api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    toast(r && r.notified ? (r.notified.ok ? "✉️ Mijozga Telegram orqali xabar yuborildi" : `ℹ️ Holat saqlandi, mijozga xabar ketmadi: ${r.notified.reason}`) : "Holat saqlandi");
  } catch (e) { toast("Xatolik: " + e.message); }
  await loadOrders();
  if (!$("drawer").hidden && $("drawer").dataset.id === o.id) openOrder(o.id);
}

// ---------- Buyurtma tafsiloti ----------
function openOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const d = $("drawer");
  d.dataset.id = id;
  $("d-title").textContent = "Buyurtma #" + (o.code || o.id.slice(0, 8));
  const paid = o.paid || {};
  const select = h("select", { class: "st-select s-" + o.status, "aria-label": "Holat" },
    STATUSES.map(s => { const op = h("option", { value: s }, STATUS_NAME[s]); op.selected = s === o.status; return op; }));
  select.addEventListener("change", () => setStatus(o, select.value));
  const payLink = o.code ? location.origin + "/tolov.html?o=" + o.code : "";
  $("d-body").replaceChildren(
    h("dl", { class: "dl" },
      h("dt", {}, "Mijoz"), h("dd", {}, o.name),
      h("dt", {}, "Aloqa"), h("dd", {}, o.contact),
      h("dt", {}, "Xizmat"), h("dd", {}, o.serviceName),
      h("dt", {}, "Narx"), h("dd", {}, sum(o.price) + " so'm"),
      h("dt", {}, "Sana"), h("dd", {}, fmtDate(o.createdAt)),
      h("dt", {}, "Til"), h("dd", {}, (o.lang || "uz").toUpperCase()),
      h("dt", {}, "Holat"), h("dd", {}, select)),
    o.message ? h("p", { class: "d-sec" }, "Izoh") : null,
    o.message ? h("p", { class: "msg" }, o.message) : null,
    h("p", { class: "d-sec" }, "To'lov"),
    h("div", { class: "parts" }, partsOf(o).map(p => h("div", { class: "part" },
      h("div", {}, h("b", {}, partsOf(o).length > 1 ? `${p.n}-qism` : "To'liq to'lov"),
        h("small", {}, paid[p.n] ? `${fmtDate(paid[p.n].at)} · ${String(paid[p.n].method || "").toUpperCase()}` : (p.n === 2 && o.status !== "bajarildi" ? "Ish tayyor bo'lgach ochiladi" : "Kutilmoqda"))),
      h("div", { class: "mini-r" }, sum(p.amount) + " so'm", paid[p.n] ? h("span", { class: "badge s-bajarildi" }, "To'langan") : h("span", { class: "badge pay-none" }, "To'lanmagan"))))),
    h("div", { class: "d-actions" },
      payLink ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: async () => {
        try { await navigator.clipboard.writeText(payLink); toast("To'lov havolasi nusxalandi"); } catch { prompt("To'lov havolasi:", payLink); }
      } }, "🔗 To'lov havolasini nusxalash") : null,
      delButton(o, closeDrawer))
  );
  d.hidden = false;
}
function closeDrawer() { $("drawer").hidden = true; }
$("drawer").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

// ---------- To'lovlar ----------
function renderPayments() {
  const rows = [];
  orders.forEach(o => Object.entries(o.paid || {}).forEach(([n, p]) => rows.push({ o, n, ...p })));
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const by = m => rows.filter(r => r.method === m).reduce((a, r) => a + (Number(r.amount) || 0), 0);
  $("pay-kpis").replaceChildren(
    kpi({ label: "Jami tushum", value: sum(total), unit: "so'm", icon: "cash", tone: "t-ok", sub: `${rows.length} ta to'lov` }),
    kpi({ label: "Payme", value: sum(by("payme")), unit: "so'm", icon: "card", tone: "t-info", sub: `${rows.filter(r => r.method === "payme").length} ta to'lov` }),
    kpi({ label: "Click", value: sum(by("click")), unit: "so'm", icon: "card", tone: "t-violet", sub: `${rows.filter(r => r.method === "click").length} ta to'lov` })
  );
  const list = rows.filter(r => matches(r.o));
  $("pay-empty").hidden = list.length > 0;
  $("pay-body").replaceChildren(...list.map(r => h("tr", { style: "cursor:pointer", onclick: () => openOrder(r.o.id) },
    h("td", { class: "nowrap" }, fmtDate(r.at)),
    h("td", { class: "who" }, h("b", {}, r.o.name), h("span", {}, r.o.contact)),
    h("td", {}, r.o.serviceName),
    h("td", {}, partsOf(r.o).length > 1 ? `${r.n}-qism` : "To'liq"),
    h("td", {}, h("span", { class: "badge " + (r.method === "click" ? "s-tasdiqlandi" : "s-yangi") }, String(r.method || "—").toUpperCase())),
    h("td", { class: "num" }, h("b", {}, sum(r.amount) + " so'm"))
  )));
}

// ---------- Mijozlar ----------
function renderClients() {
  const map = new Map();
  orders.forEach(o => {
    const key = o.tgUserId ? "tg:" + o.tgUserId : "c:" + String(o.contact).toLowerCase();
    const c = map.get(key) || { name: o.name, contact: o.contact, n: 0, paid: 0, last: o.createdAt, orders: [] };
    c.n++; c.paid += paidOf(o); c.orders.push(o);
    if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.name; }
    map.set(key, c);
  });
  const list = [...map.values()].filter(c => c.orders.some(matches)).sort((a, b) => String(b.last).localeCompare(String(a.last)));
  $("clients-empty").hidden = list.length > 0;
  $("clients-body").replaceChildren(...list.map(c => h("tr", {},
    h("td", {}, h("div", { class: "mini", style: "padding:0;border:0;cursor:default" }, h("span", { class: "avatar" }, initials(c.name)), h("div", { class: "mini-main" }, h("b", {}, c.name)))),
    h("td", {}, c.contact),
    h("td", { class: "num" }, String(c.n)),
    h("td", { class: "num" }, sum(c.paid) + " so'm"),
    h("td", { class: "nowrap" }, fmtDay(c.last))
  )));
}

// ---------- CSV ----------
$("export-btn").addEventListener("click", () => {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Sana", "Kod", "Ism", "Aloqa", "Xizmat", "Narx", "To'langan", "Holat", "Izoh"]]
    .concat(orders.map(o => [fmtDate(o.createdAt), o.code, o.name, o.contact, o.serviceName, o.price, paidOf(o), STATUS_NAME[o.status], o.message]));
  const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
});

// ---------- Kirish / chiqish ----------
async function loadOrders() {
  try {
    orders = await api("api/orders");
    loginBox.hidden = true;
    ordersBox.hidden = false;
    render();
  } catch (err) {
    if (err.status === 401) logout(password ? "Parol noto'g'ri." : "");
    else if (err.status === 429) { loginStatus.className = "form-status error"; loginStatus.textContent = err.message; }
  }
}

async function logout(message = "") {
  if (owner && !message) { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); owner = false; }
  password = "";
  sessionStorage.removeItem("adminPassword");
  loginBox.hidden = false;
  ordersBox.hidden = true;
  loginStatus.className = "form-status" + (message ? " error" : "");
  loginStatus.textContent = message;
}

$("login-form").addEventListener("submit", e => {
  e.preventDefault();
  password = $("password").value;
  sessionStorage.setItem("adminPassword", password);
  loadOrders();
});
$("logout-btn").addEventListener("click", () => logout());
$("refresh-btn").addEventListener("click", async e => {
  const b = e.currentTarget; b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
  await loadOrders();
});
$("theme-btn").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("admin-theme", next); } catch {}
  render();          // grafik ranglari yangilansin
});

// Qaysi kirish usullari yoqilgan: Telegram (egasi) va/yoki parol
(async function init() {
  let me = { owner: false, telegram: false, password: true };
  try { me = await (await fetch("/api/admin/me")).json(); } catch {}
  owner = !!me.owner;
  $("tg-admin").hidden = !me.telegram;
  $("pw-field").hidden = !me.password;
  $("pw-btn").hidden = !me.password;
  $("password").required = !!me.password;
  if (!me.password && me.telegram) {
    $("tg-note").hidden = false;
    $("tg-note").textContent = "Xavfsizlik uchun admin panelga faqat egasining Telegram akkaunti bilan kiriladi.";
  }
  showView();
  if (owner || password) loadOrders();
})();
// Har 30 soniyada yangi buyurtmalarni tekshiramiz
setInterval(() => { if ((owner || password) && !ordersBox.hidden && $("drawer").hidden) loadOrders(); }, 30000);

// Admin panel faqat serverda ishlaydi (buyurtmalar serverda saqlanadi)
if (location.protocol === "file:") {
  loginStatus.className = "form-status error";
  loginStatus.textContent = "Admin panel faqat internetdagi saytda yoki npm start bilan ishlaydi.";
}
