/* App-shell cache only. Drive originals and all cross-origin requests are untouched. */
const scope = new URL(self.registration.scope);
const CACHE_PREFIX = 'jarvis-canvas-pwa:' + scope.pathname + ':';
const CACHE_VERSION = CACHE_PREFIX + 'v1';
const appUrl = path => new URL(path, scope).href;
const relativePath = url => url.pathname.slice(scope.pathname.length);

function allowed(url) {
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return false;
  const path = relativePath(url);
  return path === '' || path === 'index.html' || path === 'manifest.webmanifest' || path === 'data/index.json'
    || /^(?:assets|icons|content)\/[^?#]+$/.test(path);
}

async function cacheResponse(request, response) {
  // Avoid opaque responses, error pages and HTML returned accidentally for a missing asset.
  if (!response.ok || response.type === 'opaque') return response;
  const url = new URL(request.url || request);
  const path = relativePath(url);
  if (/^(?:assets|icons|content)\//.test(path) && (response.headers.get('content-type') || '').includes('text/html')) return response;
  if (path === 'data/index.json') {
    const index = await response.clone().json();
    if (index?.schemaVersion !== 1 || !Array.isArray(index.artifacts)) throw new Error('Invalid artifact index');
  }
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error('App resource unavailable');
    return await cacheResponse(request, response);
  } catch {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request, { ignoreSearch: true });
    const fallback = cached || (request.mode === 'navigate' ? await cache.match(appUrl('index.html')) || await cache.match(appUrl('./')) : null);
    if (fallback) {
      // The UI can distinguish the last cached index from a successful fresh synchronization.
      const headers = new Headers(fallback.headers);
      headers.set('X-Jarvis-Data-State', 'offline-cache');
      headers.set('X-Jarvis-Offline', '1');
      return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers });
    }
    return new Response('当前离线，尚无可用的本地缓存。请联网打开一次后再试。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const update = fetch(request).then(response => cacheResponse(request, response));
  if (cached) { event.waitUntil(update.catch(() => undefined)); return cached; }
  try { return await update; }
  catch { return new Response('', { status: 503 }); }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const page = await fetch(appUrl('index.html'), { cache: 'reload' });
    if (!page.ok) throw new Error('Cannot cache the app shell');
    await cache.put(appUrl('index.html'), page.clone());
    await cache.put(appUrl('./'), page.clone());
    const html = await page.text();
    // Discover the generated JS/CSS paths rather than guessing Vite's hashed filenames.
    const resources = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
      .map(match => new URL(match[1], appUrl('index.html')))
      .filter(url => allowed(url) && !url.hash)
      .map(url => url.href);
    resources.push(appUrl('manifest.webmanifest'), appUrl('data/index.json'), appUrl('icons/icon-192.png'), appUrl('icons/icon-512.png'));
    await Promise.all([...new Set(resources)].map(async url => {
      try { const response = await fetch(url, { cache: 'reload' }); await cacheResponse(url, response); }
      catch { /* Optional assets will be cached on first successful use. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!allowed(url)) return;
  const path = relativePath(url);
  if (request.mode === 'navigate' || path === 'data/index.json' || path === 'manifest.webmanifest' || path.endsWith('.json') || path.endsWith('.html') || path === '') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'JARVIS_SKIP_WAITING') self.skipWaiting();
});
