'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { isStaff, enrolledCourseIds, restrictFilters } = require('../../../utils/access');

const UID = 'api::quiz.quiz';

const NOTHING_TO_SHOW = { page: 1, pageSize: 25, pageCount: 0, total: 0 };

/**
 * Fixed server-side rather than taken from the query string. The answer key
 * lives inside the questions component, so letting the client drive the populate
 * is the difference between a quiz and a quiz with the answers attached.
 */
const QUIZ_POPULATE = {
  questions: true,
  course: { fields: ['documentId', 'title'] },
};

module.exports = createCoreController(UID, ({ strapi }) => {
  /** Rebuilds a quiz response with or without the answer key. */
  function present(sanitized, raw, forStaff) {
    return {
      ...sanitized,
      questions: strapi
        .service(UID)
        .presentQuestions(raw?.questions, { includeAnswerKey: forStaff }),
    };
  }

  /**
   * Validates the question set, and reports whether the request was rejected.
   *
   * It returns a boolean rather than handing back ctx.badRequest()'s own return
   * value, which is the subtle part: those helpers set the status and body on
   * ctx and then return undefined. Testing their result therefore always falls
   * through, super.create() runs anyway, and the response comes back as a 201
   * with a 400 error body stapled to it - having saved the broken quiz.
   */
  async function isRejected(ctx) {
    const questions = ctx.request.body?.data?.questions;

    // Only validate when questions are actually being written - an update that
    // just renames the quiz should not have to resend them all.
    if (questions === undefined) return false;

    const problems = strapi.service(UID).findProblems(questions);

    if (problems.length === 0) return false;

    ctx.badRequest(problems.join(' '));
    return true;
  }

  return {
    async find(ctx) {
      const user = ctx.state.user;
      const forStaff = isStaff(user);

      await this.validateQuery(ctx);
      const query = await this.sanitizeQuery(ctx);

      let finalQuery = { ...query, populate: QUIZ_POPULATE };

      if (!forStaff) {
        // A quiz belongs to a course, so it is gated the same way lessons are.
        const courseIds = await enrolledCourseIds(strapi, user?.id);

        if (courseIds.length === 0) {
          return this.transformResponse([], { pagination: NOTHING_TO_SHOW });
        }

        finalQuery = restrictFilters(finalQuery, {
          course: { documentId: { $in: courseIds } },
        });
      }

      const { results, pagination } = await strapi.service(UID).find(finalQuery);
      const sanitized = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(
        sanitized.map((entry, index) => present(entry, results[index], forStaff)),
        { pagination }
      );
    },

    async findOne(ctx) {
      const user = ctx.state.user;
      const forStaff = isStaff(user);

      await this.validateQuery(ctx);
      const query = await this.sanitizeQuery(ctx);

      const quiz = await strapi
        .service(UID)
        .findOne(ctx.params.id, { ...query, populate: QUIZ_POPULATE });

      if (!quiz) {
        return ctx.notFound();
      }

      if (!forStaff) {
        const courseIds = await enrolledCourseIds(strapi, user?.id);

        if (!courseIds.includes(quiz.course?.documentId)) {
          return ctx.forbidden('Enrol in this course to take its quiz.');
        }
      }

      const sanitized = await this.sanitizeOutput(quiz, ctx);

      return this.transformResponse(present(sanitized, quiz, forStaff));
    },

    async create(ctx) {
      if (await isRejected(ctx)) return undefined;

      return super.create(ctx);
    },

    async update(ctx) {
      if (await isRejected(ctx)) return undefined;

      return super.update(ctx);
    },
  };
});
