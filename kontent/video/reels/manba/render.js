// Reels render: ovozdagi pauzalardan subtitr vaqtlarini topadi, kadrlarni chizadi, ovoz + yengil SFX bilan birlashtiradi.
// Ishlatish: node render.js <raqam> [fps] [masshtab]     masalan: node render.js 1   yoki tez ko'rish: node render.js 1 10 0.3
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, "../../../..");
const VIDEOS = require("./videolar");
const [num, fps = 30, scale = 1] = process.argv.slice(2).map(Number);
const spec = VIDEOS[num];
const voice = path.join(__dirname, "../ovoz", num + ".mp3");
const OUT = path.join(__dirname, "..");

// 1) ovozdagi jimliklar → har bo'lakning boshlanish vaqti
function align() {
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice]).toString();
  const err = require("child_process").spawnSync("ffmpeg", ["-i", voice, "-af", "silencedetect=n=-35dB:d=0.2", "-f", "null", "-"]).stderr.toString();
  const S = [...err.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]), E = [...err.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const sil = S.map((s, i) => ({ s, e: E[i] ?? dur }));
  let s0 = 0.05, s1 = dur;
  if (sil.length && sil[0].s < 0.05) { s0 = sil[0].e; sil.shift(); }
  if (sil.length && sil[sil.length - 1].e >= dur - 0.05) { s1 = sil[sil.length - 1].s; sil.pop(); }
  const w = spec.chunks.map(c => (c.s || c.c).length), tot = w.reduce((a, b) => a + b, 0);
  const times = [s0]; let cum = 0, used = -1;
  for (let i = 1; i < w.length; i++) {
    cum += w[i - 1]; const est = s0 + (s1 - s0) * cum / tot;
    let best = -1, bd = 1.4;
    sil.forEach((x, j) => { const d = Math.abs((x.s + x.e) / 2 - est); if (j > used && d < bd && x.e > times[times.length - 1] + .4) { bd = d; best = j; } });
    if (best >= 0) { times.push(sil[best].e - .04); used = best; } else times.push(Math.max(est, times[times.length - 1] + .4));
  }
  // chunk.t — qo'lda berilgan vaqt (avtomatik hizalash adashsa)
  return { times: times.map((x, i) => +(spec.chunks[i].t ?? x).toFixed(3)), speechEnd: s1, dur };
}

(async () => {
  const a = align();
  const end = a.dur + 1.2;                       // oxirida 1.2 s final kadr
  const full = { ...spec, times: a.times, speechEnd: a.speechEnd, end };
  console.log(`🎬 ${num}: ovoz ${a.dur.toFixed(1)} s, bo'laklar:`, a.times.map(x => x.toFixed(2)).join(" "));
  const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString("base64");
  const asset = { logo: "data:image/svg+xml;base64," + b64("images/logo.svg"), menu: "data:image/webp;base64," + b64("images/blog/menyu-namuna.webp"), site: "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "sayt-telefon.png")).toString("base64") };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reels-"));
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "sahna.html"), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(([s, as]) => window.setup(s, as), [full, asset]);
  let n = 0;
  for (let t = 0; t < end; t += 1 / fps) {
    await p.evaluate(tt => window.render(tt), t);
    await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await br.close();
  if (errs.length) console.log("⚠️ sahifa xatolari:", errs.slice(0, 3));
  // 2) SFX: sahna almashganda yengil "whoosh", sarlavha chiqqanda "pop" (sintez, litsenziya muammosi yo'q)
  const cues = [...new Set([...spec.vis.map(v => a.times[v.at]), ...spec.heads.map(h => a.times[h.at])])].filter(x => x > .2);
  const sfxIn = [], filt = [];
  cues.forEach((c, i) => {
    sfxIn.push("-f", "lavfi", "-i", `anoisesrc=d=0.28:c=pink:a=0.5,highpass=f=900,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.16,volume=0.12`);
    filt.push(`[${i + 1}:a]adelay=${Math.max(0, Math.round((c - .2) * 1000))}|${Math.max(0, Math.round((c - .2) * 1000))}[s${i}]`);
  });
  const name = path.join(OUT, (scale < 1 ? "korish-" : "") + spec.out + ".mp4");
  const video = path.join(dir, "v.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "28" : "18", video]);
  const mix = `[0:a]apad=pad_dur=1.5,volume=1.0[vo];${filt.join(";")};[vo]${cues.map((_, i) => `[s${i}]`).join("")}amix=inputs=${cues.length + 1}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", voice, ...sfxIn, "-i", video, "-filter_complex", mix, "-map", `${cues.length + 1}:v`, "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(end), "-movflags", "+faststart", name]);
  fs.rmSync(dir, { recursive: true });
  fs.writeFileSync(path.join(__dirname, `vaqtlar-${num}.json`), JSON.stringify(a.times));
  console.log(`✅ ${path.basename(name)} (${n} kadr)`);
})();
