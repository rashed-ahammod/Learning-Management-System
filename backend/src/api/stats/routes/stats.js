'use strict';

/**
 * An API folder with no content type behind it.
 *
 * Nothing here is stored - the numbers are counted on request. Strapi is happy
 * to register routes and a controller without a schema, which is the right shape
 * for a read-only summary: there is no stats table to drift out of date, and no
 * write path to secure.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/stats/overview',
      handler: 'stats.overview',
    },
  ],
};
