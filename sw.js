/* عامل الخدمة: أحدث نسخة من الشبكة دائماً، والذاكرة عند انقطاع الإنترنت */
const VERSION = 'noor-v8';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/data.js', 'js/praytimes.js',
  'js/native-flags.js', 'js/quran-meta.js', 'js/academy-data.js', 'js/audio-lib.js', 'js/academy.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/father.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && !k.startsWith('noor-audio')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // لا نخزّن ملفات الصوت لكبر حجمها
  if (/islamic\.network|mp3quran\.net|everyayah\.com/.test(url.hostname) || req.headers.has('range')) return;

  if (url.origin === self.location.origin) {
    // ملفات التطبيق: الشبكة أولاً (بدون ذاكرة المتصفح) ثم النسخة المحفوظة
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then((res) => put(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // الخطوط وبيانات القرآن: من الذاكرة أولاً ثم الشبكة
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)))
  );
});
