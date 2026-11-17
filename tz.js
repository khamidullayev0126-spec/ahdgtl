// AHdigital — TZ (texnik topshiriq) generatori
//
// Qanday ishlaydi:
//  1. Abdulhamid mijoz bilan gaplashadi va Telegram agentiga yozadi: «Lazzat kafe uchun menyu sayt TZ tuz: ...».
//  2. Agent yetishmayotgan narsalarni so'raydi, keyin tz_tuzish asbobi bilan shu yerda TZ yaratadi.
//  3. Mijozga havola yuboriladi: /tz/<id>. Mijoz o'qiydi, PDF qilib saqlaydi va «Tasdiqlayman» bosadi.
//  4. Tasdiqlangan TZ o'zgarmaydi — o'zgarish kerak bo'lsa, yangi TZ tuziladi. Kelishmovchilik bo'lmaydi.
//
// Saqlanadi: store → "tz" (har bir TZ alohida). Narx serverda services.js'dan hisoblanadi — AI narx to'qiy olmaydi.

const crypto = require("crypto");

const KEY = "tz";
const SITE = (process.env.SITE_URL || "https://www.ah-digital.uz").replace(/\/$/, "");
const LANGS = ["uz", "ru"];
const MAX_LIST = 25, MAX_TEXT = 300;

const L = {
  uz: {
    title: "Texnik topshiriq", date: "Sana", client: "Mijoz", business: "Biznes", service: "Xizmat",
    goal: "Maqsad", parts: "Sahifalar va bo'limlar", features: "Funksiyalar", materials: "Mijozdan kerak bo'ladigan materiallar",
    excluded: "Narxga kirmaydi", deadline: "Muddat", deadlineVal: n => `${n} ish kuni — barcha materiallar olingan kundan boshlab`,
    price: "Narx", base: "Asosiy narx", total: "Jami", sum: "so'm",
    payment: "To'lov", paymentVal: "50% — ish boshlanishidan oldin, 50% — tayyor ishni qabul qilgandan keyin.",
    revisions: "Tuzatishlar", revisionsVal: n => `${n} marta bepul tuzatish (shu TZ doirasida). TZ'dan tashqari yangi ishlar — alohida kelishiladi.`,
    notes: "Qo'shimcha kelishuvlar", terms: "Umumiy shartlar", termsLink: "Xizmat shartlari",
    approveTitle: "Tasdiqlash", approveText: "Yuqoridagi topshiriq bilan tanishdim va roziman.",
    name: "Ismingiz", approve: "Tasdiqlayman", print: "PDF qilib saqlash",
    approved: (n, d) => `✅ Tasdiqlangan: ${n}, ${d}`, contact: "Savol bo'lsa", draft: "Kelishuv uchun loyiha",
    errName: "Ismingizni yozing va rozilik belgisini qo'ying.", errNet: "Yuborib bo'lmadi. Qayta urinib ko'ring.", ok: "Rahmat! Tasdiqlandi ✅"
  },
  ru: {
    title: "Техническое задание", date: "Дата", client: "Клиент", business: "Бизнес", service: "Услуга",
    goal: "Цель", parts: "Страницы и разделы", features: "Функции", materials: "Что нужно от клиента",
    excluded: "Не входит в стоимость", deadline: "Срок", deadlineVal: n => `${n} рабочих дней — с момента получения всех материалов`,
    price: "Стоимость", base: "Базовая цена", total: "Итого", sum: "сум",
    payment: "Оплата", paymentVal: "50% — до начала работы, 50% — после приёмки готовой работы.",
    revisions: "Правки", revisionsVal: n => `${n} бесплатные правки (в рамках этого ТЗ). Новые задачи вне ТЗ — обсуждаются отдельно.`,
    notes: "Дополнительные договорённости", terms: "Общие условия", termsLink: "Условия услуг",
    approveTitle: "Подтверждение", approveText: "Я ознакомился(-лась) с заданием и согласен(-на).",
    name: "Ваше имя", approve: "Подтверждаю", print: "Сохранить в PDF",
    approved: (n, d) => `✅ Подтверждено: ${n}, ${d}`, contact: "Вопросы", draft: "Проект для согласования",
    errName: "Введите имя и отметьте согласие.", errNet: "Не удалось отправить. Попробуйте ещё раз.", ok: "Спасибо! Подтверждено ✅"
  }
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n || 0).toLocaleString("ru-RU").replace(/ /g, " ");
const clean = (s, max = MAX_TEXT) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cleanList = (a, max = 20) => (Array.isArray(a) ? a : []).map(x => clean(x)).filter(Boolean).slice(0, max);
const dateOf = iso => new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" });

