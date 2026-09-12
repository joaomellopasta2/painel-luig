// Service worker — mantém o app funcionando offline, mas SEMPRE busca a versão
// mais nova quando há internet (network-first). Assim, toda atualização publicada
// aparece na hora, sem ficar presa em cache antigo.
//
// >>> Ao publicar mudanças, troque o número da versão abaixo (v2 -> v3 -> ...).
//     Isso apaga o cache antigo em TODOS os dispositivos na próxima vez que abrirem.
const CACHE = 'painel-luig-v2';
const SHELL = [
  './', './index.html', './styles.css', './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  // baixa o essencial e assume o controle imediatamente
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // apaga caches de versões anteriores e assume as abas já abertas
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // deixa recursos de fora (fontes do Google, etc.) passarem direto pelo navegador
  if (url.origin !== self.location.origin) return;

  // NETWORK-FIRST: tenta a rede (versão nova); se estiver offline, usa o cache.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
