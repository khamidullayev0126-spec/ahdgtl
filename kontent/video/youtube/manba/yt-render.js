// YouTube (16:9) video: «Claude bilan 3 ta buyruqda sayt».
// Ishlatish: node yt-render.js [fps] [masshtab]     tez ko'rish: node yt-render.js 8 0.4
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const [fps = 30, scale = 1] = process.argv.slice(2).map(Number);
const voice = path.join(__dirname, "ovoz.mp3");
const OUT = path.join(__dirname, "..");

const GOOD = `Uyda tort pishiradigan «Shirin Tortlar» biznesi uchun bitta sahifali sayt yasab ber.
Til: o'zbekcha. Telefonda chiroyli ko'rinsin.

Bo'limlar:
1. Bosh qism: nomi, qisqa shior va «Buyurtma berish» tugmasi
2. Tortlar: 6 ta tort — nomi, qisqa tavsifi, narxi (so'mda)
3. Qanday buyurtma beriladi: 3 qadam
4. Mijozlar fikri: 3 ta qisqa sharh
5. Aloqa: telefon, Telegram tugmasi, ish vaqti

Uslub: iliq, pushti va krem ranglar, yumaloq burchaklar, katta shrift.
Rasmlar o'rniga emoji ishlat. Hammasi bitta HTML faylda bo'lsin.`;

// Har bir gap — subtitr bo'lagi; t — ovozdagi boshlanish vaqti (pauzalardan qo'lda olingan)
const CH = [
  [0, "Bu saytni men bir qator ham kod yozmasdan yasadim."],
  [2.93, "Faqat Claude'ga uchta buyruq berdim."],
  [4.94, "Hozir hammasini boshidan ko'rsataman, oxirida esa saytni bepul internetga chiqarishni ham o'rgataman."],
  [10.29, "Kerak bo'ladigan narsalar oddiy: kompyuter yoki telefon, claude.ai sayti — bepul versiyasi ham yetadi — va eng muhimi, nima xohlayotganingizni aniq bilish."],
  [19.91, "Bugun «Shirin Tortlar» degan tort do'koniga sayt yasaymiz."],
  [23.24, "U o'ylab topilgan, lekin xuddi shunday saytni istalgan kichik biznesga yasash mumkin."],
  [28.10, "Avval ko'pchilik qiladigan xatoni ko'rsataman."],
  [30.51, "Claude'ga shunchaki «menga sayt yasab ber» deb yozaman."],
  [33.71, "Natija mana bunday: inglizcha, bo'sh va zerikarli."],
  [37.23, "Claude aybdor emas — u biz nimani xohlayotganimizni bilmaydi."],
  [40.65, "Endi to'g'ri qilamiz."],
  [41.85, "Birinchi buyruqda uchta narsani aniq aytaman: sayt kim uchun, qaysi bo'limlar kerak va qanday uslubda bo'lsin."],
  [48.33, "Tilini, ranglarini, hatto telefon raqamini ham yozaman."],
  [51.74, "Va mana natija!"],
  [52.86, "Bosh qism, olti xil tort narxlari bilan, buyurtma berish uchun uchta qadam, mijozlar fikri va aloqa bo'limi."],
  [59.61, "Bir qator ham kod yozmadim."],
  [61.27, "Lekin hali mukammal emas: masalan, buyurtma tugmasi juda kichkina."],
  [65.18, "Shuning uchun keyingi buyruqlarda faqat bittadan aniq narsani so'rayman."],
  [69.04, "Ikkinchi buyruq: tugmani kattaroq qil va bosilganda Telegram ochilsin."],
  [73.16, "Uchinchi buyruq: tortlar kartochkasiga sichqoncha borganda biroz kattalashsin, pastga esa o'n foizlik chegirma banneri qo'sh."],
  [80.18, "Har bir o'zgarish bir necha soniyada tayyor."],
  [82.71, "Endi eng muhim tekshiruv — telefon."],
  [84.96, "Ko'pchilik saytni telefondan ochadi, shuning uchun sayt telefonda ham chiroyli bo'lishi shart."],
  [89.66, "Mana, hamma narsa joyida."],
  [91.40, "Sayt tayyor, lekin hozir uni faqat men ko'ryapman."],
  [94.45, "Internetga chiqarishning eng oson yo'li — Claude'dagi Publish tugmasi: bir bosishda havola tayyor bo'ladi."],
  [100.53, "Ikkinchi yo'l: faylni yuklab olib, Netlify Drop saytiga sudrab tashlaysiz."],
  [104.99, "Ikkalasi ham bepul."],
  [106.28, "O'n sakkiz yoshga to'lmagan bo'lsangiz, akkauntni ota-onangiz bilan oching."],
  [110.12, "Rostini aytsam: bu usulda bitta sahifali sayt-vizitka yasash mumkin."],
  [114.22, "Onlayn to'lov, ro'yxatdan o'tish yoki ma'lumotlar bazasi bor sayt uchun ko'proq vaqt va bilim kerak."],
  [120.17, "Eng muhim saboq: Claude kuchli, lekin unga aniq vazifa berishni siz bilishingiz kerak."],
  [125.23, "Bugungi uchala buyruq Telegram kanalimda, havola tavsifda."],
  [128.71, "Keyingi videoda shu saytga o'z domeningizni ulaymiz."],
  [131.67, "Ko'rishguncha!"]
];

