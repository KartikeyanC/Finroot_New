/* FinRoots service worker — minimal, dependency-free.
 * - cross-origin (Supabase / Paddle) is never intercepted (no auth caching)
 * - navigations: network-first, fall back to cached app shell when offline
 * - same-origin static assets (hashed by Vite): cache-first, refreshed in background
 */
const CACHE = "finroots-v1";
// Holds ONE payment receipt shared from another app until the page picks it up
// (see src/lib/sharedInbox.ts). Its own cache so a service-worker update, which
// deletes every other cache below, cannot throw a pending share away.
const SHARE_CACHE = "finroots-share";
const MAX_SHARE_IMAGE_BYTES = 8 * 1024 * 1024; // matches scan-receipt's per-image cap
const SHELL = "/index.html";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => undefined)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/**
 * Web Share Target — "Share → FinRoot" from a payment app.
 *
 * The OS POSTs the shared title/text/url and any image to /share-target. The
 * page cannot receive a POST body, so it is parked in Cache Storage here and
 * the browser is sent on to the app with a 303. Nothing is uploaded: it stays
 * on this device until the page reads and deletes it, and the page ignores
 * anything older than 15 minutes.
 *
 * Whatever goes wrong, the person still ends up in the app — a failed share
 * must never be a dead end or an error page.
 */
async function handleShare(request) {
  try {
    const form = await request.formData();
    const cache = await caches.open(SHARE_CACHE);
    await cache.delete("/__share__/meta");
    await cache.delete("/__share__/image");

    const str = (k) => (typeof form.get(k) === "string" ? String(form.get(k)).slice(0, 2000) : "");
    const file = form.get("receipt");
    let hasImage = false;
    if (file && typeof file === "object" && "size" in file && file.size > 0 && file.size <= MAX_SHARE_IMAGE_BYTES &&
        /^image\/(jpeg|png|webp)$/.test(file.type)) {
      await cache.put("/__share__/image", new Response(file, { headers: { "Content-Type": file.type } }));
      hasImage = true;
    }
    const meta = { at: Date.now(), title: str("title"), text: str("text"), url: str("url"), hasImage };
    await cache.put("/__share__/meta", new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {
    /* fall through to the redirect */
  }
  return Response.redirect("/app?shared=1", 303);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    event.respondWith(handleShare(request));
    return;
  }
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return; // leave API/CDN alone

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
