import DBHelper from './dbhelper';
import Toast from './toast';
import icons from './icons';

let restaurants, neighborhoods, cuisines, updatedRestaurants;
var initMap, newMap;
var markers = [];

/**
 * Fetch all neighborhoods and set their HTML.
 */
function fetchNeighborhoods() {
  //refactor to only fetch restaurants once, and update html appropriately.
  // Remove duplicates from cuisines
  const uniqueNeighborhoods = new Set(restaurants.map(res => res.neighborhood));
  neighborhoods = [...uniqueNeighborhoods];
  fillNeighborhoodsHTML(neighborhoods);
}

/**
 * Set neighborhoods HTML.
 */
function fillNeighborhoodsHTML(neighborhoods) {
  const select = document.getElementById('neighborhoods-select');
  select.addEventListener('change', updateRestaurants);
  if (select.querySelectorAll('option').length > 1) return;
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
function fetchCuisines() {
  //refactor to only fetch restaurants once, and update html appropriately.
  // Remove duplicates from cuisines
  const uniqueCuisines = new Set(restaurants.map(res => res.cuisine_type));
  cuisines = [...uniqueCuisines];
  fillCuisinesHTML(cuisines);
}

/**
 * Set cuisines HTML.
 */
function fillCuisinesHTML(cuisines) {
  const select = document.getElementById('cuisines-select');
  select.addEventListener('change', updateRestaurants);
  if (select.querySelectorAll('option').length > 1) return;
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  if (navigator.onLine) {
    newMap = L.map('map', {
      center: [40.722216, -73.987501],
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
      {
        mapboxToken:
          'pk.eyJ1Ijoia3lsZS1maWRhbGdvIiwiYSI6ImNqbTd0ODU5dzA1b3EzcW54YnRheDkzMGUifQ.g3ZjhlFEcmPhzVVdon5v-g',
        maxZoom: 18,
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets',
      }
    ).addTo(newMap);
  }

  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
function updateRestaurants() {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, filteredRestaurants) => {
      if (error) {
        // Got an error!
        console.error(
          'error getting restaurants by cuisine and neighborhoods',
          error
        );
      } else {
        resetRestaurants(filteredRestaurants);
        fillRestaurantsHTML(updatedRestaurants);
        fetchNeighborhoods();
        fetchCuisines();
      }
    }
  );
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
function resetRestaurants(filteredRestaurants) {
  // Remove all restaurants

  updatedRestaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (markers) {
    markers.forEach(m => m.remove());
  }
  markers = [];

  updatedRestaurants = filteredRestaurants;
  if (restaurants) return;
  restaurants = filteredRestaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
function fillRestaurantsHTML(restaurants) {
  const ul = document.getElementById('restaurants-list');
  if (ul.querySelector('li')) return;
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  navigator.onLine ? addMarkersToMap(restaurants, newMap) : null;
  //grab all heart forms and add event listener to update
  //restaurants
  const hearts = [...document.querySelectorAll('.heart')];
  hearts.forEach(heart =>
    heart.addEventListener('submit', DBHelper.updateFavoriteRestaurant)
  );
}

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant) {
  let isFavorite;
  const li = document.createElement('li');
  //fallback in case it doesn't exist from database at first
  if (typeof restaurant.is_favorite === 'string') {
    isFavorite = restaurant.is_favorite === 'false' ? false : true;
  } else {
    isFavorite = restaurant.is_favorite || false;
  }

  const picture = createResponsiveImageHtml(
    DBHelper.imageUrlForRestaurant(restaurant),
    restaurant
  );
  li.append(picture);
  const detailsContainer = document.createElement('div');
  detailsContainer.classList.add('restaurants-list--details');
  const header = document.createElement('div');
  header.classList.add('restaurant-list__heading');
  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  const heartClass = isFavorite ? 'heart__button--hearted' : '';
  const heart = `
    <form action="http://localhost:1337/restaurants/${
      restaurant.id
    }/?is_favorite=${!isFavorite}" method="POST" class="heart" data-heart="${!isFavorite}">
      <button type='Submit' name='heart' aria-label="${
        isFavorite ? 'Remove from Favorites' : 'Add to Favorites'
      }"  class="heart__button ${heartClass}">${icons.heart}</button>
    </form>
  `;
  header.append(name);
  header.insertAdjacentHTML('beforeend', heart);
  detailsContainer.append(header);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  detailsContainer.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  detailsContainer.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  detailsContainer.append(more);
  li.append(detailsContainer);
  return li;
}

/**
 * Create responsive images
 */

function createResponsiveImageHtml(imgUrl, restaurant) {
  //getting just the number of the image from the DB
  //add appropriate sizes to the url and add all responsive
  //elements to a picture tag
  const imgSizes = ['300-sm-1x', '600-sm-2x', '800-md-1x'];
  const imgLocation = '/images/';
  const image = document.createElement('img');
  const picture = document.createElement('picture');

  image.className = 'restaurant-img';
  const source = document.createElement('source');
  const mdSource = document.createElement('source');
  imgSizes.forEach(size => {
    let width = size.split('-')[1];
    let density = size.split('-')[2].slice(0, 2);
    //if the width is sm set max width, otherwise set min width
    if (width === 'sm') {
      source.setAttribute('media', '(max-width: 767px)');
      if (!source.getAttribute('srcset')) {
        source.setAttribute(
          'srcset',
          `${imgLocation}${imgUrl}-${size}.jpg ${density}`
        );
      } else {
        //srcset exists, so append image path
        let srcset = source.getAttribute('srcset');
        source.setAttribute(
          'srcset',
          (srcset += `, ${imgLocation}${imgUrl}-${size}.jpg ${density}`)
        );
      }
    } else {
      mdSource.setAttribute('media', '(min-width:768px)');
      mdSource.setAttribute('srcset', `${imgLocation}${imgUrl}-${size}.jpg`);
    }
  });
  image.src = `${imgLocation}${imgUrl}-${imgSizes[0]}.jpg`;
  image.alt = `${restaurant.name} in ${restaurant.neighborhood}
     serves ${restaurant.cuisine_type} cuisine.
    `;
  picture.appendChild(source);
  picture.appendChild(mdSource);
  picture.appendChild(image);

  return picture;
}

/**
 * Add markers for current restaurants to the map.
 */
function addMarkersToMap(restaurants = restaurants, map) {
  if (navigator.onLine) {
    restaurants.forEach(restaurant => {
      // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, map);
      marker.on('click', onClick);
      function onClick() {
        window.location.href = marker.options.url;
      }
      markers.push(marker);
    });
  }
}

/**
 * Register Service Worker
 */
const registerServiceWorker = () => {
  if ('navigator' in window) {
    self.addEventListener('load', () => {
      navigator.serviceWorker
        .register('../serviceworker.js')
        .then(registration => {
          let {
            waiting: workerWaiting,
            active: workerActive,
            installing: workerInstalling,
          } = registration;

          //success
          console.log(
            `Successfully registered service worker with scope: ${
              registration.scope
            }`
          );
          //if there's a worker waiting let's update the user
          if (workerWaiting) {
            console.log("there's a waiting worker");
            //TODO let someone know a worker is waiting
            updateReady(workerWaiting);
          }

          if (workerInstalling) {
            console.log('theres a worker installing');
            //todo: track installing worker
            trackInstalling(workerInstalling);
          }

          registration.addEventListener('updatefound', () => {
            workerInstalling = registration.installing;
            console.log('update found');
            console.log(workerInstalling.state);
            //todo track installing worker
            trackInstalling(workerInstalling);
          });

          //if the active service worker changes fire a window reload
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            function() {
              //fires when the service worker controlling the page changes
              //TODO uncomment this after testing
              window.location.reload();
            }
          );
        })
        .catch(err => {
          //something went wrong
          console.log(`Service worker registration failed with: ${err}`);
        });
    });
  } else {
    /**
     * Service workers aren't supported, do nothing
     */
  }
};

function trackInstalling(installingWorker) {
  installingWorker.addEventListener('statechange', () => {
    //state changed see if it installed
    if (installingWorker.state === 'installed') {
      console.log('update ready');
      //todo call update function
      updateReady(installingWorker);
    }
  });
}

function updateReady(worker) {
  console.log('sending message to refresh', worker);
  //TODO uncomment this after testing

  const confirm = showToast(
    document.querySelector('body'),
    `Hey, there's some fresh improvements coming your way. Hit refresh to spruce things up!`,
    { buttons: ['Dismiss', 'refresh'] }
  );
  confirm.then(() => worker.postMessage({ refresh: true })).catch(err => {
    //do nothing
  });
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  initMap();
  window.addEventListener('offline', function(e) {
    console.log('offline');

    showToast(
      document.querySelector('body'),
      `Oh No! You're offline! That's ok this website works offline, keep browsing without a worry. Anything you do including filling out reviews will be saved once you're back online🎉🎉🎉!`,
      { buttons: ['Dismiss'] }
    ).catch(() => {
      //do nothing, catching a promise so we can update the service worker
    });
  });
  //TODO: turn on after testing
  registerServiceWorker();
});

function showToast(container, message, options) {
  const toast = new Toast(container, message, options);
  toast.appendToContainer();
  const buttons = toast.getButtons;
  return new Promise((resolve, reject) => {
    buttons.forEach(button =>
      button.addEventListener('click', e => {
        console.log(e.target.textContent);
        toast.toast.classList.remove('fadeIn');
        toast.toast.classList.add('fadeOut');
        setTimeout(() => {
          toast.container.removeChild(toast.toast);
        }, 900);
        if (e.target.textContent.toLowerCase() === 'refresh') {
          resolve(true);
        }
        reject(false);
      })
    );
  });
}
