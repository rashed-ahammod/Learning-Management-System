'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * Writes inherit the permissions of the lesson's course. Reads are gated in the
 * controller instead, because they depend on enrolment rather than ownership.
 */
module.exports = createCoreRouter('api::lesson.lesson', {
  config: {
    create: { policies: ['can-manage-lesson'] },
    update: { policies: ['can-manage-lesson'] },
    delete: { policies: ['can-manage-lesson'] },
  },
});
