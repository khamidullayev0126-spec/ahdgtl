// AHdigital — Abdulhamidning shaxsiy AI agenti (faqat egasi uchun)
// Botga xuddi Claude'ga yozgandek yozasiz: agent buyurtmalarni ko'radi, holatini o'zgartiradi,
// internetdan qidiradi, eslatma qo'yadi, eslab qoladi, mijozga yoki kanalga yozishni TAYYORLAYDI.
// Tashqariga ketadigan har bir xabar (mijozga / kanalga) faqat siz ✅ tugmasini bosgandan keyin yuboriladi.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const aiUsage = require("./ai-usage");
let imager = null;                                   // rasm yaratish (satori + resvg o'rnatilgan bo'lsa)
try { imager = require("./image"); } catch (e) { console.log("ℹ️  Rasm yaratish o'chiq:", e.message); }

const MODEL = "claude-opus-5-5";
const MAX_STEPS = 10;            // bitta xabarga agent nechta qadam qila oladi
const MAX_HISTORY = 60;          // shundan oshsa — suhbat yangidan boshlanadi (eslatmalar va xotira saqlanadi)
const STATUSES = ["yangi", "tasdiqlandi", "jarayonda", "bajarildi", "bekor"];
const TZ = "Asia/Tashkent";
const MAX_TIMEOUT = 2 ** 31 - 1;  // setTimeout ~24,8 kundan uzoqni kuta olmaydi
const REPEATS = ["kunlik", "haftalik", "oylik", "yillik"];
const IDEA_PLACES = ["blog", "youtube", "shorts", "instagram", "telegram", "sayt", "biznes", "boshqa"];

// Takrorlanadigan eslatmaning keyingi vaqti (Toshkentda yozgi vaqt yo'q, UTC hisobi yetarli)
function nextTime(iso, takror) {
  const d = new Date(iso);
  if (takror === "kunlik") d.setUTCDate(d.getUTCDate() + 1);
  else if (takror === "haftalik") d.setUTCDate(d.getUTCDate() + 7);
  else if (takror === "oylik") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (takror === "yillik") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else return null;
  return d.toISOString();
}
const todayTashkent = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);

