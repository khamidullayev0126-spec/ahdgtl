// AHdigital — Telegram orqali kirish (Telegram Login Widget)
//
// Qanday ishlaydi:
// 1) kabinet.html sahifasida Telegram'ning rasmiy tugmasi turadi.
// 2) Mijoz bosib, Telegram'da tasdiqlaydi → Telegram uning ma'lumotlarini imzo (hash) bilan qaytaradi.
// 3) Server imzoni bot tokeni bilan tekshiradi — soxtalashtirib bo'lmaydi.
// 4) To'g'ri bo'lsa, brauzerga 30 kunlik himoyalangan cookie qo'yiladi.
//
// Sozlash: BotFather → /setdomain → botingizni tanlang → ahdigital-1pcz.onrender.com
// Google: Render → Environment → GOOGLE_CLIENT_ID (console.cloud.google.com → Credentials → OAuth client ID)
// Email (6 xonali kod): Render → Environment → BREVO_API_KEY va EMAIL_FROM (Brevo'da tasdiqlangan email manzil)
// Ixtiyoriy: Render → Environment → SESSION_SECRET (uzun tasodifiy matn). Bo'lmasa bot tokenidan hosil qilinadi.

const crypto = require("crypto");

const COOKIE = "ahd_sess";
const SESSION_DAYS = 30;
const MAX_AUTH_AGE = 24 * 60 * 60;   // Telegram javobi 24 soatdan eski bo'lmasin

