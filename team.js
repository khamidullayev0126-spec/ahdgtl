// Jamoa obunasi: jamoa kabineti, a'zolar, taklif havolasi va oylik umumiy hajm.
//
// Qanday ishlaydi:
//  1. Mijoz saytda "Jamoa" obunasini oladi (kirgan bo'lishi shart — u jamoa egasi bo'ladi).
//  2. Obuna to'langanda yoki admin "tasdiqlandi" qilganda jamoa avtomatik ochiladi.
//  3. Ega kabinetdagi taklif havolasini xodimlarga yuboradi → xodim kirib, jamoaga qo'shiladi.
//  4. A'zolar buyurtma formasida "Jamoa obunasi hisobidan" belgisini qo'yadi:
//     video/slayd — umumiy hovuzdan bepul, vizitka/menyu sayt — limit ichida bepul, katta sayt — 30% chegirma.
//  5. Hajm har oy 1-sanada (Toshkent vaqti) yangilanadi, ishlatilmagani keyingi oyga o'tmaydi.
const crypto = require("crypto");

const ACTIVE_STATUSES = ["tasdiqlandi", "jarayonda", "bajarildi"];
const ITEM_SERVICES = ["video", "slayd"];        // umumiy hovuzdan: video, slayd va postlar
const SITE_SERVICES = ["vizitka"];               // vizitka yoki menyu sayt
const DISCOUNT_SERVICES = { "katta-sayt": 0.3 }; // chegirma bilan
const TEAM_SERVICES = [...ITEM_SERVICES, ...SITE_SERVICES, ...Object.keys(DISCOUNT_SERVICES)];

// Hajm: 3 kishiga 18 ta ish, har qo'shimcha xodimga +4; vizitka/menyu sayt — 1 ta (5 kishida 2 ta)
const limitsFor = seats => ({ items: 18 + 4 * Math.max(0, seats - 3), sites: seats >= 5 ? 2 : 1 });
// Toshkent vaqti bo'yicha oy: "2026-11"
const monthKey = d => new Date(new Date(d).getTime() + 5 * 3600_000).toISOString().slice(0, 7);

