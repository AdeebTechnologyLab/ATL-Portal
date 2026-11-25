const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

self.addEventListener('push', function (e) {
    const data = e.data ? e.data.json() : {};

    const options = {
        body: data.body || 'New message received',
        icon: data.icon || '/logo.png',
        badge: '/logo.png',
        tag: data.tag || 'adeebtech-notification',
        silent: false,
        data: {
            url: data.url || '/'
        }
    };

    e.waitUntil(
        self.registration.showNotification(data.title || 'AdeebTechLab', options)
    );
});

self.addEventListener('notificationclick', function (e) {
    e.notification.close();

    const urlToOpen = new URL(e.notification.data.url, self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    })
        .then((windowClients) => {
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        });

    e.waitUntil(promiseChain);
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Never cache API or socket requests
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache-first for hashed static assets
    if (url.origin === self.location.origin && /\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|jpeg|webp|svg|gif)$/i.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Stale-while-revalidate for same-origin navigations and other static files
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const networkFetch = fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => cached);
                return cached || networkFetch;
            })
        );
        return;
    }

    // Default network
    event.respondWith(fetch(request));
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});
