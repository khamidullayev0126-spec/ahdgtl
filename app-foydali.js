// AHdigital ilovasi — «Foydali» bo'limi: 🛡 Tekshirish, 🔳 QR kod, 💡 Maslahatlar.
// app.html dagi `screens`, `state`, `render`, `esc` dan foydalanadi (o'sha fayldan keyin yuklanadi).
// Tekshiruv Tekshir botining serverida bajariladi (/api/check). Matn saqlanmaydi,
// fayl esa umuman yuborilmaydi — telefon faqat uning nomi va SHA-256 "barmoq izi"ni hisoblab yuboradi.

(function () {
  const API = window.TEKSHIR_API || "https://ahdgtl.onrender.com/api/check";
  const BOT = "https://t.me/tekshirbot_bot?start=app";

  // ---------- Maslahatlar ----------
  // 70 ta maslahat — app-maslahatlar.js dan (7 yo'nalish × 10)
  const TIPS = window.TIPS || [];
  const CATS = window.TIP_CATS || [];
  const catName = id => (CATS.find(c => c[0] === id) || ["", "", ""])[2];
  const dayIndex = () => Math.floor((Date.now() + 5 * 3600e3) / 864e5) % TIPS.length;      // Toshkent vaqti bo'yicha har kuni yangi
  const tipCard = (t, big) => `<div class="card tip"><span class="kicker">${esc(catName(t[0]))}</span><b style="font-size:${big ? 18 : 16}px">${t[1]} ${esc(t[2])}</b><p class="lead">${esc(t[3])}</p></div>`;

  // ---------- Tekshirish ----------
  const LEVEL = { danger: ["#c0392b", "#fdecea", "🔴"], suspicious: ["#b7791f", "#fff7e0", "🟡"], safe: ["#2f7d4f", "#eaf7ee", "✅"] };
  const lang = () => ({ ru: "ru", en: "uz-latn" }[(document.documentElement.lang || "uz").slice(0, 2)] || "uz-latn");

  async function sha256(file) {
    const buf = await file.arrayBuffer();
    const h = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function runCheck(payload) {
    state.tk = { busy: true, res: null, err: "", file: payload.file ? payload.file.name : "", lastText: payload.text || state.tk.lastText || "" };
    render();
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, lang: lang() }) });
      if (r.status === 429) throw new Error("Juda tez yuboryapsiz. Bir daqiqa kuting.");
      if (!r.ok) throw new Error("Hozir tekshirib bo'lmadi. Birozdan keyin urinib ko'ring.");
      state.tk.res = await r.json();
    } catch (e) {
      state.tk.err = e.message === "Failed to fetch" ? "Internet bilan bog'lanib bo'lmadi (yoki server uyg'onmoqda — 1 daqiqadan keyin qayta urining)." : e.message;
    }
    state.tk.busy = false;
    render();
    document.getElementById("tk-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resultCard(r) {
    const [ink, bg, ic] = LEVEL[r.level] || LEVEL.safe;
    return `<section id="tk-result" class="card" style="background:${bg};border:2px solid ${ink}">
      <b style="font:400 26px var(--h);color:${ink}">${esc(r.title || ic)}</b>
      ${r.reasons.length ? `<div><span class="kicker">Nima uchun</span><ul class="tk-list">${r.reasons.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${(r.numbers || []).length ? `<div><span class="kicker">Raqamlar</span><ul class="tk-list">${r.numbers.map(n => `<li>${esc(n.masked)} — ${n.count ? `<b>${n.count} ta shikoyat</b>` : "shikoyat yo'q"}</li>`).join("")}</ul><p class="small">Shikoyatlar soni — foydalanuvchilar fikri, rasmiy xulosa emas.</p></div>` : ""}
      ${r.advice.length ? `<div><span class="kicker">Nima qilish kerak</span><ul class="tk-list plain">${r.advice.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    </section>`;
  }

  // ---------- QR kod ----------
  const QR_TYPES = [["link", "🔗 Havola"], ["wifi", "📶 Wi-Fi"], ["tel", "📞 Telefon"], ["text", "✏️ Matn"]];
  const wifiEsc = s => String(s).replace(/([\\;,:"])/g, "\\$1");
  function qrData() {
    const q = state.qr, v = q.v;
    if (q.type === "wifi") return v.ssid ? `WIFI:T:${v.pass ? "WPA" : "nopass"};S:${wifiEsc(v.ssid)};${v.pass ? `P:${wifiEsc(v.pass)};` : ""};` : "";
    if (q.type === "tel") { const d = String(v.tel || "").replace(/[^\d+]/g, ""); return d.length >= 7 ? "tel:" + d : ""; }
    if (q.type === "link") { const u = String(v.link || "").trim(); return u ? (/^[a-z]+:\/\//i.test(u) ? u : "https://" + u) : ""; }
    return String(v.text || "").trim();
  }
  function drawQr() {
    const cv = document.getElementById("qr-canvas"); if (!cv || !window.qrcode) return;
    const data = qrData(), label = String(state.qr.v.label || "").trim().slice(0, 40);
    const ctx = cv.getContext("2d");
    const W = 720, H = label ? 820 : 720;
    cv.width = W; cv.height = H;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    document.getElementById("qr-actions").hidden = !data;
    if (!data) { ctx.fillStyle = "#b9ae9c"; ctx.font = "600 30px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Ma'lumot kiriting", W / 2, H / 2); return; }
    qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
    const q = qrcode(0, "M"); q.addData(data); q.make();
    const n = q.getModuleCount(), quiet = 4, cell = Math.floor(W / (n + quiet * 2)), off = Math.floor((W - cell * n) / 2);
    ctx.fillStyle = "#201e1d";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
    if (label) { ctx.fillStyle = "#201e1d"; ctx.font = "800 44px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, W / 2, H - 50); }
  }
  async function qrBlob() { return new Promise(r => document.getElementById("qr-canvas").toBlob(r, "image/png")); }

  // ---------- Ekranlar ----------
  Object.assign(state, { tk: { busy: false, res: null, err: "", file: "" }, qr: { type: "link", v: {} }, tipCat: "all" });

  Object.assign(screens, {
    foydali: { title: "Foydali", render() {
      return `
        <p class="lead">Hamma uchun bepul vositalar — firibgarlardan himoya va kichik biznes uchun.</p>
        <span class="kicker">💡 Kun maslahati</span>
        ${tipCard(TIPS[dayIndex()], true)}
        <a class="tool" href="#tekshir"><span class="tool-ic" style="background:#1f6f4a">🛡</span><span><b>Tekshirish</b><span class="s">Shubhali xabar, havola yoki APK faylni tekshiring</span></span><span aria-hidden="true">›</span></a>
        <a class="tool" href="#qr"><span class="tool-ic" style="background:#26283a">🔳</span><span><b>QR kod yasash</b><span class="s">Menyu, Wi-Fi, Instagram yoki telefon uchun — bepul</span></span><span aria-hidden="true">›</span></a>
        <a class="tool" href="#maslahat"><span class="tool-ic" style="background:#c67139">💡</span><span><b>Maslahatlar</b><span class="s">${TIPS.length} ta maslahat · ${CATS.length} yo'nalish</span></span><span aria-hidden="true">›</span></a>`;
    } },

    tekshir: { title: "Tekshirish", back: true, render() {
      const s = state.tk;
      return `
        <section class="card dark">
          <span class="kicker">🛡 Tekshir</span>
          <p class="h1" style="font-size:24px">Bu xabar firibgarlikmi?</p>
          <p class="lead">Shubhali SMS, Telegram xabar yoki havolani shu yerga qo'ying — bir necha soniyada aytaman.</p>
        </section>
        <form id="tk-form" class="screen" style="gap:12px" novalidate>
          <div class="field"><label for="tk-text">Xabar yoki havola</label><textarea id="tk-text" name="text" rows="5" maxlength="4000" placeholder="Masalan: Kartangiz bloklandi, SMS kodni yuboring…">${esc(s.lastText || "")}</textarea></div>
          <div class="grid2">
            <button class="btn ghost sm" type="button" data-tk="paste">📋 Joylash</button>
            <button class="btn ghost sm" type="button" data-tk="file">📎 APK / fayl</button>
          </div>
          <input type="file" id="tk-file" hidden>
          <button class="btn" type="submit" ${s.busy ? "disabled" : ""}>${s.busy ? "Tekshirilmoqda…" : "🔍 Tekshirish"}</button>
        </form>
        ${s.err ? `<p class="err" role="alert">${esc(s.err)}</p>` : ""}
        ${s.res ? resultCard(s.res) : ""}
        <p class="small">🔒 Xabaringiz saqlanmaydi. Fayl internetga yuklanmaydi — telefon faqat uning «barmoq izi»ni (SHA-256) tekshiradi. Natija 100% kafolat emas.</p>
        <a class="li white" href="${BOT}" target="_blank" rel="noopener"><span style="flex:1"><b>Telegram'da ham bor: @tekshirbot_bot</b><span class="s">Xabarni botga uzating — guruhlarda ham ishlaydi</span></span><span aria-hidden="true">›</span></a>`;
    } },

    qr: { title: "QR kod", back: true, render() {
      const q = state.qr, v = q.v;
      const f = (id, label, ph, type = "text") => `<div class="field"><label for="qr-${id}">${label}</label><input id="qr-${id}" data-qr="${id}" type="${type}" placeholder="${ph}" value="${esc(v[id] || "")}"></div>`;
      const fields = {
        link: f("link", "Havola", "instagram.com/lazzat_kafe"),
        wifi: f("ssid", "Wi-Fi nomi", "Lazzat kafe") + f("pass", "Parol (bo'lmasa — bo'sh qoldiring)", "parol123"),
        tel: f("tel", "Telefon raqam", "+998 90 123 45 67", "tel"),
        text: `<div class="field"><label for="qr-text">Matn</label><textarea id="qr-text" data-qr="text" rows="3" maxlength="300">${esc(v.text || "")}</textarea></div>`
      }[q.type];
      return `
        <p class="lead">QR kod yasang, rasmini saqlang va chop eting. Hammasi telefoningizda — hech narsa yuborilmaydi.</p>
        <div class="chips" role="group" aria-label="QR turi">${QR_TYPES.map(([id, l]) => `<button class="chip" type="button" data-qrtype="${id}" aria-pressed="${q.type === id}">${l}</button>`).join("")}</div>
        ${fields}
        ${f("label", "Ostidagi yozuv (ixtiyoriy)", "Menyuni ko'ring 👆")}
        <canvas id="qr-canvas" class="qr-canvas" width="720" height="720" aria-label="QR kod"></canvas>
        <div id="qr-actions" class="grid2" hidden>
          <button class="btn sm" type="button" data-qract="save">⬇️ Saqlash</button>
          <button class="btn ghost sm" type="button" data-qract="share">↗️ Ulashish</button>
        </div>
        <section class="card hot"><b>Menyu yoki sayt kerakmi?</b><p class="lead">QR kod sizning saytingizga olib borsin — vizitka yoki menyu sayt 2–3 kunda tayyor.</p><a class="btn" href="#buyurtma" data-pick="vizitka">Sayt buyurtma qilish</a></section>`;
    } },

    maslahat: { title: "Maslahatlar", back: true, render() {
      const cats = [["all", `Barchasi · ${TIPS.length}`], ...CATS.map(c => [c[0], `${c[1]} ${c[2]}`])];
      const list = TIPS.filter(t => state.tipCat === "all" || t[0] === state.tipCat);
      return `
        <div class="chips scroll" role="group" aria-label="Yo'nalish">${cats.map(([id, l]) => `<button class="chip" type="button" data-tipcat="${id}" aria-pressed="${state.tipCat === id}">${l}</button>`).join("")}</div>
        ${list.map(t => tipCard(t)).join("")}
        <button class="btn ghost" type="button" data-act="share-tips">↗️ Oilamga ulashish</button>`;
    } }
  });

  // ---------- Harakatlar ----------
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-tk],[data-qrtype],[data-qract],[data-tipcat],[data-act='share-tips']");
    if (!t) return;
    if (t.dataset.tk === "paste") {
      try { const txt = await navigator.clipboard.readText(); document.getElementById("tk-text").value = txt; }
      catch { alert("Matnni nusxalab, maydonni bosib turing va «Вставить / Paste» ni tanlang."); }
    }
    if (t.dataset.tk === "file") document.getElementById("tk-file").click();
    if (t.dataset.qrtype) { state.qr.type = t.dataset.qrtype; render(); drawQr(); }
    if (t.dataset.tipcat) { state.tipCat = t.dataset.tipcat; render(); document.querySelector(".chips.scroll [aria-pressed='true']")?.scrollIntoView({ inline: "center", block: "nearest" }); }
    if (t.dataset.qract === "save") {
      const a = document.createElement("a"); a.href = URL.createObjectURL(await qrBlob()); a.download = "qr-kod.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    if (t.dataset.qract === "share") {
      const file = new File([await qrBlob()], "qr-kod.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "QR kod" }).catch(() => {});
      else alert("Bu telefonda ulashib bo'lmadi — «Saqlash» ni bosing.");
    }
    if (t.dataset.act === "share-tips") {
      const text = "Firibgarlardan himoya va biznes uchun foydali maslahatlar — AHdigital ilovasida 👇";
      if (navigator.share) navigator.share({ title: "AHdigital", text, url: location.origin + "/app.html#maslahat" }).catch(() => {});
    }
  });

  document.addEventListener("change", async e => {
    if (e.target.id !== "tk-file" || !e.target.files[0]) return;
    const f = e.target.files[0];
    const file = { name: f.name, size: f.size, mime: f.type || "" };
    if (f.size <= 100 * 1024 * 1024) { try { file.sha256 = await sha256(f); } catch { /* hash bo'lmasa — nomi bo'yicha */ } }
    runCheck({ file });
  });

  document.addEventListener("input", e => {
    if (e.target.dataset.qr) { state.qr.v[e.target.dataset.qr] = e.target.value; drawQr(); }
  });

  document.addEventListener("submit", e => {
    if (e.target.id !== "tk-form") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const text = document.getElementById("tk-text").value.trim();
    if (!text) { state.tk.err = "Avval xabar yoki havolani qo'ying."; render(); return; }
    state.tk.lastText = text;
    runCheck({ text });
  }, true);

  // QR ekrani ochilganda rasmni chizamiz
  addEventListener("hashchange", () => { if (location.hash === "#qr") setTimeout(drawQr, 0); });
  if (location.hash === "#qr") setTimeout(drawQr, 0);

  window.FOYDALI = { TIPS, tipCard, dayIndex };
  render();
})();
