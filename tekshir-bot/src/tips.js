// Kunlik maslahatlar: har kuni soat 10:00 da (Toshkent) har bir foydalanuvchiga bitta xavfsizlik maslahati.
//
//  • TAKRORLANMAYDI: har kimga qaysi maslahat yuborilgani bazada (tip_sent) saqlanadi.
//  • YANGILANIB TURADI: maslahatlar bazada. Admin /maslahat_qosh bilan qo'shadi; AI (kalit bo'lsa)
//    har kuni bitta yangi maslahat TAKLIF qiladi — lekin u faqat admin «✅ Qo'shish» bosgandan keyin
//    hammaga yuboriladi. AI noto'g'ri maslahat yozishi mumkin, shuning uchun inson tekshiruvi shart.
//  • Odam xohlamasa — maslahat ostidagi «🔕 O'chirish» tugmasi yoki /maslahat_ochir.
//  • Botni bloklagan odamga qayta yuborilmaydi (avtomatik o'chiriladi).

const BASE = require("./tips-base.json");

const SEND_HOUR = Number(process.env.TIPS_HOUR || 10);        // Toshkent vaqti bilan
const TZ_OFFSET = 5 * 60 * 60 * 1000;                           // Toshkent = UTC+5 (yozgi vaqt yo'q)
const NEW_USER_GAP = 2 * 60 * 60 * 1000;                        // /start bosganiga 2 soat bo'lmagan — ertaga
const tkDay = now => new Date(now + TZ_OFFSET).toISOString().slice(0, 10);
const tkHour = now => new Date(now + TZ_OFFSET).getUTCHours();
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tips (
  id         TEXT PRIMARY KEY,
  cat        TEXT,
  icon       TEXT,
  uz_t       TEXT NOT NULL,
  uz_x       TEXT NOT NULL,
  ru_t       TEXT,
  ru_x       TEXT,
  src        TEXT NOT NULL,              -- base | admin | ai
  status     TEXT NOT NULL,              -- active | pending | rejected
  ord        INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tip_sent (
  user_id INTEGER NOT NULL,
  tip_id  TEXT NOT NULL,
  day     TEXT NOT NULL,
  PRIMARY KEY (user_id, tip_id)
);
CREATE TABLE IF NOT EXISTS tip_subs (
  user_id  INTEGER PRIMARY KEY,
  enabled  INTEGER NOT NULL DEFAULT 1,
  last_day TEXT
);
CREATE TABLE IF NOT EXISTS tip_meta (k TEXT PRIMARY KEY, v TEXT);
`;

// ---------- Lotin → kirill (o'zbekcha) ----------
// Brend va texnik so'zlar (Click, SMS, CVV, sayt manzillari) lotincha qoladi.
const MAP = { a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з" };
const DI = [["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"]];
function cyrWord(w) {
  if (/[cw]/i.test(w) || /\.[a-z]{2,}/i.test(w) || /^[A-Z0-9]{2,}$/.test(w.replace(/[^A-Za-z0-9]/g, "")) && /[A-Z]{2}/.test(w)) return w;
  let out = "", i = 0;
  const s = w.replace(/[ʻʼ’‘`]/g, "'");
  while (i < s.length) {
    const two = s.slice(i, i + 2), low = two.toLowerCase();
    const di = DI.find(([a]) => a === low);
    if (di) {
      let r = di[1];
      if (low === "ye" && i > 0 && /[a-z]/i.test(s[i - 1])) r = "е";
      out += two[0] === two[0].toUpperCase() && two[0] !== two[0].toLowerCase() ? r.toUpperCase() : r; i += 2; continue;
    }
    const ch = s[i], lc = ch.toLowerCase();
    if (lc === "e" && (i === 0 || !/[a-z']/i.test(s[i - 1]))) { out += ch === "E" ? "Э" : "э"; i++; continue; }
    if (ch === "'" && i > 0 && /[a-z]/i.test(s[i - 1]) && i + 1 < s.length && /[a-z]/i.test(s[i + 1])) { out += "ъ"; i++; continue; }
    if (MAP[lc]) { out += ch === lc ? MAP[lc] : MAP[lc].toUpperCase(); i++; continue; }
    out += ch; i++;
  }
  return out;
}
const toCyr = text => String(text).split(/(\s+)/).map(p => /\s/.test(p) ? p : cyrWord(p)).join("");

// ---------- O'xshash maslahatni aniqlash (takror bo'lmasin) ----------
const words = s => new Set(String(s).toLowerCase().replace(/[ʻʼ’‘`]/g, "'").replace(/[^a-zа-яёўқғҳ0-9' ]/gi, " ").split(/\s+/).filter(w => w.length > 2));
function similar(a, b) {
  const A = words(a), B = words(b); if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

const TXT = {
  "uz-latn": { head: "💡 Kunlik maslahat", off: "🔕 Kunlik maslahatni o'chirish", share: "Foydali bo'lsa — yaqinlaringizga ulashing 🙏" },
  "uz-cyrl": { head: "💡 Кунлик маслаҳат", off: "🔕 Кунлик маслаҳатни ўчириш", share: "Фойдали бўлса — яқинларингизга улашинг 🙏" },
  ru: { head: "💡 Совет дня", off: "🔕 Отключить советы", share: "Если полезно — поделитесь с близкими 🙏" }
};

function createTips(db, { log = console } = {}) {
  db.exec(SCHEMA);
  const q = {
    count: db.prepare("SELECT COUNT(*) n FROM tips"),
    ins: db.prepare(`INSERT OR IGNORE INTO tips (id, cat, icon, uz_t, uz_x, ru_t, ru_x, src, status, ord, created_at)
                     VALUES (@id, @cat, @icon, @uz_t, @uz_x, @ru_t, @ru_x, @src, @status, @ord, @now)`),
    maxOrd: db.prepare("SELECT COALESCE(MAX(ord), 0) m FROM tips"),
    active: db.prepare("SELECT * FROM tips WHERE status IN ('active','pending')"),
    get: db.prepare("SELECT * FROM tips WHERE id = ?"),
    setStatus: db.prepare("UPDATE tips SET status = ? WHERE id = ?"),
    next: db.prepare(`SELECT * FROM tips WHERE status = 'active' AND id NOT IN (SELECT tip_id FROM tip_sent WHERE user_id = ?) ORDER BY ord LIMIT 1`),
    sent: db.prepare("INSERT OR IGNORE INTO tip_sent (user_id, tip_id, day) VALUES (?, ?, ?)"),
    subDay: db.prepare(`INSERT INTO tip_subs (user_id, enabled, last_day) VALUES (?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET last_day = excluded.last_day`),
    setEn: db.prepare(`INSERT INTO tip_subs (user_id, enabled) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled`),
    isEn: db.prepare("SELECT enabled FROM tip_subs WHERE user_id = ?"),
    due: db.prepare(`SELECT u.telegram_id id, u.lang lang FROM users u LEFT JOIN tip_subs s ON s.user_id = u.telegram_id
                     WHERE u.telegram_id > 0 AND COALESCE(s.enabled, 1) = 1 AND COALESCE(s.last_day, '') != ? AND u.first_seen <= ?`),
    pending: db.prepare("SELECT * FROM tips WHERE status = 'pending' ORDER BY created_at"),
    metaGet: db.prepare("SELECT v FROM tip_meta WHERE k = ?"),
    metaSet: db.prepare("INSERT OR REPLACE INTO tip_meta (k, v) VALUES (?, ?)"),
    stats: db.prepare(`SELECT (SELECT COUNT(*) FROM tips WHERE status='active') active, (SELECT COUNT(*) FROM tips WHERE status='pending') pending,
                       (SELECT COUNT(*) FROM tip_subs WHERE enabled=0) off, (SELECT COUNT(*) FROM tip_sent) sent`)
  };

  // Asosiy 50 ta maslahat — yo'nalishlar aralash tartibda (har kuni boshqa mavzu)
  (function seed() {
    const cats = [...new Set(BASE.map(t => t.cat))], pos = {};
    const now = Date.now();
    BASE.forEach(t => {
      const c = cats.indexOf(t.cat), k = pos[t.cat] = (pos[t.cat] ?? -1) + 1;
      q.ins.run({ id: t.id, cat: t.cat, icon: t.icon, uz_t: t.uz.t, uz_x: t.uz.x, ru_t: t.ru.t, ru_x: t.ru.x, src: "base", status: "active", ord: k * cats.length + c + 1, now });
    });
  })();

  function format(tip, lang) {
    const L = TXT[lang] ? lang : "uz-latn";
    let ti = tip.uz_t, x = tip.uz_x;
    if (L === "ru" && tip.ru_t) { ti = tip.ru_t; x = tip.ru_x; }
    if (L === "uz-cyrl") { ti = toCyr(ti); x = toCyr(x); }
    return { text: `${TXT[L].head}\n\n${tip.icon || "💡"} <b>${esc(ti)}</b>\n${esc(x)}\n\n<i>${TXT[L].share}</i>`, off: TXT[L].off };
  }

  // Yangi maslahat (admin yoki AI). O'xshashi bo'lsa — rad etiladi.
  function add({ icon = "💡", cat = "boshqa", uz_t, uz_x, ru_t = null, ru_x = null, src = "admin", status = "active" }, now = Date.now()) {
    uz_t = String(uz_t || "").trim(); uz_x = String(uz_x || "").trim();
    if (uz_t.length < 4 || uz_x.length < 15 || uz_t.length > 80 || uz_x.length > 400) return { ok: false, reason: "len" };
    for (const t of q.active.all()) {
      if (similar(t.uz_t, uz_t) >= .75 || similar(t.uz_t + " " + t.uz_x, uz_t + " " + uz_x) >= .6) return { ok: false, reason: "dup", like: t };
    }
    const id = src[0] + now.toString(36) + Math.random().toString(36).slice(2, 6);
    q.ins.run({ id, cat, icon, uz_t, uz_x, ru_t, ru_x, src, status, ord: q.maxOrd.get().m + 1, now });
    return { ok: true, tip: q.get.get(id) };
  }

  const setEnabled = (userId, on) => q.setEn.run(userId, on ? 1 : 0);
  const isEnabled = userId => (q.isEn.get(userId)?.enabled ?? 1) === 1;
  const nextFor = userId => q.next.get(userId) || null;
  const approve = id => { const t = q.get.get(id); if (!t || t.status !== "pending") return null; q.setStatus.run("active", id); return q.get.get(id); };
  const reject = id => { const t = q.get.get(id); if (!t || t.status !== "pending") return null; q.setStatus.run("rejected", id); return t; };

  // AI'dan bitta yangi maslahat taklifi (admin tasdiqlaydi)
  async function propose(client, model, now = Date.now()) {
    const existing = q.active.all().map(t => "- " + t.uz_t).join("\n");
    const prompt = `Sen O'zbekistondagi oddiy odamlar uchun kiberxavfsizlik bo'yicha maslahat yozasan (Telegram bot «Tekshir»).
Quyidagi ro'yxatda YO'Q bo'lgan, yangi mavzudagi BITTA amaliy maslahat yoz. Qoidalar:
- Faqat rost va tekshirilgan narsa; raqam, statistika, o'ylab topilgan fakt yo'q.
- Mahalliy hayotga mos (Click, Payme, Telegram, Uzcard/Humo, OLX va h.k.), oddiy so'zlar bilan.
- Sarlavha 3–7 so'z, matn 1–2 gap (ko'pi bilan 250 belgi).
Mavjud maslahatlar:
${existing}

Faqat JSON qaytar: {"icon":"bitta emoji","cat":"firibgarlik|parol|telefon|oila|tolov","uz_t":"...","uz_x":"...","ru_t":"ruscha sarlavha","ru_x":"ruscha matn"}`;
    const r = await client.messages.create({ model, max_tokens: 600, messages: [{ role: "user", content: prompt }] });
    const txt = (r.content || []).map(c => c.text || "").join("");
    const m = txt.match(/\{[\s\S]*\}/); if (!m) return { ok: false, reason: "json" };
    let d; try { d = JSON.parse(m[0]); } catch { return { ok: false, reason: "json" }; }
    return add({ ...d, src: "ai", status: "pending" }, now);
  }

  // Har 5 daqiqada chaqiriladi. Soat 10:00 dan keyin bugun olmaganlarga bittadan yuboradi.
  async function runDaily({ api, admins = [], ai = null, model = "claude-haiku-5-5", now = Date.now(), pause = 60 } = {}) {
    if (tkHour(now) < SEND_HOUR) return { skipped: "early" };
    const day = tkDay(now), res = { day, sent: 0, off: 0, empty: 0, failed: 0 };
    for (const u of q.due.all(day, now - NEW_USER_GAP)) {
      const tip = nextFor(u.id);
      if (!tip) { res.empty++; q.subDay.run(u.id, day); continue; }
      const f = format(tip, u.lang);
      try {
        await api.sendMessage(u.id, f.text, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: [[{ text: f.off, callback_data: "tipsub:off" }]] } });
        q.sent.run(u.id, tip.id, day); q.subDay.run(u.id, day); res.sent++;
      } catch (e) {
        const msg = String(e && (e.description || e.message) || e);
        if (/blocked|deactivated|chat not found|Forbidden/i.test(msg)) { setEnabled(u.id, false); res.off++; }
        else { res.failed++; log.error && log.error("Kunlik maslahat:", msg); }
      }
      if (pause) await new Promise(r => setTimeout(r, pause));      // Telegram chegarasi: sekundiga ~30 ta
    }
    // Kuniga bir marta: AI'dan yangi taklif (kalit bo'lsa) va adminlarga xabar
    if (q.metaGet.get("admin_day")?.v !== day && admins.length) {
      q.metaSet.run("admin_day", day);
      let prop = null;
      if (ai && q.pending.all().length < 5) { try { prop = await propose(ai, model, now); } catch (e) { log.error && log.error("AI maslahat:", e.message); } }
      const left = q.stats.get().active;
      for (const a of admins) {
        try {
          if (prop && prop.ok) await api.sendMessage(a, `🆕 AI yangi maslahat taklif qildi (tekshiring!):\n\n${prop.tip.icon} <b>${esc(prop.tip.uz_t)}</b>\n${esc(prop.tip.uz_x)}\n\n🇷🇺 ${esc(prop.tip.ru_t || "—")}\n${esc(prop.tip.ru_x || "")}`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Qo'shish", callback_data: "tipok:" + prop.tip.id }, { text: "❌ Rad etish", callback_data: "tipno:" + prop.tip.id }]] } });
          if (res.empty) await api.sendMessage(a, `⚠️ ${res.empty} kishi barcha ${left} ta maslahatni olib bo'ldi — yangi maslahat qo'shing: /maslahat_qosh`);
        } catch { /* admin xabari — muhim emas */ }
      }
    }
    return res;
  }

  return { format, add, setEnabled, isEnabled, nextFor, approve, reject, propose, runDaily, stats: () => q.stats.get(), pending: () => q.pending.all() };
}

module.exports = { createTips, toCyr, similar, tkDay, tkHour, SEND_HOUR };
