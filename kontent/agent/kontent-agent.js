// Kontent zavodi agenti: bitta mavzudan blog, Telegram post, Shorts ssenariysi va YouTube qadoqlash yasaydi.
// Ishlatish (kompyuterda, loyiha papkasida):
//   ANTHROPIC_API_KEY=... node kontent/agent/kontent-agent.js "Kafe uchun QR menyu"
// Natija: kontent/agent/out/ papkasida .md fayl. Bu papka internetda ko'rinmaydi.
// API kalit kodga yoki chatga yozilmaydi: u faqat muhit o'zgaruvchisida turadi.

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-5-5";
const OUT_DIR = path.join(__dirname, "out");

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('Mavzu yozing: node kontent/agent/kontent-agent.js "mavzu"');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY topilmadi. Kalitni faqat kompyuterning muhit o'zgaruvchisiga yozing.");
  process.exit(1);
}

const SYSTEM = `Sen AHdigital (O'zbekiston, kichik biznes uchun sayt va video xizmati) kontent yordamchisisan.
Uslub: oddiy o'zbek tili, samimiy, aniq, qisqa gaplar.
Faqat berilgan faktlardan foydalan. Narx yoki va'da o'ylab topma.
Narxlar: vizitka/menyu sayt 65 000 so'm (2–3 ish kuni), Reels video 30 000 so'm, slayd va post 130 000 so'm, katta sayt 1 500 000 so'm (7–14 ish kuni).
Aloqa: Telegram @Abdulkhamid_2905, sayt www.ah-digital.uz, Telegram kanal t.me/ahdigital_01.`;

const TASK = `Mavzu: "${topic}"

Quyidagi 4 bo'limni aynan shu sarlavhalar bilan yoz:

## 1. Blog maqola
600–800 so'zli maqola. Sarlavha, qisqa kirish, 3–4 bo'lim (##), xulosa. Oxirida AHdigital xizmatiga bir gapli chaqiriq.

## 2. Telegram post
120–180 so'z. Boshida savol, o'rtada 3 ta qisqa fikr, oxirida havola va @Abdulkhamid_2905. Oxirida 3 ta heshteg.

## 3. Shorts ssenariysi (30–45 soniya)
- Hook (birinchi 2 soniyada aytiladigan jumla): 3 ta variant
- Ssenariy: qisqa gaplar, har qatorning oldida [soniya] ko'rsat
- Oxirgi chaqiriq

## 4. YouTube qadoqlash
- 5 ta sarlavha (60 belgigacha, har biri boshqacha uslubda)
- Tavsif: 3–4 gap va bo'limlar
- Muqova (thumbnail) uchun 2–4 so'zli matn, 3 ta variant`;

(async () => {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [{ role: "user", content: TASK }],
  });

  if (res.stop_reason === "refusal") {
    console.error("Model bu so'rovni rad etdi. Mavzuni boshqacha yozib ko'ring.");
    process.exit(1);
  }

  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${stamp}.md`);
  fs.writeFileSync(file, `# ${topic}\n\n${text}\n`, "utf8");
  console.log(`Tayyor: ${file}`);
  console.log(`Tokenlar: kirish ${res.usage.input_tokens}, chiqish ${res.usage.output_tokens}`);
})().catch((err) => {
  console.error("Xato:", err.message);
  process.exit(1);
});
