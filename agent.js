// AHdigital — Abdulhamidning shaxsiy AI agenti (faqat egasi uchun)
// Botga xuddi Claude'ga yozgandek yozasiz: agent buyurtmalarni ko'radi, holatini o'zgartiradi,
// internetdan qidiradi, eslatma qo'yadi, eslab qoladi, mijozga yoki kanalga yozishni TAYYORLAYDI.
// Tashqariga ketadigan har bir xabar (mijozga / kanalga) faqat siz ✅ tugmasini bosgandan keyin yuboriladi.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-5-5";
const MAX_STEPS = 10;            // bitta xabarga agent nechta qadam qila oladi
const MAX_HISTORY = 60;          // shundan oshsa — suhbat yangidan boshlanadi (eslatmalar va xotira saqlanadi)
const STATUSES = ["yangi", "tasdiqlandi", "jarayonda", "bajarildi", "bekor"];
const TZ = "Asia/Tashkent";

function createAgent({ api, send, ownerChatId, services, readOrders, writeOrders, dataDir, channel, client }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const claude = client || new Anthropic();   // client — faqat sinov uchun

  // ---------- Doimiy saqlanadigan ma'lumotlar (data/ papkasida) ----------
  fs.mkdirSync(dataDir, { recursive: true });
  const file = name => path.join(dataDir, name);
  const load = (name, def) => { try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch { return def; } };
  const save = (name, val) => fs.writeFileSync(file(name), JSON.stringify(val, null, 2));

  let notes = load("agent-xotira.json", []);        // [{id, matn, sana}]
  let reminders = load("agent-eslatmalar.json", []); // [{id, vaqt, matn}]
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
      reminders = reminders.filter(x => x.id !== r.id); save("agent-eslatmalar.json", reminders);
      timers.delete(r.id);
    }, Math.min(ms, 2 ** 31 - 1)));
  }
  reminders.forEach(arm);   // server qayta ishga tushsa — eslatmalar tiklanadi

  // ---------- Asboblar (tools) ----------
  const priceList = services.map(s => `- ${s.id}: ${s.name} — ${fmt(s.price)} so'm / ${s.period}`).join("\n");

  const TOOLS = [
    { name: "buyurtmalar", description: "Saytdagi buyurtmalar ro'yxatini qaytaradi (eng yangisi birinchi). Holat bo'yicha filtrlash mumkin.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        holat: { type: "string", enum: STATUSES, description: "Faqat shu holatdagilar" },
        soni: { type: "integer", description: "Nechta qaytarilsin (standart 15)" } }, required: [] } },
    { name: "statistika", description: "Buyurtmalar soni holat bo'yicha, bajarilgan ishlardan tushgan daromad va eng ko'p so'ralgan xizmatlar.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } },
    { name: "buyurtma_holati", description: "Buyurtma holatini o'zgartiradi (admin paneldagi kabi). Mijozga hech narsa yuborilmaydi.",
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
        vaqt: { type: "string" }, matn: { type: "string" } }, required: ["vaqt", "matn"] } },
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
        o.status = input.holat; writeOrders(orders);
        return `#${o.code} holati endi: ${o.status}.`;
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
      case "eslatma_qoyish": {
        const t = new Date(input.vaqt);
        if (isNaN(t)) return "Xato: vaqt formati noto'g'ri. Masalan: 2026-11-06T09:00:00+05:00";
        if (t < Date.now()) return "Xato: bu vaqt allaqachon o'tib ketgan.";
        const r = { id: id(), vaqt: t.toISOString(), matn: input.matn };
        reminders.push(r); save("agent-eslatmalar.json", reminders); arm(r);
        return `Eslatma qo'yildi (id ${r.id}): ${t.toLocaleString("uz-UZ", { timeZone: TZ })} — ${r.matn}`;
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
      const r = await send(p.chatId, p.matn);
      result = r.ok ? `✅ Yuborildi: ${p.kim}` : `⚠️ Yuborib bo'lmadi (${r.description}). ${p.turi === "kanal" ? "Bot kanalda admin ekanini tekshiring." : ""}`;
    } else result = "❌ Bekor qilindi.";
    await api("answerCallbackQuery", { callback_query_id: q.id, text: action === "ag_ok" ? "Bajarildi" : "Bekor qilindi" });
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
          "• Kanalga flexbox haqida post tayyorla\n• Ertaga 9:00 da darsni eslat\n• JavaScript'da massiv nima?\n" +
          "• Internetdan qidir: Bootstrap 5 dagi yangiliklar\n\n/yangi — suhbatni yangidan boshlash\n\n" +
          "Mijozga yoki kanalga yozadigan narsani doim avval sizga ko'rsataman — ✅ bosmaguningizcha hech narsa ketmaydi.");
      }
      await api("sendChatAction", { chat_id: ownerChatId, action: "typing" });
      const typing = setInterval(() => api("sendChatAction", { chat_id: ownerChatId, action: "typing" }), 4500);
      try { await reply(await think(text)); } finally { clearInterval(typing); }
    }).catch(e => console.error("Agent navbat xatosi:", e.message));
  }

  return { onOwnerMessage, onCallback };
}

module.exports = { createAgent };
