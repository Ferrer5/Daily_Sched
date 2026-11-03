const CACHE = "schedule-app-v22";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];
const SHELL_FILES = new Set(["index.html", "styles.css", "script.js"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) =>
    Promise.all(FILES.map((file) => cache.add(file).catch((error) => {
      console.warn(`Service worker could not cache ${file}:`, error);
    })))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  const scopeUrl = new URL(self.registration.scope);
  const relativePath = requestUrl.pathname.startsWith(scopeUrl.pathname)
    ? requestUrl.pathname.slice(scopeUrl.pathname.length)
    : "";
  if (relativePath === "" || SHELL_FILES.has(relativePath)) {
    const cachePromise = caches.open(CACHE);
    const updatePromise = cachePromise.then((cache) =>
      fetch(event.request).then((response) => {
        if (response.ok) {
          return cache.put(event.request, response.clone()).then(() => response);
        }
        return response;
      })
    );
    event.waitUntil(updatePromise.catch((error) => {
      console.warn(`Service worker could not refresh ${event.request.url}:`, error);
    }));
    event.respondWith(cachePromise
      .then((cache) => cache.match(event.request))
      .then((cached) => cached || updatePromise));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
