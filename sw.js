// AHdigital ilovasi — service worker
// Ilova internet sekin yoki yo'q bo'lsa ham ochilishi uchun asosiy fayllarni saqlab qo'yadi.
// Yangilanganda VERSION raqamini oshiring — eski kesh o'chadi.
const VERSION = "ahd-v1";
const SHELL = ["/app.html", "/manifest.json", "/icon-192.png", "/icon-512.png", "/images/logo.svg", "/offline.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/telegram/") || url.pathname.startsWith("/legends")) return; // jonli ma'lumot — keshlanmaydi

  // Sahifalar: avval internetdan (yangisi), bo'lmasa keshdan
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("/offline.html")))
    );
    return;
  }

  // Rasm, shrift, CSS: keshdan darhol, orqada yangilab qo'yamiz
  if (/\.(png|jpe?g|svg|webp|css|woff2?|ttf)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
