/* 知识花园 Service Worker：联网优先、离线兜底 */
const CACHE = "hpm-garden-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/answers.js",
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 联网优先：在线时永远拿最新代码（并回填缓存），断网时用缓存，天然避免版本滞留
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html")))
  );
});
