// Pro va Max obunachilari uchun kabinet: tabrik, limit hisoblagichi, "obuna hisobidan" buyurtma,
// tugashdan 3 kun oldin eslatma va oylik hisobot.
//
// Qoidalar (shartlar.html, C va D bo'limlar bilan bir xil bo'lsin):
//  Pro — oyiga 15 tagacha video/slayd/post, vizitka va menyu saytlar, oyiga 1 ta katta sayt
//  Max — video/slayd/post cheksiz, vizitka va menyu saytlar, obuna davomida (12 oy) 2 tagacha katta sayt
//  Ikkalasida ham bir vaqtda 2 tagacha faol buyurtma — qolganlari navbatda turadi.
const { monthKey, addPeriod, monthName, shiftMonth, MONTHS, ACTIVE_STATUSES } = require("./team");

const RULES = {
  pro: { items: 15, big: 1, bigPer: "month" },
  max: { items: null, big: 2, bigPer: "term" }   // null — cheksiz
};
const ITEM_SERVICES = ["video", "slayd"];
const SITE_SERVICES = ["vizitka"];
const BIG_SERVICES = ["katta-sayt"];
const PLAN_SERVICES = [...ITEM_SERVICES, ...SITE_SERVICES, ...BIG_SERVICES];
const OPEN_STATUSES = ["yangi", "tasdiqlandi", "jarayonda"];
const MAX_ACTIVE = 2;
const DAY = 864e5;

const fmt = n => Number(n).toLocaleString("ru-RU").replace(/[\s,]/g, " ");
const W = {
  uz: { t: "oyi hisoboti", plan: "obuna", done: "Bajarildi", work: "Jarayonda", wait: "Navbatda", items: "Video, slayd va post", sites: "Vizitka/menyu sayt", big: "Katta sayt", none: "Bu oy obuna hisobidan buyurtma bo'lmadi.", val: "Shu ishlarning oddiy narxi", sum: "so'm", until: "Obuna amal qiladi", more: "Batafsil kabinetda", inf: "cheksiz" },
  ru: { t: "— отчёт за месяц", plan: "подписка", done: "Выполнено", work: "В работе", wait: "В очереди", items: "Видео, слайды и посты", sites: "Сайт-визитка/меню", big: "Большой сайт", none: "В этом месяце заказов по подписке не было.", val: "Обычная цена этих работ", sum: "сум", until: "Подписка действует до", more: "Подробнее в кабинете", inf: "без лимита" },
  en: { t: "monthly report", plan: "plan", done: "Done", work: "In progress", wait: "Queued", items: "Videos, slides and posts", sites: "Business card/menu sites", big: "Full websites", none: "No orders on the plan this month.", val: "Regular price of this work", sum: "UZS", until: "Plan active until", more: "Details in your dashboard", inf: "unlimited" }
};
const REMIND = {
  uz: (name, d, url) => `⏰ ${name} obunangiz ${d} kundan keyin tugaydi.\nUzaytirsangiz, ishlar to'xtamaydi — yangi muddat eskisining davomidan boshlanadi.${url ? `\nUzaytirish: ${url}` : ""}`,
  ru: (name, d, url) => `⏰ Ваша подписка ${name} закончится через ${d} дн.\nПродлите — работа не остановится, новый срок начнётся с конца текущего.${url ? `\nПродлить: ${url}` : ""}`,
  en: (name, d, url) => `⏰ Your ${name} plan ends in ${d} day(s).\nRenew now and nothing stops — the new term starts when the current one ends.${url ? `\nRenew: ${url}` : ""}`
};

