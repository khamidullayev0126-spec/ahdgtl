// Admin panel: AI LEGENDS o'quvchilariga maxfiy havola yaratish (admin.js dagi api() dan foydalanadi)
(function () {
  const $ = id => document.getElementById(id);
  const fmt = iso => new Date(iso).toLocaleDateString("uz-UZ");
  async function loadList() {
    try {
      const list = await api("api/legends/oquvchilar");
      $("lg-body").replaceChildren(...list.map(x => {
        const tr = document.createElement("tr");
        [x.ism, x.guruh, fmt(x.yaratildi), fmt(x.tugaydi), x.id].forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.append(td); });
        // Bekor qilish (ikki marta bosiladi — tasodifan bosilmasin) yoki qayta tiklash
        const td = document.createElement("td"), b = document.createElement("button");
        b.type = "button"; b.className = "btn btn-secondary btn-sm";
        b.textContent = x.bekor ? "Tiklash" : "Bekor qilish";
        if (x.bekor) tr.style.opacity = ".55";
        b.addEventListener("click", async () => {
          if (!x.bekor && b.dataset.confirm !== "1") {
            b.dataset.confirm = "1"; b.textContent = "Rostdanmi?";
            setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Bekor qilish"; }, 3000);
            return;
          }
          try { await api("api/legends/bekor", { method: "POST", body: JSON.stringify({ id: x.id, bekor: !x.bekor }) }); loadList(); }
          catch (err) { alert(err.message); }
        });
        td.append(b); tr.append(td);
        return tr;
      }));
    } catch {}
  }
  $("lg-form").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true;
    try {
      const r = await api("api/legends/invite", { method: "POST", body: JSON.stringify({ ism: $("lg-ism").value, guruh: $("lg-guruh").value, kun: $("lg-kun").value }) });
      $("lg-who").textContent = $("lg-ism").value.trim();
      $("lg-link").value = r.link;
      $("lg-warn").textContent = r.ogohlantirish || `Havola ${fmt(r.tugaydi)} gacha ishlaydi. Bekor qilish kerak bo'lsa, pastdagi ro'yxatdan «Bekor qilish»ni bosing.`;
      $("lg-result").hidden = false;
      $("lg-ism").value = "";
      loadList();
    } catch (err) { alert(err.message); }
    btn.disabled = false;
  });
  $("lg-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("lg-link").value); $("lg-copy").textContent = "Nusxalandi ✓"; }
    catch { $("lg-link").select(); $("lg-copy").textContent = "Qo'lda nusxalang"; }
    setTimeout(() => ($("lg-copy").textContent = "Nusxalash"), 2000);
  });
  // Admin kirganida ro'yxatni yuklaymiz
  new MutationObserver(() => { if (!document.getElementById("orders-box").hidden) loadList(); })
    .observe(document.getElementById("orders-box"), { attributes: true, attributeFilter: ["hidden"] });
  if (!document.getElementById("orders-box").hidden) loadList();
})();
