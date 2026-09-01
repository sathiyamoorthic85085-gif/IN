const CACHE_NAME = "innohack26-event-assets-v4";
const APP_SHELL = ["/", "/register", "/manifest.webmanifest", "/event-media-manifest.json"];

const cacheAsset = (cache, asset) => cache.add(asset).catch(() => undefined);

async function getManagedEventMedia() {
  const response = await fetch("/event-media-manifest.json", { cache: "no-store" });
  if (!response.ok) return [];
  const media = await response.json();
  return Array.isArray(media) ? media.filter((asset) => typeof asset === "string" && asset.startsWith("/media/")) : [];
}

async function cacheInitialShell(cache) {
  const shell = await fetch("/");
  if (!shell.ok) return;
  await cache.put("/", shell.clone());
  const html = await shell.text();
  const buildAssets = [...html.matchAll(/(?:src|href)="([^"?]+\/assets\/[^"?]+(?:\?[^\"]*)?)"/g)].map((match) => match[1]);
  await Promise.all(buildAssets.map((asset) => cacheAsset(cache, asset)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    const eventMedia = await getManagedEventMedia().catch(() => []);
    await Promise.all([...APP_SHELL.filter((asset) => asset !== "/"), ...eventMedia].map((asset) => cacheAsset(cache, asset)));
    await cacheInitialShell(cache).catch(() => undefined);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/media/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response; })));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
  }
});

