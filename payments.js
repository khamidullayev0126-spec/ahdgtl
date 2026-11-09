// AHdigital — onlayn to'lov: Click va Payme (Uzcard, Humo kartalari ikkalasi orqali ham)
//
// To'lov tartibi:
//   • Bir martalik xizmatlar (video, vizitka, slayd, katta sayt): 2 qism — 50% oldindan, qolgan 50% ish "bajarildi" bo'lgach.
//   • Obuna va kurs: 1 qism — 100% oldindan.
// Har bir qismning to'lov ID'si: "<buyurtma kodi>-<qism raqami>", masalan "a1b2c3d4-1".
//
// Render → Environment (kalit bo'lmasa — o'sha to'lov usuli o'chiq turadi):
//   Payme: PAYME_MERCHANT_ID, PAYME_KEY  (sinov uchun: PAYME_TEST=1 — test.paycom.uz)
//          Payme kabinetida "Endpoint URL": https://<sayt>/api/payme
//   Click: CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY
//          Click kabinetida: Prepare URL https://<sayt>/api/click/prepare, Complete URL https://<sayt>/api/click/complete

const crypto = require("crypto");
const express = require("express");

const PAYME_TIMEOUT = 12 * 3600 * 1000;      // Payme qoidasi: yaratilgan tranzaksiya 12 soatda bajarilmasa — bekor

