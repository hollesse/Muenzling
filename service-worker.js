const CACHE = "muenzling-v3";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
];
// Einzeln cachen, damit eine fehlende Datei (z. B. ein Icon) nicht die ganze Installation abbricht
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          FILES.map((f) =>
            c.add(new Request(f, { cache: "reload" })).catch(() => {}),
          ),
        ),
      ),
  );
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  ),
);
// Netzwerk zuerst (damit Updates sofort ankommen), offline aus dem Cache
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && new URL(e.request.url).origin === location.origin) {
          let copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request)),
  );
});