function createPlans({ store, services, readOrders, publicUrl = () => "" }) {
  const read = () => store.get("obunalar", []);
  const write = list => store.set("obunalar", list);
  const svc = id => services.find(s => s.id === id) || {};
  const isActiveOrder = o => o.status !== "bekor" && !!o.tgUserId && (ACTIVE_STATUSES.includes(o.status) || !!(o.paid && o.paid[1]));
  const activeNow = (s, now = Date.now()) => new Date(s.startedAt).getTime() <= now && new Date(s.expiresAt).getTime() > now;

  // To'langan/tasdiqlangan Pro va Max buyurtmalaridan obuna yozuvi (bir marta). Uzaytirilsa — eskisining davomidan.
  function sync() {
    const subs = read();
    let changed = false;
    const orders = readOrders().filter(o => RULES[o.serviceId] && isActiveOrder(o));
    for (const o of orders.slice().reverse()) {
      if (subs.some(s => s.id === o.code)) continue;
      const userId = String(o.tgUserId);
      const now = new Date().toISOString();
      const prev = subs.filter(s => s.userId === userId).sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0];
      const startedAt = prev && prev.expiresAt > now ? prev.expiresAt : now;
      subs.push({ id: o.code, userId, serviceId: o.serviceId, period: svc(o.serviceId).period, startedAt, expiresAt: addPeriod(startedAt, svc(o.serviceId).period), welcomed: false, remindedAt: null });
      changed = true;
    }
    if (changed) write(subs);
    return subs;
  }

  function planOf(userId) {
    const mine = sync().filter(s => s.userId === String(userId));
    return mine.find(s => activeNow(s)) || mine.sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0] || null;
  }

  function usage(sub, orders = readOrders(), now = Date.now()) {
    const rule = RULES[sub.serviceId];
    const mine = orders.filter(o => o.planId === sub.id && o.status !== "bekor");
    const month = monthKey(now);
    const inMonth = mine.filter(o => monthKey(o.createdAt) === month);
    const bigPool = rule.bigPer === "month" ? inMonth : mine;
    return {
      month,
      items: { used: inMonth.filter(o => ITEM_SERVICES.includes(o.serviceId)).length, limit: rule.items },
      sites: { used: inMonth.filter(o => SITE_SERVICES.includes(o.serviceId)).length, limit: null },
      big: { used: bigPool.filter(o => BIG_SERVICES.includes(o.serviceId)).length, limit: rule.big, per: rule.bigPer },
      open: { used: mine.filter(o => OPEN_STATUSES.includes(o.status)).length, limit: MAX_ACTIVE },
      orders: inMonth
    };
  }

  function forOrder(user, service) {
    if (!user) return { error: "Obuna hisobidan buyurtma berish uchun avval kiring.", status: 401 };
    const sub = planOf(user.id);
    if (!sub) return { error: "Sizda faol Pro yoki Max obuna yo'q.", status: 403 };
    if (!activeNow(sub)) return { error: "Obunangiz muddati tugagan. Uzaytirsangiz, yana obuna hisobidan buyurtma bera olasiz.", status: 403 };
    if (!PLAN_SERVICES.includes(service.id)) return { error: "Bu xizmat obunaga kirmaydi.", status: 400 };
    const u = usage(sub);
    if (ITEM_SERVICES.includes(service.id) && u.items.limit !== null && u.items.used >= u.items.limit)
      return { error: `Bu oy ${u.items.limit} ta video, slayd va post limiti tugadi. Keyingi oy 1-sanada yangilanadi.`, status: 409 };
    if (BIG_SERVICES.includes(service.id) && u.big.used >= u.big.limit)
      return { error: u.big.per === "month" ? "Bu oylik katta sayt limiti tugadi (oyiga 1 ta)." : `Obuna davomidagi katta sayt limiti tugadi (${u.big.limit} ta).`, status: 409 };
    return { sub, price: 0 };
  }

  function view(sub, user) {
    const u = usage(sub);
    const s = svc(sub.serviceId);
    return {
      id: sub.id, kind: sub.serviceId, name: s.name, period: sub.period, price: s.price,
      startedAt: sub.startedAt, expiresAt: sub.expiresAt, active: activeNow(sub),
      daysLeft: Math.max(0, Math.ceil((new Date(sub.expiresAt) - Date.now()) / DAY)),
      welcome: !sub.welcomed && activeNow(sub), firstName: String((user && user.name) || "").split(" ")[0],
      usage: { month: u.month, items: u.items, sites: u.sites, big: u.big, open: u.open },
      orders: u.orders.map(o => ({ code: o.code, serviceName: o.serviceName, status: o.status, createdAt: o.createdAt }))
    };
  }

  // ---------- Oylik hisobot ----------
  function monthsOf(sub, now = Date.now()) {
    const first = monthKey(sub.startedAt), cur = monthKey(now);
    const last = monthKey(Math.min(now, new Date(sub.expiresAt).getTime() - 1));
    const end = last < cur ? last : cur;
    const list = [];
    for (let m = end; m >= first && list.length < 24; m = shiftMonth(m, -1)) list.push(m);
    return list;
  }
  function report(sub, month, orders = readOrders()) {
    const rule = RULES[sub.serviceId];
    const list = orders.filter(o => o.planId === sub.id && o.status !== "bekor" && monthKey(o.createdAt) === month);
    const count = st => list.filter(o => st.includes(o.status)).length;
    return {
      month, kind: sub.serviceId, name: svc(sub.serviceId).name, expiresAt: sub.expiresAt,
      total: list.length, done: count(["bajarildi"]), inWork: count(["tasdiqlandi", "jarayonda"]), waiting: count(["yangi"]),
      items: { used: list.filter(o => ITEM_SERVICES.includes(o.serviceId)).length, limit: rule.items },
      sites: list.filter(o => SITE_SERVICES.includes(o.serviceId)).length,
      big: list.filter(o => BIG_SERVICES.includes(o.serviceId)).length,
      value: list.reduce((a, o) => a + (svc(o.serviceId).price || 0), 0)
    };
  }
  function reportText(r, lang = "uz", url = "") {
    const w = W[lang] || W.uz;
    const lines = [`📊 ${monthName(r.month, lang)} ${w.t}`, `⭐ ${r.name} ${w.plan}`, ""];
    if (!r.total) lines.push(w.none);
    else {
      lines.push(`✅ ${w.done}: ${r.done} · ⏳ ${w.work}: ${r.inWork} · 🕒 ${w.wait}: ${r.waiting}`);
      lines.push(`🎬 ${w.items}: ${r.items.used}${r.items.limit === null ? ` (${w.inf})` : ` / ${r.items.limit}`}`);
      if (r.sites) lines.push(`🌐 ${w.sites}: ${r.sites}`);
      if (r.big) lines.push(`🏗 ${w.big}: ${r.big}`);
      lines.push("", `💰 ${w.val}: ${fmt(r.value)} ${w.sum}`);
    }
    const d = new Date(r.expiresAt);
    lines.push("", `📅 ${w.until}: ${d.getUTCDate()} ${(MONTHS[lang] || MONTHS.uz)[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
    if (url) lines.push(`${w.more}: ${url}`);
    return lines.join("\n");
  }

  // Har oy 1-sanada (Toshkent, 10:00 dan keyin) o'tgan oy hisoboti — bir oy, bir marta
  async function sendMonthly(send, now = Date.now()) {
    const local = new Date(now + 5 * 3600_000);
    if (local.getUTCDate() !== 1 || local.getUTCHours() < 10) return 0;
    const month = shiftMonth(monthKey(now), -1);
    const sent = store.get("obuna_hisobotlar", {});
    const orders = readOrders();
    let n = 0;
    for (const s of sync()) {
      const key = `${s.id}:${month}`;
      if (sent[key] || !monthsOf(s, now).includes(month)) continue;
      const order = orders.find(o => o.code === s.id);
      if (!order) continue;
      sent[key] = new Date(now).toISOString();
      store.set("obuna_hisobotlar", sent);
      const lang = ["uz", "ru", "en"].includes(order.lang) ? order.lang : "uz";
      try { await send(order, { [lang]: reportText(report(s, month, orders), lang, `${publicUrl()}/kabinet.html`) }); n++; } catch {}
    }
    return n;
  }

  // Tugashiga 3 kun (yoki kamroq) qolganda bir marta eslatma. Uzaytirilgan bo'lsa — eslatmaydi.
  async function remind(send, now = Date.now()) {
    const subs = sync();
    const orders = readOrders();
    let n = 0;
    for (const s of subs) {
      const left = new Date(s.expiresAt).getTime() - now;
      if (s.remindedAt || left <= 0 || left > 3 * DAY || !activeNow(s, now)) continue;
      if (subs.some(x => x !== s && x.userId === s.userId && x.startedAt >= s.expiresAt)) continue;   // allaqachon uzaytirilgan
      const order = orders.find(o => o.code === s.id);
      if (!order) continue;
      s.remindedAt = new Date(now).toISOString();
      write(subs);
      const lang = ["uz", "ru", "en"].includes(order.lang) ? order.lang : "uz";
      const url = `${publicUrl()}/index.html?xizmat=${s.serviceId}#buyurtma`;
      try { await send(order, { [lang]: REMIND[lang](svc(s.serviceId).name, Math.ceil(left / DAY), publicUrl() ? url : "") }); n++; } catch {}
    }
    return n;
  }

  function mount(app) {
    const need = (req, res) => { if (!req.user) { res.status(401).json({ error: "Avval kiring.", login: true }); return false; } return true; };
    app.get("/api/plan", (req, res) => {
      if (!need(req, res)) return;
      const s = planOf(req.user.id);
      res.json({ plan: s ? view(s, req.user) : null });
    });
    // Tabrik bir marta ko'rsatiladi
    app.post("/api/plan/welcomed", (req, res) => {
      if (!need(req, res)) return;
      const subs = sync();
      subs.filter(s => s.userId === String(req.user.id)).forEach(s => { s.welcomed = true; });
      write(subs);
      res.json({ ok: true });
    });
    app.get("/api/plan/report", (req, res) => {
      if (!need(req, res)) return;
      const s = planOf(req.user.id);
      if (!s) return res.status(404).json({ error: "Obuna topilmadi." });
      const months = monthsOf(s);
      const month = months.includes(String(req.query.month)) ? String(req.query.month) : months[0];
      res.json({ months, report: month ? report(s, month) : null });
    });
  }

  return { mount, planOf, forOrder, usage, sync, report, reportText, sendMonthly, remind, PLANS: Object.keys(RULES) };
}

module.exports = { createPlans, RULES, PLAN_SERVICES };
