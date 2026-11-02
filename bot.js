// AHdigital Telegram bot
// - Yangi buyurtma: egasiga (sizga) darhol xabar
// - Mijoz botni buyurtma kodi bilan ochsa: buyurtmadan 1 daqiqa o'tib tasdiq so'raydi (✅ / ❌)
// - Mijoz savol yozsa: Claude javob beradi (ANTHROPIC_API_KEY bo'lsa), savol egasiga ham boradi
// - Egasi botdagi xabarga "reply" qilsa — javob mijozga yetkaziladi
// Telegram qoidasi: bot odamga birinchi bo'lib yoza olmaydi — mijoz avval botni ochishi (Start) kerak.

const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");

const CONFIRM_DELAY_MS = Number(process.env.BOT_CONFIRM_DELAY_MS) || 60_000;   // buyurtmadan keyin 1 daqiqa
const MAX_TURNS = 20;
const ALLOWED = ["message", "callback_query", "business_connection", "business_message"];                     // shundan keyin Claude bilan suhbat yangidan boshlanadi

function createBot({ token, ownerChatId, publicUrl, services, readOrders, writeOrders }) {
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

    // Siz o'zingiz chatga yozdingiz — bot shu chatda jim turadi
    if (msg.from && msg.from.id === conn.user.id) {
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
      await send(chatId, first ? `${intro} Abdulhamid o'rniga javob beryapman, u ham bu chatni ko'radi.\n\n${answer}` : answer, opts);
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
          ? "✅ Bot Telegram Business'ga ulandi. Endi shaxsiy chatlaringizda mijozlarga javob beradi.\nSiz chatga o'zingiz yozsangiz, bot o'sha chatda 6 soat jim turadi."
          : "⏸ Bot Telegram Business'dan uzildi.");
      }
      return;
    }
    if (update.business_message) return handleBusiness(update.business_message);

    // Tugma bosildi
    if (update.callback_query) {
      const q = update.callback_query, [action, code] = (q.data || "").split(":");
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
      } else if (text === "/start") {
        await send(chatId, "Bot ishlayapti ✅ Yangi buyurtmalar shu yerga keladi. Mijoz xabariga reply qilsangiz, javobingiz unga yetadi.");
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
  }

  return { start, onNewOrder, deepLink, handleUpdate };
}

module.exports = { createBot };
