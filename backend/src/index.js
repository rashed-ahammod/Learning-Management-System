'use strict';

const bootstrapApplication = require('./bootstrap');

module.exports = {
  register(/* { strapi } */) {},

  /**
   * Runs once before the server starts accepting requests. We use it to put the
   * application roles and their permissions into the database, because Strapi
   * stores those as data rather than as code - see src/bootstrap/roles.js.
   */
  async bootstrap({ strapi }) {
    await bootstrapApplication(strapi);
  },
};
