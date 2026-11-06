// AHdigital — post rasmlarini yaratish (Telegram/Instagram uchun)
// Claude rasmning MAZMUNINI yozadi (sarlavha, ro'yxat, kod), bu fayl uni AHdigital uslubidagi PNG rasmga aylantiradi.
// satori: HTML'ga o'xshash tuzilmani SVG'ga aylantiradi; resvg: SVG'ni PNG'ga.

const fs = require("fs");
const path = require("path");
const satori = require("satori").default || require("satori");
const { Resvg } = require("@resvg/resvg-js");

const F = name => fs.readFileSync(path.join(__dirname, "fonts", name));
const FONTS = [
  { name: "Caprasimo", data: F("Caprasimo.ttf"), weight: 400, style: "normal" },
  { name: "Figtree", data: F("Figtree-600.ttf"), weight: 600, style: "normal" },
  { name: "Figtree", data: F("Figtree-800.ttf"), weight: 800, style: "normal" },
  { name: "Mono", data: F("JetBrainsMono-Regular.ttf"), weight: 400, style: "normal" }
];

// Logo (bo'lmasa — rasm logosiz chiqadi)
let LOGO = "";
for (const p of ["images/logo.svg", "public/images/logo.svg"]) {
  try { LOGO = "data:image/svg+xml;base64," + fs.readFileSync(path.join(__dirname, p)).toString("base64"); break; } catch {}
}

const THEMES = {
  sayt:  { bg: "#f5ead8", fg: "#201e1d", card: "#ebddc5", accent: "#c67139", blob: "#ffc6a5", pill: "Siz bilmagan web saytlar" },
  css:   { bg: "#3d472b", fg: "#f5ead8", card: "#2c3420", accent: "#ffc6a5", blob: "#56633f", pill: "60 soniyada HTML/CSS" },
  ai:    { bg: "#17161a", fg: "#f5ead8", card: "#26242b", accent: "#f6a06b", blob: "#2e2838", pill: "AI va kod" },
  men:   { bg: "#c67139", fg: "#f5ead8", card: "#a85c2b", accent: "#201e1d", blob: "#d67f48", pill: "Men va loyihalarim" }
};
const SIZES = { kvadrat: [1080, 1080], post: [1080, 1350], story: [1080, 1920] };

