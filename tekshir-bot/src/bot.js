// Tekshir — firibgarlikka qarshi Telegram bot. Asosiy fayl.
// 1-bosqich: /start, til tanlash, /til, /yordam. 6-bosqich: baza, /stats, /export. 7-bosqich: shikoyatlar, raqamlar.
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
const { extractNumbers, reportPoints } = require("./checkers/numbers");
const crypto = require("crypto");

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

  // ---------- Shikoyatlar (7-bosqich) ----------
  // Tugma bosilganda raqamning o'zini qayta so'ramaslik uchun, tekshiruv paytida faqat HASH'larni
  // xotirada 24 soat ushlab turamiz: kod -> { targets: [{hash, kind}], owner, until, markup }
  // Raqamning o'zi bu yerda ham, bazada ham saqlanmaydi.
  const pending = new Map();
  const PENDING_TTL = 24 * 60 * 60 * 1000;
  function remember(targets, owner) {
    const now = Date.now();
    if (pending.size > 5000) for (const [k, v] of pending) if (v.until < now || pending.size > 5000) pending.delete(k);
    const id = crypto.randomBytes(6).toString("base64url");     // 8 belgi — callback_data 64 baytdan oshmasin
    pending.set(id, { targets, owner, until: now + PENDING_TTL });
    return id;
  }
  const getPending = (id, userId) => { const p = pending.get(id); return p && p.until > Date.now() && p.owner === userId ? p : null; };

  // 1-qadam: "📢 Shikoyat qilish" → tasodifan bosilmasin, tasdiqlash tugmalarini ko'rsatamiz
  bot.callbackQuery(/^rep:(.+)$/, async ctx => {
    const lang = getLang(ctx.from.id);
    const p = getPending(ctx.match[1], ctx.from.id);
    if (!p) return ctx.answerCallbackQuery({ text: t(lang, "report_expired"), show_alert: true });
    p.markup = ctx.callbackQuery.message?.reply_markup;           // "Bekor qilish" bosilsa — qaytaramiz
    await ctx.answerCallbackQuery({ text: t(lang, "report_ask"), show_alert: true });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard()
      .text(t(lang, "btn_report_yes"), `repy:${ctx.match[1]}`).text(t(lang, "btn_report_no"), `repn:${ctx.match[1]}`) }).catch(() => {});
  });

  // 2-qadam: "Ha" → shikoyatlar bazaga yoziladi (bir odam — bitta raqamga bir marta)
  bot.callbackQuery(/^repy:(.+)$/, async ctx => {
    const lang = getLang(ctx.from.id);
    const p = getPending(ctx.match[1], ctx.from.id);
    if (!p) return ctx.answerCallbackQuery({ text: t(lang, "report_expired"), show_alert: true });
    const results = p.targets.map(x => db.addReport(x.hash, x.kind, ctx.from.id));
    const key = results.includes("ok") ? "report_ok" : results.includes("limit") ? "report_limit" : "report_dup";
    pending.delete(ctx.match[1]);
    await ctx.answerCallbackQuery({ text: t(lang, key), show_alert: true });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text(t(lang, "btn_report_done"), "noop") }).catch(() => {});
  });

  // "Bekor qilish" → asl tugmalar qaytadi
  bot.callbackQuery(/^repn:(.+)$/, async ctx => {
    const p = getPending(ctx.match[1], ctx.from.id);
    await ctx.answerCallbackQuery();
    if (p?.markup) await ctx.editMessageReplyMarkup({ reply_markup: p.markup }).catch(() => {});
  });
  bot.callbackQuery("noop", ctx => ctx.answerCallbackQuery());

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
    // 7-bosqich: raqamlar va saytlar ustidan shikoyatlar soni. Bazadan faqat HASH bo'yicha qidiramiz.
    const targets = [], numbers = [], extra = [];
    if (db.canHash()) {
      for (const n of extractNumbers(text)) {
        const hash = db.hash(n.digits);
        const count = db.reportCount(hash);
        targets.push({ hash, kind: n.kind });
        numbers.push({ masked: n.masked, count });
        // Shikoyatlar ballga ham ta'sir qiladi, lekin o'zi yolg'iz "🔴" bermaydi (eng ko'pi 50)
        if (count) extra.push({ host: "", reasons: [{ code: "num_reports", points: reportPoints(count), vars: { n: count }, hidden: true }] });
      }
      for (const r of urlRes) {
        if (!r.host || r.trusted) continue;                     // rasmiy saytlarga shikoyat qilinmaydi
        const hash = db.hashDomain(r.host);
        const count = db.reportCount(hash);
        targets.push({ hash, kind: "domain" });
        if (count) r.reasons.push({ code: "url_reports", points: reportPoints(count), vars: { n: count } });
      }
    }
    const result = combineAll(urlRes, analyzeText(text), fileRes, extra);
    // Bazaga faqat natija yoziladi — xabar matni ham, to'liq havola ham YOZILMAYDI
    try {
      db.logCheck({ userId: ctx.from.id, chatType: "private", result, hasText: !!text.trim(), hosts: urlRes.map(r => r.host) });
    } catch (e) { console.error("Baza (logCheck):", e.message); }   // baza xatosi javobga xalaqit bermasin
    const reportId = targets.length ? remember(targets, ctx.from.id) : null;
    const { text: answer, reply_markup } = buildReply(lang, result, ctx.me.username, { numbers, reportId });
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
  if (!process.env.HASH_SALT) console.warn("⚠️  HASH_SALT yo'q — raqam tekshiruvi va shikoyatlar o'chiq. .env ga qo'shing (README).");
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
