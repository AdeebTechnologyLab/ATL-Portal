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
