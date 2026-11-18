// Ma'lumotlar bazasi (6-bosqich). SQLite — bitta fayl: data/tekshir.db
// better-sqlite3 sinxron ishlaydi: kod sodda, Telegram bot uchun yetarlicha tez.
//
// MAXFIYLIK QOIDALARI (qat'iy):
//  • Xabarning to'liq matni SAQLANMAYDI — faqat natija (daraja, ball, sabab kodlari).
//  • Havolaning faqat DOMENI saqlanadi (masalan "paymee.uz"), to'liq manzil emas.
//  • Telefon va karta raqamlari faqat SHA-256 + tuz (HASH_SALT) ko'rinishida saqlanadi (7-bosqich).

const Database = require("better-sqlite3");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.join(__dirname, "..", "data", "tekshir.db");

const SCHEMA = `
-- Foydalanuvchilar: faqat Telegram ID, til va sanalar
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  lang        TEXT,
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  checks      INTEGER NOT NULL DEFAULT 0
);

-- Har bir tekshiruv natijasi (MATNSIZ!)
CREATE TABLE IF NOT EXISTS checks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  chat_type  TEXT,                 -- private | group
  level      TEXT NOT NULL,        -- safe | suspicious | danger
  score      INTEGER NOT NULL,
  has_url    INTEGER NOT NULL DEFAULT 0,
  has_text   INTEGER NOT NULL DEFAULT 0,
  has_file   INTEGER NOT NULL DEFAULT 0,
  domains    TEXT,                 -- "paymee.uz,bit.ly"
  reasons    TEXT,                 -- sabab kodlari: "url_lookalike,txt_secret"
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS checks_time ON checks(created_at);

-- Domenlar statistikasi: qaysi sayt necha marta tekshirildi va qanday chiqdi
CREATE TABLE IF NOT EXISTS domains (
  domain     TEXT PRIMARY KEY,
  checks     INTEGER NOT NULL DEFAULT 0,
  danger     INTEGER NOT NULL DEFAULT 0,
  suspicious INTEGER NOT NULL DEFAULT 0,
  last_level TEXT,
  last_seen  INTEGER
);

-- Tashqi API (VirusTotal, Safe Browsing) javoblari keshi — bot qayta ishga tushsa ham saqlanadi
CREATE TABLE IF NOT EXISTS cache (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,             -- JSON
  until INTEGER NOT NULL
);

-- Shikoyatlar (7-bosqichda ishlatiladi). target_hash — raqamning hash'i, raqamning o'zi emas
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target_hash TEXT NOT NULL,
  target_kind TEXT NOT NULL,       -- phone | card | domain
  reporter_id INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE (target_hash, reporter_id) -- bitta odam bitta raqamga faqat 1 marta shikoyat qiladi
);

-- Guruhlar (8-bosqichda ishlatiladi)
CREATE TABLE IF NOT EXISTS groups (
  chat_id  INTEGER PRIMARY KEY,
  title    TEXT,
  lang     TEXT,
  enabled  INTEGER NOT NULL DEFAULT 1,
  added_at INTEGER NOT NULL
);
`;

const DAY = 24 * 60 * 60 * 1000;

