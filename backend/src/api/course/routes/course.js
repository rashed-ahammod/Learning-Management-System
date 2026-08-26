'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * Reading a course is open - the catalogue is public. Writing to one runs
 * through the ownership policy first.
 */
module.exports = createCoreRouter('api::course.course', {
  config: {
    update: { policies: ['is-course-owner'] },
    delete: { policies: ['is-course-owner'] },
  },
});
