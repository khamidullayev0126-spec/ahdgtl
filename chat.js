// AHdigital — saytdagi AI suhbat oynasi uchun server qismi (POST /api/chat)
// Tashrif buyuruvchi savol beradi, Claude AHdigital xizmatlari bo'yicha qisqa javob qaytaradi.
// Himoya: bitta IP — soatiga 30 ta xabar, bitta xabar — 500 belgigacha, suhbat — 12 ta savolgacha.

const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");

function createSiteChat({ services }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const claude = new Anthropic();
  const fmt = n => n.toLocaleString("ru-RU");
  const priceList = services.map(s => `- ${s.name}: ${fmt(s.price)} so'm / ${s.period}. ${s.desc || ""}`).join("\n");

  const SYSTEM = `Sen Claude — Anthropic yaratgan AI yordamchisan. AHdigital saytidagi suhbat oynasida tashrif buyuruvchilar bilan gaplashyapsan. AHdigital — Abdulhamid Xamidullayevning AI kontent va web sayt xizmatlari.
Qoidalar:
- Faqat o'zbek tilida, qisqa (1–4 gap), samimiy javob ber. Markdown ishlatma.
- O'zingni odam deb ko'rsatma. So'rashsa, AI ekaningni ayt.
- Narx va xizmatlarni faqat quyidagi ro'yxatdan ayt. Ro'yxatda yo'q narx, chegirma, muddat yoki va'da o'ylab topma — "Abdulhamid aniq aytadi" de.
- Odam buyurtma bermoqchi bo'lsa, sahifadagi "Buyurtma qoldiring" formasini yoki Telegram @Abdulkhamid_2905 ni taklif qil.
- AHdigital'ga aloqasi yo'q mavzularda bir gap bilan javob berib, xizmatlarga qaytar.
Xizmatlar:
${priceList}`;

  const sessions = new Map();   // id -> { history, at }
  const hits = new Map();       // ip -> [vaqtlar]
  setInterval(() => {           // 1 soatdan eski suhbatlarni tozalaymiz
    const old = Date.now() - 3600_000;
    for (const [k, v] of sessions) if (v.at < old) sessions.delete(k);
    for (const [k, v] of hits) if (!v.some(t => t > old)) hits.delete(k);
  }, 600_000).unref();

  return async function handler(req, res) {
    const now = Date.now();
    const list = (hits.get(req.ip) || []).filter(t => now - t < 3600_000);
    if (list.length >= 30) return res.status(429).json({ error: "Ko'p savol berildi. Bir soatdan keyin qayta yozing yoki Telegram'da @Abdulkhamid_2905 ga yozing." });

    const text = String(req.body.message || "").trim();
    if (!text) return res.status(400).json({ error: "Savolingizni yozing." });
    if (text.length > 500) return res.status(400).json({ error: "Savol 500 belgidan oshmasin." });

    let id = String(req.body.session || "");
    let s = sessions.get(id);
    if (!s) { id = crypto.randomBytes(8).toString("hex"); s = { history: [] }; sessions.set(id, s); }
    if (s.history.length >= 24) return res.json({ session: id, reply: "Suhbatimiz uzun bo'lib ketdi 🙂 Batafsil gaplashish uchun Telegram'da @Abdulkhamid_2905 ga yozing." });

    list.push(now); hits.set(req.ip, list);
    s.at = now;
    s.history.push({ role: "user", content: text });
    try {
      const r = await claude.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 2000,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        messages: s.history
      });
      if (r.stop_reason === "refusal") { s.history.pop(); return res.json({ session: id, reply: "Bu savolga javob bera olmayman. Abdulhamid sizga yordam beradi: Telegram @Abdulkhamid_2905." }); }
      s.history.push({ role: "assistant", content: r.content });
      const reply = r.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "Abdulhamid sizga tez orada javob beradi.";
      res.json({ session: id, reply });
    } catch (err) {
      s.history.pop();
      console.error("Sayt chat:", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err.message);
      res.status(503).json({ error: "Hozir javob bera olmayapman. Telegram'da @Abdulkhamid_2905 ga yozing." });
    }
  };
}

module.exports = { createSiteChat };