function createAuth({ botToken, store, readOrders, botUsername, publicDir, orderExtra = () => ({}) }) {
  const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || "";
  const BREVO_KEY = process.env.BREVO_API_KEY || "";
  const EMAIL_FROM = process.env.EMAIL_FROM || "";
  const EMAIL_ON = !!(BREVO_KEY && EMAIL_FROM);
  if (!botToken && !GOOGLE_ID && !EMAIL_ON) return null;
  const seed = process.env.SESSION_SECRET || botToken || GOOGLE_ID || BREVO_KEY;
  const sessionKey = crypto.createHash("sha256").update("sess:" + seed).digest("hex");
  const tgKey = crypto.createHash("sha256").update(botToken || crypto.randomBytes(32)).digest();

  const b64 = s => Buffer.from(s).toString("base64url");
  const sign = s => crypto.createHmac("sha256", sessionKey).update(s).digest("base64url");
  const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

  // Telegram imzosini tekshirish (rasmiy qoida: core.telegram.org/widgets/login#checking-authorization)
  function checkTelegram(data) {
    if (!botToken || !data || typeof data !== "object" || typeof data.hash !== "string") return false;
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

  function login(res, id, profile) {
    const all = users();
    const old = all[id] || {};
    all[id] = { ...profile, id, createdAt: old.createdAt || new Date().toISOString(), lastLogin: new Date().toISOString() };
    store.set("foydalanuvchilar", all);
    setCookie(res, makeSession(id), SESSION_DAYS * 86400);
  }

  // ---------- Email kodlari (xotirada, 10 daqiqa amal qiladi) ----------
  const CODE_TTL = 10 * 60_000;
  const codes = new Map();       // email -> { hash, exp, tries, sentAt }
  const sends = new Map();       // email yoki IP -> [vaqtlar]
  const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
  const codeHash = (email, code) => crypto.createHmac("sha256", sessionKey).update(email + ":" + code).digest("hex");

  function tooMany(key, perHour, minGap = 0) {
    const now = Date.now();
    const list = (sends.get(key) || []).filter(t => now - t < 3600_000);
    sends.set(key, list);
    if (minGap && list.length && now - list[list.length - 1] < minGap) return "Kod yaqinda yuborildi. 1 daqiqadan keyin qayta so'rang.";
    if (list.length >= perHour) return "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.";
    list.push(now);
    return "";
  }

  async function sendCode(email, code) {
    const text = `AHdigital'ga kirish kodingiz: ${code}\n\nKod 10 daqiqa amal qiladi. Agar siz so'ramagan bo'lsangiz, bu xatga e'tibor bermang.`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:16px;color:#201e1d">
      <p>AHdigital'ga kirish kodingiz:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
      <p style="color:#645c50">Kod 10 daqiqa amal qiladi. Agar siz so'ramagan bo'lsangiz, bu xatga e'tibor bermang.</p></div>`;
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: "AHdigital", email: EMAIL_FROM }, to: [{ email }], subject: `Kirish kodi: ${code}`, textContent: text, htmlContent: html })
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }

  // Mijozning buyurtmalari: bot orqali bog'langanlari (tgChatId) yoki @username bilan yozilganlari
  function ordersOf(user) {
    const uname = user.username ? "@" + user.username.toLowerCase() : null;
    const email = user.email ? user.email.toLowerCase() : null;
    return readOrders()
      .filter(o => {
        const c = String(o.contact || "").trim().toLowerCase();
        return String(o.tgUserId) === String(user.id) || String(o.tgChatId) === String(user.id) || (uname && c === uname) || (email && c === email);
      })
      .map(o => ({ code: o.code, serviceName: o.serviceName, price: o.price, status: o.status, createdAt: o.createdAt, ...orderExtra(o) }));
  }

  function install(app) {
    app.get("/api/auth/config", (req, res) => res.json({ bot: botToken ? botUsername() || "" : "", google: GOOGLE_ID, email: EMAIL_ON }));

    // Email: 1) kod so'rash
    app.post("/api/auth/email/start", async (req, res) => {
      if (!EMAIL_ON) return res.status(400).json({ error: "Email bilan kirish sozlanmagan." });
      const email = String((req.body || {}).email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email manzilni to'g'ri yozing." });
      const limit = tooMany("e:" + email, 5, 60_000) || tooMany("ip:" + req.ip, 20);
      if (limit) return res.status(429).json({ error: limit });
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      codes.set(email, { hash: codeHash(email, code), exp: Date.now() + CODE_TTL, tries: 0 });
      try { await sendCode(email, code); }
      catch (e) { console.error("Email yuborilmadi:", e.message); codes.delete(email); return res.status(502).json({ error: "Xat yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring." }); }
      res.json({ ok: true });
    });

    // Email: 2) kodni tekshirish
    app.post("/api/auth/email/verify", (req, res) => {
      const email = String((req.body || {}).email || "").trim().toLowerCase();
      const code = String((req.body || {}).code || "").replace(/\D/g, "");
      const rec = codes.get(email);
      if (!rec || rec.exp < Date.now()) { codes.delete(email); return res.status(400).json({ error: "Kod eskirgan. Yangi kod so'rang." }); }
      if (++rec.tries > 5) { codes.delete(email); return res.status(429).json({ error: "Juda ko'p noto'g'ri urinish. Yangi kod so'rang." }); }
      if (code.length !== 6 || !same(codeHash(email, code), rec.hash)) return res.status(401).json({ error: "Kod noto'g'ri. Qayta tekshiring." });
      codes.delete(email);
      const id = "e:" + email;
      const old = users()[id] || {};
      login(res, id, { provider: "email", name: old.name || email.split("@")[0], email, username: "", photo: "" });
      res.json({ ok: true });
    });

    // Google: brauzer Google'dan "ID token" oladi, biz uni Google'ning o'zida tekshiramiz
    app.post("/api/auth/google", async (req, res) => {
      const token = String((req.body || {}).credential || "");
      if (!GOOGLE_ID || !token || token.length > 4096) return res.status(400).json({ error: "Google bilan kirish sozlanmagan." });
      let info;
      try {
        const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
        info = r.ok ? await r.json() : null;
      } catch (e) { console.error("Google tekshiruvi:", e.message); }
      const ok = info && info.aud === GOOGLE_ID
        && ["accounts.google.com", "https://accounts.google.com"].includes(info.iss)
        && Number(info.exp) * 1000 > Date.now()
        && String(info.email_verified) === "true";
      if (!ok) return res.status(401).json({ error: "Google tasdig'i noto'g'ri yoki eskirgan. Qayta urinib ko'ring." });

      const id = "g:" + info.sub;
      const all = users();
      const old = all[id] || {};
      all[id] = {
        id, provider: "google",
        name: info.name || info.email,
        email: info.email,
        username: "",
        photo: info.picture || "",
        createdAt: old.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      store.set("foydalanuvchilar", all);
      setCookie(res, makeSession(id), SESSION_DAYS * 86400);
      res.json({ ok: true });
    });

    app.post("/api/auth/telegram", (req, res) => {
      const d = req.body || {};
      const data = {};
      for (const k of ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"]) if (d[k] != null) data[k] = String(d[k]);
      if (!checkTelegram(data)) return res.status(401).json({ error: "Telegram tasdig'i noto'g'ri yoki eskirgan. Qayta urinib ko'ring." });

      const all = users();
      const old = all[data.id] || {};
      all[data.id] = {
        id: data.id, provider: "telegram",
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

  // Sayt hammaga ochiq. Buyurtmani kirmasdan ham berish mumkin; kirish faqat AI chat va ilova (app.html) uchun kerak.
  // Kirgan mijozning buyurtmasi kabinetda ko'rinadi. Buyurtma uchun ham kirishni talab qilish: ORDER_LOGIN = 1
  // Saytni butunlay yopish kerak bo'lsa: Render → Environment → LOGIN_REQUIRED = 1
  const PRIVATE = /^\/(app\.html|app)$/i;
  const OPEN = /^\/(offline\.html|kabinet\.html|shartlar\.html|admin\.html|legends(\/.*|\.html)?|healthz|api\/.*|telegram\/.*)$/i;
  function gate(req, res, next) {
    const p = req.path;
    const s = readSession(req);
    const user = s && users()[s.id];
    if (user) req.user = user;
    if (process.env.LOGIN_REQUIRED === "0") return next();
    const strict = process.env.LOGIN_REQUIRED === "1";
    if (req.method === "POST" && p === "/api/chat" && !user)        // AI chat pul turadi — faqat kirganlar uchun
      return res.status(401).json({ error: "AI yordamchidan foydalanish uchun avval kiring (Telegram yoki Google).", login: true });
    if (req.method === "POST" && p === "/api/orders" && !user && process.env.ORDER_LOGIN === "1")
      return res.status(401).json({ error: "Buyurtma berish uchun avval kiring (Telegram yoki Google).", login: true });
    if (req.method !== "GET") return next();
    const page = !OPEN.test(p) && (p === "/" || /\.html$/i.test(p) || !/\.[a-z0-9]+$/i.test(p));
    if (!page) return next();
    if (user) return next();
    if (PRIVATE.test(p) || strict) return res.redirect("/kabinet.html?mode=signin&next=" + encodeURIComponent(req.originalUrl));
    next();
  }

  return { install, gate, readSession, checkTelegram };
}

module.exports = { createAuth };
