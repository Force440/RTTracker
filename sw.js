const CACHE='rt-tracker-pwa-v1.2.1';
const ASSETS=['./','./index.html','./styles.css?v=1.2.1','./app.js?v=1.2.1','./core.js','./manifest.webmanifest','./seed-data.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const sameOrigin=new URL(e.request.url).origin===location.origin;if(!sameOrigin)return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(cached=>cached||caches.match('./index.html'))))});