const SCENES = [
  { at: 0, type: "hook", ch: "Natija" },
  { at: 3, type: "need", ch: "Nima kerak?" },
  { at: 4, type: "project", ch: "Loyiha" },
  { at: 6, type: "chat", ch: "Yomon buyruq", tag: "❌ Yomon buyruq", prompt: "menga sayt yasab ber", cps: 9, replyAt: 4.6,
    reply: "Mana oddiy sayt: «Welcome to My Website», About, Services, Contact…" },
  { at: 8, type: "browser", ch: "Yomon natija", img: "v0", url: "my-website", scroll: [0, 0], label: "❌ Inglizcha, bo'sh, zerikarli" },
  { at: 10, type: "chat", ch: "1-buyruq", tag: "✅ 1-buyruq", prompt: GOOD, cps: 70, replyAt: 10.4,
    reply: "Tayyor! «Shirin Tortlar» uchun bitta sahifali sayt: bosh qism, 6 ta tort, 3 qadam, sharhlar va aloqa 🎂" },
  { at: 13, type: "browser", ch: "Natija", img: "v1", scroll: [0, .92], scrollFrom: 1.2 },
  { at: 16, type: "browser", ch: "Kamchilik", img: "v1", scroll: [0, 0], ring: [581, 353, 239, 85], ringAt: 2.0, label: "Tugma juda kichkina 🤏" },
  { at: 17, type: "chat", ch: "2-buyruq", tag: "✅ 2-buyruq", prompt: "«Buyurtma berish» tugmasini kattaroq qil va bosilganda Telegram ochilsin", cps: 22, replyAt: 3.6,
    reply: "Tayyor! Tugma kattalashdi ✈️ — bosilganda Telegram ochiladi." },
  { at: 18, type: "browser", ch: "2-buyruq natijasi", img: "v2", scroll: [0, 0], ring: [509, 353, 383, 112], ringAt: .6, label: "✈️ Katta tugma → Telegram" },
  { at: 19, type: "hover", ch: "3-buyruq" },
  { at: 20, type: "browser", ch: "3-buyruq natijasi", img: "v2", scroll: [1, 1], label: "🎁 10% chegirma banneri" },
  { at: 21, type: "phone", ch: "Telefon" },
  { at: 24, type: "publish", ch: "Internetga chiqarish", first: 3.2, second: 9.3, kid: 15.0 },
  { at: 29, type: "honest", ch: "Halol xulosa", second: 4.25, lesson: 10.2 },
  { at: 32, type: "cta", ch: "Keyingi qadam" }
];

(async () => {
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice]).toString();
  const end = dur + 1.5;
  const spec = { chunks: CH.map(c => c[1]), times: CH.map(c => c[0]), scenes: SCENES, speechEnd: 132.3, end };
  const imgDir = path.join(__dirname, "img"), imgs = {};
  for (const f of fs.readdirSync(imgDir)) imgs[path.basename(f, ".png")] = "img/" + f;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-"));
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "yt.html"));
  await p.evaluate(([s, i]) => window.setup(s, i), [spec, imgs]);
  let n = 0;
  for (let t = 0; t < end; t += 1 / fps) {
    await p.evaluate(tt => window.render(tt), t);
    await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90 });
  }
  await br.close();
  if (errs.length) console.log("⚠️ xatolar:", errs.slice(0, 3));
  // SFX: sahna almashganda yengil «whoosh» (sintez)
  const cues = SCENES.map(s => CH[s.at][0]).filter(x => x > .2);
  const sfxIn = [], filt = [];
  cues.forEach((c, i) => {
    sfxIn.push("-f", "lavfi", "-i", "anoisesrc=d=0.3:c=pink:a=0.5,highpass=f=900,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.18,volume=0.10");
    const ms = Math.max(0, Math.round((c - .25) * 1000)); filt.push(`[${i + 1}:a]adelay=${ms}|${ms}[s${i}]`);
  });
  const video = path.join(dir, "v.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "30" : "18", video]);
  const name = path.join(OUT, (scale < 1 ? "korish-" : "") + "claude-3-buyruqda-sayt.mp4");
  const mix = `[0:a]apad=pad_dur=2,volume=1.0[vo];${filt.join(";")};[vo]${cues.map((_, i) => `[s${i}]`).join("")}amix=inputs=${cues.length + 1}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", voice, ...sfxIn, "-i", video, "-filter_complex", mix, "-map", `${cues.length + 1}:v`, "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(end), "-movflags", "+faststart", name]);
  fs.rmSync(dir, { recursive: true });
  console.log(`✅ ${path.basename(name)} (${n} kadr, ${end.toFixed(1)} s)`);
})();