function openDb(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");      // o'qish va yozish bir-biriga xalaqit bermaydi
  db.exec(SCHEMA);
  migrate(db);

  // Tez-tez ishlatiladigan so'rovlarni oldindan tayyorlab qo'yamiz
  const q = {
    getLang:   db.prepare("SELECT lang FROM users WHERE telegram_id = ?"),
    upsertUser: db.prepare(`INSERT INTO users (telegram_id, lang, first_seen, last_seen) VALUES (@id, @lang, @now, @now)
                            ON CONFLICT(telegram_id) DO UPDATE SET lang = COALESCE(@lang, lang), last_seen = @now`),
    addCheck:  db.prepare(`INSERT INTO checks (user_id, chat_type, level, score, has_url, has_text, has_file, domains, reasons, created_at)
                           VALUES (@user_id, @chat_type, @level, @score, @has_url, @has_text, @has_file, @domains, @reasons, @now)`),
    userCount: db.prepare("UPDATE users SET checks = checks + 1, last_seen = ? WHERE telegram_id = ?"),
    domain:    db.prepare(`INSERT INTO domains (domain, checks, danger, suspicious, last_level, last_seen) VALUES (@d, 1, @dg, @sp, @lv, @now)
                           ON CONFLICT(domain) DO UPDATE SET checks = checks + 1, danger = danger + @dg, suspicious = suspicious + @sp, last_level = @lv, last_seen = @now`),
    cacheGet:  db.prepare("SELECT value, until FROM cache WHERE key = ?"),
    cacheSet:  db.prepare("INSERT OR REPLACE INTO cache (key, value, until) VALUES (?, ?, ?)"),
    cacheDel:  db.prepare("DELETE FROM cache WHERE until < ?"),
    repAdd:    db.prepare("INSERT OR IGNORE INTO reports (target_hash, target_kind, reporter_id, created_at) VALUES (?, ?, ?, ?)"),
    repCount:  db.prepare("SELECT COUNT(*) n FROM reports WHERE target_hash = ?"),
    repToday:  db.prepare("SELECT COUNT(*) n FROM reports WHERE reporter_id = ? AND created_at >= ?")
  };

  const api = {
    raw: db,
    file,                                  // bazaning qayerda turgani (diagnostika uchun)

    // ---- Foydalanuvchi va til ----
    getLang: id => q.getLang.get(id)?.lang || undefined,
    setLang: (id, lang) => q.upsertUser.run({ id, lang, now: Date.now() }),
    touchUser: id => q.upsertUser.run({ id, lang: null, now: Date.now() }),

    // ---- Tekshiruvni yozish (matnsiz!) ----
    // result — combineAll natijasi. Faqat daraja, ball, sabab kodlari va domenlar (hosts) olinadi.
    logCheck({ userId, chatType, result, hasText, hosts = [] }) {
      const now = Date.now();
      const domains = [...new Set(hosts.filter(Boolean))].slice(0, 10);
      const reasons = [...new Set(result.reasons.map(r => r.code))].join(",");
      const tx = db.transaction(() => {
        q.addCheck.run({
          user_id: userId, chat_type: chatType, level: result.level, score: result.score,
          has_url: result.hasUrl ? 1 : 0, has_text: hasText ? 1 : 0, has_file: result.hasFile ? 1 : 0,
          domains: domains.join(",") || null, reasons: reasons || null, now
        });
        if (userId) q.userCount.run(now, userId);
        for (const d of domains) q.domain.run({ d, dg: result.level === "danger" ? 1 : 0, sp: result.level === "suspicious" ? 1 : 0, lv: result.level, now });
      });
      tx();
    },

    // ---- Kesh (tashqi API javoblari) ----
    cacheGet(key) {
      const row = q.cacheGet.get(key);
      if (!row || row.until < Date.now()) return undefined;
      try { return JSON.parse(row.value); } catch { return undefined; }
    },
    cacheSet: (key, value, ttl = DAY) => q.cacheSet.run(key, JSON.stringify(value), Date.now() + ttl),
    cachePurge: () => q.cacheDel.run(Date.now()).changes,   // muddati o'tganlarni tozalash

    // ---- Hash (7-bosqich: telefon/karta) ----
    // Raqamning o'zi hech qachon bazaga yozilmaydi — faqat shu funksiya natijasi.
    // SHA-256 + tuz (HASH_SALT): tuzni bilmagan odam bazadan raqamni qayta tiklay olmaydi.
    canHash: () => !!process.env.HASH_SALT,
    hash(value) {
      const salt = process.env.HASH_SALT;
      if (!salt) throw new Error("HASH_SALT .env da yo'q");
      return crypto.createHash("sha256").update(salt + ":" + String(value).replace(/\D/g, "")).digest("hex");
    },
    // Domen uchun hash (harflar ham kerak, shuning uchun alohida)
    hashDomain(domain) {
      const salt = process.env.HASH_SALT;
      if (!salt) throw new Error("HASH_SALT .env da yo'q");
      return crypto.createHash("sha256").update(salt + ":d:" + String(domain).toLowerCase()).digest("hex");
    },

    // ---- Shikoyatlar ----
    // Natija: "ok" — qabul qilindi, "dup" — bu odam avval shikoyat qilgan, "limit" — bugungi limit tugadi
    addReport(targetHash, kind, reporterId, dailyLimit = 20) {
      const now = Date.now();
      if (q.repToday.get(reporterId, now - DAY).n >= dailyLimit) return "limit";
      return q.repAdd.run(targetHash, kind, reporterId, now).changes ? "ok" : "dup";
    },
    reportCount: targetHash => q.repCount.get(targetHash).n,

    // ---- Guruhlar (8-bosqich) ----
    // mode: "suspicious" — 🟡 va 🔴 da ogohlantiradi, "danger" — faqat 🔴 da
    // delete_danger: 1 bo'lsa — 🔴 xabar o'chiriladi (bot admin bo'lsa)
    getGroup: chatId => db.prepare("SELECT * FROM groups WHERE chat_id = ?").get(chatId),
    addGroup(chatId, title) {
      db.prepare(`INSERT INTO groups (chat_id, title, lang, enabled, added_at) VALUES (?, ?, 'uz-latn', 1, ?)
                  ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title, enabled = 1`).run(chatId, title || "", Date.now());
      return api.getGroup(chatId);
    },
    setGroup(chatId, field, value) {
      if (!["lang", "enabled", "mode", "delete_danger"].includes(field)) throw new Error("noto'g'ri maydon: " + field);
      db.prepare(`UPDATE groups SET ${field} = ? WHERE chat_id = ?`).run(value, chatId);
      return api.getGroup(chatId);
    },
    removeGroup: chatId => db.prepare("UPDATE groups SET enabled = 0 WHERE chat_id = ?").run(chatId),
    groupCounted: (chatId, warned) => db.prepare("UPDATE groups SET checks = checks + 1, warnings = warnings + ? WHERE chat_id = ?").run(warned ? 1 : 0, chatId),

    // ---- /stats uchun raqamlar ----
    stats() {
      const now = Date.now(), today = startOfDay(now), week = now - 7 * DAY;
      const one = (sql, ...a) => db.prepare(sql).get(...a);
      const levels = Object.fromEntries(db.prepare("SELECT level, COUNT(*) n FROM checks GROUP BY level").all().map(r => [r.level, r.n]));
      return {
        users: one("SELECT COUNT(*) n FROM users").n,
        usersToday: one("SELECT COUNT(*) n FROM users WHERE first_seen >= ?", today).n,
        usersWeek: one("SELECT COUNT(*) n FROM users WHERE first_seen >= ?", week).n,
        activeWeek: one("SELECT COUNT(*) n FROM users WHERE last_seen >= ?", week).n,
        checks: one("SELECT COUNT(*) n FROM checks").n,
        checksToday: one("SELECT COUNT(*) n FROM checks WHERE created_at >= ?", today).n,
        checksWeek: one("SELECT COUNT(*) n FROM checks WHERE created_at >= ?", week).n,
        levels: { safe: levels.safe || 0, suspicious: levels.suspicious || 0, danger: levels.danger || 0 },
        kinds: one("SELECT SUM(has_url) url, SUM(has_text) text, SUM(has_file) file FROM checks"),
        langs: db.prepare("SELECT lang, COUNT(*) n FROM users WHERE lang IS NOT NULL GROUP BY lang ORDER BY n DESC").all(),
        topDanger: db.prepare("SELECT domain, danger, checks FROM domains WHERE danger > 0 ORDER BY danger DESC, checks DESC LIMIT 10").all(),
        topReasons: topReasons(db),
        reports: one("SELECT COUNT(*) n FROM reports").n,
        reportsWeek: one("SELECT COUNT(*) n FROM reports WHERE created_at >= ?", week).n,
        groups: one("SELECT COUNT(*) n FROM groups").n,
        groupsActive: one("SELECT COUNT(*) n FROM groups WHERE enabled = 1").n,
        groupWarnings: one("SELECT COALESCE(SUM(warnings), 0) n FROM groups").n,
        reportedTargets: db.prepare("SELECT target_kind kind, COUNT(DISTINCT target_hash) n FROM reports GROUP BY target_kind").all()
      };
    },

    // ---- /export uchun: oxirgi N kunlik tekshiruvlar (foydalanuvchi ID'siz) ----
    exportRows(days = 30) {
      return db.prepare(`SELECT created_at, chat_type, level, score, has_url, has_text, has_file, domains, reasons
                         FROM checks WHERE created_at >= ? ORDER BY id`).all(Date.now() - days * DAY);
    },

    close: () => db.close()
  };
  return api;
}

