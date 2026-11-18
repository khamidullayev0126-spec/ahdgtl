// Tekshir — service worker: ilova internet sekin yoki yo'q bo'lsa ham ochiladi.
// Tekshiruvning o'zi (/api/check) hech qachon keshlanmaydi.
const VERSION = "tekshir-v1";
const SHELL = ["/", "/maslahatlar.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/telegram/")) return;
  // Avval internetdan (yangi versiya), bo'lmasa — keshdan
  e.respondWith(fetch(e.request).then(r => { if (r.ok && u.pathname !== "/share") { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("/"))));
});
