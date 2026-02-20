// 꿈해몽 & 운세 - Service Worker
const CACHE_NAME = 'dream-fortune-v2';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/i18n.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './js/locales/ko.json',
    './js/locales/en.json',
    './js/locales/zh.json',
    './js/locales/hi.json',
    './js/locales/ru.json',
    './js/locales/ja.json',
    './js/locales/es.json',
    './js/locales/pt.json',
    './js/locales/id.json',
    './js/locales/tr.json',
    './js/locales/de.json',
    './js/locales/fr.json'
];

// 설치 시 캐시
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// Network-first for HTML/JS, cache-first for other assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isHTMLorJS = event.request.destination === 'document'
        || event.request.destination === 'script'
        || url.pathname.endsWith('.html')
        || url.pathname.endsWith('.js')
        || url.pathname.endsWith('.json');

    if (isHTMLorJS) {
        // Network-first for HTML/JS/JSON
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Cache-first for other assets (CSS, images, fonts)
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        fetch(event.request).then(fetchResponse => {
                            if (fetchResponse && fetchResponse.status === 200) {
                                caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchResponse));
                            }
                        }).catch(() => {});
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    }
});

// 활성화 시 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