const h = (type, style, ...children) => ({ type, props: { style: { display: "flex", ...style }, children: children.flat().filter(c => c !== null && c !== undefined && c !== false) } });
const stripEmoji = s => String(s || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "");   // bo'shliqlarga tegmaydi (kod uchun)
const noEmoji = s => String(s || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();

// "Dizaynerlar uchun *3 ta bepul* sayt" — yulduzcha ichidagi so'zlar rangli
function title(text, t, size) {
  // so'zlar ro'yxati; har bir so'z bir nechta rangli bo'lakdan iborat bo'lishi mumkin ("*prompt*:" → "prompt" + ":")
  const words = []; let prevSpace = true;
  noEmoji(text).split(/(\*[^*]+\*)/).forEach(part => {
    if (!part) return;
    const accent = part.startsWith("*") && part.endsWith("*");
    const raw = part.replace(/\*/g, "");
    const glued = words.length > 0 && !prevSpace && !/^\s/.test(raw);   // oldingi so'zga yopishgan (masalan "*prompt*:")
    prevSpace = /\s$/.test(raw);
    raw.split(/\s+/).forEach((w, i) => {
      if (!w) return;
      if (i === 0 && glued) words[words.length - 1].push({ w, accent });
      else words.push([{ w, accent }]);
    });
  });
  return h("div", { flexWrap: "wrap", fontFamily: "Caprasimo", fontSize: size, lineHeight: 1.05, columnGap: size * 0.26 },
    words.map(segs => h("div", {}, segs.map(({ w, accent }) => ({ type: "span", props: { style: { color: accent ? t.accent : t.fg }, children: w } })))));
}

function codeBlock(code, size) {
  const lines = stripEmoji(code).replace(/\r/g, "").split("\n").slice(0, 14);
  const fs_ = lines.length > 9 ? size * 0.8 : size;
  const span = (color, text) => ({ type: "span", props: { style: { color, whiteSpace: "pre" }, children: text } });   // oddiy matn bo'lagi (flex emas)
  const tok = line => {
    const out = []; const re = /("[^"]*"?|'[^']*'?)|(<\/?[a-zA-Z0-9-]+)|([a-zA-Z-]+)(?=\s*:)|(\/\/.*$)/g; let last = 0, m;
    while ((m = re.exec(line))) {
      if (m.index > last) out.push(span("#e8e6f0", line.slice(last, m.index)));
      out.push(span(m[1] ? "#9ee6b8" : m[2] ? "#ff8fb1" : m[3] ? "#a99bff" : "#8a879a", m[0]));
      last = re.lastIndex;
    }
    if (last < line.length) out.push(span("#e8e6f0", line.slice(last)));
    return out.length ? out : [span("#e8e6f0", " ")];
  };
  return h("div", { flexDirection: "column", background: "#1e1d24", borderRadius: 36, padding: "40px 44px", gap: fs_ * 0.45 },
    h("div", { gap: 12, marginBottom: 18 }, ["#ff5f57", "#febc2e", "#28c840"].map(c => h("div", { width: 20, height: 20, borderRadius: 10, background: c }))),
    lines.map(l => ({ type: "div", props: { style: { display: "flex", fontFamily: "Mono", fontSize: fs_ }, children: tok(l) } })));
}

function list(items, t, numbered, mark, size) {
  return h("div", { flexDirection: "column", gap: items.length > 4 ? 14 : 20 },
    items.slice(0, 6).map((it, i) => h("div", { background: t.card, borderRadius: 30, padding: items.length > 4 ? "16px 28px" : "24px 32px", alignItems: "center", gap: 26 },
      h("div", { width: size * 1.5, height: size * 1.5, borderRadius: size, background: t.accent, color: t.bg, alignItems: "center", justifyContent: "center",
        fontFamily: numbered ? "Caprasimo" : "Figtree", fontWeight: 800, fontSize: size * 0.8, flexShrink: 0 }, numbered ? String(i + 1) : mark),
      h("div", { flexDirection: "column", flex: 1 },
        h("div", { fontFamily: "Figtree", fontWeight: 800, fontSize: size, lineHeight: 1.2, color: t.fg }, noEmoji(it.nom || it)),
        it.izoh ? h("div", { fontFamily: "Mono", fontSize: size * 0.66, opacity: 0.7, marginTop: 4, color: t.fg }, noEmoji(it.izoh)) : null))));
}

// p: { mavzu, format, yorliq, qism, sarlavha, turi: "royxat"|"raqamli"|"kod", elementlar, kod, pastki }
async function render(p) {
  const t = THEMES[p.mavzu] || THEMES.sayt;
  const [W, H] = SIZES[p.format] || SIZES.kvadrat;
  const story = p.format === "story";
  const pad = story ? "220px 72px 260px" : "72px";
  const titleSize = p.sarlavha && p.sarlavha.length > 45 ? 76 : 92;
  const items = (p.elementlar || []).map(e => typeof e === "string" ? { nom: e } : e);

  let body = null;
  if (p.turi === "kod" && p.kod) body = codeBlock(p.kod, 42);
  else if (items.length) body = list(items, t, p.turi === "raqamli", "✓", items.length > 4 ? 38 : 42);

  const tree = h("div", { width: W, height: H, background: t.bg, position: "relative", overflow: "hidden", fontFamily: "Figtree" },
    h("div", { position: "absolute", right: -200, top: -220, width: 560, height: 560, borderRadius: 280, background: t.blob }),
    h("div", { position: "absolute", left: -170, bottom: -130, width: 360, height: 360, borderRadius: 180, background: t.blob, opacity: 0.7 }),
    h("div", { position: "absolute", top: 0, left: 0, width: W, height: H, flexDirection: "column", padding: pad, gap: 36 },
      h("div", { justifyContent: "space-between", alignItems: "center" },
        h("div", { background: t.accent, color: t.bg, fontWeight: 800, fontSize: 30, padding: "12px 28px", borderRadius: 999 }, noEmoji(p.yorliq) || t.pill),
        h("div", { alignItems: "center", gap: 14, fontFamily: "Caprasimo", fontSize: 38, color: t.fg },
          LOGO ? { type: "img", props: { src: LOGO, width: 64, height: 64, style: { borderRadius: 32, background: p.mavzu === "men" ? "#f5ead8" : "transparent" } } } : null,
          "AHdigital")),
      p.qism ? h("div", { fontWeight: 800, fontSize: 30, letterSpacing: 3, opacity: 0.7, color: t.fg, marginBottom: -20 }, noEmoji(p.qism).toUpperCase()) : null,
      title(p.sarlavha || "", t, titleSize),
      h("div", { flex: 1, flexDirection: "column", justifyContent: "center", gap: 26 },
        body,
        p.pastki ? h("div", { justifyContent: "center", textAlign: "center", fontWeight: 800, fontSize: 36, opacity: 0.85, color: t.fg }, noEmoji(p.pastki)) : null),
      h("div", { justifyContent: "space-between", fontWeight: 800, fontSize: 30, opacity: 0.85, color: t.fg },
        h("span", {}, story ? "Profilga o'ting" : "t.me/ahdigital_01"), h("span", {}, "@ah.digital_01"))));

  const svg = await satori(tree, { width: W, height: H, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

module.exports = { render, THEMES: Object.keys(THEMES), FORMATS: Object.keys(SIZES) };
