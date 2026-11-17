// Tekshir — firibgarlikka qarshi Telegram bot. Asosiy fayl.
// 1-bosqich: /start, til tanlash, /til, /yordam. 6-bosqich: baza, /stats, /export. 7-bosqich: shikoyatlar, raqamlar.
// 8-bosqich: guruh rejimi (/tekshir, /sozlama, avtomatik ogohlantirish). 9-bosqich: AI.
// 10-bosqich: /demo, /maslahat, so'rovlar chegarasi (daqiqasiga 10), serverda ishlash (webhook).
// Ishga tushirish: npm start   (avval .env faylida BOT_TOKEN bo'lishi kerak)

// .env faylini doim loyiha papkasidan o'qiymiz (terminal qaysi papkada bo'lishidan qat'i nazar)
const path = require("path");
const fs = require("fs");
const ENV_PATH = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });
const { Bot, InlineKeyboard, InputFile, webhookCallback } = require("grammy");
const { t, LANGS, dict, DEFAULT_LANG } = require("./i18n");
const { extractUrls, checkUrls } = require("./checkers/url");
const { combineAll } = require("./scoring");
const { analyzeText } = require("./checkers/text");
const { checkFile } = require("./checkers/file");
const { buildReply, buildGroupReply, esc } = require("./reply");
const { createLimiter } = require("./ratelimit");
const { openDb, toCsv } = require("./db");
const { isAdmin, formatStats } = require("./admin");
const cache = require("./cache");
const { extractNumbers, reportPoints } = require("./checkers/numbers");
const crypto = require("crypto");
const { aiCheck } = require("./checkers/ai");

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

  // ---------- So'rovlar chegarasi (10-bosqich) ----------
  // Shaxsiy chat: bitta odam daqiqasiga RATE_LIMIT (10) ta xabar. Oshsa — bir marta ogohlantiramiz, keyin jim.
  // Guruh: daqiqasiga GROUP_RATE_LIMIT (30) ta xabar tekshiriladi, qolgani jim o'tkazib yuboriladi.
  // Adminlar (ADMIN_IDS) cheklanmaydi.
  const userLimit = createLimiter({ limit: Number(process.env.RATE_LIMIT || 10) });
  const groupLimit = createLimiter({ limit: Number(process.env.GROUP_RATE_LIMIT || 30) });
  bot.use(async (ctx, next) => {
    if (!ctx.message || !ctx.from) return next();
    if (ctx.chat.type === "private") {
      if (isAdmin(ctx.from.id)) return next();
      const r = userLimit.hit(ctx.from.id);
      if (r.ok) return next();
      if (r.warn) await ctx.reply(t(getLang(ctx.from.id), "rate_limited"));
      return;
    }
    if (isGroup(ctx)) return groupLimit.hit(ctx.chat.id).ok ? next() : undefined;
    return next();
  });

  // /start — til tanlanmagan bo'lsa, avval tilni so'raymiz
  bot.command("start", async ctx => {
    if (isGroup(ctx)) return ctx.reply(t(groupOf(ctx).lang, "group_welcome"), { parse_mode: "HTML" });
    const lang = getLang(ctx.from.id);
    if (!lang) return ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() });
    await ctx.reply(t(lang, "welcome"), { parse_mode: "HTML" });
  });

  // /til — tilni qayta tanlash
  bot.command("til", ctx => ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() }));

  // /yordam — qanday ishlatish
  bot.command(["yordam", "help"], ctx => isGroup(ctx)
    ? ctx.reply(t(groupOf(ctx).lang, "group_welcome"), { parse_mode: "HTML" })
    : ctx.reply(t(getLang(ctx.from.id), "help"), { parse_mode: "HTML" }));

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
    if (ctx.chat.type !== "private" || !isAdmin(ctx.from.id)) return;   // statistika guruhda ko'rinmasin
    await ctx.reply(formatStats(db.stats()), { parse_mode: "HTML" });
  });

  // /export — oxirgi 30 kunlik tekshiruvlar CSV faylda (Excel'da ochiladi). Foydalanuvchi ID'si va matn YO'Q
  // /export 7 — oxirgi 7 kun
  bot.command("export", async ctx => {
    if (ctx.chat.type !== "private" || !isAdmin(ctx.from.id)) return;
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
  // owner = null — guruh xabari: guruhdagi har kim shikoyat qila oladi (har biri faqat bir marta)
  const getPending = (id, userId) => { const p = pending.get(id); return p && p.until > Date.now() && (p.owner === null || p.owner === userId) ? p : null; };

  // 1-qadam: "📢 Shikoyat qilish" → tasodifan bosilmasin, tasdiqlash tugmalarini ko'rsatamiz
  // Tugma tili: shaxsiy tanlangan til, bo'lmasa — guruh tili
  const cbLang = ctx => getLang(ctx.from.id) || (isGroup(ctx) ? groupOf(ctx).lang : undefined);
  bot.callbackQuery(/^rep:(.+)$/, async ctx => {
    const lang = cbLang(ctx);
    const p = getPending(ctx.match[1], ctx.from.id);
    if (!p) return ctx.answerCallbackQuery({ text: t(lang, "report_expired"), show_alert: true });
    p.markup = p.markup || ctx.callbackQuery.message?.reply_markup;   // "Bekor qilish" bosilsa — asl tugmalarni qaytaramiz
    await ctx.answerCallbackQuery({ text: t(lang, "report_ask"), show_alert: true });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard()
      .text(t(lang, "btn_report_yes"), `repy:${ctx.match[1]}`).text(t(lang, "btn_report_no"), `repn:${ctx.match[1]}`) }).catch(() => {});
  });

  // 2-qadam: "Ha" → shikoyatlar bazaga yoziladi (bir odam — bitta raqamga bir marta)
  bot.callbackQuery(/^repy:(.+)$/, async ctx => {
    const lang = cbLang(ctx);
    const p = getPending(ctx.match[1], ctx.from.id);
    if (!p) return ctx.answerCallbackQuery({ text: t(lang, "report_expired"), show_alert: true });
    const results = p.targets.map(x => db.addReport(x.hash, x.kind, ctx.from.id));
    const key = results.includes("ok") ? "report_ok" : results.includes("limit") ? "report_limit" : "report_dup";
    await ctx.answerCallbackQuery({ text: t(lang, key), show_alert: true });
    if (p.owner === null) {                                       // guruh: boshqalar ham shikoyat qila olsin — asl tugmalar qaytadi
      if (p.markup) await ctx.editMessageReplyMarkup({ reply_markup: p.markup }).catch(() => {});
      return;
    }
    pending.delete(ctx.match[1]);
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text(t(lang, "btn_report_done"), "noop") }).catch(() => {});
  });

  // "Bekor qilish" → asl tugmalar qaytadi
  bot.callbackQuery(/^repn:(.+)$/, async ctx => {
    const p = getPending(ctx.match[1], ctx.from.id);
    await ctx.answerCallbackQuery();
    if (p?.markup) await ctx.editMessageReplyMarkup({ reply_markup: p.markup }).catch(() => {});
  });
  bot.callbackQuery("noop", ctx => ctx.answerCallbackQuery());

  // ---------- Tahlil: shaxsiy chat va guruh uchun umumiy ----------
  // Xabardagi havola, matn, fayl va raqamlarni tekshiradi. Matn bazaga YOZILMAYDI.
  // opts.ai — AI tahlilini ham ishlatish (shaxsiy chat va /tekshir). Guruhdagi har bir xabar uchun — yo'q (narx).
  async function analyze(m, userId, chatType, opts = {}) {
    const text = m.text || m.caption || "";
    const doc = m.document;                                    // fayl (APK, PDF, ZIP va h.k.)
    const urls = extractUrls(text, m.entities || m.caption_entities);
    const textRes = analyzeText(text);
    // Qoidalar o'zi aniq 🔴 topgan bo'lsa, AI'ga pul sarflamaymiz
    const textScore = textRes.reasons.reduce((a, x) => a + x.points, 0);
    const useAi = opts.ai && textScore < 70;
    // Havolalar, fayl va AI bir vaqtda tekshiriladi, keyin natijalar birlashtiriladi
    const [urlRes, fileRes, aiRes] = await Promise.all([
      urls.length ? checkUrls(urls) : [],
      doc ? checkFile({ name: doc.file_name || "", mime: doc.mime_type || "", size: doc.file_size || 0 }, opts.download || (() => download(doc.file_id))) : null,
      useAi ? aiCheck(text, opts.lang, userId).catch(() => null) : null
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
    if (aiRes) extra.push(aiRes);
    const result = combineAll(urlRes, textRes, fileRes, extra);
    // Bazaga faqat natija yoziladi — xabar matni ham, to'liq havola ham YOZILMAYDI
    if (opts.log !== false) try {
      db.logCheck({ userId, chatType, result, hasText: !!text.trim(), hosts: urlRes.map(r => r.host) });
    } catch (e) { console.error("Baza (logCheck):", e.message); }   // baza xatosi javobga xalaqit bermasin
    return { result, numbers, targets };
  }

  // ---------- 8-bosqich: GURUH REJIMI ----------
  const isGroup = ctx => ["group", "supergroup"].includes(ctx.chat?.type);
  // Guruh bazada bo'lmasa (bot 8-bosqichdan oldin qo'shilgan bo'lsa) — hozir qo'shamiz
  const groupOf = ctx => db.getGroup(ctx.chat.id) || db.addGroup(ctx.chat.id, ctx.chat.title);

  // Guruh admini ekanini tekshirish (sozlamalarni faqat adminlar o'zgartiradi)
  async function isGroupAdmin(ctx) {
    if (ctx.message?.sender_chat?.id === ctx.chat.id) return true;    // yashirin (anonim) admin
    try {
      const mbr = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
      return ["creator", "administrator"].includes(mbr.status);
    } catch { return false; }
  }

  // Bot guruhga qo'shilganda — salomlashadi va qanday ishlashini tushuntiradi. Chiqarilsa — o'chiriladi
  bot.on("my_chat_member", async ctx => {
    if (!isGroup(ctx)) return;
    const was = ctx.myChatMember.old_chat_member.status, now = ctx.myChatMember.new_chat_member.status;
    const inside = st => ["member", "administrator", "creator"].includes(st);
    if (inside(now) && !inside(was)) {
      const g = db.addGroup(ctx.chat.id, ctx.chat.title);
      await ctx.reply(t(g.lang, "group_welcome"), { parse_mode: "HTML" });
    } else if (!inside(now) && inside(was)) db.removeGroup(ctx.chat.id);
  });

  // Sozlamalar oynasi
  function settingsView(g) {
    const L = g.lang;
    const text = t(L, "group_settings", {
      state: t(L, g.enabled ? "gs_on" : "gs_off"),
      mode: t(L, g.mode === "danger" ? "gs_mode_danger" : "gs_mode_suspicious"),
      del: t(L, g.delete_danger ? "gs_yes" : "gs_no"),
      lang: t(L, "lang_name")
    });
    const kb = new InlineKeyboard()
      .text(t(L, g.enabled ? "btn_gs_pause" : "btn_gs_resume"), `gs:enabled:${g.enabled ? 0 : 1}`).row()
      .text(t(L, "btn_gs_mode"), `gs:mode:${g.mode === "danger" ? "suspicious" : "danger"}`).row()
      .text(t(L, "btn_gs_del"), `gs:delete_danger:${g.delete_danger ? 0 : 1}`).row();
    for (const l of LANGS) kb.text(t(l, "lang_name"), `gs:lang:${l}`);
    return { text, reply_markup: kb };
  }

  // /sozlama — guruh sozlamalari (faqat guruh adminlari)
  bot.command("sozlama", async ctx => {
    if (!isGroup(ctx)) return ctx.reply(t(getLang(ctx.from.id), "group_only"));
    const g = groupOf(ctx);
    if (!(await isGroupAdmin(ctx))) return ctx.reply(t(g.lang, "group_admin_only"));
    const v = settingsView(g);
    await ctx.reply(v.text, { parse_mode: "HTML", reply_markup: v.reply_markup });
  });

  bot.callbackQuery(/^gs:(enabled|mode|delete_danger|lang):(.+)$/, async ctx => {
    if (!isGroup(ctx)) return ctx.answerCallbackQuery();
    const g0 = groupOf(ctx);
    if (!(await isGroupAdmin(ctx))) return ctx.answerCallbackQuery({ text: t(g0.lang, "group_admin_only"), show_alert: true });
    const [, field, raw] = ctx.match;
    const ok = { enabled: ["0", "1"], delete_danger: ["0", "1"], mode: ["danger", "suspicious"], lang: LANGS }[field];
    if (!ok.includes(raw)) return ctx.answerCallbackQuery();
    const g = db.setGroup(ctx.chat.id, field, ["enabled", "delete_danger"].includes(field) ? Number(raw) : raw);
    await ctx.answerCallbackQuery({ text: t(g.lang, "group_saved") });
    const v = settingsView(g);
    await ctx.editMessageText(v.text, { parse_mode: "HTML", reply_markup: v.reply_markup }).catch(() => {});
  });

  // /tekshir — guruhda shubhali xabarga JAVOB (reply) qilib yoziladi. Natija har doim chiqadi (✅ ham)
  bot.command("tekshir", async ctx => {
    const target = ctx.message.reply_to_message;
    const lang = isGroup(ctx) ? groupOf(ctx).lang : getLang(ctx.from.id);
    if (!target || (!(target.text || target.caption || "").trim() && !target.document))
      return ctx.reply(t(lang, "group_tekshir_hint"), { parse_mode: "HTML" });
    const { result, numbers, targets } = await analyze(target, ctx.from.id, isGroup(ctx) ? "group" : "private", { ai: true, lang });
    const reportId = targets.length ? remember(targets, isGroup(ctx) ? null : ctx.from.id) : null;
    const { text: answer, reply_markup } = buildReply(lang, result, ctx.me.username, { numbers, reportId });
    await ctx.reply(answer, { parse_mode: "HTML", reply_markup, reply_parameters: { message_id: target.message_id, allow_sending_without_reply: true }, link_preview_options: { is_disabled: true } });
  });

  // Guruhdagi oddiy xabarlar: jim tekshiradi, faqat xavf bo'lsa ogohlantiradi (✅ uchun guruhni to'ldirmaydi)
  async function onGroupMessage(ctx) {
    const m = ctx.message;
    if (m.from?.is_bot) return;                                         // boshqa botlarga e'tibor bermaymiz
    const text = m.text || m.caption || "";
    if (!text.trim() && !m.document) return;
    const g = groupOf(ctx);
    if (!g.enabled) return;
    const { result, numbers, targets } = await analyze(m, m.from?.id, "group");
    const warn = result.level === "danger" || (result.level === "suspicious" && g.mode !== "danger");
    db.groupCounted(ctx.chat.id, warn);
    if (!warn) return;

    // 🔴 va sozlamada yoqilgan bo'lsa — xabarni o'chiramiz (bot admin bo'lib, huquqi bo'lsa)
    let deleted = false;
    if (result.level === "danger" && g.delete_danger) {
      try { await ctx.deleteMessage(); deleted = true; } catch (e) { console.error("O'chirib bo'lmadi:", e.message); }
    }
    const reportId = targets.length ? remember(targets, null) : null;   // guruhda har kim shikoyat qila oladi
    const { text: answer, reply_markup } = buildGroupReply(g.lang, result, ctx.me.username, { numbers, reportId, deleted, name: m.from?.first_name });
    await ctx.reply(answer, { parse_mode: "HTML", reply_markup, link_preview_options: { is_disabled: true },
      ...(deleted ? {} : { reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true } }) });
  }

  // ---------- /demo — o'quv namunalari (10-bosqich) ----------
  // Bot haqiqiy havolani ochmaydi va faylni yubormaydi: namuna faqat MATN sifatida ko'rsatiladi,
  // keyin xuddi oddiy tekshiruvdek tahlil qilinadi. Statistikaga yozilmaydi, AI ishlatilmaydi.
  const langOf = ctx => isGroup(ctx) ? groupOf(ctx).lang : (getLang(ctx.from.id) || DEFAULT_LANG);
  const DEMO_APK = path.join(__dirname, "..", "demo", "Rasmlar.apk");
  const demoMenu = lang => new InlineKeyboard()
    .text(t(lang, "demo_btn_sms"), "demo:sms").row()
    .text(t(lang, "demo_btn_link"), "demo:link").row()
    .text(t(lang, "demo_btn_file"), "demo:file");
  bot.command("demo", ctx => { const lang = langOf(ctx); return ctx.reply(t(lang, "demo_intro"), { parse_mode: "HTML", reply_markup: demoMenu(lang) }); });
  bot.callbackQuery("demo:menu", async ctx => {
    const lang = cbLang(ctx) || DEFAULT_LANG;
    await ctx.answerCallbackQuery();
    await ctx.reply(t(lang, "demo_intro"), { parse_mode: "HTML", reply_markup: demoMenu(lang) });
  });
  bot.callbackQuery(/^demo:(sms|link|file)$/, async ctx => {
    const lang = cbLang(ctx) || DEFAULT_LANG;
    await ctx.answerCallbackQuery();
    const kind = ctx.match[1];
    let m, dl;
    if (kind === "file") {
      const buf = fs.readFileSync(DEMO_APK);             // zararsiz matnli fayl — faqat hash uchun o'qiladi
      m = { caption: t(lang, "demo_file"), document: { file_name: "Rasmlar.apk", mime_type: "application/vnd.android.package-archive", file_size: buf.length, file_id: "demo" } };
      dl = async () => buf;
      await ctx.reply(`${t(lang, "demo_sample")}

📎 <b>Rasmlar.apk</b>
<code>${esc(m.caption)}</code>`, { parse_mode: "HTML" });
    } else {
      m = { text: t(lang, kind === "sms" ? "demo_sms" : "demo_link") };
      // <code> ichida — havola bosiladigan bo'lmaydi
      await ctx.reply(`${t(lang, "demo_sample")}

<code>${esc(m.text)}</code>`, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
    const { result, numbers } = await analyze(m, ctx.from.id, "demo", { log: false, download: dl });
    const { text: answer } = buildReply(lang, result, ctx.me.username, { numbers });
    await ctx.reply(answer, { parse_mode: "HTML", reply_markup: new InlineKeyboard().text(t(lang, "btn_demo_more"), "demo:menu"), link_preview_options: { is_disabled: true } });
  });

  // ---------- /maslahat — xavfsizlik maslahatlari ----------
  const tipsOf = lang => (dict[lang] || dict[DEFAULT_LANG]).tips;
  function tipView(lang, i) {
    const tips = tipsOf(lang), n = tips.length;
    i = ((i % n) + n) % n;
    return { text: `💡 ${i + 1}/${n}\n\n${tips[i]}`, reply_markup: new InlineKeyboard().text(t(lang, "btn_tip_next"), `tip:${(i + 1) % n}`) };
  }
  bot.command("maslahat", ctx => {
    const lang = langOf(ctx);
    const v = tipView(lang, Math.floor(Math.random() * tipsOf(lang).length));
    return ctx.reply(v.text, { reply_markup: v.reply_markup });
  });
  bot.callbackQuery(/^tip:(\d+)$/, async ctx => {
    const v = tipView(cbLang(ctx) || DEFAULT_LANG, Number(ctx.match[1]));
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(v.text, { reply_markup: v.reply_markup }).catch(() => {});
  });

  // ---------- Boshqa har qanday xabar ----------
  bot.on("message", async ctx => {
    if (isGroup(ctx)) return onGroupMessage(ctx);
    if (ctx.chat.type !== "private") return;          // kanallar va h.k. — e'tibor bermaymiz
    let lang = getLang(ctx.from.id);
    // AUTO_LANG=1 (bepul serverda): baza o'chib ketgan bo'lsa ham tilni qayta so'ramaymiz —
    // Telegram ilovasining tilidan taxmin qilamiz (rus/ukrain/qozoq → rus, qolgani → o'zbek). /til bilan o'zgartirsa bo'ladi.
    if (!lang && process.env.AUTO_LANG === "1") {
      lang = ["ru", "uk", "be", "kk"].includes(ctx.from.language_code) ? "ru" : "uz-latn";
      db.setLang(ctx.from.id, lang);
    }
    if (!lang) return ctx.reply(t("uz-latn", "choose_lang"), { reply_markup: langKeyboard() });

    // Matn oddiy xabarda "text"da, rasm/fayl ostidagi yozuvda esa "caption"da bo'ladi
    const m = ctx.message;
    const text = m.text || m.caption || "";
    if (!text.trim() && !m.document) return ctx.reply(t(lang, "no_text"));   // stiker, ovozli xabar va h.k.

    await ctx.replyWithChatAction("typing").catch(() => {});   // "yozmoqda..." belgisi
    const { result, numbers, targets } = await analyze(m, ctx.from.id, "private", { ai: true, lang });
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
  if (!process.env.AI_API_KEY && !process.env.ANTHROPIC_API_KEY) console.warn("ℹ️  AI_API_KEY yo'q — AI tahlili o'chiq, bot qoidalar bilan ishlaydi.");
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
    { command: "demo", description: "Namunalar: firibgarlar qanday yozadi" },
    { command: "maslahat", description: "Xavfsizlik maslahati" },
    { command: "til", description: "Tilni o'zgartirish / Сменить язык" }
  ]).catch(e => console.error("Buyruqlar menyusi:", e.message));
  // Guruhlardagi "/" menyusi
  bot.api.setMyCommands([
    { command: "tekshir", description: "Xabarga javob qilib yozing — tekshiraman" },
    { command: "sozlama", description: "Guruh sozlamalari (adminlar)" }
  ], { scope: { type: "all_group_chats" } }).catch(e => console.error("Guruh menyusi:", e.message));
  // Long polling: bot o'zi Telegram'dan yangi xabarlarni so'rab turadi (kompyuterda ishlatish uchun qulay)
  // Serverda (Render) — WEBHOOK: Telegram xabarlarni o'zi bizning manzilga yuboradi.
  // Kompyuterda — LONG POLLING: bot o'zi Telegram'dan so'rab turadi.
  const base = process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL;
  if (base) startWebhook(bot, db, base.replace(/\/$/, ""));
  else bot.start({ onStart: info => console.log(`✅ @${info.username} ishga tushdi. To'xtatish: Ctrl + C`) });
}

// ---------- Webhook rejimi (serverda) ----------
// Telegram faqat maxfiy kalit (secret_token) bilan kelgan so'rovlarni qabul qilamiz — begona odam soxta xabar yubora olmaydi.
function startWebhook(bot, db, base, port = Number(process.env.PORT || 3000)) {
  const http = require("http");
  const crypto = require("crypto");
  const secret = process.env.WEBHOOK_SECRET || crypto.createHash("sha256").update("tekshir:" + process.env.BOT_TOKEN).digest("hex").slice(0, 48);
  const hookPath = "/telegram/" + secret.slice(0, 16);
  // Tekshiruv 25 soniyadan oshsa ham Telegram'ga "qabul qildim" deymiz — aks holda u xabarni qayta yuboradi
  const handle = webhookCallback(bot, "http", { secretToken: secret, onTimeout: "return", timeoutMilliseconds: 25000 });
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Tekshir bot ishlayapti ✅");
    }
    if (req.method === "POST" && req.url === hookPath) return handle(req, res).catch(e => { console.error("Webhook:", e.message); if (!res.headersSent) { res.writeHead(500); res.end(); } });
    res.writeHead(404); res.end();
  });
  server.listen(port, async () => {
    try {
      await bot.init();
      await bot.api.setWebhook(base + hookPath, { secret_token: secret, allowed_updates: ["message", "callback_query", "my_chat_member"] });
      console.log(`✅ @${bot.botInfo.username} webhook rejimida ishga tushdi (port ${server.address().port})`);
    } catch (e) { console.error("❌ Webhook o'rnatilmadi:", e.message); }
  });
  if (require.main === module)
    for (const sig of ["SIGINT", "SIGTERM"]) process.removeAllListeners(sig).once(sig, () => { server.close(); db.close(); process.exit(0); });
  return server;
}

module.exports = { createBot, startWebhook };
