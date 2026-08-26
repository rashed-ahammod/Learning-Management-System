'use strict';

const { canManageCourse, loadCourseForAccess } = require('../../../utils/access');

/**
 * Guards the writes on a single course: PUT and DELETE /api/courses/:id.
 *
 * The permission matrix already decided that instructors may call these routes.
 * This decides whether they may call them on *this* course. Content managers and
 * admins pass for any course; an instructor only for one they own.
 *
 * Returning false produces a 403. We do that for a missing course too rather
 * than a 404, so the response cannot be used to probe which course ids exist.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const user = policyContext.state.user;
  const course = await loadCourseForAccess(strapi, policyContext.params.id);

  return canManageCourse(user, course);
};
