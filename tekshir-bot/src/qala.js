// «Parol qal'asi» o'yini — server qismi (2-bosqich).
// O'yinchi username bilan kiradi, o'z qal'asiga O'YIN paroli qo'yadi, boshqalarning qal'asiga hujum qiladi.
//
// XAVFSIZLIK:
//  • Parol hech qachon brauzerga yuborilmaydi (faqat hujum tugagach ko'rsatiladi). Har bir belgi SERVERDA tekshiriladi.
//  • Bazada parol AES-256-GCM bilan SHIFRLANGAN holda turadi (kalit: QALA_KEY yoki HASH_SALT'dan olinadi).
//    O'yinda belgilarni bittalab tekshirish kerak, shuning uchun bir tomonlama hash ishlamaydi — shifrlash ishlatamiz.
//  • O'yinchi tokeni bazada faqat SHA-256 ko'rinishida saqlanadi.
//  • O'yinda HAQIQIY parol yozmaslik haqida ogohlantiramiz (ekranda).

const crypto = require("crypto");

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", DIGITS = "0123456789", SYMBOLS = "!@#$%&*?_-.";
const CHARSET = LETTERS + DIGITS + SYMBOLS;
const MAX_LIVES = 10, MIN_LEN = 8, MAX_LEN = 16;
const RESERVED = ["admin", "administrator", "moderator", "tekshir", "tekshirbot", "ahdigital", "system", "server", "null", "undefined"];
const POWER_LIMIT = { lupa: 2, heart: 2 };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS qala_players (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  token_hash  TEXT NOT NULL UNIQUE,
  atk_score   INTEGER NOT NULL DEFAULT 0,
  def_score   INTEGER NOT NULL DEFAULT 0,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS qala_castles (
  owner_id    INTEGER PRIMARY KEY,
  enc         TEXT NOT NULL,          -- shifrlangan parol
  len         INTEGER NOT NULL,
  strength    INTEGER NOT NULL,
  ver         INTEGER NOT NULL,       -- qal'a yaratilgan vaqt: parol almashsa — yangi qal'a
  attacks     INTEGER NOT NULL DEFAULT 0,
  falls       INTEGER NOT NULL DEFAULT 0,
  holds       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS qala_attacks (
  id          TEXT PRIMARY KEY,
  attacker_id INTEGER NOT NULL,
  owner_id    INTEGER NOT NULL,
  ver         INTEGER NOT NULL,
  lives       INTEGER NOT NULL,
  lost        INTEGER NOT NULL DEFAULT 0,
  used        TEXT NOT NULL DEFAULT '',
  opened      TEXT NOT NULL DEFAULT '',
  powers      TEXT NOT NULL DEFAULT '{}',
  state       TEXT NOT NULL DEFAULT 'play',   -- play | won | lost
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (attacker_id, owner_id, ver)
);
`;

// ---------- Sof funksiyalar (testlanadi) ----------
const nameOk = s => typeof s === "string" && /^[A-Za-z0-9_]{3,15}$/.test(s);
function checkPassword(pw) {
  if (typeof pw !== "string") return "bad";
  if (pw.length < MIN_LEN) return "short";
  if (pw.length > MAX_LEN) return "long";
  if ([...pw].some(c => !CHARSET.includes(c))) return "chars";
  if (new Set(pw).size < 6) return "same";           // "AAAABBBB" kabi — juda oson
  return null;
}
// Bu o'yinda qiyinlik = turli belgilar soni + kam uchraydigan belgilar (raqam, belgi)
function strength(pw) {
  const u = new Set(pw), has = set => [...pw].some(c => set.includes(c));
  return Math.min(100, u.size * 6 + (has(DIGITS) ? 10 : 0) + (has(SYMBOLS) ? 15 : 0) + (pw.length - MIN_LEN) * 2);
}
function hintText(n, pw) {
  const cnt = set => [...pw].filter(c => set.includes(c)).length;
  if (n === 1) { const d = cnt(DIGITS); return d ? `Parolda ${d} ta raqam bor` : "Parolda raqam yo'q"; }
  if (n === 2) return `${cnt(LETTERS)} ta harf, ${cnt(SYMBOLS)} ta belgi (!@#…)`;
  return "Sehrli o'q: bitta belgi ochildi ✨";
}
const positions = (pw, ch) => [...pw].map((c, i) => c === ch ? i : -1).filter(i => i >= 0);
function slotsOf(pw, opened) { return [...pw].map(c => opened.includes(c) ? c : null); }
const isWon = (pw, opened) => [...pw].every(c => opened.includes(c));

function createQala(db, { key } = {}) {
  db.exec(SCHEMA);
  const secret = key || process.env.QALA_KEY || ("qala:" + (process.env.HASH_SALT || process.env.BOT_TOKEN || "dev"));
  const K = crypto.createHash("sha256").update(secret).digest();
  const enc = pw => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", K, iv); const ct = Buffer.concat([c.update(pw, "utf8"), c.final()]); return [iv, c.getAuthTag(), ct].map(b => b.toString("base64")).join("."); };
  const dec = s => { const [iv, tag, ct] = s.split(".").map(x => Buffer.from(x, "base64")); const d = crypto.createDecipheriv("aes-256-gcm", K, iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]).toString("utf8"); };
  const sha = t => crypto.createHash("sha256").update(String(t)).digest("hex");

  const q = {
    byName:  db.prepare("SELECT id FROM qala_players WHERE name = ?"),
    byToken: db.prepare("SELECT * FROM qala_players WHERE token_hash = ?"),
    byId:    db.prepare("SELECT * FROM qala_players WHERE id = ?"),
    addPl:   db.prepare("INSERT INTO qala_players (name, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?)"),
    seen:    db.prepare("UPDATE qala_players SET last_seen = ? WHERE id = ?"),
    castle:  db.prepare("SELECT * FROM qala_castles WHERE owner_id = ?"),
    setCastle: db.prepare(`INSERT INTO qala_castles (owner_id, enc, len, strength, ver) VALUES (@id, @enc, @len, @st, @ver)
                           ON CONFLICT(owner_id) DO UPDATE SET enc = @enc, len = @len, strength = @st, ver = @ver, attacks = 0, falls = 0, holds = 0`),
    list:    db.prepare(`SELECT p.name, c.owner_id, c.len, c.strength, c.ver, c.attacks, c.falls, c.holds,
                           (SELECT state FROM qala_attacks a WHERE a.attacker_id = @me AND a.owner_id = c.owner_id AND a.ver = c.ver) my
                         FROM qala_castles c JOIN qala_players p ON p.id = c.owner_id
                         WHERE c.owner_id != @me ORDER BY (my IS NOT NULL), p.last_seen DESC LIMIT 40`),
    attack:  db.prepare("SELECT * FROM qala_attacks WHERE id = ? AND attacker_id = ?"),
    myAtk:   db.prepare("SELECT * FROM qala_attacks WHERE attacker_id = ? AND owner_id = ? AND ver = ?"),
    addAtk:  db.prepare("INSERT INTO qala_attacks (id, attacker_id, owner_id, ver, lives, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"),
    saveAtk: db.prepare("UPDATE qala_attacks SET lives = @lives, lost = @lost, used = @used, opened = @opened, powers = @powers, state = @state, updated_at = @now WHERE id = @id"),
    cAttacked: db.prepare("UPDATE qala_castles SET attacks = attacks + 1 WHERE owner_id = ?"),
    cFell:   db.prepare("UPDATE qala_castles SET falls = falls + 1 WHERE owner_id = ?"),
    cHeld:   db.prepare("UPDATE qala_castles SET holds = holds + 1 WHERE owner_id = ?"),
    atkWin:  db.prepare("UPDATE qala_players SET atk_score = atk_score + ?, wins = wins + 1 WHERE id = ?"),
    atkLose: db.prepare("UPDATE qala_players SET losses = losses + 1 WHERE id = ?"),
    defWin:  db.prepare("UPDATE qala_players SET def_score = def_score + ? WHERE id = ?"),
    top:     db.prepare("SELECT name, atk_score, def_score, wins, (atk_score + def_score) total FROM qala_players ORDER BY total DESC, wins DESC LIMIT 20")
  };

  function nameFree(name) {
    if (!nameOk(name)) return { ok: false, reason: "format" };
    if (RESERVED.includes(name.toLowerCase()) || q.byName.get(name)) return { ok: false, reason: "taken", suggest: suggest(name) };
    return { ok: true };
  }
  function suggest(name) {
    const base = name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 11) || "kamonchi", out = [];
    for (let i = 0; i < 40 && out.length < 3; i++) {
      const s = base + "_" + crypto.randomInt(10, 1000);
      if (!q.byName.get(s) && !out.includes(s)) out.push(s);
    }
    return out;
  }
  function join(name, now = Date.now()) {
    const f = nameFree(name);
    if (!f.ok) return f;
    const token = crypto.randomBytes(24).toString("hex");
    try { q.addPl.run(name, sha(token), now, now); }
    catch { return { ok: false, reason: "taken", suggest: suggest(name) }; }   // bir vaqtda ikki kishi olsa
    return { ok: true, token, name };
  }
  function auth(token) {
    if (typeof token !== "string" || token.length !== 48) return null;
    const p = q.byToken.get(sha(token));
    if (p) q.seen.run(Date.now(), p.id);
    return p || null;
  }
  function castleInfo(c) { return c ? { len: c.len, strength: c.strength, attacks: c.attacks, falls: c.falls, holds: c.holds } : null; }
  function me(p) {
    p = q.byId.get(p.id);
    return { name: p.name, atk_score: p.atk_score, def_score: p.def_score, wins: p.wins, losses: p.losses, castle: castleInfo(q.castle.get(p.id)) };
  }
  function setCastle(p, pw, now = Date.now()) {
    pw = typeof pw === "string" ? pw.toUpperCase() : pw;
    const err = checkPassword(pw);
    if (err) return { ok: false, reason: err };
    if (pw.includes(p.name.toUpperCase())) return { ok: false, reason: "name" };
    const st = strength(pw);
    const old = q.castle.get(p.id);
    q.setCastle.run({ id: p.id, enc: enc(pw), len: pw.length, st, ver: old ? Math.max(now, old.ver + 1) : now });
    return { ok: true, len: pw.length, strength: st };
  }
  function list(p) {
    return q.list.all({ me: p.id }).map(r => ({ owner: r.name, len: r.len, strength: r.strength, attacks: r.attacks, falls: r.falls, holds: r.holds, my: r.my || null }));
  }
  function view(a, pw) {
    const opened = a.opened;
    const out = { id: a.id, len: pw.length, lives: a.lives, lost: a.lost, used: a.used, slots: slotsOf(pw, opened), state: a.state };
    if (a.state !== "play") out.password = pw;
    return out;
  }
  function startAttack(p, owner, now = Date.now()) {
    const o = typeof owner === "string" && q.byName.get(owner);
    if (!o) return { ok: false, reason: "no_castle" };
    if (o.id === p.id) return { ok: false, reason: "self" };
    const c = q.castle.get(o.id);
    if (!c) return { ok: false, reason: "no_castle" };
    let a = q.myAtk.get(p.id, o.id, c.ver);
    if (!a) {
      const id = crypto.randomBytes(12).toString("hex");
      q.addAtk.run(id, p.id, o.id, c.ver, MAX_LIVES, now, now);
      q.cAttacked.run(o.id);
      a = q.attack.get(id, p.id);
    }
    return { ok: true, owner: owner, strength: c.strength, ...view(a, dec(c.enc)) };
  }
  // Hujumni yuklash: qal'a o'zgargan bo'lsa (egasi yangi parol qo'ygan) — hujum bekor
  function load(p, id) {
    const a = typeof id === "string" && q.attack.get(id, p.id);
    if (!a) return null;
    const c = q.castle.get(a.owner_id);
    if (!c || c.ver !== a.ver) return null;
    return { a, c, pw: dec(c.enc) };
  }
  function finish(a, c, won) {
    if (won) { q.cFell.run(a.owner_id); q.atkWin.run(50 + a.lives * 10, a.attacker_id); }
    else { q.cHeld.run(a.owner_id); q.atkLose.run(a.attacker_id); q.defWin.run(30 + Math.round(c.strength / 5), a.owner_id); }
  }
  function save(a, now) { q.saveAtk.run({ ...a, now }); }

  function guess(p, id, ch, now = Date.now()) {
    const L = load(p, id);
    if (!L) return { ok: false, reason: "no_attack" };
    const { a, c, pw } = L;
    if (a.state !== "play") return { ok: false, reason: "over", ...view(a, pw) };
    if (typeof ch !== "string" || ch.length !== 1 || !CHARSET.includes(ch)) return { ok: false, reason: "char" };
    if (a.used.includes(ch)) return { ok: false, reason: "used" };
    a.used += ch;
    const res = { ok: true, ch, hit: pw.includes(ch), positions: positions(pw, ch), hint: null };
    if (res.hit) {
      a.opened += ch;
      if (isWon(pw, a.opened)) { a.state = "won"; finish(a, c, true); }
    } else {
      a.lives--; a.lost++;
      if (a.lives <= 0) { a.state = "lost"; finish(a, c, false); }
      else if (a.lost % 3 === 0) {
        const n = a.lost / 3;
        res.hint = { n, text: hintText(n, pw) };
        if (n === 3) res.hint.reveal = reveal(a, c, pw);
      }
    }
    save(a, now);
    return { ...res, ...view(a, pw) };
  }
  function reveal(a, c, pw) {
    const hidden = [...new Set(pw)].filter(ch => !a.opened.includes(ch));
    if (!hidden.length) return null;
    const ch = hidden[crypto.randomInt(hidden.length)];
    a.opened += ch; if (!a.used.includes(ch)) a.used += ch;
    if (isWon(pw, a.opened)) { a.state = "won"; finish(a, c, true); }
    return { ch, positions: positions(pw, ch) };
  }
  // Bonus sharlar: lupa (bitta belgi ochiladi) va yurak (+1 jon). Har biri hujumda ko'pi bilan 2 marta.
  function power(p, id, kind, now = Date.now()) {
    const L = load(p, id);
    if (!L) return { ok: false, reason: "no_attack" };
    const { a, c, pw } = L;
    if (a.state !== "play") return { ok: false, reason: "over", ...view(a, pw) };
    if (!POWER_LIMIT[kind]) return { ok: false, reason: "kind" };
    const pw2 = JSON.parse(a.powers || "{}");
    if ((pw2[kind] || 0) >= POWER_LIMIT[kind]) return { ok: false, reason: "limit" };
    pw2[kind] = (pw2[kind] || 0) + 1; a.powers = JSON.stringify(pw2);
    const res = { ok: true, kind };
    if (kind === "heart") a.lives = Math.min(MAX_LIVES, a.lives + 1);
    else res.reveal = reveal(a, c, pw);
    save(a, now);
    return { ...res, ...view(a, pw) };
  }
  function giveUp(p, id, now = Date.now()) {
    const L = load(p, id);
    if (!L) return { ok: false, reason: "no_attack" };
    const { a, c, pw } = L;
    if (a.state === "play") { a.state = "lost"; finish(a, c, false); save(a, now); }
    return { ok: true, ...view(a, pw) };
  }
  const top = () => q.top.all();

  return { nameFree, join, auth, me, setCastle, list, startAttack, guess, power, giveUp, top };
}

