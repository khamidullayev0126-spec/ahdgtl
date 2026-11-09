// AHdigital — Abdulhamidning shaxsiy AI agenti (faqat egasi uchun)
// Botga xuddi Claude'ga yozgandek yozasiz: agent buyurtmalarni ko'radi, holatini o'zgartiradi,
// internetdan qidiradi, eslatma qo'yadi, eslab qoladi, mijozga yoki kanalga yozishni TAYYORLAYDI.
// Tashqariga ketadigan har bir xabar (mijozga / kanalga) faqat siz ✅ tugmasini bosgandan keyin yuboriladi.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
let imager = null;                                   // rasm yaratish (satori + resvg o'rnatilgan bo'lsa)
try { imager = require("./image"); } catch (e) { console.log("ℹ️  Rasm yaratish o'chiq:", e.message); }

const MODEL = "claude-opus-5-5";
const MAX_STEPS = 10;            // bitta xabarga agent nechta qadam qila oladi
const MAX_HISTORY = 60;          // shundan oshsa — suhbat yangidan boshlanadi (eslatmalar va xotira saqlanadi)
const STATUSES = ["yangi", "tasdiqlandi", "jarayonda", "bajarildi", "bekor"];
const TZ = "Asia/Tashkent";

function createAgent({ api, send, ownerChatId, services, readOrders, writeOrders, store, channel, client, caller, sendPhoto, business, notifyStatus }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const claude = client || new Anthropic();   // client — faqat sinov uchun

  // ---------- Doimiy saqlanadigan ma'lumotlar (data/ papkasida) ----------
  // Doimiy ombor (store.js): Render qayta ishga tushsa ham xotira va eslatmalar saqlanadi
  const KEY = { "agent-xotira.json": "agent-xotira", "agent-eslatmalar.json": "agent-eslatmalar" };
  const save = (name, val) => store.set(KEY[name], val);
  let notes = [];        // [{id, matn, sana}]   — start() da yuklanadi
  let reminders = [];    // [{id, vaqt, matn}]
  const pending = new Map();                          // tasdiq kutayotgan amallar: id -> {turi, ...}
  let history = [];
  let queue = Promise.resolve();                      // xabarlar navbat bilan ishlansin

  const now = () => new Date().toLocaleString("uz-UZ", { timeZone: TZ, dateStyle: "full", timeStyle: "short" });
  const fmt = n => Number(n || 0).toLocaleString("ru-RU");
  const id = () => crypto.randomBytes(3).toString("hex");

  // ---------- Eslatmalar ----------
  const timers = new Map();
  function arm(r) {
    clearTimeout(timers.get(r.id));
    const ms = Math.max(0, new Date(r.vaqt).getTime() - Date.now());
    timers.set(r.id, setTimeout(async () => {
      await send(ownerChatId, `⏰ Eslatma: ${r.matn}`);
      if (r.qongiroq && caller) { const c = await caller.call(`Eslatma: ${r.matn}`); if (!c.ok) await send(ownerChatId, `📵 ${c.text}`); }
      reminders = reminders.filter(x => x.id !== r.id); save("agent-eslatmalar.json", reminders);
      timers.delete(r.id);
    }, Math.min(ms, 2 ** 31 - 1)));
  }

  // ---------- Asboblar (tools) ----------
  const priceList = services.map(s => `- ${s.id}: ${s.name} — ${fmt(s.price)} so'm / ${s.period}`).join("\n");

  const TOOLS = [
    { name: "buyurtmalar", description: "Saytdagi buyurtmalar ro'yxatini qaytaradi (eng yangisi birinchi). Holat bo'yicha filtrlash mumkin.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        holat: { type: "string", enum: STATUSES, description: "Faqat shu holatdagilar" },
        soni: { type: "integer", description: "Nechta qaytarilsin (standart 15)" } }, required: [] } },
    { name: "statistika", description: "Buyurtmalar soni holat bo'yicha, bajarilgan ishlardan tushgan daromad va eng ko'p so'ralgan xizmatlar.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } },
    { name: "buyurtma_holati", description: "Buyurtma holatini o'zgartiradi (admin paneldagi kabi). Holat tasdiqlandi/jarayonda/bajarildi/bekor bo'lsa, mijozga Telegram orqali avtomatik qisqa xabar boradi (agar mijoz Telegram orqali bog'langan bo'lsa).",
      input_schema: { type: "object", additionalProperties: false, properties: {
        kod: { type: "string", description: "Buyurtma kodi, masalan A1B2C3" },
        holat: { type: "string", enum: STATUSES } }, required: ["kod", "holat"] } },
    { name: "mijozga_yozish", description: "Buyurtma bergan mijozga Telegram orqali xabar TAYYORLAYDI. Xabar darhol ketmaydi: egasiga ✅/❌ tugmalari bilan ko'rsatiladi. Faqat botni ochgan mijozlarga yozish mumkin.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        kod: { type: "string" }, matn: { type: "string", description: "Mijozga yuboriladigan matn, o'zbek tilida" } }, required: ["kod", "matn"] } },
    { name: "kanalga_post", description: "Telegram kanalga post TAYYORLAYDI. Post darhol chiqmaydi: egasiga ✅/❌ tugmalari bilan ko'rsatiladi.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        matn: { type: "string", description: "Post matni (1–4000 belgi), oddiy matn" } }, required: ["matn"] } },
    { name: "eslatma_qoyish", description: "Belgilangan vaqtda egasiga Telegramda eslatma yuboradi. Vaqtni Toshkent vaqti bo'yicha ISO formatda bering, masalan 2026-11-06T09:00:00+05:00.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        vaqt: { type: "string" }, matn: { type: "string" },
        qongiroq: { type: "boolean", description: "true bo'lsa, eslatma vaqtida egasiga telefon qo'ng'irog'i ham qilinadi" } }, required: ["vaqt", "matn"] } },
    { name: "menga_qongiroq", description: "Egasining (Abdulhamidning) telefoniga HOZIR haqiqiy qo'ng'iroq qiladi va matnni o'zbekcha ovozda o'qib beradi. Faqat egasi so'raganda yoki juda muhim/shoshilinch holatda ishlat. Boshqa raqamlarga qo'ng'iroq qilib bo'lmaydi.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        matn: { type: "string", description: "Telefonda aytiladigan qisqa gap (1–3 jumla), o'zbek tilida" } }, required: ["matn"] } },
    { name: "eslatmalar", description: "Kutilayotgan eslatmalar ro'yxati.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } },
    { name: "eslatma_ochirish", description: "Eslatmani id bo'yicha o'chiradi.",
      input_schema: { type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"] } },
    { name: "xotiraga_yozish", description: "Egasi haqida yoki ish bo'yicha muhim narsani doimiy xotiraga yozadi (reja, odat, mijoz haqida ma'lumot). Suhbat yangilansa ham saqlanadi.",
      input_schema: { type: "object", additionalProperties: false, properties: { matn: { type: "string" } }, required: ["matn"] } },
    { name: "xotirani_oqish", description: "Doimiy xotiradagi barcha yozuvlarni qaytaradi. Egasining rejalari, odatlari yoki avvalgi kelishuvlar kerak bo'lganda chaqiring.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } },
    { name: "xotiradan_ochirish", description: "Xotiradagi yozuvni id bo'yicha o'chiradi.",
      input_schema: { type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"] } },
    ...(imager ? [{ name: "rasm_yaratish", description: "AHdigital uslubida post rasmi (PNG) yaratadi va egasiga yuboradi. kanal_matni berilsa, rasm ostida '✅ Kanalga joylash' tugmasi chiqadi — egasi bossagina kanalga chiqadi. Rasmda emoji ishlatma (ko'rinmaydi); emoji'ni kanal_matni ga qo'y.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        mavzu: { type: "string", enum: imager.THEMES, description: "Rang: sayt (krem — foydali saytlar), css (yashil — HTML/CSS darslari), ai (qora — AI va kod), men (to'q sariq — shaxsiy loyihalar, e'lonlar)" },
        format: { type: "string", enum: imager.FORMATS, description: "kvadrat — Telegram (standart), post — Instagram 4:5, story — 9:16" },
        yorliq: { type: "string", description: "Yuqoridagi kichik yorliq, masalan 'Siz bilmagan web saytlar'. Bo'sh qolsa — mavzuning standart yorlig'i" },
        qism: { type: "string", description: "Ixtiyoriy kichik yozuv sarlavha ustida, masalan '13-qism'" },
        sarlavha: { type: "string", description: "Qisqa sarlavha (6–60 belgi). Urg'u beriladigan so'zlarni *yulduzcha* ichiga oling: 'Dizaynerlar uchun *3 ta bepul* sayt'" },
        turi: { type: "string", enum: ["raqamli", "royxat", "kod"], description: "raqamli — 1,2,3 ro'yxat; royxat — ✓ belgili ro'yxat; kod — kod bloki" },
        elementlar: { type: "array", maxItems: 6, items: { type: "object", additionalProperties: false, properties: { nom: { type: "string" }, izoh: { type: "string", description: "Ixtiyoriy: sayt manzili yoki qisqa izoh" } }, required: ["nom"] } },
        kod: { type: "string", description: "turi=kod bo'lsa: 3–12 qator kod, qisqa qatorlar (≤34 belgi)" },
        pastki: { type: "string", description: "Ixtiyoriy pastki qisqa chaqiruv, masalan 'Saqlab qo'ying!'" },
        kanal_matni: { type: "string", description: "Ixtiyoriy: kanalga rasm bilan chiqadigan matn (≤1000 belgi, emoji mumkin)" } }, required: ["mavzu", "sarlavha", "turi"] } }] : []),
    ...(business ? [
      { name: "chatlar", description: "Abdulhamidning shaxsiy Telegram chatlari (Telegram Business orqali bot ko'rgan) — oxirgi yozganlar birinchi. Kim yozgani, oxirgi xabar va 24 soat ichida yozgan-yozmagani.",
        input_schema: { type: "object", properties: { soni: { type: "integer", description: "nechta chat (standart 15)" } } } },
      { name: "chatni_oqish", description: "Bitta shaxsiy chatdagi oxirgi xabarlarni o'qiydi. kim — ism, @username yoki chat id.",
        input_schema: { type: "object", properties: { kim: { type: "string" }, soni: { type: "integer", description: "nechta xabar (standart 20)" } }, required: ["kim"] } },
      { name: "chatga_yozish", description: "Abdulhamidning shaxsiy chatiga UNING NOMIDAN xabar TAYYORLAYDI. Darhol ketmaydi: egasiga ✅/❌ tugmalari bilan ko'rsatiladi. Telegram qoidasi: odam oxirgi 24 soat ichida yozgan bo'lishi kerak. Matnni Abdulhamidning o'zi yozgandek, birinchi shaxsda yoz (\"men\").",
        input_schema: { type: "object", properties: { kim: { type: "string", description: "ism, @username yoki chat id" }, matn: { type: "string" } }, required: ["kim", "matn"] } },
      { name: "chat_sozlamasi", description: "Shaxsiy chatlar rejimi. avto_javob=true — bot mijozlarga o'zi javob beradi; false — javob bermaydi, faqat egasiga bildiradi. bildirish — yangi xabar haqida egasiga xabar berish.",
        input_schema: { type: "object", properties: { avto_javob: { type: "boolean" }, bildirish: { type: "boolean" } } } }
    ] : []),
    { type: "web_search_20260209", name: "web_search", max_uses: 5 }
  ];

  const SYSTEM = `Sen — Abdulhamid Xamidullayevning shaxsiy AI agentisan (Claude). U senga Telegram bot orqali yozadi, xuddi Claude bilan gaplashgandek.
Abdulhamid haqida: CoddyCamp o'quv markazining Junior guruhi o'quvchisi, junior dasturchi, Software Engineer bo'lishni maqsad qilgan. Scratch, Pictoblox, AI, Figma, HTML, CSS, Bootstrap'ni o'rgangan, hozir JavaScript o'rganyapti. AHdigital brendi bilan Claude yordamida video, slayd, post va saytlar yaratadi, AI LEGENDS kursini o'tadi. Instagram: @ah.digital_01, Telegram kanal: t.me/ahdigital_01.

Ishlash tartibi:
- Doim o'zbek tilida, samimiy va aniq yoz. Telegram uchun oddiy matn ishlat: markdown belgilari (**, ##, jadval) ishlatma; ro'yxat uchun "•" yoki raqam qo'y.
- Har qanday savolga yordam ber: dasturlash, JavaScript, kontent g'oyalari, caption va post matnlari, reja tuzish, o'qish. Kod so'ralsa, to'liq va ishlaydigan kod ber.
- Yangi yoki aniq faktlar kerak bo'lsa (narxlar, yangiliklar, hujjatlar) web_search bilan qidir va manbani qisqa ayt.
- Buyurtmalar, statistika, eslatma va xotira uchun asboblardan foydalan. Taxmin qilma — kerak bo'lsa asbobni chaqir.
- Mijozga yoki kanalga yozish faqat tayyorlanadi; Abdulhamid ✅ bosmaguncha hech narsa ketmaydi. Buni "yubordim" deb aytma — "tasdiqlash uchun tayyorladim" de.
- Narx, chegirma yoki muddat haqida mijozga va'da berma — faqat quyidagi narxlardan foydalan.
- Sen rasm yarata olasan: rasm_yaratish asbobi AHdigital uslubidagi post rasmini yasaydi (sarlavha + ro'yxat yoki kod). "Rasm qil", "post rasmi", "kanal uchun rasm" deyilsa — uni ishlat; kanal uchun bo'lsa kanal_matni ham yoz. Rasmni o'zing ko'ra olmaysan, shuning uchun matnni qisqa va aniq yoz.
- Sen Abdulhamidga Telegram orqali ovozli qo'ng'iroq qila olasan: menga_qongiroq asbobi (hozir) yoki eslatma_qoyish qongiroq=true (belgilangan vaqtda). U qo'ng'iroq so'rasa, "qila olmayman" dema — asbobni chaqir va natijasini aynan ayt.
- Sen Abdulhamidning shaxsiy Telegram chatlarini ko'ra olasan (Telegram Business): chatlar, chatni_oqish, chatga_yozish, chat_sozlamasi. "Kim yozdi?", "X ning chatini o'qi", "X ga yoz: ..." deyilsa — shu asboblarni ishlat. Chatga yozish ham faqat tayyorlanadi, ✅ bosilgandagina ketadi. Chatlardagi shaxsiy gaplarni boshqa odamlarga aytma.
- Abdulhamid muhim narsa aytsa (reja, mijoz haqida ma'lumot, odat), uni xotiraga yozib qo'y.
- Har bir xabar boshida [Hozir: ...] qatori turadi — bu hozirgi Toshkent vaqti, eslatma vaqtini shunga qarab hisobla.

AHdigital xizmatlari:
${priceList}`;

  async function runTool(name, input) {
    const orders = readOrders();
    switch (name) {
      case "buyurtmalar": {
        const list = orders.filter(o => !input.holat || o.status === input.holat)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, input.soni || 15);
        if (!list.length) return "Bunday buyurtma yo'q.";
        return list.map(o => `#${o.code} · ${o.status} · ${o.name} (${o.contact}) · ${o.serviceName} — ${fmt(o.price)} so'm · ${new Date(o.createdAt).toLocaleString("uz-UZ", { timeZone: TZ })}${o.message ? ` · izoh: ${o.message}` : ""}${o.tgChatId ? " · botni ochgan" : ""}`).join("\n");
      }
      case "statistika": {
        const by = Object.fromEntries(STATUSES.map(s => [s, orders.filter(o => o.status === s).length]));
        const income = orders.filter(o => o.status === "bajarildi").reduce((a, o) => a + (o.price || 0), 0);
        const top = Object.entries(orders.reduce((m, o) => (m[o.serviceName] = (m[o.serviceName] || 0) + 1, m), {}))
          .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n}: ${c} ta`).join(", ");
        return `Jami: ${orders.length} ta. ${STATUSES.map(s => `${s}: ${by[s]}`).join(", ")}. Bajarilganlardan daromad: ${fmt(income)} so'm. Eng ko'p: ${top || "—"}.`;
      }
      case "buyurtma_holati": {
        const o = orders.find(x => x.code === String(input.kod).replace("#", "").trim().toLowerCase());
        if (!o) return "Xato: bunday kodli buyurtma topilmadi.";
        const changed = o.status !== input.holat;
        o.status = input.holat; writeOrders(orders);
        let note = "";
        if (changed && notifyStatus) { const n = await notifyStatus(o); if (n) note = n.ok ? " Mijozga Telegram orqali xabar yuborildi." : ` Mijozga xabar ketmadi (${n.reason}).`; }
        return `#${o.code} holati endi: ${o.status}.${note}`;
      }
      case "mijozga_yozish": {
        const o = orders.find(x => x.code === String(input.kod).replace("#", "").trim().toLowerCase());
        if (!o) return "Xato: bunday kodli buyurtma topilmadi.";
        if (!o.tgChatId) return `Xato: ${o.name} botni ochmagan, unga bot yoza olmaydi. Kontakt: ${o.contact} — Abdulhamid o'zi yozishi yoki qo'ng'iroq qilishi kerak.`;
        const k = id(); pending.set(k, { turi: "mijoz", chatId: o.tgChatId, matn: input.matn, kim: `${o.name} (#${o.code})` });
        await approval(k, `✉️ Mijozga xabar — ${o.name} (#${o.code}):\n\n${input.matn}`);
        return "Xabar tayyorlandi va egasiga tasdiqlash uchun ko'rsatildi. U ✅ bossa yuboriladi.";
      }
      case "kanalga_post": {
        if (!channel) return "Xato: kanal sozlanmagan (Render'da TELEGRAM_CHANNEL o'zgaruvchisi yo'q, masalan @ahdigital_01). Bot kanalda admin bo'lishi kerak.";
        const k = id(); pending.set(k, { turi: "kanal", chatId: channel, matn: input.matn, kim: channel });
        await approval(k, `📢 Kanal uchun post (${channel}):\n\n${input.matn}`);
        return "Post tayyorlandi va egasiga tasdiqlash uchun ko'rsatildi. U ✅ bossa kanalga chiqadi.";
      }
      case "rasm_yaratish": {
        if (!imager) return "Xato: rasm yaratish o'rnatilmagan (satori va @resvg/resvg-js kerak).";
        const png = await imager.render(input);
        const caption = input.kanal_matni ? String(input.kanal_matni).slice(0, 1024) : "";
        if (caption && channel) {
          const k = id(); pending.set(k, { turi: "rasm", chatId: channel, png, matn: caption, kim: channel });
          await sendPhoto(ownerChatId, png, `${caption}\n\n— Kanalga (${channel}) joylaymi?`, { inline_keyboard: [[
            { text: "✅ Kanalga joylash", callback_data: `ag_ok:${k}` }, { text: "❌ Kerak emas", callback_data: `ag_no:${k}` }]] });
          return "Rasm yaratildi va egasiga ko'rsatildi. U ✅ bossa, matn bilan kanalga chiqadi. Rasmni ko'ra olmaysan — o'zgartirish kerak bo'lsa, egasi aytadi.";
        }
        await sendPhoto(ownerChatId, png, caption.slice(0, 1000));
        return `Rasm yaratildi va egasiga yuborildi.${caption && !channel ? " Kanal sozlanmagan (TELEGRAM_CHANNEL)." : ""}`;
      }
      case "eslatma_qoyish": {
        const t = new Date(input.vaqt);
        if (isNaN(t)) return "Xato: vaqt formati noto'g'ri. Masalan: 2026-11-06T09:00:00+05:00";
        if (t < Date.now()) return "Xato: bu vaqt allaqachon o'tib ketgan.";
        const r = { id: id(), vaqt: t.toISOString(), matn: input.matn, qongiroq: !!input.qongiroq };
        reminders.push(r); save("agent-eslatmalar.json", reminders); arm(r);
        return `Eslatma qo'yildi (id ${r.id}): ${t.toLocaleString("uz-UZ", { timeZone: TZ })} — ${r.matn}${r.qongiroq ? (caller ? " · telefon qo'ng'irog'i bilan" : " · (qo'ng'iroq sozlanmagan, faqat Telegram xabari)") : ""}`;
      }
      case "menga_qongiroq": {
        if (!caller) return "Xato: telefon qo'ng'irog'i sozlanmagan. Render'da CALLMEBOT_USER (Telegram username, masalan @Abdulkhamid_2905) kerak.";
        const c = await caller.call(input.matn);
        return c.ok ? c.text : `Xato: ${c.text}`;
      }
      case "eslatmalar":
        return reminders.length ? reminders.map(r => `${r.id}: ${new Date(r.vaqt).toLocaleString("uz-UZ", { timeZone: TZ })} — ${r.matn}`).join("\n") : "Eslatmalar yo'q.";
      case "eslatma_ochirish": {
        const before = reminders.length;
        reminders = reminders.filter(r => r.id !== input.id); save("agent-eslatmalar.json", reminders);
        clearTimeout(timers.get(input.id)); timers.delete(input.id);
        return before === reminders.length ? "Bunday eslatma topilmadi." : "Eslatma o'chirildi.";
      }
      case "xotiraga_yozish": {
        const n = { id: id(), matn: input.matn, sana: new Date().toISOString().slice(0, 10) };
        notes.push(n); save("agent-xotira.json", notes);
        return `Xotiraga yozildi (id ${n.id}).`;
      }
      case "xotirani_oqish":
        return notes.length ? notes.map(n => `${n.id} (${n.sana}): ${n.matn}`).join("\n") : "Xotira bo'sh.";
      case "xotiradan_ochirish": {
        const before = notes.length;
        notes = notes.filter(n => n.id !== input.id); save("agent-xotira.json", notes);
        return before === notes.length ? "Bunday yozuv topilmadi." : "Yozuv o'chirildi.";
      }
      case "chatlar": {
        const list = business.list(input.soni || 15);
        if (!list.length) return "Hali hech kim yozmagan (yoki Telegram Business ulanmagan).";
        const s = business.settings();
        return `Avto javob: ${s.avto ? "yoqilgan" : "o'chiq"}, bildirish: ${s.bildirish ? "yoqilgan" : "o'chiq"}.\n` + list.map(c => {
          const m = c.msgs[c.msgs.length - 1] || {};
          const fresh = c.lastIn && Date.now() - c.lastIn < 864e5;
          return `• ${c.name}${c.username ? " (@" + c.username + ")" : ""} · id ${c.id} · oxirgi: ${m.who === "u" ? "u" : m.who === "bot" ? "bot" : "siz"}: "${String(m.text || "").slice(0, 80)}" · ${new Date(c.last).toLocaleString("uz-UZ", { timeZone: TZ })} · ${fresh ? "javob yozsa bo'ladi" : "24 soatdan oshgan"}`;
        }).join("\n");
      }
      case "chatni_oqish": {
        const c = business.find(input.kim);
        if (!c) return `Xato: "${input.kim}" nomli chat topilmadi. Avval chatlar ro'yxatini ko'r.`;
        const who = { u: c.name, men: "Abdulhamid", bot: "Bot" };
        return `${c.name}${c.username ? " (@" + c.username + ")" : ""} bilan chat:\n` + c.msgs.slice(-(input.soni || 20)).map(m =>
          `[${new Date(m.t).toLocaleString("uz-UZ", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })}] ${who[m.who] || m.who}: ${m.text}`).join("\n");
      }
      case "chatga_yozish": {
        const c = business.find(input.kim);
        if (!c) return `Xato: "${input.kim}" nomli chat topilmadi. Bot faqat Business ulangandan keyin yozgan odamlarni biladi.`;
        const old = !c.lastIn || Date.now() - c.lastIn > 864e5;
        const k = id(); pending.set(k, { turi: "biznes", chatId: c.id, matn: input.matn, kim: c.name });
        await approval(k, `👤 Sizning nomingizdan — ${c.name}${c.username ? " (@" + c.username + ")" : ""}:\n\n${input.matn}${old ? "\n\n⚠️ U 24 soatdan beri yozmagan — Telegram yuborishga ruxsat bermasligi mumkin." : ""}`);
        return "Xabar tayyorlandi va egasiga tasdiqlash uchun ko'rsatildi. U ✅ bossa uning nomidan yuboriladi.";
      }
      case "chat_sozlamasi": {
        const patch = {};
        if (typeof input.avto_javob === "boolean") patch.avto = input.avto_javob;
        if (typeof input.bildirish === "boolean") patch.bildirish = input.bildirish;
        business.setSettings(patch);
        const s = business.settings();
        return `Saqlandi. Avto javob: ${s.avto ? "yoqilgan" : "o'chiq"}, yangi xabarlarni bildirish: ${s.bildirish ? "yoqilgan" : "o'chiq"}.`;
      }
      default: return `Xato: noma'lum asbob ${name}`;
    }
  }

  // Tashqariga ketadigan xabar uchun tasdiq tugmalari
  function approval(k, text) {
    return send(ownerChatId, `${text}\n\nYuboraymi?`, { reply_markup: { inline_keyboard: [[
      { text: "✅ Yuborish", callback_data: `ag_ok:${k}` }, { text: "❌ Bekor", callback_data: `ag_no:${k}` }
    ]] } });
  }

  async function onCallback(q) {
    const [action, k] = (q.data || "").split(":");
    if (!action.startsWith("ag_")) return false;
    const p = pending.get(k);
    if (!p) { await api("answerCallbackQuery", { callback_query_id: q.id, text: "Bu so'rov eskirgan." }); return true; }
    pending.delete(k);
    let result;
    if (action === "ag_ok") {
      const r = p.turi === "rasm" ? await sendPhoto(p.chatId, p.png, p.matn)
        : p.turi === "biznes" ? await business.send(p.chatId, p.matn)
        : await send(p.chatId, p.matn);
      result = r.ok ? `✅ Yuborildi: ${p.kim}` : `⚠️ Yuborib bo'lmadi (${r.description}). ${p.turi === "kanal" ? "Bot kanalda admin ekanini tekshiring." : ""}`;
    } else result = "❌ Bekor qilindi.";
    await api("answerCallbackQuery", { callback_query_id: q.id, text: action === "ag_ok" ? "Bajarildi" : "Bekor qilindi" });
    if (p.turi === "rasm") pending.delete(k);
    await api("editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    await send(ownerChatId, result);
    return true;
  }

  // ---------- Agent tsikli ----------
  async function think(text) {
    if (history.length >= MAX_HISTORY) history = [];      // tarixni tahrirlamaymiz — yangisini boshlaymiz
    history.push({ role: "user", content: `[Hozir: ${now()}]\n${text}` });
    const mark = history.length - 1;
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const res = await claude.beta.messages.create({
          model: MODEL,
          max_tokens: 16000,
          output_config: { effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: SYSTEM,
          tools: TOOLS,
          cache_control: { type: "ephemeral" },
          messages: history
        });
        history.push({ role: "assistant", content: res.content });
        const said = res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();

        if (res.stop_reason === "refusal") return said || "Bu so'rovni bajara olmayman.";
        if (res.stop_reason === "pause_turn") continue;             // qidiruv davom etadi
        if (res.stop_reason !== "tool_use") return said || "Bajarildi ✅";

        if (said) await send(ownerChatId, said);                    // oraliq izoh ("qidiryapman..." va h.k.)
        const results = [];
        for (const b of res.content.filter(b => b.type === "tool_use")) {
          let out, isErr = false;
          try { out = await runTool(b.name, b.input || {}); isErr = out.startsWith("Xato:"); }
          catch (e) { out = `Xato: ${e.message}`; isErr = true; }
          results.push({ type: "tool_result", tool_use_id: b.id, content: out, is_error: isErr });
        }
        history.push({ role: "user", content: results });
      }
      return "Juda ko'p qadam bo'ldi, shu yerda to'xtadim. Davom etishimni xohlasangiz, yozing.";
    } catch (err) {
      history = history.slice(0, mark);                         // muvaffaqiyatsiz so'rovni tarixdan olib tashlaymiz
      if (err instanceof Anthropic.AuthenticationError) return "⚠️ Claude kaliti noto'g'ri (ANTHROPIC_API_KEY). Render'da tekshiring.";
      if (err instanceof Anthropic.RateLimitError) return "⚠️ Claude limiti — bir oz kutib qayta yozing.";
      if (err instanceof Anthropic.BadRequestError && /credit|balance/i.test(err.message)) return "⚠️ Anthropic hisobingizda kredit tugagan. platform.claude.com → Billing.";
      if (err instanceof Anthropic.APIError) { console.error("Agent:", err.status, err.message); return `⚠️ Claude xatosi (${err.status}). Keyinroq urinib ko'ring.`; }
      console.error("Agent:", err.message);
      return "⚠️ Claude bilan bog'lanib bo'lmadi. Keyinroq urinib ko'ring.";
    }
  }

  // Telegram 4096 belgidan uzun xabarni qabul qilmaydi — bo'lib yuboramiz
  async function reply(text) {
    for (let i = 0; i < text.length; i += 4000) await send(ownerChatId, text.slice(i, i + 4000));
  }

  function onOwnerMessage(text) {
    queue = queue.then(async () => {
      if (text === "/yangi") { history = []; return send(ownerChatId, "🆕 Yangi suhbat boshlandi. Xotira va eslatmalar saqlanib qoldi."); }
      if (text === "/yordam" || text === "/start") {
        return send(ownerChatId,
          "🤖 Men sizning shaxsiy AI agentingizman. Menga xuddi Claude'ga yozgandek yozing. Masalan:\n\n" +
          "• Bugun qanday buyurtmalar keldi?\n• #A1B2C3 ni bajarildi qil\n• Shu mijozga ish tayyor deb yoz\n" +
          "• Kanalga flexbox haqida post tayyorla\n• Menga qo'ng'iroq qilib eslat\n• Ertaga 9:00 da darsni eslat\n• JavaScript'da massiv nima?\n" +
          "• Internetdan qidir: Bootstrap 5 dagi yangiliklar\n• Kimlar yozdi? / Dilnozaga yoz: ...\n\n/yangi — suhbatni yangidan boshlash\n\n" +
          "Mijozga yoki kanalga yozadigan narsani doim avval sizga ko'rsataman — ✅ bosmaguningizcha hech narsa ketmaydi.");
      }
      await api("sendChatAction", { chat_id: ownerChatId, action: "typing" });
      const typing = setInterval(() => api("sendChatAction", { chat_id: ownerChatId, action: "typing" }), 4500);
      try { await reply(await think(text)); } finally { clearInterval(typing); }
    }).catch(e => console.error("Agent navbat xatosi:", e.message));
  }

  // Server ishga tushganda (ombor yuklangach) chaqiriladi
  function start() {
    notes = store.get("agent-xotira", []);
    reminders = store.get("agent-eslatmalar", []);
    reminders.forEach(arm);   // server qayta ishga tushsa — eslatmalar tiklanadi
  }

  return { onOwnerMessage, onCallback, start };
}

module.exports = { createAgent };
