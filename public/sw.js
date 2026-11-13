/* Zahir Guest — service worker of the offline audit mode (ZG-6).
 *
 * Registered only for workspaces with the offline mode (tenants.offline_audit_enabled); otherwise the page
 * unregisters it and clears these caches.
 *
 * What it keeps, and how:
 *   zg-static : the app's code and styles (/_next/static, immutable), fonts and icons — cache first.
 *   zg-pages  : the HTML of audit pages (/dashboard/audit/<id>) — network first, the cached copy when offline.
 *               Pages are also prepared ahead (message 'precache' from the app: audits listed on the dashboard).
 *   zg-photos : audit photos already seen (/api/photos/<id>) — network first, the cached copy when offline.
 * Nothing else is ever cached: no other /api route, no POST, no login page, no redirect.
 * When offline, any other app page shows a small page listing the audits available offline.
 * Message 'clear' (logout, offline mode switched off) deletes everything.
 */
const VERSION = 'zg-sw-1';
const STATIC = 'zg-static';
const PAGES = 'zg-pages';
const PHOTOS = 'zg-photos';
const META = 'zg-meta';
const MAX_STATIC = 400;
const MAX_PHOTOS = 200;
const PAGE_TIMEOUT = 6000; // a very slow network counts as offline for audit pages
const FRESH_MS = 10 * 60 * 1000; // a prepared page is not fetched again within 10 minutes

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC, PAGES, PHOTOS, META]);
    for (const k of await caches.keys()) if (k.startsWith('zg-') && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isAuditPage = (url) => url.origin === self.location.origin && /^\/dashboard\/audit\/[0-9a-f-]{36}\/?$/i.test(url.pathname);
const isStatic = (url) =>
  (url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname === '/manifest.webmanifest' || /^\/(icons\/[^/]+|apple-icon[^/]*)\.png$/.test(url.pathname))) ||
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
const isPhoto = (url) => url.origin === self.location.origin && /^\/api\/photos\/[0-9a-f-]{36}$/i.test(url.pathname);
const pageKey = (url) => self.location.origin + url.pathname.replace(/\/$/, '');

/** Only plain successful same-origin answers are kept: never a redirect (session expired, audit closed). */
const cacheable = (res) => res && res.ok && !res.redirected && (res.type === 'basic' || res.type === 'cors') && res.status === 200;

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('timeout')), ms); });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(t); }
}