function createTz({ store, services, notifyOwner = () => {} }) {
  const all = () => store.get(KEY, {}) || {};
  const sellable = () => services.filter(s => !s.hidden && s.group === "once" && s.price > 0);

  // Muddatni services.js'dagi "2–3 ish kuni" dan olamiz (eng katta son)
  const defaultDays = svc => Math.max(...(String(svc.time).match(/\d+/g) || ["3"]).map(Number));

  // TZ yaratish. Xato bo'lsa { error }, aks holda { tz, url }
  function create(input) {
    const svc = sellable().find(s => s.id === input.xizmat);
    if (!svc) return { error: `xizmat noto'g'ri. Mumkin: ${sellable().map(s => s.id).join(", ")}` };
    const mijoz = clean(input.mijoz, 80), biznes = clean(input.biznes, 100);
    if (!mijoz || !biznes) return { error: "mijoz ismi va biznes nomi kerak." };
    const bolimlar = cleanList(input.bolimlar), funksiyalar = cleanList(input.funksiyalar);
    if (!bolimlar.length && !funksiyalar.length) return { error: "kamida bitta bo'lim yoki funksiya kerak." };

    const qoshimcha = (Array.isArray(input.qoshimcha) ? input.qoshimcha : []).slice(0, 10).map(x => ({ nomi: clean(x && x.nomi, 120), narx: Math.round(Number(x && x.narx)) }));
    if (qoshimcha.some(x => !x.nomi || !(x.narx > 0))) return { error: "qo'shimcha ishning nomi va narxi (so'mda, musbat) bo'lishi kerak. Narxni Abdulhamiddan so'ra, o'zing qo'yma." };
    const chegirma = Math.max(0, Math.round(Number(input.chegirma) || 0));
    const base = svc.price;
    const jami = base + qoshimcha.reduce((a, x) => a + x.narx, 0) - chegirma;
    if (jami <= 0) return { error: "chegirma narxdan katta bo'lib qoldi." };

    const days = Math.round(Number(input.muddat_kun)) || defaultDays(svc);
    if (days < 1 || days > 90) return { error: "muddat 1–90 ish kuni oralig'ida bo'lsin." };

    const db = all();
    const n = Object.keys(db).length + 1;
    const id = crypto.randomBytes(9).toString("base64url");          // taxmin qilib bo'lmaydigan havola
    const tz = {
      id, raqam: `TZ-${String(n).padStart(3, "0")}`, til: LANGS.includes(input.til) ? input.til : "uz",
      yaratildi: new Date().toISOString(), mijoz, biznes,
      xizmat: svc.id, xizmatNomi: svc.name, maqsad: clean(input.maqsad, 400),
      bolimlar, funksiyalar, materiallar: cleanList(input.materiallar), kirmaydi: cleanList(input.kirmaydi),
      muddatKun: days, asosiyNarx: base, qoshimcha, chegirma, jami,
      tuzatish: 2, izoh: clean(input.izoh, 600), buyurtma: clean(input.buyurtma, 20),
      tasdiq: null
    };
    store.set(KEY, { ...db, [id]: tz });
    return { tz, url: `${SITE}/tz/${id}` };
  }

  function list() {
    return Object.values(all()).sort((a, b) => b.yaratildi.localeCompare(a.yaratildi)).slice(0, MAX_LIST);
  }

  function approve(id, name) {
    const db = all();
    const tz = db[id];
    if (!tz) return { status: 404 };
    if (tz.tasdiq) return { status: 409, tz };
    const ism = clean(name, 80);
    if (ism.length < 2) return { status: 400 };
    tz.tasdiq = { ism, vaqt: new Date().toISOString() };
    store.set(KEY, { ...db, [id]: tz });
    Promise.resolve(notifyOwner(`✅ Mijoz TZ'ni tasdiqladi: ${tz.raqam} · ${tz.biznes}\n👤 ${ism} · ${fmt(tz.jami)} so'm · ${tz.muddatKun} ish kuni\n${SITE}/tz/${id}`)).catch(() => {});
    return { status: 200, tz };
  }

  function page(tz) {
    const t = L[tz.til] || L.uz;
    const ul = a => a.length ? `<ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const sec = (h, body) => body ? `<section><h2>${esc(h)}</h2>${body}</section>` : "";
    const rows = [[t.base + " — " + tz.xizmatNomi, tz.asosiyNarx], ...tz.qoshimcha.map(x => [x.nomi, x.narx]), ...(tz.chegirma ? [["−", -tz.chegirma]] : [])];
    const priceTable = `<table>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${b < 0 ? "−" : ""}${fmt(Math.abs(b))} ${t.sum}</td></tr>`).join("")}<tr class="total"><td>${t.total}</td><td>${fmt(tz.jami)} ${t.sum}</td></tr></table>`;
    const approveBlock = tz.tasdiq
      ? `<p class="ok">${esc(t.approved(tz.tasdiq.ism, dateOf(tz.tasdiq.vaqt)))}</p>`
      : `<form id="f" class="noprint"><h2>${t.approveTitle}</h2>
          <label class="chk"><input type="checkbox" id="agree"> ${t.approveText}</label>
          <input id="nm" maxlength="80" placeholder="${t.name}" autocomplete="name">
          <button type="submit">${t.approve}</button><p id="msg" role="status"></p></form>`;
    return `<!doctype html><html lang="${tz.til}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(tz.raqam)} · ${esc(tz.biznes)} — AHdigital</title>
<style>
:root{--bg:#f5ecdc;--card:#fffaf2;--ink:#2b2420;--muted:#6f6259;--acc:#a8552f;--line:#e4d6c1}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}.doc{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:28px 24px}
header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--acc);padding-bottom:14px;margin-bottom:8px}
.brand{font-weight:800;color:var(--acc);font-size:20px}h1{margin:4px 0 0;font-size:24px}.meta{color:var(--muted);font-size:14px;text-align:right}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.04em;color:var(--acc);margin:22px 0 6px}ul{margin:0;padding-left:20px}li{margin:3px 0}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:14px 0 0}dt{color:var(--muted)}dd{margin:0;font-weight:600;overflow-wrap:anywhere}
table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}td:last-child{text-align:right;white-space:nowrap;padding-left:12px}
.total td{font-weight:800;font-size:18px;border-bottom:0}.draft{display:inline-block;background:#f0dcc8;color:var(--acc);font-size:12px;padding:2px 10px;border-radius:99px;margin-top:6px}
form{margin-top:26px;padding-top:6px;border-top:1px dashed var(--line)}.chk{display:flex;gap:10px;align-items:flex-start;margin:8px 0 12px}
input#nm{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font:inherit;background:#fff}
button,.btn{display:inline-block;margin-top:12px;padding:12px 22px;border:0;border-radius:99px;background:var(--acc);color:#fff;font:600 16px system-ui;cursor:pointer;text-decoration:none}
.btn.light{background:transparent;color:var(--acc);border:1.5px solid var(--acc)}.ok{background:#e3eedb;color:#2f5a2a;padding:12px 14px;border-radius:12px;font-weight:600;margin-top:24px}
#msg{min-height:1.4em;color:var(--acc)}.foot{margin-top:24px;color:var(--muted);font-size:14px}.foot a{color:var(--acc)}
@media (max-width:520px){.meta{text-align:left}.doc{padding:22px 18px}}
@media print{body{background:#fff}main{padding:0}.doc{border:0;padding:0}.noprint{display:none!important}}
</style></head><body><main><div class="doc">
<header><div><div class="brand">AHdigital</div><h1>${t.title} ${esc(tz.raqam)}</h1>${tz.tasdiq ? "" : `<span class="draft">${t.draft}</span>`}</div>
<div class="meta">${t.date}: ${dateOf(tz.yaratildi)}<br>ah-digital.uz</div></header>
<dl><dt>${t.client}</dt><dd>${esc(tz.mijoz)}</dd><dt>${t.business}</dt><dd>${esc(tz.biznes)}</dd><dt>${t.service}</dt><dd>${esc(tz.xizmatNomi)}</dd></dl>
${sec(t.goal, tz.maqsad ? `<p>${esc(tz.maqsad)}</p>` : "")}
${sec(t.parts, ul(tz.bolimlar))}${sec(t.features, ul(tz.funksiyalar))}${sec(t.materials, ul(tz.materiallar))}${sec(t.excluded, ul(tz.kirmaydi))}
${sec(t.deadline, `<p>${t.deadlineVal(tz.muddatKun)}</p>`)}${sec(t.price, priceTable)}
${sec(t.payment, `<p>${t.paymentVal}</p>`)}${sec(t.revisions, `<p>${t.revisionsVal(tz.tuzatish)}</p>`)}${sec(t.notes, tz.izoh ? `<p>${esc(tz.izoh)}</p>` : "")}
${sec(t.terms, `<p><a href="/shartlar.html" style="color:var(--acc)">${t.termsLink}</a></p>`)}
${approveBlock}
<p class="noprint"><a class="btn light" href="#" onclick="print();return false">${t.print}</a></p>
<p class="foot">${t.contact}: Telegram <a href="https://t.me/Abdulkhamid_2905">@Abdulkhamid_2905</a> · +998 95 632 29 05</p>
</div></main>
${tz.tasdiq ? "" : `<script>
document.getElementById("f").addEventListener("submit", async e => {
  e.preventDefault();
  const nm = document.getElementById("nm").value.trim(), msg = document.getElementById("msg");
  if (nm.length < 2 || !document.getElementById("agree").checked) { msg.textContent = ${JSON.stringify(t.errName)}; return; }
  e.submitter && (e.submitter.disabled = true);
  try {
    const r = await fetch(location.pathname.replace(/^\\/tz\\//, "/api/tz/") + "/tasdiq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ism: nm }) });
    if (r.ok || r.status === 409) { msg.textContent = ${JSON.stringify(t.ok)}; setTimeout(() => location.reload(), 900); }
    else { msg.textContent = ${JSON.stringify(t.errNet)}; e.submitter && (e.submitter.disabled = false); }
  } catch { msg.textContent = ${JSON.stringify(t.errNet)}; e.submitter && (e.submitter.disabled = false); }
});
</script>`}</body></html>`;
  }

  function mount(app, { rateLimit = (q, s, n) => n() } = {}) {
    const valid = id => /^[A-Za-z0-9_-]{8,20}$/.test(id);
    app.get("/tz/:id", (req, res) => {
      const tz = valid(req.params.id) && all()[req.params.id];
      if (!tz) return res.status(404).type("html").send("<p style='font:16px system-ui;padding:24px'>TZ topilmadi.</p>");
      res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" }).type("html").send(page(tz));
    });
    app.post("/api/tz/:id/tasdiq", rateLimit, (req, res) => {
      if (!valid(req.params.id)) return res.sendStatus(404);
      const r = approve(req.params.id, req.body && req.body.ism);
      res.status(r.status).json({ ok: r.status === 200 });
    });
  }

  return { create, list, approve, page, mount, sellable };
}

module.exports = { createTz };
