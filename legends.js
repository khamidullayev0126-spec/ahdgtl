// AI LEGENDS — kurs platformasi (server qismi)
// • Admin to'lovni qabul qilgach, o'quvchiga SHAXSIY MAXFIY HAVOLA yaratadi.
// • Havola imzolangan (HMAC): soxtalashtirib bo'lmaydi, Render qayta ishga tushsa ham ishlayveradi.
// • O'quvchi havolani ochadi → brauzerida profil cookie'si saqlanadi → /legends sahifasida faqat o'z guruhi darslarini ko'radi.
// • Har bir dars jadval bo'yicha ochiladi va SOZLAMA.oynaSoat soat davomida ko'rinadi.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { SOZLAMA, DARSLAR } = require("./legends-darslar");

const COOKIE = "ahd_legends";
const TZ_OFFSET = "+05:00";     // Toshkent

function createLegends({ app, requireAdmin, publicDir, store, adminPassword }) {
  const SECRET = process.env.LEGENDS_SECRET || crypto.createHash("sha256").update("legends:" + adminPassword).digest("hex");
  const revoked = new Set(String(process.env.LEGENDS_BEKOR || "").split(",").map(s => s.trim()).filter(Boolean));
  const readLog = () => store.get("legends-oquvchilar", []);
  const writeLog = list => store.set("legends-oquvchilar", list);

  // ---------- Imzolangan token ----------
  const b64 = s => Buffer.from(s).toString("base64url");
  const sign = data => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  function makeToken(p) { const data = b64(JSON.stringify(p)); return `${data}.${sign(data)}`; }
  function readToken(t) {
    const [data, sig] = String(t || "").split(".");
    if (!data || !sig) return null;
    const good = Buffer.from(sign(data)), given = Buffer.from(sig);
    if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
    try {
      const p = JSON.parse(Buffer.from(data, "base64url").toString());
      if (!p.exp || Date.now() > p.exp || revoked.has(p.id) || !DARSLAR[p.g]) return null;
      return p;
    } catch { return null; }
  }
  const cookieToken = req => {
    const m = (req.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : "";
  };
  const student = req => readToken(cookieToken(req));

  // ---------- Dars jadvali ----------
  function schedule(g) {
    const start = new Date(`${SOZLAMA.guruhlar[g].boshlanish}T00:00:00${TZ_OFFSET}`);
    const out = [];
    for (let d = 0; out.length < DARSLAR[g].length && d < 400; d++) {
      const day = new Date(start.getTime() + d * 86400000);
      const local = new Date(day.getTime() + 5 * 3600000);            // Toshkent kuni
      if (!SOZLAMA.darsKunlari.includes(local.getUTCDay())) continue;
      const ymd = local.toISOString().slice(0, 10);
      const open = new Date(`${ymd}T${String(SOZLAMA.ochilishSoati).padStart(2, "0")}:00:00${TZ_OFFSET}`);
      const close = SOZLAMA.oynaSoat ? new Date(open.getTime() + SOZLAMA.oynaSoat * 3600000) : null;
      out.push({ open, close });
    }
    return out;
  }
  function state(s, now = Date.now()) {
    if (now < s.open) return "kutilmoqda";
    if (s.close && now > s.close) return "yopildi";
    return "ochiq";
  }

  // ---------- Admin: havola yaratish ----------
  app.post("/api/legends/invite", requireAdmin, (req, res) => {
    const ism = String(req.body.ism || "").trim().slice(0, 60);
    const g = String(req.body.guruh || "").toUpperCase();
    const kun = Math.min(366, Math.max(1, Number(req.body.kun) || 30));
    if (ism.length < 2) return res.status(400).json({ error: "O'quvchi ismini kiriting." });
    if (!DARSLAR[g]) return res.status(400).json({ error: "Guruh A, B yoki C bo'lishi kerak." });
    const id = crypto.randomBytes(4).toString("hex");
    const exp = Date.now() + kun * 86400000;
    const token = makeToken({ id, n: ism, g, exp });
    const base = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;
    const log = readLog();
    log.push({ id, ism, guruh: g, yaratildi: new Date().toISOString(), tugaydi: new Date(exp).toISOString() });
    writeLog(log);
    const inGroup = log.filter(x => x.guruh === g && new Date(x.tugaydi) > Date.now()).length;
    res.json({ id, link: `${base}/legends/kirish?k=${encodeURIComponent(token)}`, tugaydi: new Date(exp).toISOString(),
      ogohlantirish: inGroup > 10 ? `Diqqat: ${g} guruhda ${inGroup} ta faol o'quvchi (chegara — 10).` : "" });
  });
  app.get("/api/legends/oquvchilar", requireAdmin, (req, res) => res.json(readLog().reverse()));

  // ---------- O'quvchi: kirish ----------
  app.get("/legends/kirish", (req, res) => {
    const p = readToken(req.query.k);
    if (!p) return res.redirect("/legends?xato=havola");
    const maxAge = Math.max(0, Math.floor((p.exp - Date.now()) / 1000));
    const secure = req.secure || req.get("x-forwarded-proto") === "https" ? "; Secure" : "";
    res.set("Set-Cookie", `${COOKIE}=${encodeURIComponent(req.query.k)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`);
    res.redirect("/legends");
  });
  app.post("/api/legends/chiqish", (req, res) => {
    res.set("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    res.json({ ok: true });
  });
  app.get("/legends", (req, res) => res.sendFile(path.join(publicDir, "legends.html")));

  // ---------- O'quvchi: profil va darslar ----------
  app.get("/api/legends/me", (req, res) => {
    const p = student(req);
    if (!p) return res.status(401).json({ error: "Kirish uchun maxfiy havola kerak." });
    const sch = schedule(p.g), gr = SOZLAMA.guruhlar[p.g];
    res.json({
      ism: p.n, guruh: p.g, guruhNom: gr.nom, tugaydi: new Date(p.exp).toISOString(),
      oynaSoat: SOZLAMA.oynaSoat,
      darslar: DARSLAR[p.g].map((d, i) => ({ n: i + 1, nom: d.nom, maqsad: d.maqsad, holat: state(sch[i]),
        ochiladi: sch[i].open.toISOString(), yopiladi: sch[i].close ? sch[i].close.toISOString() : null }))
    });
  });
  app.get("/api/legends/dars/:n", (req, res) => {
    const p = student(req);
    if (!p) return res.status(401).json({ error: "Kirish uchun maxfiy havola kerak." });
    const i = Number(req.params.n) - 1, d = DARSLAR[p.g][i];
    if (!d) return res.status(404).json({ error: "Bunday dars yo'q." });
    const st = state(schedule(p.g)[i]);
    if (st === "kutilmoqda") return res.status(403).json({ error: "Bu dars hali ochilmagan." });
    if (st === "yopildi") return res.status(403).json({ error: `Bu dars ${SOZLAMA.oynaSoat} soatlik ko'rish muddati tugagan. Savol bo'lsa, ustozga yozing.` });
    res.json({ n: i + 1, ...d });
  });

  console.log("🎓 AI LEGENDS platformasi: /legends");
  if (!process.env.LEGENDS_SECRET) console.log("ℹ️  LEGENDS_SECRET yo'q — havolalar ADMIN_PASSWORD asosida imzolanadi (parolni o'zgartirsangiz, eski havolalar ishlamay qoladi).");
}

module.exports = { createLegends };
