/* The production build injects a complete, content-versioned asset manifest. */
const BUILD = '__BUILD_ID__';
const FILES = __PRECACHE_FILES__;
const PREFIX = 'douluo-web-shell-';
const CACHE = PREFIX + BUILD;
const allowed = new Map(FILES.map(file => [file.path, file.mime]));

function validResponse(response, mime) {
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  return response.ok && !response.redirected && mime.includes(type);
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    // Activation is impossible until every page, lazy chunk and artwork exists.
    for (const file of FILES) {
      const response = await fetch(new Request(new URL(file.path, self.location.origin), {cache:'reload', credentials:'same-origin', redirect:'error'}));
      if (!validResponse(response, file.mime)) throw new Error('Incomplete offline package');
      if(file.hash){const bytes=await response.clone().arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');if(hash!==file.hash)throw new Error('Incomplete offline package: hash mismatch');}
      await cache.put(file.path, response);
    }
  } catch (error) {
    await caches.delete(CACHE);
    throw error;
  }
  // No skipWaiting: current games retain the complete version they opened.
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Existing pages can still request their older lazy chunks after activation.
  // Prune only when no game page is open; update entry pages hold no game state.
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(clients.every(client=>new URL(client.url).pathname==='/update.html')){
    const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  }
  // No clients.claim: an already loaded page may belong to a different build.
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate';
  const pathname = navigation && (url.pathname === '/' || url.pathname === '/index.html') ? '/index.html' : url.pathname;
  // APIs, unknown URLs, exports and model traffic never enter the shell cache.
  if ((!allowed.has(pathname)&&!pathname.startsWith('/assets/')) || (navigation && pathname !== '/index.html')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), cached = await cache.match(pathname);
    if (cached) return cached;
    if(pathname.startsWith('/assets/')){for(const key of await caches.keys()){if(key.startsWith(PREFIX)&&key!==CACHE){const previous=await(await caches.open(key)).match(pathname);if(previous)return previous;}}}
    // A missing asset must fail as an asset. Never return HTML for JS/images.
    try {
      const response = await fetch(request);
      if (allowed.has(pathname)&&response.ok && !validResponse(response, allowed.get(pathname))) return Response.error();
      if (allowed.has(pathname)&&validResponse(response, allowed.get(pathname))) await cache.put(pathname, response.clone());
      return response;
    } catch { return Response.error(); }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'DOULUO_OFFLINE_STATUS') (event.ports?.[0]??event.source)?.postMessage({type:'DOULUO_OFFLINE_STATUS',build:BUILD,assets:FILES.length});
  if (event.data?.type === 'DOULUO_ACTIVATE'&&event.data.build===BUILD) event.waitUntil(self.skipWaiting());
});
