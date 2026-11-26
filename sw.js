/* CODE ADVENTURE - Service Worker untuk mode offline/PWA */
'use strict';
var CACHE = 'code-adventure-v3';
var CORE = [
  './', './index.html', './manifest.webmanifest', './sw.js',
  './assets/icon-192.png', './assets/icon-512.png',
  './vendor/phaser/phaser.min.js',
  './vendor/blockly/blockly_compressed.js',
  './vendor/blockly/blocks_compressed.js',
  './vendor/blockly/msg/id.js',
  './vendor/blockly/media/sprites.svg',
  './vendor/blockly/media/click.mp3',
  './vendor/blockly/media/delete.mp3',
  './vendor/blockly/media/disconnect.mp3',
  './vendor/blockly/media/drop.mp3',
  './vendor/blockly/media/dropdown-arrow.svg',
  './vendor/blockly/media/delete-icon.svg',
  './vendor/blockly/media/foldout-icon.svg',
  './vendor/blockly/media/resize-handle.svg',
  './src/styles/main.css',
  './src/core/util.js', './src/core/storage.js', './src/core/audio.js', './src/core/scoring.js',
  './src/game/levels.js', './src/game/world.js', './src/game/scene.js',
  './src/blocks/definitions.js', './src/blocks/toolbox.js',
  './src/engine/interpreter.js',
  './src/ui/pseudocode.js', './src/ui/export.js', './src/ui/teacher.js', './src/ui/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(CORE.map(function (url) {
      return cache.add(url).catch(function () { /* berkas opsional dilewati */ });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
