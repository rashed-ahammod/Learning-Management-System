'use strict';

/**
 * Everything that hangs off a course, in the order it has to go.
 *
 * Progress rows and attempts first, because they refer to lessons and quizzes;
 * then the lessons and quizzes themselves; then the enrolments.
 */
const CHILDREN = [
  'api::lesson-progress.lesson-progress',
  'api::quiz-attempt.quiz-attempt',
  'api::lesson.lesson',
  'api::quiz.quiz',
  'api::enrollment.enrollment',
];

async function removeChildrenOf(courseIds) {
  if (courseIds.length === 0) return;

  for (const uid of CHILDREN) {
    await strapi.db.query(uid).deleteMany({ where: { course: { id: { $in: courseIds } } } });
  }
}

/** Resolves whichever rows a delete is about to remove, before they are gone. */
async function courseIdsFor(where) {
  const courses = await strapi.db.query('api::course.course').findMany({
    where,
    select: ['id'],
  });

  return courses.map((course) => course.id);
}

/**
 * Strapi does not cascade deletes across relations, so removing a course would
 * otherwise leave its lessons, quizzes, enrolments, progress rows and attempts
 * behind.
 *
 * That is worse than untidy. Those rows become unreachable: the ownership
 * policies work out who may touch a lesson or a quiz by looking at the course it
 * belongs to, so once the course is gone nobody can edit or delete them - not
 * even an admin. They are also still counted by any query that does not join
 * through the course.
 *
 * Doing this as a lifecycle rather than in the controller means it also applies
 * to deletions made from the Strapi admin panel, which never touch our routes.
 */
module.exports = {
  async beforeDelete(event) {
    await removeChildrenOf(await courseIdsFor(event.params.where));
  },

  async beforeDeleteMany(event) {
    await removeChildrenOf(await courseIdsFor(event.params.where));
  },
};
