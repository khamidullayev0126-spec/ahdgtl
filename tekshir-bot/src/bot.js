// Tekshir — firibgarlikka qarshi Telegram bot. Asosiy fayl.
// 1-bosqich: /start, til tanlash, /til, /yordam.
// Ishga tushirish: npm start   (avval .env faylida BOT_TOKEN bo'lishi kerak)

require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const { t, LANGS } = require("./i18n");
const { extractUrls, checkUrls } = require("./checkers/url");
const { combineAll } = require("./scoring");
const { analyzeText } = require("./checkers/text");
const { checkFile } = require("./checkers/file");
const { buildReply } = require("./reply");

// Foydalanuvchining tanlagan tili.
// HOZIRCHA xotirada (Map) saqlanadi — bot qayta ishga tushsa, unutiladi.
// 6-bosqichda SQLite bazasiga o'tkazamiz.
const userLang = new Map();          // telegram_id -> "uz-latn" | "uz-cyrl" | "ru"
const getLang = id => userLang.get(id);

// Til tanlash tugmalari: har bir til — alohida qator
function langKeyboard() {
  const kb = new InlineKeyboard();
  for (const lang of LANGS) kb.text(t(lang, "lang_name"), `lang:${lang}`).row();
  return kb;
}

// Botni yaratuvchi funksiya. Testlarda ham shundan foydalanamiz (shuning uchun alohida).
// deps.download(file_id) — faylni xotiraga yuklab beradi. Testlarda soxtasi beriladi (internetsiz).
function createBot(token, options = {}, deps = {}) {
  const bot = new Bot(token, options);
  // Faylni Telegram serveridan XOTIRAGA yuklaymiz (diskka yozilmaydi, ishga tushirilmaydi) — faqat hash uchun
  const download = deps.download || (async fileId => {
    const file = await bot.api.getFile(fileId);
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return Buffer.from(await res.arrayBuffer());
  });

  // /start — til tanlanmagan bo'lsa, avval tilni so'raymiz
  bot.command("start", async ctx => {
    const lang = getLang(ctx.from.id);
    if (!lang) return ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() });
    await ctx.reply(t(lang, "welcome"), { parse_mode: "HTML" });
  });

  // /til — tilni qayta tanlash
  bot.command("til", ctx => ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() }));

  // /yordam — qanday ishlatish
  bot.command(["yordam", "help"], ctx => ctx.reply(t(getLang(ctx.from.id), "help"), { parse_mode: "HTML" }));

  // Til tugmasi bosilganda: callback_data = "lang:uz-latn"
  bot.callbackQuery(/^lang:(.+)$/, async ctx => {
    const lang = ctx.match[1];
    if (!LANGS.includes(lang)) return ctx.answerCallbackQuery();   // noto'g'ri qiymat — e'tibor bermaymiz
    userLang.set(ctx.from.id, lang);
    await ctx.answerCallbackQuery({ text: t(lang, "lang_saved") });  // tepada qisqa xabarcha
    await ctx.editMessageText(t(lang, "lang_saved"));                // tugmalar o'rniga tasdiq
    await ctx.reply(t(lang, "welcome"), { parse_mode: "HTML" });
  });

  // "Shikoyat qilish" tugmasi — 7-bosqichda to'liq ishlaydi
  bot.callbackQuery("report", ctx => ctx.answerCallbackQuery({ text: t(getLang(ctx.from.id), "report_soon"), show_alert: true }));

  // Boshqa har qanday xabar (shaxsiy chatda): havolalarni topamiz va tekshiramiz
  bot.on("message", async ctx => {
    if (ctx.chat.type !== "private") return;          // guruhlar — 8-bosqichda
    const lang = getLang(ctx.from.id);
    if (!lang) return ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() });

    // Matn oddiy xabarda "text"da, rasm/fayl ostidagi yozuvda esa "caption"da bo'ladi
    const m = ctx.message;
    const text = m.text || m.caption || "";
    const doc = m.document;                                    // fayl (APK, PDF, ZIP va h.k.)
    if (!text.trim() && !doc) return ctx.reply(t(lang, "no_text"));   // stiker, ovozli xabar va h.k.
    const urls = extractUrls(text, m.entities || m.caption_entities);

    await ctx.replyWithChatAction("typing").catch(() => {});   // "yozmoqda..." belgisi
    // Havolalar, matn va fayl bir vaqtda tekshiriladi, keyin natijalar birlashtiriladi
    const [urlRes, fileRes] = await Promise.all([
      urls.length ? checkUrls(urls) : [],
      doc ? checkFile({ name: doc.file_name || "", mime: doc.mime_type || "", size: doc.file_size || 0 }, () => download(doc.file_id)) : null
    ]);
    const result = combineAll(urlRes, analyzeText(text), fileRes);
    const { text: answer, reply_markup } = buildReply(lang, result, ctx.me.username);
    await ctx.reply(answer, { parse_mode: "HTML", reply_markup, reply_parameters: { message_id: m.message_id }, link_preview_options: { is_disabled: true } });
  });

  // Xato bo'lsa — bot to'xtab qolmasin: log'ga yozamiz, foydalanuvchiga yumshoq javob
  bot.catch(async err => {
    console.error("Bot xatosi:", err.error?.message || err.message);
    try { await err.ctx.reply(t(getLang(err.ctx.from?.id), "error")); } catch { /* javob ham yuborilmasa — jim */ }
  });

  return bot;
}

// Fayl to'g'ridan-to'g'ri ishga tushirilganda (npm start) — botni ishga tushiramiz.
// Testlar esa faqat createBot'ni chaqiradi, internetga ulanmaydi.
if (require.main === module) {
  if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN topilmadi. .env.example faylini .env deb nusxalang va tokenni yozing.");
    process.exit(1);
  }
  const bot = createBot(process.env.BOT_TOKEN);
  // Telegram'dagi "/" menyusida ko'rinadigan buyruqlar
  bot.api.setMyCommands([
    { command: "start", description: "Boshlash" },
    { command: "yordam", description: "Qanday ishlatish" },
    { command: "til", description: "Tilni o'zgartirish / Сменить язык" }
  ]).catch(e => console.error("Buyruqlar menyusi:", e.message));
  // Long polling: bot o'zi Telegram'dan yangi xabarlarni so'rab turadi (kompyuterda ishlatish uchun qulay)
  bot.start({ onStart: info => console.log(`✅ @${info.username} ishga tushdi. To'xtatish: Ctrl + C`) });
}

module.exports = { createBot, userLang };
