/**
 * IndexDb setup
 *
 */
import idb from 'idb';

function openDatabase() {
  //if the browser doesn't support serviceworkers skip opening a db
  if (!navigator.serviceWorker) return Promise.resolve();

  //otherwise return the dbPromise

  return idb.open('restaurant', 1, upgradeDb => {
    switch (upgradeDb.oldVersion) {
      case 0:
        upgradeDb.createObjectStore('restaurants', {
          keyPath: 'id',
        });
    }
  });
}

/**
 * Dbpromise configuration
 */

const _dbPromise = openDatabase();

/**
 * get from cache first if it exists
 */
function serveRestaurantsFromCache(callback) {
  return _dbPromise
    .then(db => {
      //no need to serve from cache if restaurants don't exist
      if (!db) return;
      //serve restaurants from cache
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');

      return restaurantStore.getAll();
    })
    .then(
      restaurants => {
        // callback(null, restaurants);

        return restaurants;
      }, //something went wrong
      () =>
        //send the error back in the callback
        callback(
          new Error('something went wrong getting restaurants from cache'),
          null
        )
    );
}

/**
 * Common database helper functions.
 */

class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://127.0.0.1:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  //refactor fetchRestaurants for fetch and async
  static async getRestaurants(callback) {
    try {
      const db = await _dbPromise;
      const cachedRestaurants = await serveRestaurantsFromCache(callback);

      if (cachedRestaurants && cachedRestaurants.length === 0) {
        // didn't receive restaurants from cache, send them via fetch,
        //then proceed to update cache from network
        const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
        const restaurants = await response.json();
        console.log('serving from network fetch');
        callback(null, restaurants);

        //update browser db

        var putPromises = restaurants.map(r => {
          let tx = db.transaction('restaurants', 'readwrite');
          let restaurantStore = tx.objectStore('restaurants');

          return restaurantStore.put(r);
          //according to the idb library transaction will autoclose
          //each time so I don't need to explicitly do so here
          //i was getting errors saying the transaction had already closed
          //when I tried to include it in my code.
        });

        Promise.all(putPromises)
          .then(() => {
            console.log('putting restaurants succeeded');
            //callback(null, restaurants);
          })
          .catch(err => console.log('putting restaurants failed', err));
      } else {
        //otherwise we got restaurants send them from cache
        console.log('serving from cache');
        callback(null, cachedRestaurants);
      }
    } catch (err) {
      //something went down above, just return the err
      return callback(err, null);
    }
  }
  //grab all the restaurant reviews, update idb, return all reviews
  static async getRestaurantReviews(restaurantId) {
    try {
      const res = await fetch(
        `${this.DATABASE_URL}/reviews/?restaurant_id=${restaurantId}`
      );
      const reviews = await res.json();
      return Promise.resolve(reviews);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          // Got the restaurant
          callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //handle missing photos
    restaurant.photograph = restaurant.photograph || 'restaurant-placeholder';
    return restaurant.photograph;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
      }
    );
    marker.addTo(map);
    return marker;
  }
}

export default DBHelper;
