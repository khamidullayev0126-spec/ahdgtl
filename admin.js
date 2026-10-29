// Admin panel JavaScript: kirish, buyurtmalarni ko'rish, holatini o'zgartirish, o'chirish

const STATUSES = ["yangi", "jarayonda", "bajarildi", "bekor"];
let password = sessionStorage.getItem("adminPassword") || "";

const loginBox = document.getElementById("login-box");
const ordersBox = document.getElementById("orders-box");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const logoutBtn = document.getElementById("logout-btn");
const tbody = document.getElementById("orders-body");
const emptyEl = document.getElementById("empty");
const statsEl = document.getElementById("stats");

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "x-admin-password": password }
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "Xatolik"), { status: res.status });
  return data;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
}

function renderStats(orders) {
  const count = s => orders.filter(o => o.status === s).length;
  const income = orders.filter(o => o.status === "bajarildi").reduce((sum, o) => sum + o.price, 0);
  statsEl.innerHTML = "";
  [
    ["Jami", orders.length],
    ["Yangi", count("yangi")],
    ["Jarayonda", count("jarayonda")],
    ["Bajarildi", count("bajarildi")],
    ["Daromad (so'm)", income.toLocaleString("ru-RU")]
  ].forEach(([label, value]) => {
    const div = document.createElement("div");
    div.className = "stat";
    div.innerHTML = "<span></span><strong></strong>";
    div.querySelector("span").textContent = label;
    div.querySelector("strong").textContent = value;
    statsEl.appendChild(div);
  });
}

function renderOrders(orders) {
  tbody.innerHTML = "";
  emptyEl.hidden = orders.length > 0;
  renderStats(orders);

  orders.forEach(o => {
    const tr = document.createElement("tr");
    const cells = [formatDate(o.createdAt), o.name, o.contact, o.serviceName, o.message || "—"];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });

    // Holat tanlash
    const tdStatus = document.createElement("td");
    const select = document.createElement("select");
    select.className = "input input-sm status-" + o.status;
    STATUSES.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      opt.selected = s === o.status;
      select.appendChild(opt);
    });
    select.addEventListener("change", async () => {
      await api(`api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
      loadOrders();
    });
    tdStatus.appendChild(select);
    tr.appendChild(tdStatus);

    // O'chirish tugmasi (ikki marta bosish kerak — tasodifan o'chmasin)
    const tdDel = document.createElement("td");
    const del = document.createElement("button");
    del.className = "btn btn-secondary btn-sm";
    del.textContent = "O'chirish";
    del.addEventListener("click", async () => {
      if (del.dataset.confirm !== "1") {
        del.dataset.confirm = "1";
        del.textContent = "Rostdanmi?";
        setTimeout(() => { del.dataset.confirm = ""; del.textContent = "O'chirish"; }, 3000);
        return;
      }
      await api(`api/orders/${o.id}`, { method: "DELETE" });
      loadOrders();
    });
    tdDel.appendChild(del);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });
}

async function loadOrders() {
  try {
    const orders = await api("api/orders");
    loginBox.hidden = true;
    ordersBox.hidden = false;
    logoutBtn.hidden = false;
    renderOrders(orders);
  } catch (err) {
    if (err.status === 401) logout(password ? "Parol noto'g'ri." : "");
  }
}

function logout(message = "") {
  password = "";
  sessionStorage.removeItem("adminPassword");
  loginBox.hidden = false;
  ordersBox.hidden = true;
  logoutBtn.hidden = true;
  loginStatus.className = "form-status" + (message ? " error" : "");
  loginStatus.textContent = message;
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  password = document.getElementById("password").value;
  sessionStorage.setItem("adminPassword", password);
  loadOrders();
});

logoutBtn.addEventListener("click", () => logout());

if (password) loadOrders();
// Har 30 soniyada yangi buyurtmalarni tekshiramiz
setInterval(() => { if (password && !ordersBox.hidden) loadOrders(); }, 30000);

// Admin panel faqat serverda ishlaydi (buyurtmalar serverda saqlanadi)
if (location.protocol === "file:") {
  loginStatus.className = "form-status error";
  loginStatus.textContent = "Admin panel faqat internetdagi saytda yoki npm start bilan ishlaydi.";
}
