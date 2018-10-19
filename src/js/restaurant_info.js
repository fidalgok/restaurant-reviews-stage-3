import DBHelper from './dbhelper.js';
import Toast from './toast';
//helper library to sanitize form submits, learned how to use it in the Learn Node wes bos course. I figured adding a bit of security to the application wouldn't hurt
import dompurify from 'dompurify';

let restaurant;
const reviewForm = document.querySelector('.form');

/**
 * Initialize Google map, called from HTML.
 */
const initApp = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.map = L.map('map', {
        zoom: 16,
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        scrollwheel: false,
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
      ).addTo(self.map);
      fillRestaurantHTML(restaurant);
      fillBreadcrumb(restaurant);
      DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      let submitReview = passRestaurant({ restaurant_id: restaurant.id });
      reviewForm.addEventListener('submit', submitReview);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
function fetchRestaurantFromURL(callback) {
  if (restaurant) {
    // restaurant already fetched!
    callback(null, restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) {
    // no id found in URL
    let error = new Error('Could not find restaurant');
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, foundRestaurant) => {
      if (!foundRestaurant || error) {
        callback(error);
        return;
      }
      restaurant = foundRestaurant;

      callback(null, restaurant);
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
function fillRestaurantHTML(restaurant = restaurant) {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  createResponsiveImageHtml(
    DBHelper.imageUrlForRestaurant(restaurant),
    restaurant
  );

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
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
  const picture = document
    .getElementById('restaurant-img')
    .querySelector('picture');

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
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
function fillRestaurantHoursHTML(operatingHours = restaurant.operating_hours) {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
async function fillReviewsHTML(id = restaurant.id) {
  let reviews = await DBHelper.getRestaurantReviews(id).catch(err => {
    console.log(err);
    reviews = '';
  });
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  //show latest reviews first, then create DOM elements for each review
  const reviewHTML = reviews
    .reverse()
    .map(review => {
      return createReviewHTML(review);
    })
    .join('');
  ul.innerHTML = reviewHTML;
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
function createReviewHTML({
  name,
  id,
  restaurant_id,
  rating,
  comments,
  updatedAt,
}) {
  const html = `
  <li id="review-${id}" data-id='${id}' data-restaurant-id='${restaurant_id}'>
  <div class="review__header review--black">
    <p>${name}</p>
    <p>${
      updatedAt
        ? new Date(updatedAt).toLocaleDateString()
        : new Date().toLocaleDateString()
    }</p>
  </div>
  <p class="review--orange review__rating">
    Rating: ${rating}
  </p>
  <p>${comments}</p>

  </li>
  `;

  return html;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
function fillBreadcrumb(restaurant = restaurant) {
  const breadcrumb = document.getElementById('breadcrumb');
  const list = breadcrumb.querySelector('ul');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  list.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function passRestaurant(restaurant) {
  //passing the restaurant to the evenlistener function
  //will probably refactor later
  return async function handleSubmit(e) {
    e.preventDefault();
    //grab form inputs from this
    const { name, comment, rating } = this;

    //form fields are required except the comment field
    //just validate here they aren't blank before sending the form to the db

    const cleanName = dompurify.sanitize(name.value);
    const cleanComment = dompurify.sanitize(comment.value);

    const review = await DBHelper.createReview({
      name: cleanName,
      rating: rating.value,
      comments: cleanComment,
      restaurant_id: restaurant.restaurant_id,
    }).catch(res => {
      console.log(
        'youre offline, but reviews will be sent after your connection is restored'
      );
      return res.body;
    });
    //todo: update reviews with new review
    //clear form

    this.reset();
    const ul = document.getElementById('reviews-list');
    const reviewHTML = createReviewHTML(review);
    ul.insertAdjacentHTML('afterbegin', reviewHTML);
    console.log(`ive been submitted`, review);
  };
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

document.addEventListener('DOMContentLoaded', event => {
  initApp();
  window.addEventListener('offline', function(e) {
    console.log('offline');

    showToast(
      document.querySelector('body'),
      `Oh No! You're offline! That's ok this website works offline, keep browsing without a worry. Anything you do including filling out reviews will be saved once you're back online🎉🎉🎉!`,
      { buttons: ['Dismiss'] }
    ).catch(() => '');
  });
  //TODO: turn on after testing
  //registerServiceWorker();
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
