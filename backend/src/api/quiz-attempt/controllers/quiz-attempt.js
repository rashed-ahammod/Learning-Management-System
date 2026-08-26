'use strict';

const { isEnrolledIn } = require('../../../utils/access');

const UID = 'api::quiz-attempt.quiz-attempt';

/** The shape an attempt is returned in - never the raw record. */
function present(attempt) {
  return {
    id: attempt.documentId,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    answers: attempt.answers,
    submittedAt: attempt.submittedAt,
  };
}

module.exports = ({ strapi }) => ({
  /**
   * POST /api/quizzes/:documentId/attempts   body: { answers: [{ questionId, selectedIndex }] }
   *
   * Grades the submission and stores the result, then hands back the score. The
   * marking happens between those two steps and nowhere else, so the number that
   * gets stored is the number the server worked out.
   *
   * Answers are matched by question id rather than by position, so a question
   * added or reordered between loading the quiz and submitting it cannot shift
   * everything by one and silently mark a student down.
   */
  async submit(ctx) {
    const user = ctx.state.user;

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: { questions: true, course: { fields: ['documentId'] } },
    });

    if (!quiz) {
      return ctx.notFound('That quiz does not exist.');
    }

    const courseId = quiz.course?.documentId;

    if (!(await isEnrolledIn(strapi, user.id, courseId))) {
      return ctx.forbidden('Enrol in this course before taking its quiz.');
    }

    if (!Array.isArray(ctx.request.body?.answers)) {
      return ctx.badRequest('`answers` must be an array of { questionId, selectedIndex }.');
    }

    const result = strapi.service(UID).grade(quiz.questions ?? [], ctx.request.body.answers);

    const attempt = await strapi.documents(UID).create({
      data: {
        student: user.id,
        quiz: quiz.documentId,
        course: courseId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        answers: result.answers,
        submittedAt: new Date(),
      },
    });

    ctx.status = 201;
    return { data: present(attempt) };
  },

  /**
   * GET /api/quizzes/:documentId/attempts
   *
   * The caller's own attempts at one quiz, newest first - this is the "result is
   * stored and viewable later" half. Filtered by the session user, so there is no
   * id a student could swap to read somebody else's marks.
   */
  async mine(ctx) {
    const attempts = await strapi.db.query(UID).findMany({
      where: {
        student: { id: ctx.state.user.id },
        quiz: { documentId: ctx.params.documentId },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return { data: attempts.map(present) };
  },

  /**
   * DELETE /api/quiz-attempts/:documentId
   *
   * Housekeeping for an admin - removing a user's records, say. Note there is
   * still no create or update route: the only way an attempt comes into
   * existence is by answering the questions, and once marked it cannot be
   * edited. Only the admin role is granted this action.
   */
  async remove(ctx) {
    const attempt = await strapi.documents(UID).findOne({
      documentId: ctx.params.documentId,
    });

    if (!attempt) {
      return ctx.notFound();
    }

    await strapi.documents(UID).delete({ documentId: ctx.params.documentId });

    ctx.status = 204;
  },
});
