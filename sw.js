const CACHE_NAME = 'taskflow-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/today.html',
    '/calendar.html',
    '/note.html',
    '/setting.html',
    '/pomodoro.html',
    '/resorces/css/generic.css',
    '/resorces/css/today.css',
    '/resorces/css/header.css',
    '/resorces/css/login.css',
    '/resorces/css/landing.css',
    '/resorces/js/main.js',
    '/resorces/js/auth.js',
    '/resorces/js/auth-check.js',
    '/resorces/js/header.js',
    '/resorces/js/index.js',
    '/resorces/js/today.js',
    '/resorces/js/calendar.js',
    '/resorces/js/settings.js',
    '/resorces/js/theme-toggle.js',
    '/resorces/js/search.js',
    '/resorces/js/pomodoro.js',
    '/resorces/js/landing.js',
    '/resorces/img/logo.png'
];

// Install - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
    // Skip API calls - always go to network
    if (event.request.url.includes('/api/')) {
        return event.respondWith(fetch(event.request));
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone and cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});
