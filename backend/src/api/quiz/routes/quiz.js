'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * Reads are gated on enrolment inside the controller, which also decides whether
 * the answer key travels with the response. Writes run through the ownership
 * policy, on the same rule as the lessons of the course.
 */
module.exports = createCoreRouter('api::quiz.quiz', {
  config: {
    create: { policies: ['can-manage-quiz'] },
    update: { policies: ['can-manage-quiz'] },
    delete: { policies: ['can-manage-quiz'] },
  },
});
