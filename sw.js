/* Service worker mínimo para que la app sea instalable (PWA / Play Store).
   Estrategia:
   - Las páginas (navegación) van primero a la red y, si no hay internet,
     muestran la última versión guardada. Así los cambios se ven enseguida.
   - Los íconos y archivos estáticos se sirven de caché.
   - Nunca cachea Firebase ni las imágenes subidas (van siempre por red). */

const CACHE = "rifas-v1";
const ESTATICOS = [
  "./index.html",
  "./cliente.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Solo manejamos lo que está en nuestro propio sitio.
  if (url.origin !== self.location.origin) return;

  // Navegación (abrir una página): red primero, caché de respaldo.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Estáticos: caché primero, red de respaldo.
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
      return res;
    }))
  );
});
