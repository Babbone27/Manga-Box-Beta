const CACHE_NAME = 'manga-box-v1.1';

// Nucleo essenziale "scolpito nella pietra" (App Shell)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/favicon/web-app-manifest-192x192.png',
    '/favicon/web-app-manifest-512x512.png'
];

self.addEventListener('install', (event) => {
    // skipWaiting obbliga il service worker in sospeso a diventare subito attivo
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    // Pulizia delle eventuali vecchie caches (manga-box-v1 o precedenti)
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prende il controllo di tutte le schede aperte
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Filtro per evitare che vada in crash con chiamate non standard (es. localhost extensions, POST a database)
    if (!url.protocol.startsWith('http') || event.request.method !== 'GET') {
        return;
    }

    // STRATEGIA: Stale-While-Revalidate (La migliore per le PWA moderne)
    // 1. Restituisce subito il file dalla memoria istantaneamente (zero caricamento).
    // 2. Chiede sottobanco al server (o al PC locale) se c'è una versione più aggiornata.
    // 3. Se c'è, aggiorna la memoria offline di nascosto. Al prossimo riavvio l'app avrà l'aggiornamento.
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                
                // La parte "Revalidate": va a cercare le info vere da internet
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Salva *tutto* (JS, immagini, json esterni) in modo dinamico! Non serve più elencarli a mano.
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Se fallisce (perché l'utente è totalmente offline in treno), non fare nulla ed evita errori
                });

                // "Stale": restituisci *SUBITO* la risposta in memoria altrimenti aspetta internet.
                return cachedResponse || fetchPromise;
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});