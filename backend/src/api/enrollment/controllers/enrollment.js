'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  isInstructor,
  managesWholeLibrary,
  isEnrolledIn,
  restrictFilters,
} = require('../../../utils/access');

const UID = 'api::enrollment.enrollment';

/**
 * Which enrolment rows a role is allowed to see.
 *
 *   admin / content manager : all of them, for the dashboard and the stats
 *   instructor              : only the ones on courses they own
 *   anyone else             : only their own
 *
 * The last branch is the default on purpose, so an unrecognised role ends up
 * with the narrowest view rather than the widest.
 */
function visibleTo(user) {
  if (managesWholeLibrary(user)) return {};
  if (isInstructor(user)) return { course: { owner: { id: user.id } } };

  return { student: { id: user?.id ?? null } };
}

function canSee(user, enrollment) {
  if (managesWholeLibrary(user)) return true;
  if (isInstructor(user)) return enrollment?.course?.owner?.id === user.id;

  return enrollment?.student?.id === user?.id;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /**
   * Enrolling is the one write a student can make, so both sides of the row are
   * decided by the server: the course comes from the request, the student is
   * always whoever is logged in. Nothing in the payload can enrol somebody else.
   */
  async create(ctx) {
    const user = ctx.state.user;
    const courseId = ctx.request.body?.data?.course;

    if (!courseId) {
      return ctx.badRequest('A course is required to enrol.');
    }

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseId,
    });

    if (!course) {
      return ctx.notFound('That course does not exist.');
    }

    // The schema cannot express "unique per student per course", so the check
    // lives here. Without it a double-clicked Enrol button writes two rows, and
    // every progress percentage derived from them comes out wrong.
    if (await isEnrolledIn(strapi, user.id, courseId)) {
      return ctx.badRequest('You are already enrolled in this course.');
    }

    const enrollment = await strapi.documents(UID).create({
      data: { course: courseId, student: user.id },
    });

    const sanitized = await this.sanitizeOutput(enrollment, ctx);

    ctx.status = 201;
    return this.transformResponse(sanitized);
  },

  async find(ctx) {
    await this.validateQuery(ctx);
    const query = await this.sanitizeQuery(ctx);

    // Applied after sanitizeQuery: this restriction is trusted server state, and
    // filters on relations the caller has no permission to read directly.
    const { results, pagination } = await strapi
      .service(UID)
      .find(restrictFilters(query, visibleTo(ctx.state.user)));

    const sanitized = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitized, { pagination });
  },

  /**
   * findOne cannot be narrowed with a filter the way find can - the core handler
   * looks the row up by id directly - so the row is loaded and checked first.
   */
  async findOne(ctx) {
    const enrollment = await strapi.documents(UID).findOne({
      documentId: ctx.params.id,
      populate: {
        student: { fields: ['id'] },
        course: { populate: { owner: { fields: ['id'] } } },
      },
    });

    if (!enrollment) {
      return ctx.notFound();
    }

    if (!canSee(ctx.state.user, enrollment)) {
      return ctx.forbidden();
    }

    return super.findOne(ctx);
  },
}));
