// Downloads yoki Desktop papkasini turlar bo'yicha tartiblaydi (AI'siz, bepul).
// Xavfsiz: hech narsa O'CHIRILMAYDI va ustiga yozilmaydi. Avval faqat reja ko'rsatadi.
// Ishlatish:
//   node kontent/agent/papka-tartib.js ~/Downloads          ← faqat ko'rsatadi (hech narsa ko'chmaydi)
//   node kontent/agent/papka-tartib.js ~/Downloads --bajar  ← haqiqatan ko'chiradi

const fs = require("fs");
const path = require("path");

const GROUPS = {
  "Rasmlar":    /\.(jpe?g|png|gif|webp|heic|svg|avif)$/i,
  "Videolar":   /\.(mp4|mov|mkv|webm|avi)$/i,
  "Ovozlar":    /\.(mp3|wav|m4a|aac|ogg)$/i,
  "Hujjatlar":  /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|key|pages|numbers)$/i,
  "Arxivlar":   /\.(zip|rar|7z|tar|gz)$/i,
  "Dasturlar":  /\.(dmg|pkg|exe|msi|apk)$/i,
  "Kod":        /\.(html?|css|js|json|py|ts|jsx|tsx)$/i,
  "Dizayn":     /\.(fig|psd|ai|sketch|xd)$/i,
};

const dir = process.argv[2];
const doIt = process.argv.includes("--bajar");
if (!dir || !fs.existsSync(dir)) { console.error('Papka ko\'rsating: node kontent/agent/papka-tartib.js ~/Downloads'); process.exit(1); }

const plan = [];
for (const f of fs.readdirSync(dir)) {
  const src = path.join(dir, f);
  if (f.startsWith(".") || !fs.statSync(src).isFile()) continue;     // yashirin fayl va papkalarga tegmaymiz
  const group = Object.keys(GROUPS).find(g => GROUPS[g].test(f)) || "Boshqa";
  let dst = path.join(dir, group, f);
  for (let n = 2; fs.existsSync(dst); n++) dst = path.join(dir, group, f.replace(/(\.\w+)?$/, ` (${n})$1`));   // nom band bo'lsa — (2), (3)
  plan.push({ f, group, src, dst });
}

if (!plan.length) { console.log("Tartiblanadigan fayl yo'q."); process.exit(0); }
const count = {};
plan.forEach(p => (count[p.group] = (count[p.group] || 0) + 1));
console.log(Object.entries(count).map(([g, n]) => `📁 ${g}: ${n} ta`).join("\n"));

if (!doIt) {
  console.log(`\nBu faqat reja — hech narsa ko'chmadi. Ko'chirish uchun oxiriga --bajar qo'shing.`);
  process.exit(0);
}
for (const p of plan) { fs.mkdirSync(path.dirname(p.dst), { recursive: true }); fs.renameSync(p.src, p.dst); }
console.log(`\n✅ ${plan.length} ta fayl tartiblandi.`);