// ---------- HTTP ----------
// Faqat o'z saytimizdan (o'yin shu serverda: /qala). IP bo'yicha daqiqasiga 90 ta so'rov, ro'yxatdan o'tish — 5 ta.
function createQalaHttp(qala, createLimiter) {
  const lim = createLimiter({ limit: 90 }), joinLim = createLimiter({ limit: 5 });
  const routes = {
    name:   (d) => qala.nameFree(String(d.name || "")),
    join:   (d, ip) => joinLim.hit(ip).ok ? qala.join(String(d.name || "")) : { ok: false, reason: "slow" },
    me:     (d, ip, p) => ({ ok: true, ...qala.me(p) }),
    castle: (d, ip, p) => qala.setCastle(p, d.password),
    list:   (d, ip, p) => ({ ok: true, castles: qala.list(p) }),
    attack: (d, ip, p) => qala.startAttack(p, d.owner),
    guess:  (d, ip, p) => qala.guess(p, d.id, d.ch),
    power:  (d, ip, p) => qala.power(p, d.id, d.kind),
    giveup: (d, ip, p) => qala.giveUp(p, d.id),
    top:    () => ({ ok: true, top: qala.top() })
  };
  const PUBLIC = ["name", "join", "top"];
  return async function handle(req, res, action) {
    const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(obj)); };
    if (req.method !== "POST") return send(405, { ok: false, reason: "post" });
    const origin = req.headers.origin;
    if (origin && origin !== "https://" + req.headers.host && origin !== "http://" + req.headers.host) return send(403, { ok: false, reason: "origin" });
    if (!routes[action]) return send(404, { ok: false, reason: "route" });
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    if (!lim.hit(ip).ok) return send(429, { ok: false, reason: "slow" });
    let body = "";
    for await (const chunk of req) { body += chunk; if (body.length > 2048) return send(413, { ok: false, reason: "big" }); }
    let d;
    try { d = JSON.parse(body || "{}"); } catch { return send(400, { ok: false, reason: "json" }); }
    let p = null;
    if (!PUBLIC.includes(action)) { p = qala.auth(d.token); if (!p) return send(401, { ok: false, reason: "auth" }); }
    try { send(200, routes[action](d, ip, p)); }
    catch (e) { console.error("Qala API:", e.message); send(500, { ok: false, reason: "server" }); }
  };
}

module.exports = { createQala, createQalaHttp, checkPassword, strength, hintText, CHARSET, MAX_LIVES };
