'use strict';

const { canManageCourse, courseForContent } = require('../../../utils/access');

/**
 * Guards writes to quizzes, on the same rule as lessons: whoever may manage the
 * course may manage the quizzes attached to it.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const course = await courseForContent(strapi, 'api::quiz.quiz', policyContext);

  return canManageCourse(policyContext.state.user, course);
};
