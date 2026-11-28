// Reels 18 — «AI'ga uy vazifangni yozdirma». Ishlatish: node render.js [fps] [masshtab] [boshlanish] [tugash]
//   tez ko'rish:  node render.js 10 0.5      kadrlar: node render.js kadr 0.5 2 6 ...
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, "../../../..");
const beats = JSON.parse(fs.readFileSync(path.join(__dirname, "plan/beats.json"), "utf8"));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf" };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = u.startsWith("/f/") ? path.join(ROOT, u.slice(3)) : path.join(__dirname, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
(async () => {
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port;
  const args = process.argv.slice(2);
  const stills = args[0] === "kadr" ? args.slice(1).map(Number) : null;
  const [fps = 30, scale = 1, t0 = 0, t1 = beats.t.end] = stills ? [] : args.map(Number);
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: stills ? 0.5 : scale });
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${port}/sahna.html`);
  await p.waitForFunction(() => window.render && window.ready);
  await p.evaluate(b => window.setBeats(b), beats);
  await p.evaluate(() => window.ready);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reels18-"));
  if (stills) {
    for (const t of stills) { await p.evaluate(tt => window.render(tt), t); await p.screenshot({ path: path.join(dir, `k-${String(Math.round(t * 100)).padStart(5, "0")}.jpg`), type: "jpeg", quality: 85 }); }
    const out = path.join(__dirname, "plan/kadrlar.jpg");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-pattern_type", "glob", "-i", path.join(dir, "k-*.jpg"), "-vf", `tile=${Math.min(stills.length, 5)}x${Math.ceil(stills.length / 5)}`, out]);
    console.log("✅", out);
  } else {
    let n = 0;
    for (let t = t0; t < t1; t += 1 / fps) {
      await p.evaluate(tt => window.render(tt), t);
      await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90 });
    }
    const voice = path.join(__dirname, "ref/ovoz-tez.wav"), sfx = path.join(__dirname, "ref/sfx.wav");
    const out = path.join(__dirname, (scale < 1 ? "korish-" : "") + "18-ai-bilan-oqish.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.jpg"),
      "-ss", String(t0), "-i", voice, "-ss", String(t0), "-i", sfx,
      "-filter_complex", "[1:a]volume=1.0[v];[2:a]volume=0.55[s];[v][s]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,apad[a]",
      "-map", "0:v", "-map", "[a]", "-t", String(t1 - t0), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", scale < 1 ? "28" : "18",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]);
    console.log("✅", path.basename(out), n, "kadr");
  }
  if (errs.length) console.log("⚠️", errs.slice(0, 5));
  fs.rmSync(dir, { recursive: true }); await br.close(); srv.close();
})();
