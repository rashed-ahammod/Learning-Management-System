'use strict';

const { canManageCourse, loadCourseForAccess, isEnrolledIn } = require('../../../utils/access');

const UID = 'api::lesson-progress.lesson-progress';

module.exports = ({ strapi }) => ({
  /**
   * PUT /api/lessons/:documentId/progress   body: { completed: boolean }
   *
   * Deliberately a "set to this state" endpoint rather than a toggle. A toggle
   * depends on what the server currently holds, so a double-tapped checkbox or a
   * retried request flips it back and the tick ends up out of step with the bar.
   * Sending the wanted state makes the call idempotent - asking twice is a no-op.
   *
   * The student is always the caller, never a value from the request, so nobody
   * can complete a lesson on somebody else's behalf.
   */
  async set(ctx) {
    const user = ctx.state.user;
    const completed = ctx.request.body?.completed;

    if (typeof completed !== 'boolean') {
      return ctx.badRequest('`completed` must be true or false.');
    }

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: ctx.params.documentId,
      populate: { course: { fields: ['documentId'] } },
    });

    if (!lesson) {
      return ctx.notFound('That lesson does not exist.');
    }

    const courseId = lesson.course?.documentId;

    if (!(await isEnrolledIn(strapi, user.id, courseId))) {
      return ctx.forbidden('Enrol in this course before tracking progress on it.');
    }

    const existing = await strapi.db.query(UID).findOne({
      where: { student: { id: user.id }, lesson: { documentId: ctx.params.documentId } },
    });

    if (completed && !existing) {
      await strapi.documents(UID).create({
        data: {
          student: user.id,
          lesson: ctx.params.documentId,
          // The course is stored alongside the lesson so a course-wide count is
          // one query rather than a join through every lesson. It is written
          // from the lesson's own course, never from the request, so the two
          // cannot disagree.
          course: courseId,
          completedAt: new Date(),
        },
      });
    } else if (!completed && existing) {
      await strapi.documents(UID).delete({ documentId: existing.documentId });
    }

    // The remaining two combinations already match what was asked for.

    return { data: await strapi.service(UID).forStudent(courseId, user.id) };
  },

  /**
   * GET /api/courses/:documentId/progress
   *
   * The caller's own progress in a course. Always computed from the stored rows
   * rather than accepted from the client, so a student cannot report themselves
   * as finished.
   */
  async mine(ctx) {
    const courseId = ctx.params.documentId;

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseId,
    });

    if (!course) {
      return ctx.notFound('That course does not exist.');
    }

    return { data: await strapi.service(UID).forStudent(courseId, ctx.state.user.id) };
  },

  /**
   * GET /api/courses/:documentId/progress/students
   *
   * How everyone enrolled in a course is doing. Admins and content managers may
   * ask about any course; an instructor only about their own - the same
   * ownership rule the course write routes use.
   */
  async students(ctx) {
    const course = await loadCourseForAccess(strapi, ctx.params.documentId);

    if (!course) {
      return ctx.notFound('That course does not exist.');
    }

    if (!canManageCourse(ctx.state.user, course)) {
      return ctx.forbidden('You can only see progress for your own courses.');
    }

    return { data: await strapi.service(UID).forEveryStudent(ctx.params.documentId) };
  },
});
