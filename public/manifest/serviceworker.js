const CACHENAME = 'nkardazolink-v1';
const ASSETS = [
  '../../../',
  '../../../index.html',
  '../../../index_new.html',

  'https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap',
  'https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@200;300;400;500;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@200;300;400;500;600;700;900&display=swap',

  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined',
  'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHENAME).then((cache) => {console.log('caching'); cache.addAll(ASSETS)})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHENAME)
        .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});