// ── Audit pages ─────────────────────────────────────────────────────────────────────────────────
/** The code and styles an audit page needs (script / style tags and chunks named in the page's own data). */
function staticRefs(html) {
  const out = new Set();
  const re = /(?:\/_next\/)?(static\/(?:chunks|css|media)\/[^"'\\\s)<>]+)/g;
  let m;
  while ((m = re.exec(html))) out.add(self.location.origin + '/_next/' + m[1]);
  return Array.from(out);
}

async function cacheStatics(urls) {
  const cache = await caches.open(STATIC);
  for (const u of urls) {
    try {
      if (await cache.match(u)) continue;
      const res = await fetch(u, { credentials: 'same-origin' });
      if (cacheable(res)) await cache.put(u, res);
    } catch { /* offline: next time */ }
  }
  await trim(STATIC, MAX_STATIC);
}

async function storePage(key, res) {
  const html = await res.clone().text();
  await cacheStatics(staticRefs(html));
  const body = await res.clone().blob();
  const headers = new Headers(res.headers);
  headers.set('x-zg-cached-at', String(Date.now()));
  // the body is stored decoded: drop what described the network encoding
  for (const h of ['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding']) headers.delete(h);
  await (await caches.open(PAGES)).put(key, new Response(body, { status: 200, headers }));
}

async function auditPage(request) {
  const url = new URL(request.url);
  const key = pageKey(url);
  try {
    const res = await withTimeout(fetch(request), PAGE_TIMEOUT);
    if (cacheable(res)) await storePage(key, res);
    else if (res.redirected || res.status === 404 || res.status === 403) await (await caches.open(PAGES)).delete(key); // closed or no longer accessible
    return res;
  } catch {
    const cached = await (await caches.open(PAGES)).match(key);
    return cached || offlinePage();
  }
}

async function precache(urls) {
  const cache = await caches.open(PAGES);
  for (const raw of urls.slice(0, 30)) {
    try {
      const url = new URL(raw, self.location.origin);
      if (isAuditPage(url)) {
        const key = pageKey(url);
        const cached = await cache.match(key);
        if (cached && Date.now() - Number(cached.headers.get('x-zg-cached-at') || 0) < FRESH_MS) continue;
        const res = await fetch(url.href, { credentials: 'same-origin', redirect: 'follow' });
        if (cacheable(res)) await storePage(key, res);
        else if (res.redirected || res.status === 404 || res.status === 403) await cache.delete(key);
      } else if (isStatic(url)) {
        const s = await caches.open(STATIC);
        if (!(await s.match(url.href))) {
          const res = await fetch(url.href, { credentials: 'same-origin' });
          if (cacheable(res)) await s.put(url.href, res);
        }
      }
    } catch { /* offline or failed: try again next time */ }
  }
  await trim(STATIC, MAX_STATIC);
}

async function availableAudits() {
  const out = [];
  for (const req of await (await caches.open(PAGES)).keys()) {
    const path = new URL(req.url).pathname;
    let name = '';
    try {
      const meta = await (await caches.open(META)).match(self.location.origin + '/__zg/names');
      if (meta) name = ((await meta.json())[path]) || '';
    } catch { /* no names */ }
    out.push({ path, name });
  }
  return out;
}

async function offlinePage() {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const audits = await availableAudits();
  const list = audits.length
    ? '<ul>' + audits.map((a) => `<li><a href="${esc(a.path)}">${esc(a.name || 'Audit')}</a></li>`).join('') + '</ul>'
    : '<p>Aucun audit n’est disponible hors ligne sur ce téléphone.<br><span lang="en">No audit is available offline on this phone.</span></p>';
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors ligne — Zahir Guest</title><style>
body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0D1B2A;color:#F4F1EC;padding:32px max(20px,env(safe-area-inset-left))}
h1{font-weight:400;font-size:1.6rem;margin:0 0 8px;color:#C8A45A}p{color:#B8AE9C}ul{list-style:none;padding:0}
li{margin:10px 0}a{display:block;padding:14px 16px;border:1px solid rgba(200,164,90,.4);border-radius:8px;color:#F4F1EC;text-decoration:none}
button{margin-top:16px;background:none;border:1px solid #C8A45A;color:#C8A45A;border-radius:999px;padding:8px 16px;font:inherit}
</style></head><body><h1>Hors ligne</h1><p>Cette page demande du réseau. Les audits ci-dessous sont disponibles sur ce téléphone.<br><span lang="en">You are offline. These audits are available on this phone.</span></p>
${list}<button onclick="location.reload()">Réessayer</button></body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// ── Static files ────────────────────────────────────────────────────────────────────────────────
async function staticFile(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  const res = await fetch(request);
  const host = new URL(request.url).hostname;
  if (cacheable(res) || (res.type === 'opaque' && (host === 'fonts.gstatic.com' || host === 'fonts.googleapis.com'))) {
    cache.put(request.url, res.clone()).then(() => trim(STATIC, MAX_STATIC)).catch(() => {});
  }
  return res;
}

// ── Photos already seen ─────────────────────────────────────────────────────────────────────────
async function photo(request) {
  const key = new URL(request.url).href;
  try {
    // cors mode: the storage answer can be kept without the large padding browsers add to opaque responses
    const res = await fetch(key, { credentials: 'same-origin', mode: 'cors', redirect: 'follow' });
    if (res.ok && res.type !== 'opaque') {
      const cache = await caches.open(PHOTOS);
      cache.put(key, res.clone()).then(() => trim(PHOTOS, MAX_PHOTOS)).catch(() => {});
    }
    return res;
  } catch {
    const cached = await (await caches.open(PHOTOS)).match(key);
    if (cached) return cached;
    try { return await fetch(request); } catch { return new Response('', { status: 504 }); }
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    if (isAuditPage(url)) { event.respondWith(auditPage(request)); return; }
    // Other app pages: normal network; when it fails, the list of audits available offline
    if (url.origin === self.location.origin && url.pathname.startsWith('/dashboard')) {
      event.respondWith(fetch(request).catch(() => offlinePage()));
    }
    return;
  }
  if (isStatic(url)) { event.respondWith(staticFile(request)); return; }
  if (isPhoto(url)) { event.respondWith(photo(request)); return; }
  // everything else (all other /api routes, RSC requests, third parties): untouched
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'precache' && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      if (data.names && typeof data.names === 'object') {
        const meta = await caches.open(META);
        const key = self.location.origin + '/__zg/names';
        let names = {};
        try { const m = await meta.match(key); if (m) names = await m.json(); } catch { /* none */ }
        Object.assign(names, data.names);
        await meta.put(key, new Response(JSON.stringify(names), { headers: { 'Content-Type': 'application/json' } }));
      }
      await precache(data.urls);
      event.source && event.source.postMessage({ type: 'precached', version: VERSION });
    })());
  } else if (data.type === 'clear') {
    event.waitUntil((async () => {
      for (const k of await caches.keys()) if (k.startsWith('zg-')) await caches.delete(k);
      event.source && event.source.postMessage({ type: 'cleared' });
    })());
  }
});
