import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const scope = 'https://example.test/hardware-pm-learn/apps/jarvis-canvas/';
const indexUrl = new URL('data/index.json', scope).href;
const currentIndex = JSON.parse(await readFile(new URL('../public/data/index.json', import.meta.url), 'utf8'));
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const cacheStores = new Map();
const deleted = [];
const listeners = new Map();
const key = request => typeof request === 'string' ? request : request.url;
let fetchResource = async () => { throw new Error('Offline'); };
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };

const caches = {
  async open(name) {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    const entries = cacheStores.get(name);
    return {
      async put(request, response) { entries.set(key(request), response.clone()); },
      async match(request, options = {}) {
        const wanted = new URL(key(request));
        for (const [stored, response] of entries) {
          const found = new URL(stored);
          if (options.ignoreSearch) { wanted.search = ''; found.search = ''; }
          if (wanted.href === found.href) return response.clone();
        }
        return undefined;
      },
    };
  },
  async keys() { return [...cacheStores.keys()]; },
  async delete(name) { deleted.push(name); return cacheStores.delete(name); },
};
const context = vm.createContext({
  URL, Request, Response, Headers, caches,
  fetch: (...args) => fetchResource(...args),
  self: {
    registration: { scope },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(name, callback) { listeners.set(name, callback); },
  },
});
vm.runInContext(source, context, { filename: 'sw.js' });
const cacheName = vm.runInContext('CACHE_VERSION', context);
const namespace = vm.runInContext('CACHE_PREFIX', context);
check(cacheName === namespace + 'v2', 'cache version advances only within the app namespace');
check(context.allowed(new URL(indexUrl)), 'own subpath index is intercepted');
check(!context.allowed(new URL('https://example.test/hardware-pm-learn/index.html')), 'garden root is outside the app scope');
check(!context.allowed(new URL('https://drive.google.com/file/d/example/view')), 'Drive originals are outside the cache');

// Exercise the actual network-first path, not a duplicate validator implementation.
fetchResource = async () => Response.json(currentIndex);
const fresh = await context.networkFirst(new Request(indexUrl));
check(fresh.status === 200, 'schema v2 index remains available after SW takes control');
check((await fresh.json()).collections.length === currentIndex.collections.length, 'fresh collection list survives the SW response');
const stored = await (await caches.open(cacheName)).match(indexUrl);
check((await stored.json()).schemaVersion === 2, 'v2 index was cached successfully');

const legacy = { schemaVersion: 1, artifacts: [] };
await context.cacheResponse(indexUrl, Response.json(legacy));
const legacyStored = await (await caches.open(cacheName)).match(indexUrl);
check((await legacyStored.json()).schemaVersion === 1, 'legacy artifact-only index stays compatible');
for (const invalid of [null, { schemaVersion: 3, artifacts: [] }, { schemaVersion: 2, artifacts: {} }, { schemaVersion: 2, artifacts: [], collections: {} }]) {
  await assert.rejects(() => context.cacheResponse(indexUrl, Response.json(invalid)), /Invalid artifact index/);
  checks++;
}

await context.cacheResponse(indexUrl, Response.json(currentIndex));
fetchResource = async () => { throw new Error('Offline'); };
const offline = await context.networkFirst(new Request(indexUrl));
check(offline.status === 200, 'offline request receives the saved index');
check(offline.headers.get('X-Jarvis-Offline') === '1', 'cached response declares offline state');
check((await offline.json()).collections.length === currentIndex.collections.length, 'offline response preserves collections');

// The upgrade must not delete the older knowledge garden or other apps' caches.
await caches.open(namespace + 'v1');
await caches.open('hardware-pm-garden-v1');
await caches.open('jarvis-canvas-pwa:/other-app/:v1');
let activation;
listeners.get('activate')({ waitUntil(promise) { activation = promise; } });
await activation;
check(deleted.length === 1 && deleted[0] === namespace + 'v1', 'upgrade deletes only this app previous cache');
check(cacheStores.has('hardware-pm-garden-v1') && cacheStores.has('jarvis-canvas-pwa:/other-app/:v1'), 'unrelated garden and app caches are preserved');

console.log(`Service Worker index: ${checks} checks passed.`);
