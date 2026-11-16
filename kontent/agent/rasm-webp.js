// Rasmlarni WebP'ga aylantiradi (AI'siz, bepul). Asl fayllar O'CHIRILMAYDI.
// Bir marta o'rnating:  npm i sharp
// Ishlatish:            node kontent/agent/rasm-webp.js ~/Desktop/rasmlar [--sifat 80] [--eni 1600]
// Natija: shu papka ichida "webp/" papkasi.

const fs = require("fs");
const path = require("path");

let sharp;
try { sharp = require("sharp"); }
catch { console.error("sharp topilmadi. Avval loyiha papkasida yozing:  npm i sharp"); process.exit(1); }

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith("--"));
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? Number(args[i + 1]) : def; };
const quality = opt("sifat", 80), maxWidth = opt("eni", 1600);

if (!dir || !fs.existsSync(dir)) { console.error('Papka ko\'rsating: node kontent/agent/rasm-webp.js "papka"'); process.exit(1); }
const out = path.join(dir, "webp");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  if (!files.length) return console.log("Bu papkada JPG yoki PNG rasm yo'q.");
  let before = 0, after = 0;
  for (const f of files) {
    const src = path.join(dir, f);
    const dst = path.join(out, f.replace(/\.\w+$/, ".webp"));
    if (fs.existsSync(dst)) { console.log(`⏭  ${f} — webp allaqachon bor`); continue; }
    await sharp(src).resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality }).toFile(dst);
    const a = fs.statSync(src).size, b = fs.statSync(dst).size;
    before += a; after += b;
    console.log(`✅ ${f}: ${(a / 1024).toFixed(0)} KB → ${(b / 1024).toFixed(0)} KB`);
  }
  if (before) console.log(`\nJami: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB (${Math.round(100 - after / before * 100)}% kichikroq). Papka: ${out}`);
})().catch(e => { console.error("Xato:", e.message); process.exit(1); });
