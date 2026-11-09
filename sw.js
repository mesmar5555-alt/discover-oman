/* حفظ نسخة من اللعبة على الجهاز: بعد أول زيارة تفتح اللعبة حتى دون إنترنت.
   عند تحديث الملفات على GitHub تصل النسخة الجديدة في الزيارة التالية. */
var CACHE = 'discover-oman-v4';
var FILES = [
  './',
  'css/style.css',
  'fonts/tajawal-arabic-400-normal.woff2',
  'fonts/tajawal-arabic-500-normal.woff2',
  'fonts/tajawal-arabic-700-normal.woff2',
  'fonts/tajawal-arabic-800-normal.woff2',
  'fonts/tajawal-latin-400-normal.woff2',
  'fonts/tajawal-latin-500-normal.woff2',
  'fonts/tajawal-latin-700-normal.woff2',
  'fonts/tajawal-latin-800-normal.woff2',
  'img/icon-180.png',
  'img/icon.svg',
  'index.html',
  'js/app.js',
  'js/audio.js',
  'js/data.js',
  'js/drag.js',
  'js/pointer-polyfill.js',
  'js/tap.js',
  'js/games/coloring.js',
  'js/games/countries.js',
  'js/games/labelgame.js',
  'js/games/puzzle.js',
  'js/games/seas.js',
  'js/games/wilayat.js',
  'js/geo.js',
  'js/map.js',
  'js/ui.js',
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) { if (res && res.ok) c.put(e.request, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