function addPeriod(iso, period) {
  const d = new Date(iso);
  if (period === "yil") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

function createTeams({ store, services, readOrders, publicUrl = () => "" }) {
  const teamServices = services.filter(s => s.perSeat).map(s => s.id);
  const users = () => store.get("foydalanuvchilar", {});
  const readTeams = () => store.get("jamoalar", []);
  const writeTeams = list => store.set("jamoalar", list);
  const isActiveOrder = o => o.status !== "bekor" && !!o.tgUserId && (ACTIVE_STATUSES.includes(o.status) || !!(o.paid && o.paid[1]));

  // To'langan/tasdiqlangan jamoa buyurtmalaridan jamoa yozuvini yaratamiz (bir marta)
  function sync() {
    const teams = readTeams();
    let changed = false;
    const orders = readOrders().filter(o => teamServices.includes(o.serviceId) && isActiveOrder(o));
    // eskisidan yangisiga — uzaytirishda a'zolar yangi jamoaga ko'chadi
    for (const o of orders.slice().reverse()) {
      if (teams.some(t => t.id === o.code)) continue;
      const svc = services.find(s => s.id === o.serviceId);
      const seats = Number(o.seats) || svc.minSeats;
      const ownerId = String(o.tgUserId);
      const now = new Date().toISOString();
      const prev = teams.filter(t => t.ownerId === ownerId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      const members = prev ? prev.members.filter(m => m.id !== ownerId).slice(0, seats - 1) : [];
      const startedAt = prev && prev.expiresAt > now ? prev.expiresAt : now;   // muddati tugamagan bo'lsa — davomidan
      teams.push({
        id: o.code, ownerId, serviceId: o.serviceId, seats, period: svc.period,
        startedAt, expiresAt: addPeriod(startedAt, svc.period),
        invite: crypto.randomBytes(9).toString("base64url"),
        members: [{ id: ownerId, joinedAt: now }, ...members]
      });
      changed = true;
    }
    if (changed) writeTeams(teams);
    return teams;
  }

  const activeNow = t => { const now = new Date().toISOString(); return t.startedAt <= now && t.expiresAt > now; };
  // Foydalanuvchining jamoasi: avval hozir amal qilayotgani, bo'lmasa eng oxirgisi (muddati tugagan bo'lishi mumkin)
  function teamOf(userId) {
    const mine = sync().filter(t => t.members.some(m => m.id === String(userId)));
    return mine.find(activeNow) || mine.sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0] || null;
  }

  function usage(team, orders = readOrders()) {
    const month = monthKey(Date.now());
    const mine = orders.filter(o => o.teamId === team.id && o.status !== "bekor" && monthKey(o.createdAt) === month);
    const lim = limitsFor(team.seats);
    return {
      month,
      items: { used: mine.filter(o => ITEM_SERVICES.includes(o.serviceId)).length, limit: lim.items },
      sites: { used: mine.filter(o => SITE_SERVICES.includes(o.serviceId)).length, limit: lim.sites },
      orders: mine
    };
  }

  // Buyurtma formasidan: jamoa hisobidan buyurtma berish mumkinmi va narxi qancha
  function forOrder(user, service) {
    if (!user) return { error: "Jamoa hisobidan buyurtma berish uchun avval kiring.", status: 401 };
    const team = teamOf(user.id);
    if (!team) return { error: "Siz hech qaysi jamoada emassiz.", status: 403 };
    if (!activeNow(team)) return { error: "Jamoa obunasining muddati tugagan. Jamoa egasi obunani uzaytirishi kerak.", status: 403 };
    if (!TEAM_SERVICES.includes(service.id)) return { error: "Bu xizmat jamoa obunasiga kirmaydi.", status: 400 };
    const u = usage(team);
    if (ITEM_SERVICES.includes(service.id) && u.items.used >= u.items.limit)
      return { error: `Bu oy jamoaning ${u.items.limit} ta video, slayd va post limiti tugadi. Keyingi oy 1-sanada yangilanadi.`, status: 409 };
    if (SITE_SERVICES.includes(service.id) && u.sites.used >= u.sites.limit)
      return { error: `Bu oy jamoaning vizitka/menyu sayt limiti (${u.sites.limit} ta) tugadi.`, status: 409 };
    const off = DISCOUNT_SERVICES[service.id];
    return { team, price: off ? Math.round(service.price * (1 - off)) : 0 };
  }

  function view(team, userId) {
    const all = users();
    const owner = team.ownerId === String(userId);
    const u = usage(team);
    const nameOf = id => { const x = all[id] || {}; return { name: x.name || "—", username: x.username || "", email: owner ? x.email || "" : "" }; };
    return {
      id: team.id, owner, seats: team.seats, period: team.period,
      startedAt: team.startedAt, expiresAt: team.expiresAt, active: activeNow(team),
      members: team.members.map(m => ({ id: owner ? m.id : undefined, ...nameOf(m.id), owner: m.id === team.ownerId, me: m.id === String(userId), joinedAt: m.joinedAt })),
      invite: owner ? `${publicUrl()}/kabinet.html?jamoa=${team.invite}` : undefined,
      usage: { month: u.month, items: u.items, sites: u.sites },
      orders: u.orders.map(o => ({ code: o.code, serviceName: o.serviceName, status: o.status, price: o.price, createdAt: o.createdAt, by: nameOf(String(o.tgUserId)).name }))
    };
  }

  // Taklifni taxmin qilib topishga qarshi: bitta foydalanuvchi soatiga 20 tagacha urinish
  const tries = new Map();
  function tooMany(id) {
    const now = Date.now(), list = (tries.get(id) || []).filter(t => now - t < 3600_000);
    if (list.length >= 20) return true;
    if (tries.size > 5000) tries.clear();
    tries.set(id, [...list, now]);
    return false;
  }

  function mount(app) {
    const need = (req, res) => { if (!req.user) { res.status(401).json({ error: "Avval kiring.", login: true }); return false; } return true; };

    app.get("/api/team", (req, res) => {
      if (!need(req, res)) return;
      const t = teamOf(req.user.id);
      res.json({ team: t ? view(t, req.user.id) : null });
    });

    // Taklif havolasi: kimning jamoasi, joy bormi (qo'shilishdan oldin ko'rsatish uchun)
    app.get("/api/team/invite/:token", (req, res) => {
      if (!need(req, res)) return;
      if (tooMany(String(req.user.id))) return res.status(429).json({ error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring." });
      const t = sync().find(x => x.invite === String(req.params.token));
      if (!t || !activeNow(t)) return res.status(404).json({ error: "Taklif havolasi eskirgan yoki noto'g'ri." });
      const owner = users()[t.ownerId] || {};
      res.json({ ownerName: owner.name || "—", seats: t.seats, members: t.members.length, member: t.members.some(m => m.id === String(req.user.id)) });
    });

    app.post("/api/team/join", (req, res) => {
      if (!need(req, res)) return;
      if (tooMany(String(req.user.id))) return res.status(429).json({ error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring." });
      const teams = sync();
      const t = teams.find(x => x.invite === String((req.body || {}).token || ""));
      if (!t || !activeNow(t)) return res.status(404).json({ error: "Taklif havolasi eskirgan yoki noto'g'ri." });
      const id = String(req.user.id);
      if (t.members.some(m => m.id === id)) return res.json({ ok: true, already: true });
      const other = teams.find(x => x !== t && activeNow(x) && x.members.some(m => m.id === id));
      if (other) return res.status(409).json({ error: "Siz allaqachon boshqa jamoadasiz. Avval undan chiqing." });
      if (t.members.length >= t.seats) return res.status(409).json({ error: `Jamoada bo'sh joy yo'q (${t.seats} kishi). Jamoa egasiga yozing.` });
      t.members.push({ id, joinedAt: new Date().toISOString() });
      writeTeams(teams);
      res.json({ ok: true });
    });

    // Ega: a'zoni chiqarish yoki o'zi chiqib ketish (ega chiqa olmaydi)
    app.post("/api/team/remove", (req, res) => {
      if (!need(req, res)) return;
      const teams = sync();
      const me = String(req.user.id);
      const t = teams.find(x => x.members.some(m => m.id === me) && activeNow(x)) || teams.find(x => x.members.some(m => m.id === me));
      if (!t) return res.status(404).json({ error: "Jamoa topilmadi." });
      const target = String((req.body || {}).userId || me);
      if (target === t.ownerId) return res.status(400).json({ error: "Jamoa egasini chiqarib bo'lmaydi." });
      if (target !== me && t.ownerId !== me) return res.status(403).json({ error: "Faqat jamoa egasi a'zolarni chiqara oladi." });
      t.members = t.members.filter(m => m.id !== target);
      writeTeams(teams);
      res.json({ ok: true });
    });

    // Ega: yangi taklif havolasi (eskisi ishlamay qoladi)
    app.post("/api/team/invite/reset", (req, res) => {
      if (!need(req, res)) return;
      const teams = sync();
      const t = teams.find(x => x.ownerId === String(req.user.id) && activeNow(x));
      if (!t) return res.status(404).json({ error: "Jamoa topilmadi." });
      t.invite = crypto.randomBytes(9).toString("base64url");
      writeTeams(teams);
      res.json({ ok: true, invite: `${publicUrl()}/kabinet.html?jamoa=${t.invite}` });
    });
  }

  return { mount, teamOf, forOrder, usage, sync, TEAM_SERVICES, TEAM_PLANS: teamServices };
}

module.exports = { createTeams, limitsFor, monthKey, TEAM_SERVICES };
