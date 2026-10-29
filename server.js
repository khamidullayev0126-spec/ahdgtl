// AHdigital — backend server (Node.js + Express)
// Ishga tushirish: npm install, keyin npm start

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Xizmatlar ro'yxati public/services.js faylida turadi
const PUBLIC_DIR = path.join(__dirname, "public");
let SERVICES = [];
try {
  SERVICES = require("./public/services.js");
} catch {
  console.error("❌ public/services.js topilmadi! GitHub'ga public papkasi yuklanganini tekshiring.");
}

const STATUSES = ["yangi", "jarayonda", "bajarildi", "bekor"];

// ---------- Buyurtmalarni faylda saqlash ----------
function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// ---------- Telegramga xabar yuborish (ixtiyoriy) ----------
async function notifyTelegram(order, service) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const text =
    `🆕 Yangi buyurtma!\n\n` +
    `👤 Ism: ${order.name}\n` +
    `📞 Aloqa: ${order.contact}\n` +
    `📦 Xizmat: ${service.name} (${service.price.toLocaleString("ru-RU")} so'm)\n` +
    `💬 Izoh: ${order.message || "—"}`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
    });
  } catch (err) {
    console.error("Telegramga yuborib bo'lmadi:", err.message);
  }
}

// ---------- Oddiy himoya: bitta IP dan juda ko'p so'rov kelmasin ----------
const recentRequests = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const list = (recentRequests.get(req.ip) || []).filter(t => now - t < 60_000);
  if (list.length >= 5) {
    return res.status(429).json({ error: "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring." });
  }
  list.push(now);
  recentRequests.set(req.ip, list);
  next();
}

// ---------- Admin tekshiruvi ----------
function requireAdmin(req, res, next) {
  const given = Buffer.from(req.get("x-admin-password") || "");
  const real = Buffer.from(ADMIN_PASSWORD);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    return res.status(401).json({ error: "Parol noto'g'ri." });
  }
  next();
}

// Render kabi xostinglarda mijozning haqiqiy IP manzilini bilish uchun
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));
app.use(express.static(PUBLIC_DIR));

// public papkasi yo'q bo'lsa — tushunarli xabar ko'rsatamiz
if (!fs.existsSync(path.join(PUBLIC_DIR, "index.html"))) {
  console.error("❌ public/index.html topilmadi! GitHub'ga public papkasini yuklang.");
  app.get("/", (req, res) => res.status(500).send(
    "<h1>public papkasi topilmadi</h1><p>GitHub repongizga <b>public</b> papkasini yuklang (sichqoncha bilan sudrab tashlang).</p>"
  ));
}

// ================= API =================

// Render server ishlayotganini shu manzil orqali tekshiradi
app.get("/healthz", (req, res) => res.send("ok"));

// Barcha xizmatlar
app.get("/api/services", (req, res) => {
  res.json(SERVICES);
});

// Yangi buyurtma qabul qilish
app.post("/api/orders", rateLimit, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const contact = String(req.body.contact || "").trim();
  const serviceId = String(req.body.serviceId || "").trim();
  const message = String(req.body.message || "").trim();

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: "Ismingizni kiriting (2–60 ta harf)." });
  }
  if (contact.length < 5 || contact.length > 60) {
    return res.status(400).json({ error: "Telefon raqam yoki Telegram username kiriting." });
  }
  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) {
    return res.status(400).json({ error: "Xizmatni tanlang." });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: "Izoh 1000 ta belgidan oshmasin." });
  }

  const order = {
    id: crypto.randomUUID(),
    name,
    contact,
    serviceId,
    serviceName: service.name,
    price: service.price,
    message,
    status: "yangi",
    createdAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
  notifyTelegram(order, service);

  res.status(201).json({ ok: true, id: order.id });
});

// Admin: barcha buyurtmalar
app.get("/api/orders", requireAdmin, (req, res) => {
  res.json(readOrders());
});

// Admin: buyurtma holatini o'zgartirish
app.patch("/api/orders/:id", requireAdmin, (req, res) => {
  const status = String(req.body.status || "");
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Noto'g'ri holat." });
  }
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Buyurtma topilmadi." });
  order.status = status;
  writeOrders(orders);
  res.json(order);
});

// Admin: buyurtmani o'chirish
app.delete("/api/orders/:id", requireAdmin, (req, res) => {
  const orders = readOrders();
  const left = orders.filter(o => o.id !== req.params.id);
  if (left.length === orders.length) return res.status(404).json({ error: "Buyurtma topilmadi." });
  writeOrders(left);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Sayt ishga tushdi: http://localhost:${PORT}`);
  console.log(`🔐 Admin panel:      http://localhost:${PORT}/admin.html`);
  if (ADMIN_PASSWORD === "admin123") {
    console.log("⚠️  Diqqat: .env faylida ADMIN_PASSWORD ni o'zgartiring!");
  }
});
