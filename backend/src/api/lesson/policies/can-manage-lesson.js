'use strict';

const { canManageCourse, loadCourseForAccess } = require('../../../utils/access');

/**
 * Guards writes to lessons. A lesson has no owner of its own - it inherits the
 * permissions of the course it belongs to.
 *
 * Which course that is depends on the request:
 *   - creating: the course comes from the payload
 *   - updating / deleting: the course comes from the lesson being touched
 *
 * The update case matters. Without it an instructor could edit any lesson on the
 * platform simply by knowing its id, because the matrix grants them lesson.update
 * for lessons in general.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const user = policyContext.state.user;
  const lessonId = policyContext.params.id;

  let courseId;

  if (lessonId) {
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonId,
      populate: { course: { fields: ['documentId'] } },
    });

    courseId = lesson?.course?.documentId;
  } else {
    courseId = policyContext.request.body?.data?.course;
  }

  const course = await loadCourseForAccess(strapi, courseId);

  return canManageCourse(user, course);
};