function createAgent({ api, send, ownerChatId, services, readOrders, writeOrders, store, channel, client, caller, sendPhoto, business, notifyStatus, tz, kp }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const claude = client || new Anthropic();   // client — faqat sinov uchun

  // ---------- Doimiy saqlanadigan ma'lumotlar (data/ papkasida) ----------
  // Doimiy ombor (store.js): Render qayta ishga tushsa ham xotira va eslatmalar saqlanadi
  const KEY = { "agent-xotira.json": "agent-xotira", "agent-eslatmalar.json": "agent-eslatmalar",
    "agent-moliya.json": "agent-moliya", "agent-goyalar.json": "agent-goyalar", "agent-xatolar.json": "agent-xatolar" };
  const save = (name, val) => store.set(KEY[name], val);
  let notes = [];        // [{id, matn, sana}]   — start() da yuklanadi
  let reminders = [];    // [{id, vaqt, matn, qongiroq, takror, vazifa}]
  let money = [];        // [{id, turi: kirim|chiqim, summa, izoh, sana}]
  let ideas = [];        // [{id, matn, joy, sana}]
  let bugs = [];         // [{id, xato, yechim, texnologiya, sana}]
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
    // 24,8 kundan uzoq bo'lsa — vaqti kelmasdan ishlab ketmasin: oraliqda qayta rejalashtiramiz
    const t = ms > MAX_TIMEOUT ? setTimeout(() => arm(r), MAX_TIMEOUT) : setTimeout(() => fire(r), ms);
    t.unref?.();   // server o'zi ishlab turadi; taymer jarayonni ushlab turmasin (sinovlar uchun)
    timers.set(r.id, t);
  }

  async function fire(r) {
    timers.delete(r.id);
    try {
      if (r.vazifa) {
        // Rejali vazifa: agent o'zi bajaradi (masalan, ertalabki dayjest) — har safar token sarflanadi
        queue = queue.then(async () => reply(`🗓 ${await think(`[Rejali vazifa] ${r.matn}\nBu avtomatik vazifa: uni bajar va natijani Abdulhamidga qisqa yoz.`)}`))
          .catch(e => console.error("Rejali vazifa xatosi:", e.message));
      } else {
        await send(ownerChatId, `⏰ Eslatma: ${r.matn}`);
        if (r.qongiroq && caller) { const c = await caller.call(`Eslatma: ${r.matn}`); if (!c.ok) await send(ownerChatId, `📵 ${c.text}`); }
      }
    } catch (e) { console.error("Eslatma xatosi:", e.message); }
    let next = r.takror ? nextTime(r.vaqt, r.takror) : null;
    while (next && new Date(next) <= Date.now()) next = nextTime(next, r.takror);   // server o'chiq turgan bo'lsa
    if (next) { r.vaqt = next; save("agent-eslatmalar.json", reminders); arm(r); }
    else { reminders = reminders.filter(x => x.id !== r.id); save("agent-eslatmalar.json", reminders); }
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
    { name: "eslatma_qoyish", description: "Belgilangan vaqtda egasiga Telegramda eslatma yuboradi. Vaqtni Toshkent vaqti bo'yicha ISO formatda bering, masalan 2026-11-06T09:00:00+05:00. takror bilan har kuni/hafta/oy/yil qaytariladi (obuna to'lovlari, domen). vazifa=true bo'lsa, vaqt kelganda matn oddiy eslatma emas, agentning o'zi bajaradigan topshiriq bo'ladi (masalan, 'AI va IT yangiliklaridan 5 ta punktli dayjest tuz' yoki 'JavaScript bo'yicha bitta mantiqiy masala ber') — bunda har safar token sarflanadi, buni egasiga ayt.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        vaqt: { type: "string" }, matn: { type: "string" },
        qongiroq: { type: "boolean", description: "true bo'lsa, eslatma vaqtida egasiga telefon qo'ng'irog'i ham qilinadi" },
        takror: { type: "string", enum: REPEATS, description: "Takrorlanish; berilmasa bir martalik" },
        vazifa: { type: "boolean", description: "true — vaqt kelganda agent matndagi topshiriqni o'zi bajaradi" } }, required: ["vaqt", "matn"] } },
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
    { name: "moliya_yozish", description: "Daromad (kirim) yoki xarajatni (chiqim) so'mda yozib qo'yadi. Masalan: 'domen uchun 32 000 to'ladim' — chiqim; 'buyurtmadan 30 000 keldi' — kirim. Summa dollarda aytilsa, kursni o'zing taxmin qilma — so'mdagi summani egasidan so'ra.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        turi: { type: "string", enum: ["kirim", "chiqim"] },
        summa: { type: "integer", description: "So'mda, musbat butun son" },
        izoh: { type: "string", description: "Nima uchun (masalan: domen, Claude Pro, vizitka sayt buyurtmasi)" },
        sana: { type: "string", description: "YYYY-MM-DD; aytilmasa bugun" } }, required: ["turi", "summa", "izoh"] } },
    { name: "moliya_hisobot", description: "Oy bo'yicha (yoki hamma vaqt) kirim, chiqim, sof foyda va eng katta xarajatlar. Yozuvlar id bilan qaytadi.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        oy: { type: "string", description: "YYYY-MM; berilmasa joriy oy" },
        hammasi: { type: "boolean", description: "true — barcha vaqt bo'yicha" } }, required: [] } },
    { name: "moliya_ochirish", description: "Noto'g'ri kiritilgan moliya yozuvini id bo'yicha o'chiradi.",
      input_schema: { type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"] } },
    { name: "goya_saqlash", description: "Kontent yoki biznes g'oyasini bazaga saqlaydi va qayerga mosligini belgilaydi. Egasi 'g'oya:' deb yozsa yoki shunchaki g'oya aytsa — shuni ishlat.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        matn: { type: "string", description: "G'oyaning qisqa, aniq matni" },
        joy: { type: "string", enum: IDEA_PLACES, description: "Qaysi format yoki platformaga mos" } }, required: ["matn", "joy"] } },
    { name: "goyalar", description: "Saqlangan g'oyalar ro'yxati (joy bo'yicha filtrlash mumkin).",
      input_schema: { type: "object", additionalProperties: false, properties: { joy: { type: "string", enum: IDEA_PLACES } }, required: [] } },
    { name: "goya_ochirish", description: "Bajarilgan yoki keraksiz g'oyani id bo'yicha o'chiradi.",
      input_schema: { type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"] } },
    ...(tz ? [
    { name: "tz_tuzish", description: "Mijoz uchun TZ (texnik topshiriq) sahifasini yaratadi va havolasini qaytaradi. Mijoz havolani ochib, PDF qilib saqlaydi va «Tasdiqlayman» bosadi. Faqat Abdulhamid aytgan yoki mijoz suhbatida aniq bo'lgan narsalarni yoz — o'zingdan funksiya, va'da yoki narx qo'shma. Asosiy narxni server o'zi qo'yadi. Muhim narsa noaniq bo'lsa (biznes nomi, qaysi bo'limlar, qo'shimcha ish narxi), avval Abdulhamiddan so'ra.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        xizmat: { type: "string", enum: services.filter(s => !s.hidden && s.group === "once" && s.price > 0).map(s => s.id) },
        mijoz: { type: "string", description: "Mijozning ismi" },
        biznes: { type: "string", description: "Biznes nomi va turi, masalan «Lazzat kafe (Chilonzor)»" },
        til: { type: "string", enum: ["uz", "ru"], description: "Mijoz qaysi tilda gaplashsa — TZ matni ham shu tilda bo'lsin" },
        maqsad: { type: "string", description: "1–2 gap: sayt yoki video nima uchun kerak" },
        bolimlar: { type: "array", items: { type: "string" }, description: "Sahifalar/bo'limlar yoki video sahnalari" },
        funksiyalar: { type: "array", items: { type: "string" }, description: "Nima ishlaydi: tugmalar, forma, xarita, QR va h.k." },
        materiallar: { type: "array", items: { type: "string" }, description: "Mijoz beradigan narsalar: logo, rasmlar, menyu, narxlar, manzil" },
        kirmaydi: { type: "array", items: { type: "string" }, description: "Narxga kirmaydigan narsalar (masalan: domen to'lovi, matn yozish, fotosurat)" },
        muddat_kun: { type: "integer", description: "Ish kunlari. Berilmasa xizmatning odatiy muddati" },
        qoshimcha: { type: "array", items: { type: "object", additionalProperties: false, properties: { nomi: { type: "string" }, narx: { type: "integer" } }, required: ["nomi", "narx"] }, description: "Asosiy narxdan tashqari ishlar — faqat Abdulhamid narxini aytgan bo'lsa" },
        chegirma: { type: "integer", description: "So'mda, faqat Abdulhamid aytsa" },
        izoh: { type: "string", description: "Qo'shimcha kelishuvlar" },
        buyurtma: { type: "string", description: "Bog'liq buyurtma kodi, bo'lsa" } },
        required: ["xizmat", "mijoz", "biznes", "til"] } },
    { name: "tz_royxati", description: "Tuzilgan TZ'lar ro'yxati: raqam, biznes, narx, tasdiqlanganmi, havola.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } }] : []),
    ...(kp ? [
    { name: "kp_tuzish", description: "Sayti yoki videosi yo'q biznes uchun shaxsiy tijoriy taklif sahifasini yaratadi. Xizmatlar, narx va muddatni server saytdagi narxlardan o'zi qo'yadi. Sen faqat shaxsiy kirish so'zi va foydalarni yozasan: faqat Abdulhamid aytgan faktlarga tayan, raqamli va'da berma («sotuv 2 barobar oshadi» — yo'q), raqobatchini yomonlama, haqiqiy bo'lmagan maqtov yozma. Kirish qisqa va hurmatli bo'lsin.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        biznes: { type: "string", description: "Biznes nomi, masalan «Gul olami»" },
        kimga: { type: "string", description: "Egasining ismi, ma'lum bo'lsa" },
        tur: { type: "string", enum: ["kafe", "salon", "dokon", "usta", "talim", "boshqa"] },
        til: { type: "string", enum: ["uz", "ru"] },
        xizmatlar: { type: "array", items: { type: "string", enum: services.filter(s => !s.hidden && s.group === "once" && s.price > 0).map(s => s.id) }, description: "1–3 ta xizmat" },
        kirish: { type: "string", description: "2–3 gap: nega aynan ularga yozyapsiz (masalan: Instagram'da faol, lekin sayt havolasi yo'q)" },
        foydalar: { type: "array", items: { type: "string" }, description: "2–5 ta aniq foyda shu biznes uchun, raqamli va'dasiz" },
        chegirma: { type: "integer", description: "So'mda, faqat Abdulhamid aytsa" },
        chegirma_izoh: { type: "string", description: "Masalan: «birinchi buyurtma uchun»" } },
        required: ["biznes", "tur", "til", "xizmatlar", "foydalar"] } },
    { name: "kp_royxati", description: "Yuborilgan takliflar: kim ochdi, necha marta, «Qiziqaman» bosdimi.",
      input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] } }] : []),
    { name: "xato_yozish", description: "Dasturlashda uchragan xato va uning yechimini 'xatolar kundaligi'ga yozadi.",
      input_schema: { type: "object", additionalProperties: false, properties: {
        xato: { type: "string", description: "Xato matni yoki belgisi" },
        yechim: { type: "string", description: "Qanday tuzatildi" },
        texnologiya: { type: "string", description: "Masalan: JavaScript, CSS, Node.js, Render" } }, required: ["xato", "yechim"] } },
    { name: "xato_qidirish", description: "Xatolar kundaligidan o'xshash xatoni qidiradi. Egasi xato haqida so'rasa, avval shu yerdan qidir.",
      input_schema: { type: "object", additionalProperties: false, properties: { soz: { type: "string", description: "Qidiruv so'zlari yoki xato matni" } }, required: ["soz"] } },
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
Abdulhamid haqida: CoddyCamp o'quv markazining Junior guruhi o'quvchisi, junior dasturchi, Software Engineer bo'lishni maqsad qilgan. Scratch, Pictoblox, AI, Figma, HTML, CSS, Bootstrap'ni o'rgangan, hozir JavaScript o'rganyapti. AHdigital brendi bilan Claude yordamida video, slayd, post va saytlar yaratadi. YouTube kanali: AHdigital. Instagram: @ah.digital_01, Telegram kanal: t.me/ahdigital_01.

