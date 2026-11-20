"use strict";
// 15 daqiqalik video sahnalari. Barcha vaqtlar — absolyut soniyalar (node tomonda hisoblanadi).
const $ = id => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lin = (t, a, b) => cl((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const h = s => { const d = document.createElement("div"); d.innerHTML = s.trim(); return d.firstChild; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
let SPEC, IMG = {};
const pop = (el, t, at, y = 50) => { const p = back(lin(t, at, at + .5)); el.style.opacity = cl(p * 1.4); el.style.transform = `translateY(${(1 - p) * y}px) scale(${.92 + .08 * p})`; };
const fade = (el, t, at) => { el.style.opacity = eo(lin(t, at, at + .4)); };

const S = {};

// --- Bo'lim kartochkasi
S.chapter = {
  init(el, sc) { el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:170px;text-align:center">
    <div class="pill num" style="font-size:34px;padding:10px 30px">${sc.n}-bo'lim</div>
    <div class="big ttl" style="font-size:96px;margin-top:26px">${esc(sc.title)}</div></div>`)); },
  draw(el, t, u) { pop(el.querySelector(".num"), u, 0, 30); pop(el.querySelector(".ttl"), u, .15, 50); }
};
// --- Boshlanish: katta yozuv + sayt
S.hook = {
  init(el, sc) {
    el.appendChild(h(`<div style="position:absolute;left:110px;top:120px;width:740px">
      <div class="big" style="font-size:104px;line-height:1">15 daqiqada<br><span style="color:var(--acc)">tayyor sayt</span></div>
      <div class="big" style="font-size:56px;margin-top:26px">0 qator kod 🤯</div>
      <div style="margin-top:28px;font-size:30px;color:var(--muted)">Claude bilan — boshidan oxirigacha</div></div>`));
    el.appendChild(browser(sc.img, 900, 30, 900, 650, "shirin-tortlar"));
  },
  draw(el, t, u, d) { scrollImg(el, eio(lin(u, .8, d - .3)) * .9); }
};
// --- Brauzer: rasmlar ketma-ketligi. seq: [{t, img, y, ring, label, pill}]
S.web = {
  init(el, sc) {
    const b = browser(sc.seq[0].img, 260, 10, 1400, 740, sc.url || "shirin-tortlar");
    el.appendChild(b);
    el.appendChild(h(`<div class="pill lab" style="position:absolute;right:290px;top:8px;font-size:24px;z-index:2;opacity:0"></div>`));
    el.appendChild(h(`<div class="vpill" style="position:absolute;left:300px;top:6px;z-index:2;background:var(--ink);color:#fff;font-weight:800;font-size:22px;border-radius:999px;padding:6px 18px;opacity:0"></div>`));
    b.querySelector(".view").appendChild(h(`<div class="ring" style="opacity:0"></div>`));
  },
  draw(el, t, u, d, sc) {
    let k = 0; sc.seq.forEach((s, i) => { if (t >= s.t) k = i; });
    const s = sc.seq[k], prev = sc.seq[Math.max(0, k - 1)];
    const img = el.querySelector("img.main"); if (img.dataset.k != k) { img.src = IMG[s.img]; img.dataset.k = k; }
    const y0 = s.img === prev.img ? (prev.y2 ?? prev.y ?? 0) : (s.y ?? 0);
    const y = s.y2 != null ? (s.y ?? 0) + (s.y2 - (s.y ?? 0)) * eio(lin(t, s.t + .6, (sc.seq[k + 1] ? sc.seq[k + 1].t : SPEC.end) - .5)) : y0 + ((s.y ?? 0) - y0) * eio(lin(t, s.t, s.t + .8));
    scrollImg(el, y);
    const lab = el.querySelector(".lab"); lab.textContent = s.label || ""; lab.style.opacity = s.label ? eo(lin(t, s.t, s.t + .4)) : 0;
    const vp = el.querySelector(".vpill"); vp.textContent = s.pill || ""; vp.style.opacity = s.pill ? 1 : 0;
    const r = el.querySelector(".ring");
    if (s.ring) { const [x, yy, w, hh] = s.ring, rt = s.ringT ?? s.t + .4, p = back(lin(t, rt, rt + .5)); Object.assign(r.style, { left: x + "px", top: yy + "px", width: w + "px", height: hh + "px" }); r.style.opacity = cl(p * 1.5); r.style.transform = `scale(${.6 + .4 * p})`; }
    else r.style.opacity = 0;
  }
};
// --- Sichqoncha kartochka ustida (hover)
S.hover = {
  init(el) {
    const b = browser("v2-nohover", 260, 10, 1400, 740, "shirin-tortlar");
    const v = b.querySelector(".view"); const img2 = document.createElement("img"); img2.src = IMG["v2-hover"]; img2.className = "hv"; img2.style.opacity = 0; v.appendChild(img2);
    v.appendChild(h(`<div class="cursor"></div>`)); el.appendChild(b);
    el.appendChild(h(`<div class="pill" style="position:absolute;right:290px;top:8px;font-size:24px;z-index:2">✨ Kartochka kattalashadi</div>`));
  },
  draw(el, t, u) {
    const c = el.querySelector(".cursor"), k = eio(lin(u, .3, 1.6));
    c.style.left = (1100 - 420 * k) + "px"; c.style.top = (600 - 260 * k) + "px";
    el.querySelector(".hv").style.opacity = lin(u, 1.5, 1.9) * (1 - lin(u, 4.5, 4.9)) + lin(u, 6, 6.4);
  }
};
// --- Chat: foydalanuvchi buyrug'i (yoziladi) + Claude javobi. attach — qog'ozdagi narxlar rasmi
S.chat = {
  init(el, sc) {
    const att = sc.attach ? `<div class="paper"><b>NARXLAR</b><br>Qulupnayli — 180 000<br>Shokoladli — 220 000<br>Medovik — 160 000<br>Napoleon — 170 000<br>Sabzili — 190 000<br>Tug'ilgan kun — 250 000</div>` : "";
    el.appendChild(h(`<div class="chat"><div class="head"><b>✳</b>Claude<span class="tag">${sc.tag || ""}</span></div><div class="body">
      <div class="msg user">${att}<span class="tx"></span><span class="caret"></span></div>
      <div class="msg bot" style="opacity:0"><b>✳</b><div class="rp"></div></div></div></div>`));
    if (sc.warn) el.appendChild(h(`<div class="warnb" style="opacity:0">${sc.warn}</div>`));
  },
  draw(el, t, u, d, sc) {
    const txt = sc.prompt, cps = sc.cps || 40, n = Math.min(txt.length, Math.floor(Math.max(0, u - .4) * cps));
    el.querySelector(".tx").textContent = txt.slice(0, n);
    el.querySelector(".caret").style.opacity = n < txt.length ? (Math.floor(u * 3) % 2 ? .3 : 1) : 0;
    const ra = sc.replyT ?? (sc.start + .4 + txt.length / cps + 1.2);
    const bot = el.querySelector(".msg.bot"), p = eo(lin(t, ra, ra + .4));
    bot.style.opacity = p; bot.style.transform = `translateY(${(1 - p) * 20}px)`;
    el.querySelector(".rp").textContent = t < ra + 1.3 ? "Yozmoqda…" : sc.reply;
    const w = el.querySelector(".warnb"); if (w) pop(w, t, sc.warnT, 30);
  }
};
// --- Ro'yxat (kartochkalar): items [{t, icon, text, sub}]
S.list = {
  init(el, sc) {
    const n = sc.items.length, cols = sc.cols || (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 2);
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:${sc.title ? 10 : 40}px;text-align:center" class="big"><span style="font-size:58px">${sc.title || ""}</span></div>`));
    const W = cols === 1 ? 1100 : cols === 2 ? 760 : 520, gap = 30, x0 = (1920 - (cols * W + (cols - 1) * gap)) / 2;
    const rows = Math.ceil(n / cols), H = Math.min(260, (sc.title ? 600 : 680) / rows - 24), y0 = sc.title ? 110 : 60;
    sc.items.forEach((it, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      el.appendChild(h(`<div class="card it" style="position:absolute;left:${x0 + c * (W + gap)}px;top:${y0 + r * (H + 24)}px;width:${W}px;height:${H}px;padding:0 34px;display:flex;align-items:center;gap:26px;opacity:0">
        <div style="font-size:${Math.min(90, H * .5)}px;flex:none">${it.icon}</div>
        <div><div class="big" style="font-size:${H > 180 ? 40 : 32}px;line-height:1.15">${it.text}</div>${it.sub ? `<div style="font-size:${H > 180 ? 27 : 23}px;color:var(--muted);margin-top:8px;line-height:1.3">${it.sub}</div>` : ""}</div></div>`));
    });
  },
  draw(el, t, u, d, sc) { el.querySelectorAll(".it").forEach((c, i) => pop(c, t, sc.items[i].t)); }
};
// --- Bitta katta fikr
S.big = {
  init(el, sc) { el.appendChild(h(`<div class="card bg" style="position:absolute;left:260px;right:260px;top:110px;height:480px;padding:60px;text-align:center;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:120px">${sc.icon}</div><div class="big" style="font-size:62px;margin-top:20px;line-height:1.15">${sc.text}</div>${sc.sub ? `<div style="font-size:32px;color:var(--muted);margin-top:18px">${sc.sub}</div>` : ""}</div>`)); },
  draw(el, t, u) { pop(el.firstChild, u, 0); }
};
// --- Ikki ustun: chap / o'ng
S.compare = {
  init(el, sc) {
    if (sc.title) el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:10px;text-align:center" class="big"><span style="font-size:56px">${sc.title}</span></div>`));
    [sc.left, sc.right].forEach((s, i) => el.appendChild(h(`<div class="card c${i}" style="position:absolute;left:${i ? 1000 : 200}px;top:120px;width:720px;height:500px;padding:44px;border-top:10px solid ${s.color};opacity:0">
      <div class="big" style="font-size:44px;color:${s.color}">${s.title}</div><div style="font-size:31px;margin-top:22px;line-height:1.55">${s.lines.join("<br>")}</div></div>`)));
  },
  draw(el, t, u, d, sc) { pop(el.querySelector(".c0"), t, sc.left.t); pop(el.querySelector(".c1"), t, sc.right.t); }
};
// --- Formula: kim uchun / nima kerak / qanday ko'rinishda
S.formula = {
  init(el, sc) {
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:10px;text-align:center" class="big"><span style="font-size:58px">Yaxshi buyruq formulasi</span></div>`));
    sc.items.forEach((it, i) => el.appendChild(h(`<div class="card f" style="position:absolute;left:${130 + i * 570}px;top:130px;width:520px;height:380px;padding:40px;opacity:0;border-top:10px solid ${["#c67139", "#3a7bd5", "#3f8f5a"][i]}">
      <div style="font-size:70px">${it.icon}</div><div class="big" style="font-size:44px;margin-top:10px">${it.text}</div><div style="font-size:27px;margin-top:16px;color:var(--muted);line-height:1.4">${it.sub}</div></div>`)));
    if (sc.extra) el.appendChild(h(`<div class="ex" style="position:absolute;left:50%;top:560px;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:18px;padding:16px 34px;font-size:30px;font-weight:800;white-space:nowrap;opacity:0">${sc.extra.text}</div>`));
  },
  draw(el, t, u, d, sc) { el.querySelectorAll(".f").forEach((c, i) => pop(c, t, sc.items[i].t)); const ex = el.querySelector(".ex"); if (ex) fade(ex, t, sc.extra.t); }
};
// --- «Artifact»: chap — chat, o'ng — natija
S.artifact = {
  init(el, sc) {
    el.appendChild(h(`<div style="position:absolute;left:160px;top:20px;width:1600px;height:700px;border-radius:26px;overflow:hidden;box-shadow:0 30px 80px #26283a33;display:flex;background:#fbfaf7">
      <div style="width:520px;border-right:1px solid #eee;padding:30px;display:flex;flex-direction:column;gap:18px">
        <div style="font-weight:900;font-size:26px">💬 Chat</div>
        <div class="msg user" style="font-size:21px;align-self:flex-end">Tort do'koni uchun sayt yasab ber…</div>
        <div class="msg bot" style="font-size:21px"><b>✳</b><div>Tayyor! O'ng tomonda ko'ring 👉</div></div></div>
      <div style="flex:1;position:relative;overflow:hidden"><div style="position:absolute;left:0;right:0;top:0;height:56px;background:#ece7df;display:flex;align-items:center;padding:0 24px;font-weight:900;font-size:24px;gap:12px">🖥 Natija <span class="pill" style="font-size:18px;padding:4px 14px">Artifact</span></div>
        <img src="${IMG.v1}" style="position:absolute;left:0;top:56px;width:100%"></div></div>`));
  },
  draw(el, t, u, d) { el.querySelector("img").style.transform = `translateY(${-eio(lin(u, 1, d - .5)) * 500}px)`; }
};
// --- Telefon (sayt varaqlanadi) + yon tomonda ro'yxat
S.phone = {
  init(el, sc) {
    el.appendChild(h(`<div class="phone" style="left:300px;top:0"><div class="scr"><img src="${IMG[sc.img]}"></div></div>`));
    el.appendChild(h(`<div style="position:absolute;left:860px;top:120px;width:860px">
      <div class="big" style="font-size:74px;line-height:1.05">📱 Telefonda<br>tekshiring</div>
      ${(sc.checks || []).map((c, i) => `<div class="ck" style="font-size:36px;font-weight:800;margin-top:${i ? 18 : 40}px;opacity:0">✅ ${c.text}</div>`).join("")}</div>`));
  },
  draw(el, t, u, d, sc) {
    const img = el.querySelector(".scr img"); const H = img.naturalHeight / img.naturalWidth * 392;
    img.style.transform = `translateY(${-eio(lin(u, .6, d - .5)) * (H - 732)}px)`;
    el.querySelectorAll(".ck").forEach((c, i) => pop(c, t, sc.checks[i].t, 30));
  }
};
// --- Telefonda xato (misol): ustma-ust rasmlar → tuzatilgan
S.phonefix = {
  init(el) {
    el.appendChild(h(`<div class="phone" style="left:300px;top:0"><div class="scr" style="background:#fff6ec;padding:40px 26px">
      <div style="font-weight:900;font-size:30px;text-align:center;color:#5b3a29">Galereya</div><div class="gl" style="position:relative;height:560px;margin-top:20px"></div></div></div>`));
    const cols = ["#ffc2d1", "#f3d9b8", "#d8ecd2", "#e2d6f5", "#ffe0b8", "#ffd0c4"], ic = ["🎂", "💍", "🧁", "🎈", "🍪", "🎁"];
    const gl = el.querySelector(".gl");
    ic.forEach((x, i) => gl.appendChild(h(`<div class="gb" style="position:absolute;width:150px;height:150px;border-radius:20px;background:${cols[i]};display:flex;align-items:center;justify-content:center;font-size:56px;box-shadow:0 4px 10px #0002">${x}</div>`)));
    el.appendChild(h(`<div style="position:absolute;left:860px;top:150px;width:860px"><div class="pill" style="font-size:26px;background:#e53935">Misol</div>
      <div class="big st" style="font-size:66px;line-height:1.1;margin-top:20px">❌ Rasmlar<br>ustma-ust</div></div>`));
  },
  draw(el, t, u, d, sc) {
    const k = eio(lin(t, sc.fixT, sc.fixT + 1));
    el.querySelectorAll(".gb").forEach((b, i) => {
      const bx = 60 + (i % 3) * 30, by = 40 + i * 22, fx = (i % 2) * 168, fy = Math.floor(i / 2) * 168;
      b.style.left = (bx + (fx - bx) * k) + "px"; b.style.top = (by + (fy - by) * k) + "px";
    });
    el.querySelector(".st").innerHTML = t < sc.fixT + .5 ? "❌ Rasmlar<br>ustma-ust" : "✅ Tuzatildi!";
  }
};
// --- Papka tuzilmasi
S.folder = {
  init(el, sc) {
    el.appendChild(h(`<div class="card" style="position:absolute;left:460px;top:40px;width:1000px;height:600px;padding:50px 60px;font-size:40px;line-height:1.7">
      ${sc.lines.map((l, i) => `<div class="fl" style="padding-left:${l.d * 60}px;opacity:0">${l.text}</div>`).join("")}</div>`));
  },
  draw(el, t, u, d, sc) { el.querySelectorAll(".fl").forEach((x, i) => pop(x, t, sc.lines[i].t, 20)); }
};
// --- Rasm hajmi: katta → kichik
S.size = {
  init(el) {
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:20px;text-align:center" class="big"><span style="font-size:58px">Rasmni siqing 🗜</span></div>`));
    el.appendChild(h(`<div class="card" style="position:absolute;left:310px;top:150px;width:1300px;height:420px;padding:60px">
      <div style="font-size:34px;font-weight:800">📷 medovik.jpg</div>
      <div style="margin-top:30px;height:60px;background:#f0ebe3;border-radius:30px;overflow:hidden"><div class="bar" style="height:100%;width:100%;background:#e0708a;border-radius:30px"></div></div>
      <div class="big num" style="font-size:72px;margin-top:30px">4.8 MB</div>
      <div class="ok" style="font-size:32px;color:#3f8f5a;font-weight:800;opacity:0">✅ Sifat deyarli o'zgarmadi — sayt tez ochiladi</div></div>`));
  },
  draw(el, t, u) {
    const k = eio(lin(u, 1.5, 3.2)), mb = 4.8 - (4.8 - .28) * k;
    el.querySelector(".bar").style.width = (100 - 94 * k) + "%";
    el.querySelector(".num").textContent = mb > 1 ? mb.toFixed(1) + " MB" : Math.round(mb * 1000) + " KB";
    el.querySelector(".bar").style.background = k > .99 ? "#3f8f5a" : "#e0708a";
    fade(el.querySelector(".ok"), u, 3.3);
  }
};
// --- SEO: brauzer tabi va havola ko'rinishi
S.seo = {
  init(el) {
    el.appendChild(h(`<div style="position:absolute;left:200px;top:40px;width:1520px">
      <div style="background:#ece7df;border-radius:20px 20px 0 0;padding:16px 20px 0;display:flex;gap:10px">
        <div class="tab" style="background:#fff;border-radius:14px 14px 0 0;padding:14px 26px;font-size:28px;font-weight:700;min-width:520px">📄 index.html</div></div>
      <div style="background:#fff;height:200px;border-radius:0 0 20px 20px;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--muted)">↑ brauzer tabidagi nom</div></div>`));
    el.appendChild(h(`<div class="pv" style="position:absolute;left:560px;top:340px;width:800px;background:#fff;border-radius:22px;box-shadow:0 20px 50px #26283a26;padding:26px 30px;opacity:0;border-left:8px solid #3a7bd5">
      <div style="font-size:22px;color:#3a7bd5;font-weight:700">shirin-tortlar.netlify.app</div>
      <div class="big" style="font-size:36px;margin-top:8px">Shirin Tortlar 🎂</div>
      <div style="font-size:26px;color:var(--muted);margin-top:8px">Buyurtma asosida uyda pishirilgan mazali tortlar. Narxlar va buyurtma — saytda.</div></div>`));
  },
  draw(el, t, u, d, sc) {
    el.querySelector(".tab").textContent = t < sc.tabT ? "📄 index.html" : "🎂 Shirin Tortlar — buyurtma asosida…";
    pop(el.querySelector(".pv"), t, sc.prevT, 30);
  }
};
// --- Netlify Drop (soddalashtirilgan rasm)
S.netlify = {
  init(el, sc) {
    el.appendChild(h(`<div class="card" style="position:absolute;left:330px;top:20px;width:1260px;height:600px;padding:40px;text-align:center">
      <div style="font-size:26px;color:var(--muted)">app.netlify.com/drop</div>
      <div class="zone" style="margin:26px auto 0;width:900px;height:300px;border:5px dashed #9bb3c9;border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#5a7690;position:relative">Papkani shu yerga sudrab tashlang ⬇️
        <div class="fold" style="position:absolute;font-size:110px;left:-300px;top:-200px">📁</div></div>
      <div class="url big" style="font-size:44px;margin-top:40px;opacity:0"></div>
      ${sc.kid ? `<div class="kid" style="font-size:27px;margin-top:20px;background:#fff3d6;border:2px solid #f2b33d;border-radius:16px;padding:12px 24px;display:inline-block;opacity:0">${sc.kid.text}</div>` : ""}</div>`));
  },
  draw(el, t, u, d, sc) {
    const f = el.querySelector(".fold"), k = eio(lin(t, sc.dropT, sc.dropT + 1.2));
    f.style.left = (-300 + 680 * k) + "px"; f.style.top = (-200 + 300 * k) + "px"; f.style.opacity = 1 - lin(t, sc.dropT + 1.3, sc.dropT + 1.6);
    const url = el.querySelector(".url");
    url.textContent = t < sc.renameT ? "🔗 glistening-pudding-4a7f.netlify.app" : "🔗 shirin-tortlar.netlify.app ✅";
    fade(url, t, sc.urlT);
    const kid = el.querySelector(".kid"); if (kid) fade(kid, t, sc.kid.t);
  }
};
// --- Matn muharriri: narxni almashtirish
S.editor = {
  init(el) {
    el.appendChild(h(`<div class="card" style="position:absolute;left:260px;top:20px;width:1400px;height:640px;background:#1f1e2a;color:#e8e6f0;overflow:hidden">
      <div style="display:flex;gap:12px;padding:22px 30px;border-bottom:1px solid #333"><i style="width:18px;height:18px;border-radius:50%;background:#ff5f56"></i><i style="width:18px;height:18px;border-radius:50%;background:#ffbd2e"></i><i style="width:18px;height:18px;border-radius:50%;background:#27c93f"></i><span style="margin-left:16px;color:#999;font-size:22px">index.html — matn muharriri</span>
        <span class="find" style="margin-left:auto;background:#333;border-radius:8px;padding:4px 14px;font-size:20px;color:#ffd27a;opacity:0">🔍 160 000</span></div>
      <pre style="margin:0;padding:30px 40px;font:30px/1.7 ui-monospace,Menlo,monospace;white-space:pre">&lt;div class="cake"&gt;
  &lt;h3&gt;Medovik&lt;/h3&gt;
  &lt;p&gt;Asalli qatlamlar, smetanali krem&lt;/p&gt;
  &lt;div class="price"&gt;<span class="pr" style="border-radius:6px;padding:0 6px">160 000</span> so'm&lt;/div&gt;
&lt;/div&gt;</pre></div>`));
  },
  draw(el, t, u, d, sc) {
    fade(el.querySelector(".find"), t, sc.findT);
    const pr = el.querySelector(".pr"); pr.style.background = t >= sc.findT + .6 ? "#ffd27a55" : "transparent";
    pr.textContent = t < sc.editT ? "160 000" : "170 000"; if (t >= sc.editT) pr.style.background = "#3f8f5a88";
  }
};
// --- Buyruq shablonlari: uchta kartochka
S.templates = {
  init(el, sc) {
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:10px;text-align:center" class="big"><span style="font-size:56px">Bir formula — har xil biznes</span></div>`));
    sc.items.forEach((it, i) => el.appendChild(h(`<div class="card tp" style="position:absolute;left:${110 + i * 580}px;top:110px;width:540px;height:560px;padding:36px;opacity:0;background:${it.bg};color:${it.fg}">
      <div style="font-size:64px">${it.icon}</div><div class="big" style="font-size:40px;margin-top:6px">${it.title}</div>
      <div style="font-size:23px;margin-top:18px;line-height:1.5;font-family:ui-monospace,Menlo,monospace;opacity:.92">${it.text}</div></div>`)));
  },
  draw(el, t, u, d, sc) { el.querySelectorAll(".tp").forEach((c, i) => pop(c, t, sc.items[i].t)); }
};
// --- Video rejasi (bo'limlar ro'yxati)
S.toc = {
  init(el, sc) {
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:0;text-align:center" class="big"><span style="font-size:50px">Video rejasi</span></div>`));
    const half = Math.ceil(sc.titles.length / 2);
    el.appendChild(h(`<div style="position:absolute;left:260px;right:260px;top:90px;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(${half},1fr);gap:4px 40px;height:600px">
      ${sc.titles.map((x, i) => `<div class="tc" style="font-size:25px;font-weight:700;display:flex;gap:14px;align-items:center;opacity:0"><span class="pill" style="font-size:18px;padding:2px 12px;min-width:46px;text-align:center">${i + 1}</span>${esc(x)}</div>`).join("")}</div>`));
  },
  draw(el, t, u) { el.querySelectorAll(".tc").forEach((c, i) => fade(c, u, .2 + i * .12)); }
};
// --- Halol xulosa
S.honest = {
  init(el) {
    el.appendChild(h(`<div style="position:absolute;left:0;right:0;top:20px;text-align:center" class="big"><span style="font-size:60px">Rostini aytsam 🤝</span></div>`));
    el.appendChild(h(`<div class="card c1" style="position:absolute;left:200px;top:140px;width:720px;height:480px;padding:46px;border-top:10px solid #3f8f5a">
      <div class="big" style="font-size:46px;color:#3f8f5a">✅ Tez bo'ladi</div><div style="font-size:32px;margin-top:24px;line-height:1.7">Bitta sahifali sayt-vizitka<br>Kafe, do'kon, usta uchun<br>Portfolio sahifasi</div></div>`));
    el.appendChild(h(`<div class="card c2" style="position:absolute;left:1000px;top:140px;width:720px;height:480px;padding:46px;border-top:10px solid #e0a03a">
      <div class="big" style="font-size:46px;color:#c27a0e">⏳ Ko'proq vaqt kerak</div><div style="font-size:32px;margin-top:24px;line-height:1.7">Onlayn to'lov<br>Ro'yxatdan o'tish<br>Ma'lumotlar bazasi</div></div>`));
  },
  draw(el, t, u, d, sc) { pop(el.querySelector(".c1"), t, sc.t1); pop(el.querySelector(".c2"), t, sc.t2); }
};
S.cta = {
  init(el) {
    el.appendChild(h(`<div class="card" style="position:absolute;left:360px;right:360px;top:40px;height:620px;padding:60px;text-align:center">
      <div style="font-size:110px">📥</div><div class="big" style="font-size:54px;margin-top:10px">Barcha buyruqlar — Telegram kanalimda</div>
      <div style="margin:34px auto 0;display:inline-block;background:var(--acc);color:#fff;border-radius:999px;padding:22px 60px;font-weight:900;font-size:60px">@ahdigital_01</div>
      <div style="font-size:34px;margin-top:34px;color:var(--muted)">Keyingi video: saytga <b style="color:var(--ink)">o'z domeningizni</b> ulaymiz 🌐</div></div>`));
  },
  draw(el, t, u) { pop(el.firstChild, u, 0); }
};

function browser(img, x, y, w, hh, url) {
  return h(`<div class="browser" style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px"><div class="bar"><i style="background:#ff5f56"></i><i style="background:#ffbd2e"></i><i style="background:#27c93f"></i><div class="url">🔒 ${url}</div></div><div class="view"><img class="main" src="${IMG[img]}"></div></div>`);
}
function scrollImg(el, p) {
  const b = el.querySelector(".browser"); if (!b) return;
  const img = b.querySelector("img.main"), v = b.querySelector(".view");
  const H = img.naturalHeight / img.naturalWidth * v.clientWidth, max = Math.max(0, H - v.clientHeight), y = -max * cl(p);
  img.style.transform = `translateY(${y}px)`;
  v.querySelectorAll(".ring").forEach(r => r.style.marginTop = y + "px");
}

let cur = -1, curEl = null;
window.setup = async function (spec, imgs) {
  SPEC = spec; IMG = imgs;
  await Promise.all(Object.values(imgs).map(src => { const im = new Image(); im.src = src; return im.decode().catch(() => {}); }));
};
window.render = function (t) {
  let i = -1; SPEC.scenes.forEach((s, k) => { if (t >= s.start) i = k; });
  if (i !== cur) {
    cur = i; $("stage").innerHTML = "";
    curEl = document.createElement("div"); curEl.className = "scene"; $("stage").appendChild(curEl);
    if (i >= 0) S[SPEC.scenes[i].type].init(curEl, SPEC.scenes[i]);
  }
  if (i < 0) return;
  const sc = SPEC.scenes[i], s0 = sc.start, s1 = SPEC.scenes[i + 1] ? SPEC.scenes[i + 1].start : SPEC.end;
  const u = t - s0, d = s1 - s0;
  const inP = eo(lin(u, 0, .35)), outP = eio(lin(t, s1 - .3, s1));
  curEl.style.opacity = inP * (1 - outP); curEl.style.transform = `translateY(${(1 - inP) * 40 - outP * 30}px)`;
  S[sc.type].draw(curEl, t, u, d, sc);
  $("chap").textContent = sc.ch || ""; $("chap").style.display = sc.ch ? "" : "none";
  let ci = -1; SPEC.chunks.forEach((c, k) => { if (t >= c.t - .05) ci = k; });
  const sub = $("sub"), txt = ci >= 0 ? SPEC.chunks[ci].text : "";
  sub.textContent = txt; sub.style.opacity = txt && t < SPEC.speechEnd + .4 ? 1 : 0;
  return null;
};
