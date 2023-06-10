// © Kay Sievers <kay@versioduo.com>, 2021-2022
// SPDX-License-Identifier: Apache-2.0

const name = '__NAME__';
const version = __VERSION__;
const files = [
  __FILES__
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
          })
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
