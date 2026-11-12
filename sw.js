/* عامل الخدمة: يتيح عمل التطبيق دون اتصال */
const VERSION = 'noor-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/data.js', 'js/praytimes.js',
  'manifest.webmanifest', 'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // لا نخزّن ملفات الصوت لكبر حجمها
  if (url.hostname.includes('islamic.network') || req.headers.has('range')) return;

  // الخطوط وملفات التطبيق: من الذاكرة أولاً ثم الشبكة
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
