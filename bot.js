// AHdigital Telegram bot
// - Yangi buyurtma: egasiga (sizga) darhol xabar
// - Mijoz botni buyurtma kodi bilan ochsa: buyurtmadan 1 daqiqa o'tib tasdiq so'raydi (✅ / ❌)
// - Mijoz savol yozsa: Claude javob beradi (ANTHROPIC_API_KEY bo'lsa), savol egasiga ham boradi
// - Egasi botdagi xabarga "reply" qilsa — javob mijozga yetkaziladi
// Telegram qoidasi: bot odamga birinchi bo'lib yoza olmaydi — mijoz avval botni ochishi (Start) kerak.

const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");
const { createAgent } = require("./agent");
const { createCaller } = require("./call");

const CONFIRM_DELAY_MS = Number(process.env.BOT_CONFIRM_DELAY_MS) || 60_000;   // buyurtmadan keyin 1 daqiqa
const MAX_TURNS = 20;
const ALLOWED = ["message", "callback_query", "business_connection", "business_message"];                     // shundan keyin Claude bilan suhbat yangidan boshlanadi

function createBot({ token, ownerChatId, publicUrl, services, readOrders, writeOrders, store }) {
  if (!token) return null;

  const api = async (method, body = {}) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.ok) console.error(`Telegram ${method} xatosi:`, data.description);
    return data;
  };
  const send = (chatId, text, extra = {}) => api("sendMessage", { chat_id: chatId, text, ...extra });
  // Rasm yuborish (multipart): png — Buffer
  const sendPhoto = async (chatId, png, caption = "", reply_markup) => {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", new Blob([png], { type: "image/png" }), "ahdigital.png");
    if (caption) form.append("caption", caption);
    if (reply_markup) form.append("reply_markup", JSON.stringify(reply_markup));
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
    const data = await res.json();
    if (!data.ok) console.error("Telegram sendPhoto xatosi:", data.description);
    return data;
  };

  // Fayl yuborish (zaxira nusxa uchun): buf — Buffer yoki matn
  const sendDocument = async (chatId, filename, buf, caption = "") => {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("document", new Blob([buf], { type: "application/json" }), filename);
    if (caption) form.append("caption", caption);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({ ok: false, description: "javob o'qilmadi" }));
    if (!data.ok) console.error("Telegram sendDocument xatosi:", data.description);
    return data;
  };
  // Egasiga zaxira faylini yuborish
  async function sendBackup(reason = "") {
    if (!ownerChatId) return { ok: false };
    const snap = store.snapshot();
    const day = snap.olingan.slice(0, 10);
    const n = k => { const v = snap.data[k]; return Array.isArray(v) ? v.length : v ? Object.keys(v).length : 0; };
    return sendDocument(ownerChatId, `ahdigital-zaxira-${day}.json`, Buffer.from(JSON.stringify(snap, null, 1)),
      `🗄 Zaxira nusxa${reason ? " · " + reason : ""}\nBuyurtmalar: ${n("orders")}, foydalanuvchilar: ${n("foydalanuvchilar")}, o'quvchilar: ${n("legends-oquvchilar")}\nFaylni saqlab qo'ying — ichida mijozlar ma'lumoti bor, hech kimga bermang.`);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
  let username = "";
  const timers = new Map();      // buyurtma kodi -> setTimeout
  const forwards = new Map();    // egasiga yuborilgan xabar id -> mijoz chat id
  const chats = new Map();       // mijoz chat id -> Claude suhbat tarixi

  // ---------- Claude ----------
  const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  const priceList = services.map(s => `- ${s.name}: ${s.price.toLocaleString("ru-RU")} so'm / ${s.period}. ${s.desc}`).join("\n");
  const SYSTEM = `Sen Claude — Anthropic yaratgan AI yordamchisan. AHdigital (Abdulhamid Xamidullayevning AI kontent va web sayt xizmatlari) Telegram botida mijozlar bilan gaplashyapsan.
Qoidalar:
- Faqat o'zbek tilida, qisqa (1–4 gap), samimiy javob ber. Markdown ishlatma, oddiy matn yoz.
- O'zingni odam deb ko'rsatma. So'rashsa, AI ekaningni ayt.
- Narx va xizmatlarni faqat quyidagi ro'yxatdan ayt. Ro'yxatda yo'q narx, chegirma, muddat yoki va'da o'ylab topma — bunday savollarga "Abdulhamid o'zi aniq javob beradi" de.
- Buyurtma berish uchun saytdagi formani yoki Abdulhamidga yozishni taklif qil: Telegram @Abdulkhamid_2905, telefon +998 95 632 29 05.
Xizmatlar:
${priceList}`;

  async function askClaude(chatId, text) {
    let history = chats.get(chatId) || [];
    if (history.length >= MAX_TURNS * 2) history = [];       // tarixni qirqmaymiz — yangi suhbat boshlaymiz
    history.push({ role: "user", content: text });
    try {
      const response = await claude.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 2000,
        output_config: { effort: "low" },                    // oddiy chat uchun tez va arzon
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",                                 // rad etilsa, boshqa model javob beradi
        system: SYSTEM,
        messages: history
      });
      if (response.stop_reason === "refusal") {
        history.pop();
        return "Bu savolga javob bera olmayman. Abdulhamid sizga o'zi javob beradi.";
      }
      history.push({ role: "assistant", content: response.content });   // to'liq javobni saqlaymiz
      chats.set(chatId, history);
      return response.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim()
        || "Abdulhamid sizga tez orada javob beradi.";
    } catch (err) {
      history.pop();
      if (err instanceof Anthropic.RateLimitError) console.error("Claude: limit, keyinroq urinib ko'ring");
      else if (err instanceof Anthropic.APIError) console.error(`Claude xatosi ${err.status}:`, err.message);
      else console.error("Claude bilan bog'lanib bo'lmadi:", err.message);
      return "Hozir javob bera olmayapman. Xabaringiz Abdulhamidga yetkazildi, u tez orada yozadi.";
    }
  }

  // ---------- Yordamchilar ----------
  const fmt = n => n.toLocaleString("ru-RU");
  const findOrder = code => readOrders().find(o => o.code === code);
  function updateOrder(code, patch) {
    const orders = readOrders();
    const order = orders.find(o => o.code === code);
    if (!order) return null;
    Object.assign(order, patch);
    writeOrders(orders);
    return order;
  }
  const contactKind = contact => /^@|t\.me\//i.test(contact) ? "telegram" : (contact.replace(/\D/g, "").length >= 9 ? "phone" : "other");
  // Shaxsiy AI agent — faqat egasi (siz) uchun
  const caller = createCaller({ publicUrl });   // telefon qo'ng'irog'i (Twilio sozlangan bo'lsa)
  // ---------- Shaxsiy chatlar (Telegram Business) ----------
  // Bot sizning shaxsiy chatlaringizdagi xabarlarni eslab qoladi, agent ularni o'qiydi va siz ✅ bossangiz sizning nomingizdan yozadi.
  const MAX_CHATS = 100, MAX_MSGS = 40;
  const chatsDb = () => store.get("biznes-chatlar", {});
  const settings = () => ({ avto: true, bildirish: true, ...store.get("biznes-sozlama", {}) });
  function remember(msg, who, connId) {
    const all = chatsDb();
    const c = msg.chat;
    const rec = all[c.id] || { id: c.id, msgs: [] };
    rec.name = [c.first_name, c.last_name].filter(Boolean).join(" ") || rec.name || String(c.id);
    rec.username = c.username || rec.username || "";
    rec.conn = connId || rec.conn;
    const text = msg.text || msg.caption || (msg.photo ? "[rasm]" : msg.voice ? "[ovozli xabar]" : msg.video ? "[video]" : msg.document ? "[fayl]" : msg.sticker ? "[stiker]" : "[xabar]");
    rec.msgs.push({ who, text: String(text).slice(0, 2000), t: Date.now() });
    rec.msgs = rec.msgs.slice(-MAX_MSGS);
    if (who === "u") rec.lastIn = Date.now();
    rec.last = Date.now();
    all[c.id] = rec;
    const ids = Object.keys(all).sort((a, z) => all[z].last - all[a].last);
    ids.slice(MAX_CHATS).forEach(k => delete all[k]);
    store.set("biznes-chatlar", all);
  }
  const business = {
    list: (n = 15) => Object.values(chatsDb()).sort((a, z) => z.last - a.last).slice(0, n),
    find(q) {
      const s = String(q || "").trim().toLowerCase().replace(/^@/, "");
      const list = Object.values(chatsDb());
      return list.find(c => String(c.id) === s) || list.find(c => c.username && c.username.toLowerCase() === s)
        || list.find(c => c.name.toLowerCase() === s) || list.find(c => c.name.toLowerCase().includes(s) || (c.username || "").toLowerCase().includes(s));
    },
    async send(chatId, text) {
      const c = chatsDb()[chatId];
      if (!c || !c.conn) return { ok: false, description: "bu chat uchun Business ulanishi topilmadi" };
      const r = await send(chatId, text, { business_connection_id: c.conn });
      if (r.ok) remember({ chat: { id: chatId, first_name: c.name, username: c.username }, text }, "men", c.conn);
      return r;
    },
    settings,
    setSettings: patch => store.set("biznes-sozlama", { ...settings(), ...patch })
  };

  // ---------- Buyurtma holati o'zgarsa — mijozga avtomatik xabar ----------
  // Kimga: botni ochgan mijoz (tgChatId) yoki saytga Telegram bilan kirgan mijoz (Telegram ID — kirishda "xabar yozish" ruxsatini bergan)
  const STATUS_MSG = {
    tasdiqlandi: { uz: "✅ Buyurtmangiz tasdiqlandi! Tez orada ishni boshlayman.", ru: "✅ Ваш заказ подтверждён! Скоро начну работу.", en: "✅ Your order is confirmed! I'll start working on it soon." },
    jarayonda: { uz: "🛠 Buyurtmangiz ustida ishlayapman.", ru: "🛠 Работаю над вашим заказом.", en: "🛠 I'm working on your order." },
    bajarildi: { uz: "🎉 Buyurtmangiz tayyor! Natijani shu yerda yuboraman — ko'rib chiqing. Tuzatish kerak bo'lsa, yozing.", ru: "🎉 Ваш заказ готов! Отправлю результат здесь — посмотрите. Если нужны правки, напишите.", en: "🎉 Your order is ready! I'll send the result here — take a look. If you need any changes, just write." },
    bekor: { uz: "❌ Buyurtmangiz bekor qilindi. Savol bo'lsa, shu yerga yozing.", ru: "❌ Ваш заказ отменён. Если есть вопросы, напишите сюда.", en: "❌ Your order was cancelled. If you have questions, write here." }
  };
  const ORDER_WORD = { uz: "Buyurtma", ru: "Заказ", en: "Order" };
  const CABINET = { uz: "Holatini kabinetda kuzating", ru: "Статус — в личном кабинете", en: "Track it in your account" };
  let payInfo = null;                            // payments.js ulanadi: holat xabariga to'lov havolasini qo'shadi
  const customerChat = order => order.tgChatId || (/^\d+$/.test(String(order.tgUserId || "")) ? order.tgUserId : null);
  const langOf = order => (["uz", "ru", "en"].includes(order.lang) ? order.lang : "uz");
  async function notifyStatus(order) {
    const msg = STATUS_MSG[order.status];
    if (!msg) return null;                       // "yangi" holatida mijozga yozilmaydi
    const chatId = customerChat(order);
    if (!chatId) return { ok: false, reason: "mijoz Telegram orqali bog'lanmagan" };
    const lang = langOf(order);
    const pay = payInfo ? payInfo(order, lang) : "";
    const site = publicUrl ? `\n${CABINET[lang]}: ${publicUrl.replace(/\/$/, "")}/kabinet.html?lang=${lang}` : "";
    const r = await send(chatId, `${ORDER_WORD[lang]} #${order.code} · ${order.serviceName}\n\n${msg[lang]}${pay}${site}`);
    return r.ok ? { ok: true } : { ok: false, reason: r.description || "Telegram xatosi" };
  }
  // Mijozga uning tilida xabar: texts = { uz, ru, en }
  async function notifyCustomer(order, texts) {
    const chatId = customerChat(order);
    if (!chatId) return { ok: false };
    return send(chatId, `${ORDER_WORD[langOf(order)]} #${order.code} · ${order.serviceName}\n\n${texts[langOf(order)] || texts.uz}`);
  }

  const agent = ownerChatId ? createAgent({
    api, send, ownerChatId, services, readOrders, writeOrders, store, business, notifyStatus,
    channel: process.env.TELEGRAM_CHANNEL || "",
    caller, sendPhoto
  }) : null;

  const intro = claude
    ? "Salom! 👋 Men Claude — AHdigital'ning AI yordamchisiman (sun'iy intellekt, odam emasman)."
    : "Salom! 👋 Men AHdigital'ning avtomatik yordamchi botiman (odam emasman).";

  // ---------- Yangi buyurtma (server.js chaqiradi) ----------
  function deepLink(order) {
    return username ? `https://t.me/${username}?start=${order.code}` : "";
  }

  async function onNewOrder(order) {
    if (!ownerChatId) return;
    const kind = contactKind(order.contact);
    const note = kind === "phone"
      ? "📞 Mijoz telefon qoldirgan — bot qo'ng'iroq qila olmaydi, o'zingiz qo'ng'iroq qiling."
      : "🤖 Mijoz saytdagi tugma orqali botni ochsa, 1 daqiqadan keyin bot undan tasdiq so'raydi.";
    await send(ownerChatId,
      `🆕 Yangi buyurtma #${order.code}\n\n` +
      `👤 ${order.name}\n📞 ${order.contact}\n📦 ${order.serviceName} — ${fmt(order.price)} so'm\n💬 ${order.message || "—"}\n\n${note}`);
    // Yangi buyurtmada telefon qo'ng'irog'i (Render'da CALL_ON_NEW_ORDER=1 bo'lsa)
    if (caller && process.env.CALL_ON_NEW_ORDER === "1") {
      const c = await caller.call(`Yangi buyurtma! ${order.name}, ${order.serviceName}, ${fmt(order.price)} so'm. Telegramni tekshiring.`);
      if (!c.ok) await send(ownerChatId, `📵 ${c.text}`);
    }
  }

  // Buyurtmadan 1 daqiqa o'tgach mijozdan tasdiq so'raymiz
  function scheduleConfirm(order) {
    if (timers.has(order.code)) return;
    const wait = Math.max(0, new Date(order.createdAt).getTime() + CONFIRM_DELAY_MS - Date.now());
    timers.set(order.code, setTimeout(async () => {
      timers.delete(order.code);
      const fresh = findOrder(order.code);
      if (!fresh || !fresh.tgChatId || fresh.status !== "yangi") return;
      await send(fresh.tgChatId,
        `Siz AHdigital saytida buyurtma qoldirdingiz:\n📦 ${fresh.serviceName} — ${fmt(fresh.price)} so'm\n👤 ${fresh.name}\n\nRostdan ham shu buyurtmani olasizmi?`,
        { reply_markup: { inline_keyboard: [[
          { text: "✅ Ha, buyurtma beraman", callback_data: `ok:${fresh.code}` },
          { text: "❌ Yo'q, bekor qilaman", callback_data: `no:${fresh.code}` }
        ]] } });
    }, wait));
  }

  // ---------- Telegram Business: bot sizning shaxsiy chatlaringizda javob beradi ----------
  // Sozlamalar → Telegram Business → Chatbots orqali ulanadi (Premium kerak).
  const BUSINESS_PAUSE_MS = 6 * 60 * 60 * 1000;   // siz chatga yozsangiz, bot 6 soat jim turadi
  const AWAY_REPEAT_MS = 12 * 60 * 60 * 1000;     // Claude bo'lmasa: bitta chatga 12 soatda 1 marta javob
  const connections = new Map();                  // business_connection_id -> ulanish ma'lumoti
  const paused = new Map();                       // chat id -> qachongacha jim turadi
  const greeted = new Map();                      // chat id -> oxirgi avtomatik javob vaqti

  async function getConnection(id) {
    if (!connections.has(id)) {
      const r = await api("getBusinessConnection", { business_connection_id: id });
      if (r.ok) connections.set(id, r.result);
    }
    return connections.get(id);
  }

  async function handleBusiness(msg) {
    const conn = await getConnection(msg.business_connection_id);
    // Faqat sizning akkauntingiz uchun ishlaymiz (boshqalar botni o'z akkauntiga ulab, Claude kreditingizni ishlata olmasin)
    if (!conn) return console.log("Business: ulanish ma'lumotini olib bo'lmadi");
    if (!conn.is_enabled) return console.log("Business: ulanish o'chirilgan");
    if (!ownerChatId || String(conn.user_chat_id) !== String(ownerChatId)) {
      return console.log(`Business: begona akkaunt (${conn.user_chat_id}). TELEGRAM_CHAT_ID = ${ownerChatId || "yo'q"} — ular bir xil bo'lishi kerak`);
    }
    const chatId = msg.chat.id;
    console.log(`Business: xabar keldi (chat ${chatId})`);
    const mine = msg.from && msg.from.id === conn.user.id;
    remember(msg, mine ? "men" : "u", msg.business_connection_id);

    // Avtomatik javob o'chiq: faqat sizga bildiramiz, javobni siz aytganda agent yozadi
    const cfg = settings();
    if (!mine && !cfg.avto) {
      if (cfg.bildirish) {
        const who = [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ") + (msg.chat.username ? ` (@${msg.chat.username})` : "");
        await send(ownerChatId, `💬 ${who} sizga yozdi:
${(msg.text || msg.caption || "[media]").slice(0, 1500)}

Javob uchun menga yozing, masalan: "${msg.chat.first_name || "unga"}ga yoz: ..."`);
      }
      return;
    }

    // Siz o'zingiz chatga yozdingiz — bot shu chatda jim turadi
    if (mine) {
      paused.set(chatId, Date.now() + BUSINESS_PAUSE_MS);
      return console.log("Business: siz o'zingiz yozdingiz — bot bu chatda 6 soat jim turadi");
    }
    if ((paused.get(chatId) || 0) > Date.now()) return console.log("Business: bu chatda bot jim turibdi (siz yaqinda yozgansiz)");
    if (!msg.text) return;

    const opts = { business_connection_id: msg.business_connection_id };
    const first = !greeted.has(chatId);
    if (claude) {
      await api("sendChatAction", { chat_id: chatId, action: "typing", ...opts });
      const answer = await askClaude(`b${chatId}`, msg.text);
      const out = first ? `${intro} Abdulhamid o'rniga javob beryapman, u ham bu chatni ko'radi.\n\n${answer}` : answer;
      const sent = await send(chatId, out, opts);
      if (sent.ok) remember({ chat: msg.chat, text: out }, "bot", msg.business_connection_id);
      greeted.set(chatId, Date.now());
    } else if (first || Date.now() - greeted.get(chatId) > AWAY_REPEAT_MS) {
      await send(chatId,
        `${intro}\n\nAbdulhamid hozir band, xabaringizni ko'rishi bilan javob beradi.\n` +
        `Xizmatlar va narxlar: ${publicUrl || "saytimizda"}\nKanal: t.me/ahdigital_01`, opts);
      greeted.set(chatId, Date.now());
    }
  }

  // ---------- Telegram'dan kelgan yangilanishlar ----------
  async function handleUpdate(update) {
    // Business ulanishi yoqildi yoki o'chirildi
    if (update.business_connection) {
      const c = update.business_connection;
      connections.set(c.id, c);
      console.log(`Business ulanish: ${c.is_enabled ? "yoqildi" : "o'chirildi"}, akkaunt ${c.user_chat_id}, javob yozish ruxsati: ${c.can_reply ?? (c.rights && c.rights.can_reply)}`);
      if (ownerChatId && String(c.user_chat_id) === String(ownerChatId)) {
        await send(ownerChatId, c.is_enabled
          ? "✅ Bot Telegram Business'ga ulandi.\n\nEndi menga ayting, masalan:\n• Kimlar yozdi?\n• Dilnozaning chatini o'qib ber\n• Dilnozaga yoz: buyurtmangiz ertaga tayyor\n• Avto javobni o'chir (faqat sizga bildiraman)\n\nHar bir xabarni avval sizga ko'rsataman — ✅ bossangizgina sizning nomingizdan ketadi."
          : "⏸ Bot Telegram Business'dan uzildi.");
      }
      return;
    }
    if (update.business_message) return handleBusiness(update.business_message);

    // Tugma bosildi
    if (update.callback_query) {
      const q = update.callback_query;
      if (agent && String(q.from.id) === String(ownerChatId) && await agent.onCallback(q)) return;
      const [action, code] = (q.data || "").split(":");
      const order = findOrder(code);
      if (!order || String(order.tgChatId) !== String(q.message.chat.id)) {
        return api("answerCallbackQuery", { callback_query_id: q.id, text: "Buyurtma topilmadi." });
      }
      if (order.status !== "yangi") {
        return api("answerCallbackQuery", { callback_query_id: q.id, text: "Javobingiz allaqachon qabul qilingan." });
      }
      const ok = action === "ok";
      updateOrder(code, { status: ok ? "tasdiqlandi" : "bekor", answeredAt: new Date().toISOString() });
      await api("answerCallbackQuery", { callback_query_id: q.id, text: ok ? "Tasdiqlandi!" : "Bekor qilindi" });
      await api("editMessageText", {
        chat_id: q.message.chat.id, message_id: q.message.message_id,
        text: ok
          ? `✅ Rahmat! Buyurtmangiz tasdiqlandi: ${order.serviceName}.\nAbdulhamid tez orada siz bilan bog'lanadi.`
          : "❌ Buyurtma bekor qilindi. Savollaringiz bo'lsa, shu yerga yozing."
      });
      if (ownerChatId) await send(ownerChatId, `${ok ? "✅ TASDIQLANDI" : "❌ BEKOR QILINDI"} — buyurtma #${code}\n👤 ${order.name} · 📦 ${order.serviceName}`);
      return;
    }

    const msg = update.message;
    if (!msg || !msg.text) return;
    const chatId = msg.chat.id, text = msg.text.trim();
    const isOwner = ownerChatId && String(chatId) === String(ownerChatId);

    // Egasi mijoz xabariga "reply" qildi — javobni mijozga yuboramiz
    if (isOwner) {
      const target = msg.reply_to_message && forwards.get(msg.reply_to_message.message_id);
      if (target) {
        await send(target, `Abdulhamid: ${text}`);
        await send(chatId, "✔ Javobingiz mijozga yuborildi.");
      } else if (text === "/zaxira") {
        const r = await sendBackup("so'rov bo'yicha");
        if (!r.ok) await send(chatId, "⚠️ Zaxira faylini yuborib bo'lmadi: " + (r.description || "xato"));
      } else if (agent) {
        agent.onOwnerMessage(text);          // siz yozgan har bir xabar — shaxsiy AI agentga
      } else if (text === "/start") {
        await send(chatId, "Bot ishlayapti ✅ Yangi buyurtmalar shu yerga keladi. Mijoz xabariga reply qilsangiz, javobingiz unga yetadi.\n(AI agent uchun Render'da ANTHROPIC_API_KEY kerak.)");
      }
      return;
    }

    // /start <kod> — mijoz saytdagi tugmani bosdi
    if (text.startsWith("/start")) {
      const code = text.split(" ")[1];
      const order = code && findOrder(code);
      if (order) {
        updateOrder(code, { tgChatId: chatId });
        await send(chatId, `${intro}\n\nBuyurtmangiz #${code} topildi. Bir daqiqada tasdiqlash uchun yozaman.`);
        scheduleConfirm(order);
      } else {
        await send(chatId, `${intro}\n\nAHdigital xizmatlari haqida savolingiz bo'lsa, shu yerga yozing.`);
      }
      return;
    }

    // Oddiy xabar: egasiga yuboramiz va javob beramiz
    if (ownerChatId) {
      const who = [msg.from.first_name, msg.from.username && "@" + msg.from.username].filter(Boolean).join(" ");
      const fwd = await send(ownerChatId, `💬 ${who}:\n${text}\n\n↩️ Javob berish uchun shu xabarga reply qiling.`);
      if (fwd.ok) forwards.set(fwd.result.message_id, chatId);
    }
    if (claude) {
      await api("sendChatAction", { chat_id: chatId, action: "typing" });
      await send(chatId, await askClaude(chatId, text));
    } else {
      await send(chatId, "Xabaringiz Abdulhamidga yetkazildi ✅ U tez orada javob beradi.");
    }
  }

  // ---------- Ishga tushirish ----------
  async function start(app) {
    const me = await api("getMe");
    if (!me.ok) return console.error("❌ TELEGRAM_BOT_TOKEN noto'g'ri — bot ishlamaydi.");
    username = me.result.username;
    if (caller) { caller.mount(app); console.log(`📞 Qo'ng'iroq yoqildi: ${caller.kind}`); }

    // Telegram shu manzilga xabarlarni yuboradi (Render'da)
    app.post("/telegram/webhook", (req, res) => {
      if (req.get("x-telegram-bot-api-secret-token") !== secret) return res.sendStatus(401);
      res.sendStatus(200);
      handleUpdate(req.body).catch(err => console.error("Bot xatosi:", err.message));
    });

    if (publicUrl) {
      await api("setWebhook", { url: `${publicUrl}/telegram/webhook`, secret_token: secret, allowed_updates: ALLOWED });
      console.log(`🤖 Bot @${username} ishlayapti (webhook)`);
    } else {
      // Kompyuterda: webhook o'rniga Telegram'dan o'zimiz so'rab turamiz
      await api("deleteWebhook");
      console.log(`🤖 Bot @${username} ishlayapti (polling)`);
      let offset = 0;
      (async function poll() {
        while (true) {
          try {
            const r = await api("getUpdates", { offset, timeout: 30, allowed_updates: ALLOWED });
            for (const u of r.result || []) {
              offset = u.update_id + 1;
              await handleUpdate(u).catch(err => console.error("Bot xatosi:", err.message));
            }
          } catch {
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      })();
    }

    // Server qayta ishga tushsa — kutilayotgan tasdiqlarni tiklaymiz
    readOrders().filter(o => o.tgChatId && o.status === "yangi").forEach(scheduleConfirm);
    if (!claude) console.log("ℹ️  ANTHROPIC_API_KEY yo'q — bot savollarga Claude bilan javob bermaydi.");
    if (agent) {
      agent.start();                       // xotira va eslatmalarni ombordan yuklaydi
      console.log("🧠 Shaxsiy AI agent yoqildi (egasi uchun)");
      await api("setMyCommands", { commands: [
        { command: "yordam", description: "Agent nimalar qila oladi" },
        { command: "yangi", description: "Suhbatni yangidan boshlash" },
        { command: "zaxira", description: "Barcha ma'lumotlarning zaxira faylini olish" }
      ], scope: { type: "chat", chat_id: Number(ownerChatId) } });
    }
  }

  return { start, onNewOrder, deepLink, handleUpdate, notifyStatus, notifyCustomer, setPayInfo: fn => (payInfo = fn), sendBackup, sendOwner: text => (ownerChatId ? send(ownerChatId, text) : null), username: () => username };
}

module.exports = { createBot };
