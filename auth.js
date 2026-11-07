// AHdigital — Telegram orqali kirish (Telegram Login Widget)
//
// Qanday ishlaydi:
// 1) kabinet.html sahifasida Telegram'ning rasmiy tugmasi turadi.
// 2) Mijoz bosib, Telegram'da tasdiqlaydi → Telegram uning ma'lumotlarini imzo (hash) bilan qaytaradi.
// 3) Server imzoni bot tokeni bilan tekshiradi — soxtalashtirib bo'lmaydi.
// 4) To'g'ri bo'lsa, brauzerga 30 kunlik himoyalangan cookie qo'yiladi.
//
// Sozlash: BotFather → /setdomain → botingizni tanlang → ahdigital-1pcz.onrender.com
// Ixtiyoriy: Render → Environment → SESSION_SECRET (uzun tasodifiy matn). Bo'lmasa bot tokenidan hosil qilinadi.

const crypto = require("crypto");

const COOKIE = "ahd_sess";
const SESSION_DAYS = 30;
const MAX_AUTH_AGE = 24 * 60 * 60;   // Telegram javobi 24 soatdan eski bo'lmasin

function createAuth({ botToken, store, readOrders, botUsername }) {
  if (!botToken) return null;
  const sessionKey = process.env.SESSION_SECRET || crypto.createHash("sha256").update("sess:" + botToken).digest("hex");
  const tgKey = crypto.createHash("sha256").update(botToken).digest();

  const b64 = s => Buffer.from(s).toString("base64url");
  const sign = s => crypto.createHmac("sha256", sessionKey).update(s).digest("base64url");
  const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

  // Telegram imzosini tekshirish (rasmiy qoida: core.telegram.org/widgets/login#checking-authorization)
  function checkTelegram(data) {
    if (!data || typeof data !== "object" || typeof data.hash !== "string") return false;
    const checkString = Object.keys(data).filter(k => k !== "hash" && data[k] != null).sort().map(k => `${k}=${data[k]}`).join("\n");
    const hash = crypto.createHmac("sha256", tgKey).update(checkString).digest("hex");
    if (!same(hash, data.hash)) return false;
    const age = Math.floor(Date.now() / 1000) - Number(data.auth_date);
    return age >= 0 && age < MAX_AUTH_AGE;
  }

  function makeSession(id) {
    const body = b64(JSON.stringify({ id, exp: Date.now() + SESSION_DAYS * 864e5 }));
    return body + "." + sign(body);
  }

  function readSession(req) {
    const raw = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
    if (!raw) return null;
    const [body, sig] = raw.slice(COOKIE.length + 1).split(".");
    if (!body || !sig || !same(sign(body), sig)) return null;
    try {
      const s = JSON.parse(Buffer.from(body, "base64url").toString());
      return s.exp > Date.now() ? s : null;
    } catch { return null; }
  }

  function setCookie(res, value, maxAge) {
    const secure = process.env.NODE_ENV === "production" || !!process.env.RENDER ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
  }

  const users = () => store.get("foydalanuvchilar", {});

  // Mijozning buyurtmalari: bot orqali bog'langanlari (tgChatId) yoki @username bilan yozilganlari
  function ordersOf(user) {
    const uname = user.username ? "@" + user.username.toLowerCase() : null;
    return readOrders()
      .filter(o => String(o.tgUserId) === String(user.id) || String(o.tgChatId) === String(user.id) || (uname && String(o.contact || "").trim().toLowerCase() === uname))
      .map(o => ({ code: o.code, serviceName: o.serviceName, price: o.price, status: o.status, createdAt: o.createdAt }));
  }

  function install(app) {
    app.get("/api/auth/config", (req, res) => res.json({ bot: botUsername() || "" }));

    app.post("/api/auth/telegram", (req, res) => {
      const d = req.body || {};
      const data = {};
      for (const k of ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"]) if (d[k] != null) data[k] = String(d[k]);
      if (!checkTelegram(data)) return res.status(401).json({ error: "Telegram tasdig'i noto'g'ri yoki eskirgan. Qayta urinib ko'ring." });

      const all = users();
      const old = all[data.id] || {};
      all[data.id] = {
        id: data.id,
        name: [data.first_name, data.last_name].filter(Boolean).join(" "),
        username: data.username || "",
        photo: data.photo_url || "",
        createdAt: old.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      store.set("foydalanuvchilar", all);
      setCookie(res, makeSession(data.id), SESSION_DAYS * 86400);
      res.json({ ok: true });
    });

    app.get("/api/me", (req, res) => {
      const s = readSession(req);
      const user = s && users()[s.id];
      if (!user) return res.status(401).json({ error: "Kirilmagan" });
      res.json({ user, orders: ordersOf(user) });
    });

    app.post("/api/auth/logout", (req, res) => {
      setCookie(res, "", 0);
      res.json({ ok: true });
    });
  }

  // Kirmagan odamni ochiq sahifalardan boshqa joyga qo'ymaymiz
  // Ochiq: kirish sahifasi, shartlar, admin (o'z paroli bor), AI LEGENDS (o'z havolasi bor), API va bot webhook
  const OPEN = /^\/(kabinet\.html|shartlar\.html|admin\.html|legends(\/.*|\.html)?|healthz|api\/.*|telegram\/.*)$/i;
  function gate(req, res, next) {
    if (process.env.LOGIN_REQUIRED === "0") return next();
    const p = req.path;
    const userApi = req.method === "POST" && (p === "/api/orders" || p === "/api/chat");
    const page = req.method === "GET" && !OPEN.test(p) && (p === "/" || /\.html$/i.test(p) || !/\.[a-z0-9]+$/i.test(p));
    if (!userApi && !page) return next();
    const s = readSession(req);
    const user = s && users()[s.id];
    if (user) { req.user = user; return next(); }
    if (userApi) return res.status(401).json({ error: "Avval Telegram orqali kiring." });
    res.redirect("/kabinet.html?next=" + encodeURIComponent(req.originalUrl));
  }

  return { install, gate, readSession, checkTelegram };
}

module.exports = { createAuth };
