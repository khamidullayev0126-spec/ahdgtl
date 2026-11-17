// YouTube video — yengil ko'rinish: avval faqat rasm, bosilgandagina YouTube yuklanadi.
// Sayt tez ochiladi va bosilmaguncha YouTube cookie'lari qo'yilmaydi (youtube-nocookie.com).
// HTML: <button class="yt-lite" data-yt="VIDEO_ID" data-title="..."><img ...></button>
(function () {
  const css = `.yt-lite{position:relative;display:block;width:100%;max-width:560px;aspect-ratio:16/9;padding:0;border:0;border-radius:20px;overflow:hidden;cursor:pointer;background:#1f1c19;box-shadow:0 18px 40px rgba(46,43,37,.18)}
.yt-lite img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
.yt-lite:hover img{transform:scale(1.03)}
.yt-lite::after{content:"";position:absolute;left:50%;top:50%;width:76px;height:54px;margin:-27px 0 0 -38px;border-radius:16px;background:#e62117 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M9 7l8 5-8 5z'/%3E%3C/svg%3E") center/34px no-repeat;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.yt-lite:focus-visible{outline:3px solid #c67139;outline-offset:3px}
.yt-lite.on::after{display:none}
.yt-lite iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.yt-cap{font-size:15px;opacity:.8;margin:10px 0 0}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.addEventListener("click", e => {
    const b = e.target.closest(".yt-lite");
    if (!b || b.classList.contains("on")) return;
    const id = b.dataset.yt;
    if (!/^[\w-]{11}$/.test(id)) return;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&cc_load_policy=1`;
    f.title = b.dataset.title || "YouTube video";
    f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    b.classList.add("on"); b.replaceChildren(f);
    if (typeof window.gtag === "function") window.gtag("event", "video_play", { video: id });
  });
})();