Ishlash tartibi:
- Doim o'zbek tilida, samimiy va aniq yoz. Telegram uchun oddiy matn ishlat: markdown belgilari (**, ##, jadval) ishlatma; ro'yxat uchun "•" yoki raqam qo'y.
- Har qanday savolga yordam ber: dasturlash, JavaScript, kontent g'oyalari, caption va post matnlari, reja tuzish, o'qish. Kod so'ralsa, to'liq va ishlaydigan kod ber.
- Yangi yoki aniq faktlar kerak bo'lsa (narxlar, yangiliklar, hujjatlar) web_search bilan qidir va manbani qisqa ayt.
- Buyurtmalar, statistika, eslatma va xotira uchun asboblardan foydalan. Taxmin qilma — kerak bo'lsa asbobni chaqir.
- Mijozga yoki kanalga yozish faqat tayyorlanadi; Abdulhamid ✅ bosmaguncha hech narsa ketmaydi. Buni "yubordim" deb aytma — "tasdiqlash uchun tayyorladim" de.
- Narx, chegirma yoki muddat haqida mijozga va'da berma — faqat quyidagi narxlardan foydalan.
- Sen rasm yarata olasan: rasm_yaratish asbobi AHdigital uslubidagi post rasmini yasaydi (sarlavha + ro'yxat yoki kod). "Rasm qil", "post rasmi", "kanal uchun rasm" deyilsa — uni ishlat; kanal uchun bo'lsa kanal_matni ham yoz. Rasmni o'zing ko'ra olmaysan, shuning uchun matnni qisqa va aniq yoz.
${caller ? "- Sen Abdulhamidga ovozli qo'ng'iroq qila olasan: menga_qongiroq (hozir) yoki eslatma_qoyish qongiroq=true. Natijasini aynan ayt." : "- Qo'ng'iroq sozlanmagan va hozircha kerak emas: qo'ng'iroq taklif qilma, eslatmalarni Telegram xabari bilan yubor."}
- Sen Abdulhamidning shaxsiy Telegram chatlarini ko'ra olasan (Telegram Business): chatlar, chatni_oqish, chatga_yozish, chat_sozlamasi. "Kim yozdi?", "X ning chatini o'qi", "X ga yoz: ..." deyilsa — shu asboblarni ishlat. Chatga yozish ham faqat tayyorlanadi, ✅ bosilgandagina ketadi. Chatlardagi shaxsiy gaplarni boshqa odamlarga aytma.
- Abdulhamid muhim narsa aytsa (reja, mijoz haqida ma'lumot, odat), uni xotiraga yozib qo'y.
- Pul haqida aytsa ("shuncha to'ladim", "shuncha keldi") — moliya_yozish; "shu oy qancha foyda?" — moliya_hisobot.
- Mijoz bilan kelishuvni aytsa yoki "TZ tuz" desa — tz_tuzish. Yetishmayotgan muhim narsalarni (bo'limlar, mijoz beradigan materiallar, qo'shimcha ish narxi) avval qisqa savollar bilan so'ra. Tasdiqlangan TZ o'zgarmaydi — o'zgarish bo'lsa yangisini tuz.
- Sayti yo'q biznesga taklif kerak bo'lsa — kp_tuzish. Mijoz rozi bo'lgach — tz_tuzish.
- G'oya aytsa — goya_saqlash; "g'oyalarim qani?" — goyalar. Xato va yechimini aytsa — xato_yozish; xato haqida so'rasa — avval xato_qidirish.
- Obuna, domen yoki hosting to'lovi uchun takror bilan eslatma qo'y (to'lovdan 3 kun oldin). Ertalabki dayjest yoki kunlik mashq so'rasa — vazifa=true va takror="kunlik" bilan eslatma qo'y.
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
        const takror = REPEATS.includes(input.takror) ? input.takror : null;
        const r = { id: id(), vaqt: t.toISOString(), matn: input.matn, qongiroq: !!input.qongiroq, takror, vazifa: !!input.vazifa };
        reminders.push(r); save("agent-eslatmalar.json", reminders); arm(r);
        return `Eslatma qo'yildi (id ${r.id}): ${t.toLocaleString("uz-UZ", { timeZone: TZ })} — ${r.matn}${takror ? ` · ${takror} takrorlanadi` : ""}${r.vazifa ? " · agent o'zi bajaradi (har safar token sarflanadi)" : ""}${r.qongiroq ? (caller ? " · telefon qo'ng'irog'i bilan" : " · (qo'ng'iroq sozlanmagan, faqat Telegram xabari)") : ""}`;
      }
      case "menga_qongiroq": {
        if (!caller) return "Xato: telefon qo'ng'irog'i sozlanmagan. Render'da CALLMEBOT_USER (Telegram username, masalan @Abdulkhamid_2905) kerak.";
        const c = await caller.call(input.matn);
        return c.ok ? c.text : `Xato: ${c.text}`;
      }
      case "eslatmalar":
        return reminders.length ? reminders.map(r => `${r.id}: ${new Date(r.vaqt).toLocaleString("uz-UZ", { timeZone: TZ })} — ${r.matn}${r.takror ? ` (${r.takror})` : ""}${r.vazifa ? " [vazifa]" : ""}`).join("\n") : "Eslatmalar yo'q.";
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
      case "moliya_yozish": {
        const summa = Math.round(Number(input.summa));
        if (!(summa > 0)) return "Xato: summa musbat son bo'lishi kerak (so'mda).";
        const sana = /^\d{4}-\d{2}-\d{2}$/.test(input.sana || "") ? input.sana : todayTashkent();
        const m = { id: id(), turi: input.turi === "kirim" ? "kirim" : "chiqim", summa, izoh: String(input.izoh || "").slice(0, 200), sana };
        money.push(m); save("agent-moliya.json", money);
        return `Yozildi (id ${m.id}): ${m.turi === "kirim" ? "➕ kirim" : "➖ chiqim"} ${fmt(summa)} so'm — ${m.izoh} (${sana}).`;
      }
      case "moliya_hisobot": {
        const oy = input.hammasi ? null : (/^\d{4}-\d{2}$/.test(input.oy || "") ? input.oy : todayTashkent().slice(0, 7));
        const list = money.filter(m => !oy || m.sana.startsWith(oy));
        if (!list.length) return oy ? `${oy} oyida yozuv yo'q.` : "Hali moliya yozuvi yo'q.";
        const kirim = list.filter(m => m.turi === "kirim").reduce((a, m) => a + m.summa, 0);
        const chiqim = list.filter(m => m.turi === "chiqim").reduce((a, m) => a + m.summa, 0);
        const top = list.filter(m => m.turi === "chiqim").sort((a, b) => b.summa - a.summa).slice(0, 5);
        return `${oy || "Hamma vaqt"}: kirim ${fmt(kirim)} so'm, chiqim ${fmt(chiqim)} so'm, sof ${fmt(kirim - chiqim)} so'm.\n` +
          (top.length ? `Eng katta xarajatlar:\n${top.map(m => `• ${fmt(m.summa)} — ${m.izoh}`).join("\n")}\n` : "") +
          `Yozuvlar:\n${list.slice(-30).map(m => `${m.id} ${m.sana} ${m.turi === "kirim" ? "+" : "-"}${fmt(m.summa)} ${m.izoh}`).join("\n")}`;
      }
      case "moliya_ochirish": {
        const before = money.length;
        money = money.filter(m => m.id !== input.id); save("agent-moliya.json", money);
        return before === money.length ? "Bunday yozuv topilmadi." : "Moliya yozuvi o'chirildi.";
      }
      case "goya_saqlash": {
        const g = { id: id(), matn: String(input.matn || "").slice(0, 500), joy: IDEA_PLACES.includes(input.joy) ? input.joy : "boshqa", sana: todayTashkent() };
        ideas.push(g); save("agent-goyalar.json", ideas);
        return `G'oya saqlandi (id ${g.id}, ${g.joy}). Jami g'oyalar: ${ideas.length}.`;
      }
      case "goyalar": {
        const list = ideas.filter(g => !input.joy || g.joy === input.joy);
        if (!list.length) return "G'oyalar bazasi bo'sh.";
        const by = {};
        list.forEach(g => (by[g.joy] = by[g.joy] || []).push(g));
        return Object.entries(by).map(([joy, gs]) => `${joy.toUpperCase()}:\n${gs.slice(-15).map(g => `• ${g.id} (${g.sana}) ${g.matn}`).join("\n")}`).join("\n\n");
      }
      case "goya_ochirish": {
        const before = ideas.length;
        ideas = ideas.filter(g => g.id !== input.id); save("agent-goyalar.json", ideas);
        return before === ideas.length ? "Bunday g'oya topilmadi." : "G'oya o'chirildi.";
      }
      case "xato_yozish": {
        const x = { id: id(), xato: String(input.xato || "").slice(0, 500), yechim: String(input.yechim || "").slice(0, 1000), texnologiya: String(input.texnologiya || "").slice(0, 60), sana: todayTashkent() };
        bugs.push(x); save("agent-xatolar.json", bugs);
        return `Xatolar kundaligiga yozildi (id ${x.id}). Jami: ${bugs.length}.`;
      }
      case "xato_qidirish": {
        const words = String(input.soz || "").toLowerCase().split(/[^\p{L}\p{N}_.]+/u).filter(w => w.length > 2);
        if (!words.length) return "Xato: qidiruv uchun kamida bitta so'z kerak.";
        const found = bugs.map(x => {
          const hay = `${x.xato} ${x.yechim} ${x.texnologiya}`.toLowerCase();
          return { x, score: words.filter(w => hay.includes(w)).length };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
        return found.length ? found.map(({ x }) => `• ${x.sana}${x.texnologiya ? " [" + x.texnologiya + "]" : ""}\n  Xato: ${x.xato}\n  Yechim: ${x.yechim}`).join("\n") : "Kundalikda o'xshash xato topilmadi.";
      }
      case "tz_tuzish": {
        const r = tz.create(input);
        if (r.error) return `Xato: ${r.error}`;
        const t = r.tz;
        return `TZ tayyor: ${t.raqam} · ${t.biznes} · ${t.xizmatNomi} · ${fmt(t.jami)} so'm · ${t.muddatKun} ish kuni.\nHavola: ${r.url}\nAbdulhamidga havolani ber va avval o'zi ochib tekshirishini, keyin mijozga yuborishini ayt. Tasdiqlansa, Telegramga xabar keladi.`;
      }
      case "tz_royxati": {
        const list = tz.list();
        return list.length ? list.map(t => `${t.raqam} · ${t.biznes} · ${fmt(t.jami)} so'm · ${t.tasdiq ? "✅ tasdiqlangan (" + t.tasdiq.ism + ")" : "⏳ kutilmoqda"}\n${(process.env.SITE_URL || "https://www.ah-digital.uz").replace(/\/$/, "")}/tz/${t.id}`).join("\n") : "Hali TZ tuzilmagan.";
      }
      case "kp_tuzish": {
        const r = kp.create(input);
        if (r.error) return `Xato: ${r.error}`;
        const k = r.kp;
        return `Taklif tayyor: ${k.raqam} · ${k.biznes} · ${fmt(k.jami)} so'm.\nO'zing tekshirish uchun (sanalmaydi): ${r.preview}\nMijozga yuboriladigan havola: ${r.url}\nAbdulhamidga ikkala havolani ber. Mijozga havola bilan birga qisqa, hurmatli xabar matnini ham taklif qil. Taklif ochilsa va «Qiziqaman» bosilsa, Telegramga xabar keladi.`;
      }
      case "kp_royxati": {
        const list = kp.list();
        return list.length ? list.map(k => `${k.raqam} · ${k.biznes} · ${fmt(k.jami)} so'm · ${k.ochildi ? `👀 ${k.ochildi} marta ochildi` : "hali ochilmagan"}${k.qiziqdi ? " · 🔥 qiziqdi" : ""}`).join("\n") : "Hali taklif tuzilmagan.";
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
        aiUsage.record("agent", res);
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
          "• Internetdan qidir: Bootstrap 5 dagi yangiliklar\n• Kimlar yozdi? / Dilnozaga yoz: ...\n" +
          "• Domen uchun 32 000 to'ladim / Shu oy qancha foyda qildim?\n• G'oya: kafelar uchun 10 soniyali menyu video\n" +
          "• Gul olami do'koniga taklif tuz: Instagram faol, sayti yo'q\n• Lazzat kafe uchun menyu sayt TZ tuz: 3 bo'lim, QR, Telegram tugma\n• Xato: CORS error, yechim: ...\n• Har kuni 8:00 da AI yangiliklaridan dayjest yubor\n\n/yangi — suhbatni yangidan boshlash\n\n" +
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
    money = store.get("agent-moliya", []);
    ideas = store.get("agent-goyalar", []);
    bugs = store.get("agent-xatolar", []);
    reminders.forEach(arm);   // server qayta ishga tushsa — eslatmalar tiklanadi
  }

  return { onOwnerMessage, onCallback, start };
}

module.exports = { createAgent, nextTime };
