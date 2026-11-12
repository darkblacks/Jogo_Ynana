// Service worker do Gachaqui: o jogo abre mesmo sem internet (IA, torneio e tutorial).
// Código (html/js/css) vem da rede quando possível, para pegar atualizações; imagens vêm do cache.
const CACHE = 'gachaqui-v1';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/ui.js', 'js/engine.js', 'js/ai.js', 'js/headless.js', 'js/tournament.js', 'js/rules.js', 'js/config.js',
  'js/characters.js', 'js/tutorial.js', 'js/native.js', 'fonts/fonts.css', 'assets/board.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // servidor online e fontes: direto na rede
  const isAsset = url.pathname.includes('/assets/');
  if (isAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    })));
  } else {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
  }
});
