/* 知识花园 Service Worker：联网优先、离线兜底 */
const CACHE = "hpm-garden-v4-full-20261015";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/answers.js",
  "./js/pdf-answers/ch01.js",
  "./js/pdf-answers/ch02-03.js",
  "./js/pdf-answers/ch04-06.js",
  "./js/pdf-answers/ch07-09.js",
  "./js/pdf-answers/ch10-12.js",
  "./js/pdf-answers/ch13-15.js",
  "./js/pdf-answers/ch16-18.js",
  "./js/pdf-answers/ch19-21.js",
  "./js/pdf-answers/ch22.js",
  "./source.html",
  "./css/source.css",
  "./js/source-data.js",
  "./js/source-search.js",
  "./sources/interview-full.md",
  "./sources/manifest.json",
  "./js/knowledge.js",
  "./js/cases.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("hpm-garden-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || (e.request.mode === "navigate" ? caches.match(url.pathname.endsWith("source.html") ? "./source.html" : "./index.html") : Response.error())))
  );
});
