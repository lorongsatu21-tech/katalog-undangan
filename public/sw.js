const CACHE = 'ls21-v1';
const ASSETS = ['./','./index.html','./css/app.css','./js/app.js','./js/store.js','./manifest.json','./icons/icon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