function createPayments({ store, readOrders, writeOrders, services, publicUrl = "", onPaid = () => {} }) {
  const cfg = {
    payme: { id: process.env.PAYME_MERCHANT_ID || "", key: process.env.PAYME_KEY || "", test: process.env.PAYME_TEST === "1" },
    click: { service: process.env.CLICK_SERVICE_ID || "", merchant: process.env.CLICK_MERCHANT_ID || "", secret: process.env.CLICK_SECRET_KEY || "" }
  };
  const methods = () => ({ payme: !!(cfg.payme.id && cfg.payme.key), click: !!(cfg.click.service && cfg.click.merchant && cfg.click.secret) });
  const base = () => (publicUrl || "").replace(/\/$/, "");

  // ---------- Qismlar ----------
  function partsOf(order) {
    const s = services.find(x => x.id === order.serviceId);
    const split = !s || s.group === "once";
    const price = Number(order.price) || 0;
    if (!split) return [{ n: 1, amount: price }];
    const first = Math.ceil(price / 2);
    return [{ n: 1, amount: first }, { n: 2, amount: price - first }];
  }
  // Hozir to'lanadigan qism: { n, amount, locked } — locked: 2-qism hali ochilmagan (ish tayyor emas)
  function dueOf(order) {
    if (!order || order.status === "bekor") return null;
    const paid = order.paid || {};
    for (const p of partsOf(order)) {
      if (paid[p.n]) continue;
      return { ...p, locked: p.n === 2 && order.status !== "bajarildi" };
    }
    return null;
  }
  function summary(order) {
    const paid = order.paid || {};
    return partsOf(order).map(p => ({ ...p, paid: !!paid[p.n], paidAt: paid[p.n] ? paid[p.n].at : null, method: paid[p.n] ? paid[p.n].method : null }));
  }
  const payLink = order => `${base()}/tolov.html?o=${order.code}`;

  // payId → buyurtma va qism; to'lash mumkinmi
  function resolve(payId) {
    const m = String(payId || "").match(/^([a-f0-9]{6,16})-([12])$/);
    if (!m) return { error: "notfound" };
    const orders = readOrders();
    const order = orders.find(o => o.code === m[1]);
    if (!order) return { error: "notfound" };
    const part = partsOf(order).find(p => p.n === Number(m[2]));
    if (!part) return { error: "notfound" };
    if (order.status === "bekor") return { error: "cancelled", order, part };
    if ((order.paid || {})[part.n]) return { error: "paid", order, part };
    const due = dueOf(order);
    if (!due || due.n !== part.n || due.locked) return { error: "notdue", order, part };
    return { order, part, orders };
  }

  function markPaid(payId, method, tx) {
    const r = resolve(payId);
    if (r.error && r.error !== "notdue") return null;   // notdue: navbat buzilgan bo'lsa ham pul kelgan — baribir yozamiz
    const orders = readOrders();
    const order = orders.find(o => o.code === String(payId).split("-")[0]);
    const n = Number(String(payId).split("-")[1]);
    const part = partsOf(order).find(p => p.n === n);
    order.paid = { ...(order.paid || {}), [n]: { amount: part.amount, method, tx, at: new Date().toISOString() } };
    if (n === 1 && order.status === "yangi") order.status = "tasdiqlandi";
    writeOrders(orders);
    try { onPaid(order, part, method); } catch (e) { console.error("onPaid:", e.message); }
    return order;
  }
  function unmarkPaid(payId) {
    const orders = readOrders();
    const order = orders.find(o => o.code === String(payId).split("-")[0]);
    if (!order || !order.paid) return;
    delete order.paid[String(payId).split("-")[1]];
    writeOrders(orders);
  }

  const txs = () => store.get("tolovlar", {});
  const saveTx = (key, tx) => { const all = txs(); all[key] = tx; store.set("tolovlar", all); };

  // ---------- To'lov havolalari ----------
  function checkoutUrl(method, order, part, lang = "uz") {
    const payId = `${order.code}-${part.n}`;
    const back = `${payLink(order)}&lang=${lang}`;
    if (method === "payme") {
      const params = `m=${cfg.payme.id};ac.order_id=${payId};a=${part.amount * 100};c=${back};l=${lang === "en" ? "en" : lang === "ru" ? "ru" : "uz"}`;
      return `${cfg.payme.test ? "https://test.paycom.uz" : "https://checkout.paycom.uz"}/${Buffer.from(params).toString("base64")}`;
    }
    if (method === "click") {
      const q = new URLSearchParams({ service_id: cfg.click.service, merchant_id: cfg.click.merchant, amount: String(part.amount), transaction_param: payId, return_url: back });
      return `https://my.click.uz/services/pay?${q}`;
    }
    return null;
  }

  // ---------- Payme Merchant API (JSON-RPC) ----------
  const PM = {
    auth: { code: -32504, message: { uz: "Ruxsat yo'q", ru: "Недостаточно привилегий", en: "Insufficient privileges" } },
    method: { code: -32601, message: { uz: "Metod topilmadi", ru: "Метод не найден", en: "Method not found" } },
    amount: { code: -31001, message: { uz: "Noto'g'ri summa", ru: "Неверная сумма", en: "Wrong amount" } },
    tx: { code: -31003, message: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" } },
    perform: { code: -31008, message: { uz: "Amalni bajarib bo'lmaydi", ru: "Невозможно выполнить операцию", en: "Unable to perform operation" } },
    order: { code: -31050, message: { uz: "Buyurtma topilmadi yoki to'lab bo'lmaydi", ru: "Заказ не найден или недоступен для оплаты", en: "Order not found or not payable" }, data: "order_id" },
    busy: { code: -31051, message: { uz: "Buyurtma bo'yicha boshqa to'lov kutilmoqda", ru: "По заказу ожидается другая оплата", en: "Another payment is pending" }, data: "order_id" }
  };
  function paymeCheck(params) {
    const payId = params.account && params.account.order_id;
    const r = resolve(payId);
    if (r.error) return { error: PM.order };
    if (Number(params.amount) !== r.part.amount * 100) return { error: PM.amount };
    return { payId, r };
  }
  const pmKey = id => "pm:" + id;
  function paymeTxView(t) {
    return { create_time: t.create_time, perform_time: t.perform_time || 0, cancel_time: t.cancel_time || 0, transaction: t.our, state: t.state, reason: t.reason ?? null };
  }
  function paymeExpire(t) {
    if (t.state === 1 && Date.now() - t.create_time > PAYME_TIMEOUT) {
      Object.assign(t, { state: -1, cancel_time: Date.now(), reason: 4 });
      saveTx(pmKey(t.id), t);
      return true;
    }
    return false;
  }

  async function payme(req, res) {
    const body = req.body || {};
    const reply = (x) => res.json({ jsonrpc: "2.0", id: body.id ?? null, ...x });
    const expected = "Basic " + Buffer.from("Paycom:" + cfg.payme.key).toString("base64");
    const given = req.get("authorization") || "";
    if (!methods().payme || given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return reply({ error: PM.auth });
    const p = body.params || {};
    switch (body.method) {
      case "CheckPerformTransaction": {
        const c = paymeCheck(p);
        if (c.error) return reply({ error: c.error });
        const pending = Object.values(txs()).find(t => t.kind === "payme" && t.payId === c.payId && t.state === 1 && !paymeExpire(t));
        if (pending) return reply({ error: PM.busy });
        return reply({ result: { allow: true } });
      }
      case "CreateTransaction": {
        const existing = txs()[pmKey(p.id)];
        if (existing) {
          if (existing.state !== 1 || paymeExpire(existing)) return reply({ error: PM.perform });
          return reply({ result: { create_time: existing.create_time, transaction: existing.our, state: existing.state } });
        }
        const c = paymeCheck(p);
        if (c.error) return reply({ error: c.error });
        const other = Object.values(txs()).find(t => t.kind === "payme" && t.payId === c.payId && t.state === 1 && !paymeExpire(t));
        if (other) return reply({ error: PM.busy });
        const t = { kind: "payme", id: p.id, our: crypto.randomBytes(8).toString("hex"), payId: c.payId, amount: Number(p.amount), time: Number(p.time), create_time: Date.now(), state: 1 };
        saveTx(pmKey(p.id), t);
        return reply({ result: { create_time: t.create_time, transaction: t.our, state: 1 } });
      }
      case "PerformTransaction": {
        const t = txs()[pmKey(p.id)];
        if (!t) return reply({ error: PM.tx });
        if (t.state === 2) return reply({ result: { transaction: t.our, perform_time: t.perform_time, state: 2 } });
        if (t.state !== 1 || paymeExpire(t)) return reply({ error: PM.perform });
        Object.assign(t, { state: 2, perform_time: Date.now() });
        saveTx(pmKey(p.id), t);
        markPaid(t.payId, "Payme", t.id);
        return reply({ result: { transaction: t.our, perform_time: t.perform_time, state: 2 } });
      }
      case "CancelTransaction": {
        const t = txs()[pmKey(p.id)];
        if (!t) return reply({ error: PM.tx });
        if (t.state === 1) Object.assign(t, { state: -1, cancel_time: Date.now(), reason: p.reason ?? null });
        else if (t.state === 2) { Object.assign(t, { state: -2, cancel_time: Date.now(), reason: p.reason ?? null }); unmarkPaid(t.payId); }
        saveTx(pmKey(p.id), t);
        return reply({ result: { transaction: t.our, cancel_time: t.cancel_time, state: t.state } });
      }
      case "CheckTransaction": {
        const t = txs()[pmKey(p.id)];
        if (!t) return reply({ error: PM.tx });
        paymeExpire(t);
        return reply({ result: paymeTxView(t) });
      }
      case "GetStatement": {
        const list = Object.values(txs()).filter(t => t.kind === "payme" && t.time >= Number(p.from) && t.time <= Number(p.to))
          .map(t => ({ id: t.id, time: t.time, amount: t.amount, account: { order_id: t.payId }, ...paymeTxView(t) }));
        return reply({ result: { transactions: list } });
      }
      default: return reply({ error: PM.method });
    }
  }

  // ---------- Click Shop API (Prepare / Complete) ----------
  const md5 = s => crypto.createHash("md5").update(s).digest("hex");
  function clickReply(res, b, error, note, extra = {}) {
    res.json({ click_trans_id: b.click_trans_id, merchant_trans_id: b.merchant_trans_id, ...extra, error, error_note: note });
  }
  function clickSignOk(b, withPrepare) {
    const s = String(b.click_trans_id) + b.service_id + cfg.click.secret + b.merchant_trans_id + (withPrepare ? b.merchant_prepare_id : "") + b.amount + b.action + b.sign_time;
    const want = md5(s), got = String(b.sign_string || "");
    return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  }
  function clickPrepare(req, res) {
    const b = req.body || {};
    if (!methods().click) return clickReply(res, b, -8, "Click o'chiq");
    if (!clickSignOk(b, false)) return clickReply(res, b, -1, "SIGN CHECK FAILED!");
    if (String(b.action) !== "0") return clickReply(res, b, -3, "Action not found");
    const r = resolve(b.merchant_trans_id);
    if (r.error === "paid") return clickReply(res, b, -4, "Already paid");
    if (r.error === "cancelled") return clickReply(res, b, -9, "Transaction cancelled");
    if (r.error) return clickReply(res, b, -5, "Order not found");
    if (Math.abs(Number(b.amount) - r.part.amount) > 0.01) return clickReply(res, b, -2, "Incorrect parameter amount");
    const prep = Date.now() * 10 + crypto.randomInt(10);
    saveTx("ck:" + b.click_trans_id, { kind: "click", id: String(b.click_trans_id), prepare: prep, payId: b.merchant_trans_id, amount: Number(b.amount), state: "prepared", time: Date.now() });
    return clickReply(res, b, 0, "Success", { merchant_prepare_id: prep });
  }
  function clickComplete(req, res) {
    const b = req.body || {};
    if (!methods().click) return clickReply(res, b, -8, "Click o'chiq");
    if (!clickSignOk(b, true)) return clickReply(res, b, -1, "SIGN CHECK FAILED!");
    if (String(b.action) !== "1") return clickReply(res, b, -3, "Action not found");
    const t = txs()["ck:" + b.click_trans_id];
    if (!t || String(t.prepare) !== String(b.merchant_prepare_id)) return clickReply(res, b, -6, "Transaction does not exist");
    if (t.state === "paid") return clickReply(res, b, -4, "Already paid", { merchant_confirm_id: t.prepare });
    if (t.state === "cancelled") return clickReply(res, b, -9, "Transaction cancelled");
    if (Number(b.error) < 0) {                             // Click tomonida to'lov o'tmadi
      t.state = "cancelled"; saveTx("ck:" + b.click_trans_id, t);
      return clickReply(res, b, -9, "Transaction cancelled");
    }
    if (Math.abs(Number(b.amount) - t.amount) > 0.01) return clickReply(res, b, -2, "Incorrect parameter amount");
    const r = resolve(t.payId);
    if (r.error === "paid") return clickReply(res, b, -4, "Already paid");
    if (r.error && r.error !== "notdue") return clickReply(res, b, -5, "Order not found");
    t.state = "paid"; t.paidAt = Date.now(); saveTx("ck:" + b.click_trans_id, t);
    markPaid(t.payId, "Click", t.id);
    return clickReply(res, b, 0, "Success", { merchant_confirm_id: t.prepare });
  }

  // ---------- Marshrutlar ----------
  function install(app) {
    // To'lov sahifasi uchun: buyurtma haqida qisqa ma'lumot (kod — havoladagi maxfiy belgi)
    app.get("/api/pay/:code", (req, res) => {
      const order = readOrders().find(o => o.code === String(req.params.code).toLowerCase());
      if (!order) return res.status(404).json({ error: "Buyurtma topilmadi." });
      res.json({
        code: order.code, serviceName: order.serviceName, serviceId: order.serviceId, price: order.price, status: order.status,
        name: String(order.name || "").split(" ")[0], parts: summary(order), due: dueOf(order), methods: methods()
      });
    });
    // To'lovni boshlash → Click yoki Payme sahifasiga yo'naltirish
    app.get("/api/pay/:code/:part/:method", (req, res) => {
      const { code, part, method } = req.params;
      if (!methods()[method]) return res.status(400).json({ error: "Bu to'lov usuli hozircha yoqilmagan." });
      const r = resolve(`${String(code).toLowerCase()}-${part}`);
      if (r.error === "paid") return res.status(409).json({ error: "Bu qism allaqachon to'langan." });
      if (r.error === "notdue") return res.status(409).json({ error: "Bu qismni hozircha to'lab bo'lmaydi." });
      if (r.error) return res.status(404).json({ error: "Buyurtma topilmadi." });
      const lang = ["uz", "ru", "en"].includes(req.query.lang) ? req.query.lang : "uz";
      res.redirect(checkoutUrl(method, r.order, r.part, lang));
    });
    app.post("/api/payme", payme);
    const form = express.urlencoded({ extended: false, limit: "10kb" });
    app.post("/api/click/prepare", form, clickPrepare);
    app.post("/api/click/complete", form, clickComplete);
  }

  return { install, partsOf, dueOf, summary, payLink, methods };
}

module.exports = { createPayments };
