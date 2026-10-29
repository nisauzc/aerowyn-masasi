/* Çevrimdışı kullanım için önbellek. Dosya değişince SURUM'u artır. */
var SURUM = "aerowyn-v5";
var FILES = ["./", "./css/style.css", "./icons/apple-touch-icon.png", "./icons/fox.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable.png", "./index.html", "./js/core.js", "./js/events.js", "./js/health.js", "./js/settings.js", "./js/i18n.js", "./js/pomo.js", "./js/store.js", "./js/views.js", "./js/words.js", "./kelime/css/style.css", "./kelime/data/starter.js", "./kelime/index.html", "./kelime/js/app.js", "./kelime/js/csv.js", "./kelime/js/srs.js", "./kelime/js/store.js", "./kelime/js/study.js", "./kelime/js/ui.js", "./manifest.json"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SURUM).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(new Request(f, { cache: "reload" })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return k === SURUM ? null : caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
/* Önce ağ, olmazsa önbellek: çevrimiçiyken hep güncel sürüm gelir */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(SURUM).then(function (c) { c.put(req, copy); }).catch(function () {});
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("./index.html"); });
  }));
});
