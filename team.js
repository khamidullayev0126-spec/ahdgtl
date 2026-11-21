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

  // ---------- Oylik hisobot ----------
  const MONTHS = {
    uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
    ru: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  const monthName = (m, lang = "uz") => { const [y, mm] = m.split("-"); return `${y} ${MONTHS[lang] ? MONTHS[lang][Number(mm) - 1] : mm}`; };
  const shiftMonth = (m, d) => { const [y, mm] = m.split("-").map(Number); const t = new Date(Date.UTC(y, mm - 1 + d, 1)); return t.toISOString().slice(0, 7); };
  // Jamoa amal qilgan oylar (eng yangisi birinchi)
  function monthsOf(team, now = Date.now()) {
    const first = monthKey(team.startedAt), cur = monthKey(now);
    const last = monthKey(Math.min(now, new Date(team.expiresAt).getTime() - 1));
    const end = last < cur ? last : cur;
    const list = [];
    for (let m = end; m >= first && list.length < 24; m = shiftMonth(m, -1)) list.push(m);
    return list;
  }

  function report(team, month, orders = readOrders()) {
    const all = users();
    const list = orders.filter(o => o.teamId === team.id && o.status !== "bekor" && monthKey(o.createdAt) === month);
    const lim = limitsFor(team.seats);
    const count = st => list.filter(o => st.includes(o.status)).length;
    const by = {};
    for (const o of list) { const n = (all[String(o.tgUserId)] || {}).name || o.name || "—"; by[n] = (by[n] || 0) + 1; }
    const priceOf = id => (services.find(s => s.id === id) || {}).price || 0;
    const value = list.reduce((a, o) => a + priceOf(o.serviceId), 0);         // shu ishlarning oddiy narxi
    const paid = list.reduce((a, o) => a + (Number(o.price) || 0), 0);        // jamoa alohida to'lagani (katta sayt)
    return {
      month, seats: team.seats, period: team.period, expiresAt: team.expiresAt,
      total: list.length,
      done: count(["bajarildi"]), inWork: count(["tasdiqlandi", "jarayonda"]), waiting: count(["yangi"]),
      items: { used: list.filter(o => ITEM_SERVICES.includes(o.serviceId)).length, limit: lim.items },
      sites: { used: list.filter(o => SITE_SERVICES.includes(o.serviceId)).length, limit: lim.sites },
      bigSites: list.filter(o => DISCOUNT_SERVICES[o.serviceId]).length,
      byMember: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
      value, paid, saved: Math.max(0, value - paid)
    };
  }

  const fmt = n => Number(n).toLocaleString("ru-RU").replace(/[\s,]/g, " ");
  const REPORT_WORDS = {
    uz: { t: "oyi hisoboti", team: "Jamoa", ppl: "kishi", done: "Bajarildi", work: "Jarayonda", wait: "Navbatda", items: "Video, slayd va post", sites: "Vizitka/menyu sayt", big: "Katta sayt (30% chegirma)", who: "Kim nechta buyurtma berdi", val: "Shu ishlarning oddiy narxi", saved: "Obuna hisobidan tejaldi", sum: "so'm", none: "Bu oy jamoa buyurtma bermadi.", until: "Obuna amal qiladi", more: "Batafsil kabinetda" },
    ru: { t: "— отчёт за месяц", team: "Команда", ppl: "чел.", done: "Выполнено", work: "В работе", wait: "В очереди", items: "Видео, слайды и посты", sites: "Сайт-визитка/меню", big: "Большой сайт (скидка 30%)", who: "Кто сколько заказал", val: "Обычная цена этих работ", saved: "Сэкономлено по подписке", sum: "сум", none: "В этом месяце команда ничего не заказывала.", until: "Подписка действует до", more: "Подробнее в кабинете" },
    en: { t: "monthly report", team: "Team", ppl: "members", done: "Done", work: "In progress", wait: "Queued", items: "Videos, slides and posts", sites: "Business card/menu sites", big: "Full websites (30% off)", who: "Orders by member", val: "Regular price of this work", saved: "Saved with the plan", sum: "UZS", none: "The team placed no orders this month.", until: "Plan active until", more: "Details in your dashboard" }
  };
  function reportText(r, lang = "uz", cabinetUrl = "") {
    const W = REPORT_WORDS[lang] || REPORT_WORDS.uz;
    const lines = [`📊 ${monthName(r.month, lang)} ${W.t}`, `👥 ${W.team} · ${r.seats} ${W.ppl}`, ""];
    if (!r.total) lines.push(W.none);
    else {
      lines.push(`✅ ${W.done}: ${r.done} · ⏳ ${W.work}: ${r.inWork} · 🕒 ${W.wait}: ${r.waiting}`);
      lines.push(`🎬 ${W.items}: ${r.items.used} / ${r.items.limit}`);
      lines.push(`🌐 ${W.sites}: ${r.sites.used} / ${r.sites.limit}`);
      if (r.bigSites) lines.push(`🏗 ${W.big}: ${r.bigSites}`);
      lines.push("", `${W.who}:`, ...r.byMember.map(m => `• ${m.name} — ${m.n}`));
      lines.push("", `💰 ${W.val}: ${fmt(r.value)} ${W.sum}`, `🎁 ${W.saved}: ${fmt(r.saved)} ${W.sum}`);
    }
    const d = new Date(r.expiresAt);
    lines.push("", `📅 ${W.until}: ${d.getUTCDate()} ${MONTHS[lang] ? MONTHS[lang][d.getUTCMonth()] : ""} ${d.getUTCFullYear()}`);
    if (cabinetUrl) lines.push(`${W.more}: ${cabinetUrl}`);
    return lines.join("\n");
  }

  // Har oy 1-sanada (Toshkent, 10:00 dan keyin) o'tgan oy hisobotini jamoa egasiga yuboradi. Bir oy — bir marta.
  async function sendMonthly(send, now = Date.now()) {
    const local = new Date(now + 5 * 3600_000);
    if (local.getUTCDate() !== 1 || local.getUTCHours() < 10) return 0;
    const month = shiftMonth(monthKey(now), -1);
    const sent = store.get("jamoa_hisobotlar", {});
    const orders = readOrders();
    let n = 0;
    for (const t of sync()) {
      const key = `${t.id}:${month}`;
      if (sent[key] || !monthsOf(t, now).includes(month)) continue;
      const order = orders.find(o => o.code === t.id);
      if (!order) continue;
      sent[key] = new Date(now).toISOString();
      store.set("jamoa_hisobotlar", sent);
      const r = report(t, month, orders);
      const lang = ["uz", "ru", "en"].includes(order.lang) ? order.lang : "uz";
      try { await send(order, { [lang]: reportText(r, lang, `${publicUrl()}/kabinet.html`) }); n++; } catch {}
    }
    return n;
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

    // Ega: oylik hisobot (?month=YYYY-MM, bo'lmasa — joriy oy)
    app.get("/api/team/report", (req, res) => {
      if (!need(req, res)) return;
      const t = teamOf(req.user.id);
      if (!t) return res.status(404).json({ error: "Jamoa topilmadi." });
      if (t.ownerId !== String(req.user.id)) return res.status(403).json({ error: "Hisobotni faqat jamoa egasi ko'radi." });
      const months = monthsOf(t);
      const month = months.includes(String(req.query.month)) ? String(req.query.month) : months[0];
      if (!month) return res.json({ months, report: null });
      res.json({ months, report: report(t, month) });
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

  return { mount, teamOf, forOrder, usage, sync, report, reportText, sendMonthly, monthsOf, TEAM_SERVICES, TEAM_PLANS: teamServices };
}

module.exports = { createTeams, limitsFor, monthKey, TEAM_SERVICES };
