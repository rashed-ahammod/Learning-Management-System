'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  isStaff,
  isEnrolledIn,
  enrolledCourseIds,
  restrictFilters,
} = require('../../../utils/access');

const UID = 'api::lesson.lesson';

const NOTHING_TO_SHOW = { page: 1, pageSize: 25, pageCount: 0, total: 0 };

/**
 * Lesson content is the thing students enrol to get, so reads are gated here
 * rather than left to the permission matrix - which can only say "may call
 * /api/lessons", never "may read this particular lesson".
 *
 * Both overrides treat anyone who is not clearly staff as a student. Failing
 * closed means a role added to the matrix later cannot accidentally inherit
 * unrestricted read access.
 */
module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;

    await this.validateQuery(ctx);
    const query = await this.sanitizeQuery(ctx);

    let finalQuery = query;

    if (!isStaff(user)) {
      const courseIds = await enrolledCourseIds(strapi, user?.id);

      // No enrolments means nothing to show. Returning early also avoids an
      // $in: [] filter, which is awkward to get right across databases.
      if (courseIds.length === 0) {
        return this.transformResponse([], { pagination: NOTHING_TO_SHOW });
      }

      // Applied after sanitizeQuery on purpose. Our restriction is trusted
      // server state, so it should not be validated against the caller's own
      // field permissions the way their query string is.
      finalQuery = restrictFilters(query, {
        course: { documentId: { $in: courseIds } },
      });
    }

    const { results, pagination } = await strapi.service(UID).find(finalQuery);
    const sanitized = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitized, { pagination });
  },

  async findOne(ctx) {
    const user = ctx.state.user;

    if (!isStaff(user)) {
      const lesson = await strapi.documents(UID).findOne({
        documentId: ctx.params.id,
        populate: { course: { fields: ['documentId'] } },
      });

      if (!lesson) {
        return ctx.notFound();
      }

      const enrolled = await isEnrolledIn(strapi, user?.id, lesson.course?.documentId);

      if (!enrolled) {
        return ctx.forbidden('Enrol in this course to read its lessons.');
      }
    }

    return super.findOne(ctx);
  },
}));
