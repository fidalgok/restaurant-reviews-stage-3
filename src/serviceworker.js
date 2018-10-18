//console.log('from service worker: successfully registered');
const cacheVersion = 'restaurant-reviews-v1-';
const restaurantImagesCache = 'restaurant-images';
const restaurantIconsCache = 'restaurant-icons';
const urlsToCache = [
  '/',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/manifest.json',
  '/css/main.css',
  '/restaurant.html',
];
const cacheWhitelist = [
  `${cacheVersion}skeleton`,
  restaurantImagesCache,
  restaurantIconsCache,
];

self.addEventListener('install', event => {
  //open a cache
  event.waitUntil(
    //rewrite for async await
    (async function addCaches() {
      try {
        const cache = await caches.open(`${cacheVersion}skeleton`);

        await cache.addAll(urlsToCache);
      } catch (err) {
        console.log(err);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    //ignore for now
    return;
  }

  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin === location.origin) {
    //cache restaurant images
    if (requestUrl.pathname.startsWith('/images/')) {
      //requesting images so cache them
      event.respondWith(serveImages(event.request));
      return;
    }
    //cache app icons
    if (requestUrl.pathname.startsWith('/images/icons')) {
      //requesting images so cache them
      event.respondWith(serveIcons(event.request));
      return;
    }
    if (requestUrl.pathname.startsWith('/restaurant.html')) {
      return event.respondWith(
        caches.match('/restaurant.html').then(response => {
          if (response) return response;
          return fetch(event.request).then(response => response);
        })
      );
    }
  }

  //block the fetch and respond with our cache before going to the network
  event.respondWith(
    //match a cache to the request event to one of the urls we've specified

    caches
      .match(event.request)
      .then(response => {
        //we've matched a cache now return that to the user, then go to the network
        //for any updates

        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          return response;
        });
      })
      .catch(err => console.log(`error matching cache: ${err}`))
  );
});

/**
 * Activate New Service Workers and remove any old caches
 */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keylist => {
      //needs to return a promise since wait until is expecting that.
      return Promise.all(
        keylist
          .filter(
            key =>
              cacheWhitelist.indexOf(key) === -1 &&
              key.startsWith('restaurant-reviews-')
          )
          .map(key => {
            return caches.delete(key);
          })
      );
    })
  );
});

self.addEventListener('message', e => {
  if (e.data.refresh === true) {
    self.skipWaiting();
  }
});

function serveImages(request) {
  //don't care about storing every size
  //just store the first one that comes back
  var storageUrl = request.url.replace(/-[-\d\w]+\.jpg/, '');
  return caches.open(restaurantImagesCache).then(cache => {
    return cache.match(storageUrl).then(response => {
      return (
        response ||
        fetch(request).then(response => {
          cache.put(storageUrl, response.clone());
          return response;
        })
      );
    });
  });
}

function serveIcons(request) {
  var storageUrl = request.url.replace(/\.png/, '');
  return caches.open(restaurantIconsCache).then(cache => {
    return cache.match(storageUrl).then(response => {
      return (
        response ||
        fetch(request).then(response => {
          cache.put(storageUrl, response.clone());
          return response;
        })
      );
    });
  });
}
