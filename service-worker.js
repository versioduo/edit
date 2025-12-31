const name = 'edit';
const version = 99;
const files = [
  './',
  'css/bulma-addons.css',
  'css/bulma.min.css',
  'css/fontawesome.min.css',
  'css/fonts.css',
  'icons/logo-black.svg',
  'icons/logo-boxed.png',
  'icons/logo-boxed.svg',
  'icons/logo-maskable.svg',
  'icons/logo.svg',
  'js/V2Editor.js',
  'js/V2EditorTrack.js',
  'js/V2MIDI.js',
  'js/V2MIDIFile.js',
  'js/V2Web.js',
  'site.webmanifest',
  'webfonts/AlteDIN1451Mittelschrift.woff2',
  'webfonts/fa-brands-400.woff2',
  'webfonts/fa-regular-400.woff2',
  'webfonts/fa-solid-900.woff2'
];

// Receive commands from the application.
self.addEventListener('message', (e) => {
  if (!e.data || !e.data.type)
    return;

  switch (e.data.type) {
    case 'skipWaiting':
      self.skipWaiting();
      break;
  }
});

// Install a new version of the files, bypass the browser's cache.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(name + '-' + version).then((cache) => {
      for (const file of files) {
        fetch(file, {
          cache: 'no-cache'
        })
          .then((response) => {
            if (!response.ok)
              throw new Error('Status=' + response.status);

            return cache.put(file, response);
          });
      }
    })
  );
});

// After an upgrade, delete all other versions of the cached files.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith(name + '-') && (key !== name + '-' + version))
            return caches.delete(key);
        })
      );
    })
  );
});

// Try to serve the cached page, fall back to the network.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then((response) => {
        return response || fetch(e.request);
      })
  );
});