// Eski bazaga yangi ustunlar qo'shish (bot yangilanganda ma'lumotlar yo'qolmasin)
function migrate(db) {
  const cols = db.prepare("PRAGMA table_info(groups)").all().map(c => c.name);
  const add = (name, def) => { if (!cols.includes(name)) db.exec(`ALTER TABLE groups ADD COLUMN ${name} ${def}`); };
  add("mode", "TEXT NOT NULL DEFAULT 'suspicious'");
  add("delete_danger", "INTEGER NOT NULL DEFAULT 0");
  add("checks", "INTEGER NOT NULL DEFAULT 0");
  add("warnings", "INTEGER NOT NULL DEFAULT 0");
}

function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

// Eng ko'p uchragan sabablar (masalan: url_lookalike — 12 marta)
function topReasons(db) {
  const count = new Map();
  for (const { reasons } of db.prepare("SELECT reasons FROM checks WHERE reasons IS NOT NULL").all())
    for (const r of reasons.split(",")) count.set(r, (count.get(r) || 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => ({ code, n }));
}

// CSV yaratish (Excel'da ochiladi). Har bir qiymat qo'shtirnoqda — vergul va qatorlar buzilmasin.
function toCsv(rows) {
  const head = ["sana", "chat", "daraja", "ball", "havola", "matn", "fayl", "domenlar", "sabablar"];
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map(r => [new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19), r.chat_type, r.level, r.score,
    r.has_url, r.has_text, r.has_file, r.domains, r.reasons].map(cell).join(","));
  return "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");   // ﻿ — Excel o'zbek/rus harflarini to'g'ri ko'rsatishi uchun
}

module.exports = { openDb, toCsv, DEFAULT_PATH };
