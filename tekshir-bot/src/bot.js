// Tekshir — firibgarlikka qarshi Telegram bot. Asosiy fayl.
// 1-bosqich: /start, til tanlash, /til, /yordam. 6-bosqich: baza, /stats, /export.
// Ishga tushirish: npm start   (avval .env faylida BOT_TOKEN bo'lishi kerak)

// .env faylini doim loyiha papkasidan o'qiymiz (terminal qaysi papkada bo'lishidan qat'i nazar)
const path = require("path");
const fs = require("fs");
const ENV_PATH = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });
const { Bot, InlineKeyboard, InputFile } = require("grammy");
const { t, LANGS } = require("./i18n");
const { extractUrls, checkUrls } = require("./checkers/url");
const { combineAll } = require("./scoring");
const { analyzeText } = require("./checkers/text");
const { checkFile } = require("./checkers/file");
const { buildReply } = require("./reply");
const { openDb, toCsv } = require("./db");
const { isAdmin, formatStats } = require("./admin");
const cache = require("./cache");

// Til tanlash tugmalari: har bir til — alohida qator
function langKeyboard() {
  const kb = new InlineKeyboard();
  for (const lang of LANGS) kb.text(t(lang, "lang_name"), `lang:${lang}`).row();
  return kb;
}

// Botni yaratuvchi funksiya. Testlarda ham shundan foydalanamiz (shuning uchun alohida).
// deps.download(file_id) — faylni xotiraga yuklab beradi. Testlarda soxtasi beriladi (internetsiz).
// deps.db — baza. Berilmasa, vaqtinchalik (xotiradagi) baza ochiladi — testlar uchun qulay.
function createBot(token, options = {}, deps = {}) {
  const bot = new Bot(token, options);
  const db = deps.db || openDb(":memory:");
  // Foydalanuvchi tili endi BAZADA saqlanadi — bot qayta ishga tushsa ham eslab qoladi
  const getLang = id => db.getLang(id);
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
    db.setLang(ctx.from.id, lang);
    await ctx.answerCallbackQuery({ text: t(lang, "lang_saved") });  // tepada qisqa xabarcha
    await ctx.editMessageText(t(lang, "lang_saved"));                // tugmalar o'rniga tasdiq
    await ctx.reply(t(lang, "welcome"), { parse_mode: "HTML" });
  });

  // /stats — faqat adminlar uchun (ADMIN_IDS). Boshqalarga bot jim turadi — buyruq borligi ham bilinmasin
  bot.command("stats", async ctx => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(formatStats(db.stats()), { parse_mode: "HTML" });
  });

  // /export — oxirgi 30 kunlik tekshiruvlar CSV faylda (Excel'da ochiladi). Foydalanuvchi ID'si va matn YO'Q
  // /export 7 — oxirgi 7 kun
  bot.command("export", async ctx => {
    if (!isAdmin(ctx.from.id)) return;
    const days = Math.min(365, Math.max(1, parseInt(ctx.match, 10) || 30));
    const rows = db.exportRows(days);
    const name = `tekshir-${new Date().toISOString().slice(0, 10)}.csv`;
    await ctx.replyWithDocument(new InputFile(Buffer.from(toCsv(rows), "utf8"), name), { caption: `📄 Oxirgi ${days} kun: ${rows.length} ta tekshiruv` });
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
    // Bazaga faqat natija yoziladi — xabar matni ham, to'liq havola ham YOZILMAYDI
    try {
      db.logCheck({ userId: ctx.from.id, chatType: "private", result, hasText: !!text.trim(), hosts: urlRes.map(r => r.host) });
    } catch (e) { console.error("Baza (logCheck):", e.message); }   // baza xatosi javobga xalaqit bermasin
    const { text: answer, reply_markup } = buildReply(lang, result, ctx.me.username);
    await ctx.reply(answer, { parse_mode: "HTML", reply_markup, reply_parameters: { message_id: m.message_id }, link_preview_options: { is_disabled: true } });
  });

  // Xato bo'lsa — bot to'xtab qolmasin: log'ga yozamiz, foydalanuvchiga yumshoq javob
  bot.catch(async err => {
    console.error("Bot xatosi:", err.error?.message || err.message);
    try { await err.ctx.reply(t(getLang(err.ctx.from?.id), "error")); } catch { /* javob ham yuborilmasa — jim */ }
  });

  bot.db = db;          // testlar va ishga tushirish uchun
  return bot;
}

// Fayl to'g'ridan-to'g'ri ishga tushirilganda (npm start) — botni ishga tushiramiz.
// Testlar esa faqat createBot'ni chaqiradi, internetga ulanmaydi.
if (require.main === module) {
  if (!process.env.BOT_TOKEN) {
    // Aniq sababni aytamiz — qayerdan qidirganimizni ham ko'rsatamiz
    console.error("❌ BOT_TOKEN topilmadi.");
    console.error("   Qidirilgan fayl: " + ENV_PATH);
    if (!fs.existsSync(ENV_PATH)) {
      console.error("   Sabab: bu papkada .env fayli YO'Q.");
      const ex = path.join(__dirname, "..", ".env.example");
      if (fs.existsSync(ex) && /BOT_TOKEN=\S+/.test(fs.readFileSync(ex, "utf8")))
        console.error("   Token .env.example ichiga yozilgan ko'rinadi — uni .env ga ko'chiring.");
      if (fs.existsSync(ENV_PATH + ".txt")) console.error("   .env.txt bor — nomidan .txt ni olib tashlang.");
    } else {
      console.error("   Sabab: .env bor, lekin ichida BOT_TOKEN=... qatori bo'sh yoki noto'g'ri yozilgan.");
      console.error("   To'g'ri ko'rinish: BOT_TOKEN=1234567890:AAH...  (bo'shliqsiz, qo'shtirnoqsiz)");
    }
    process.exit(1);
  }
  const db = openDb();                    // data/tekshir.db
  cache.attach(db);                       // VirusTotal/Google javoblari endi bazada ham saqlanadi
  db.cachePurge();                        // muddati o'tgan kesh yozuvlarini tozalaymiz
  setInterval(() => db.cachePurge(), 6 * 60 * 60 * 1000).unref();
  const bot = createBot(process.env.BOT_TOKEN, {}, { db });
  // To'xtatilganda bazani to'g'ri yopamiz
  for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => { bot.stop(); db.close(); process.exit(0); });
  // Telegram'dagi "/" menyusida ko'rinadigan buyruqlar
  bot.api.setMyCommands([
    { command: "start", description: "Boshlash" },
    { command: "yordam", description: "Qanday ishlatish" },
    { command: "til", description: "Tilni o'zgartirish / Сменить язык" }
  ]).catch(e => console.error("Buyruqlar menyusi:", e.message));
  // Long polling: bot o'zi Telegram'dan yangi xabarlarni so'rab turadi (kompyuterda ishlatish uchun qulay)
  bot.start({ onStart: info => console.log(`✅ @${info.username} ishga tushdi. To'xtatish: Ctrl + C`) });
}

module.exports = { createBot };
