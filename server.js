// AHdigital — backend server (Node.js + Express)
// Ishga tushirish: npm install, keyin npm start

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createBot } = require("./bot");
const { createSiteChat } = require("./chat");
const { createLegends } = require("./legends");
const { createStore } = require("./store");
const { createAuth } = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Sayt fayllari "public" papkasida turadi.
// Agar GitHub'ga papkasiz (hamma fayl bir joyda) yuklangan bo'lsa — asosiy papkadan olamiz.
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, "public", "index.html"))
  ? path.join(__dirname, "public")
  : __dirname;
const FLAT = PUBLIC_DIR === __dirname;

// Xizmatlar ro'yxati services.js faylida turadi
let SERVICES = [];
try {
  SERVICES = require(path.join(PUBLIC_DIR, "services.js"));
} catch {
  console.error("❌ services.js topilmadi! GitHub'ga barcha fayllar yuklanganini tekshiring.");
}

const STATUSES = ["yangi", "tasdiqlandi", "jarayonda", "bajarildi", "bekor"];

// ---------- Buyurtmalar: doimiy omborda (store.js — Upstash Redis yoki data/ papkasi) ----------
const store = createStore({ dataDir: DATA_DIR });
const readOrders = () => store.get("orders", []);
const writeOrders = orders => store.set("orders", orders);

// ---------- Telegram bot (ixtiyoriy) ----------
// Render manzilni RENDER_EXTERNAL_URL orqali o'zi beradi; kompyuterda bot "polling" rejimida ishlaydi
const bot = createBot({
  token: TELEGRAM_BOT_TOKEN,
  ownerChatId: TELEGRAM_CHAT_ID,
  publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "",
  services: SERVICES,
  readOrders,
  writeOrders,
  store
});

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
// Papkasiz tuzilishda server fayllari va buyurtmalar brauzerga ko'rinmasin
if (FLAT) {
  const HIDDEN = /^\/(data|node_modules|fonts)(\/|$)|^\/(server|bot|agent|call|image|chat|store|auth|legends|legends-darslar)\.js$|^\/(package(-lock)?\.json|render\.yaml|README\.md|\.env.*)$/i;
  app.use((req, res, next) => (HIDDEN.test(req.path) ? res.status(404).send("Topilmadi") : next()));
}
// Eski portfolio manzillari → yangi portfolio.html
app.get(["/portfolio", "/portfolio/", "/portfolio/index.html"], (req, res) => res.redirect(301, "/portfolio.html"));

// AI LEGENDS kurs platformasi (/legends)
createLegends({ app, requireAdmin, publicDir: PUBLIC_DIR, store, adminPassword: ADMIN_PASSWORD });

// ---------- Telegram orqali kirish (auth.js) ----------
// Sayt ochiq; buyurtma, AI chat va ilova uchun kirish kerak (Telegram, Google yoki email).
// LOGIN_REQUIRED = 1 — butun saytni yopish, 0 — kirishni umuman o'chirish
const auth = createAuth({ botToken: TELEGRAM_BOT_TOKEN, store, readOrders, publicDir: PUBLIC_DIR, botUsername: () => (bot && bot.username()) || process.env.TELEGRAM_BOT_USERNAME || "" });
if (auth) { auth.install(app); app.use(auth.gate); }
else app.get("/api/auth/config", (req, res) => res.json({ bot: "", google: "", email: false }));

app.use(express.static(PUBLIC_DIR));

if (!fs.existsSync(path.join(PUBLIC_DIR, "index.html"))) {
  console.error("❌ index.html topilmadi! GitHub'ga sayt fayllarini yuklang.");
  app.get("/", (req, res) => res.status(500).send(
    "<h1>index.html topilmadi</h1><p>GitHub repongizga sayt fayllarini yuklang.</p>"
  ));
}

// ================= API =================

// Render server ishlayotganini shu manzil orqali tekshiradi
app.get("/healthz", (req, res) => res.send("ok"));

// Google Play ilovasi (TWA) sayt egasi bir ekanini tekshiradi.
// Render → Environment: ANDROID_PACKAGE (masalan uz.ahdgital.app) va ANDROID_SHA256 (PWABuilder bergan barmoq izi)
app.get("/.well-known/assetlinks.json", (req, res) => {
  const pkg = process.env.ANDROID_PACKAGE, sha = process.env.ANDROID_SHA256;
  if (!pkg || !sha) return res.status(404).json([]);
  res.json([{ relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: sha.split(",").map(x => x.trim()) } }]);
});

// Barcha xizmatlar
app.get("/api/services", (req, res) => {
  res.json(SERVICES);
});

// Yangi buyurtma qabul qilish
// Saytdagi AI suhbat oynasi (ANTHROPIC_API_KEY bo'lsa)
const siteChat = createSiteChat({ services: SERVICES });
app.get("/api/chat", (req, res) => res.json({ enabled: !!siteChat }));
if (siteChat) app.post("/api/chat", siteChat);

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
    code: crypto.randomBytes(4).toString("hex"),   // qisqa kod: bot havolasi uchun
    name,
    contact,
    serviceId,
    serviceName: service.name,
    price: service.price,
    message,
    status: "yangi",
    tgUserId: req.user ? req.user.id : undefined,   // kirgan foydalanuvchi — kabinetda ko'rinadi
    createdAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
  if (bot) bot.onNewOrder(order).catch(err => console.error("Bot xatosi:", err.message));

  res.status(201).json({ ok: true, id: order.id, telegramLink: bot ? bot.deepLink(order) : "" });
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

// Avval ombordagi ma'lumotlar yuklanadi, keyin sayt ishga tushadi
store.init().catch(err => { console.error("❌", err.message); process.exit(1); }).then(() => app.listen(PORT, async () => {
  console.log(`✅ Sayt ishga tushdi: http://localhost:${PORT}`);
  console.log(`🔐 Admin panel:      http://localhost:${PORT}/admin.html`);
  if (ADMIN_PASSWORD === "admin123") {
    console.log("⚠️  Diqqat: .env faylida ADMIN_PASSWORD ni o'zgartiring!");
  }
  if (bot) await bot.start(app).catch(err => console.error("Botni ishga tushirib bo'lmadi:", err.message));
  else console.log("ℹ️  TELEGRAM_BOT_TOKEN yo'q — bot o'chiq.");
}));
