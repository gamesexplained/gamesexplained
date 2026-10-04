/* The site's service worker: what lets a phone install the site as an app and open the pages
   it has seen without a connection. kit/scripts/build.py writes it to _site/sw.js with
   PRECACHE filled in, and every page's head registers it.

   Network first. Every request goes to the network as it would without a service worker,
   and the copy saved on the device answers only when the network cannot, so a deploy is
   never hidden behind a stale page. Each answer from the network replaces the saved copy;
   the oldest copies go first past LIMIT entries.

   PRECACHE is saved on install: the home page, the manifest, the icons and the lib files by
   their hashed URLs. The hashes change the bytes of this file when a lib file changes,
   which is what makes the browser install the new worker. */
const CACHE = "ge-1";       // change it to drop every saved copy on the next visit
const LIMIT = 400;
const PRECACHE = {{precache}};

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.registration.navigationPreload && self.registration.navigationPreload.enable())
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // Only the site's own files. A range request (audio, video) goes straight through:
  // a partial answer is not a copy of the file.
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin || req.headers.has("range")) return;
  const net = Promise.resolve(e.preloadResponse).then(r => r || fetch(req));
  e.respondWith(net.then(res => {
    if (res.ok && res.type === "basic") e.waitUntil(save(req, res.clone()));
    return res;
  }, () => caches.match(req).then(hit => hit || (req.mode === "navigate" ? offline() : Response.error()))));
});

async function save(req, res) {
  const c = await caches.open(CACHE);
  await c.put(req, res);
  const keys = await c.keys();   // oldest first: a put moves its entry to the end
  await Promise.all(keys.slice(0, Math.max(0, keys.length - LIMIT)).map(k => c.delete(k)));
}

function offline() {
  const home = self.registration.scope;
  return new Response(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · Games Explained</title>
<link rel="icon" href="${home}icons/icon.svg" type="image/svg+xml">
<body style="font:17px/1.6 system-ui,sans-serif;background:#e9e7e1;color:#2f3136;max-width:36em;margin:0 auto;padding:48px 24px">
<h1 style="font-size:30px;margin:0 0 .5em">No connection</h1>
<p>This page has not been opened on this device before, so there is no copy of it here.
Pages you have read before open without a connection.</p>
<p><a href="${home}" style="color:#1f5fa8">Go to the home page</a></p>`,
    {status: 503, headers: {"Content-Type": "text/html; charset=utf-8"}});
}
