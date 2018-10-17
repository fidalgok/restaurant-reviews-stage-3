// import DBHelper from './dbhelper';
import DBHelper from './dbhelper.js';

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
const initMap = () => {
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
      fillBreadcrumb(restaurant);
      DBHelper.mapMarkerForRestaurant(restaurant, self.map);
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

      fillRestaurantHTML(restaurant);
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
  const reviewHTML = reviews
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
    <p>${new Date(updatedAt).toLocaleDateString()}</p>
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

initMap();
