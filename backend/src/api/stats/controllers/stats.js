'use strict';

const USER = 'plugin::users-permissions.user';
const ROLE = 'plugin::users-permissions.role';
const BLOG = 'api::blog-post.blog-post';

/**
 * How many users hold each application role.
 *
 * One count per role rather than loading every user and grouping in memory.
 * There are four roles and potentially a great many users, so the query that
 * scales with the smaller number is the right one.
 */
async function usersByRole(strapi) {
  const roles = await strapi.db.query(ROLE).findMany();
  const counts = {};

  for (const role of roles) {
    // Skip Strapi's own built-ins; they are not roles anybody is assigned here.
    if (role.type === 'public' || role.type === 'authenticated') continue;

    counts[role.type] = await strapi.db.query(USER).count({ where: { role: { id: role.id } } });
  }

  return counts;
}

/**
 * Blog totals, which take a moment's thought because of draft and publish.
 *
 * Every document has a draft row, and a published one as well once it goes live.
 * So the number of *posts* is the number of draft rows, and the number that are
 * public is the number of rows carrying a publishedAt. Counting rows without
 * splitting them that way would double-count every published post.
 */
async function blogCounts(strapi) {
  const [total, published] = await Promise.all([
    strapi.db.query(BLOG).count({ where: { publishedAt: { $null: true } } }),
    strapi.db.query(BLOG).count({ where: { publishedAt: { $notNull: true } } }),
  ]);

  return { total, published, drafts: total - published };
}

module.exports = ({ strapi }) => ({
  /**
   * GET /api/stats/overview
   *
   * Admin-only, granted through the permission matrix like every other action.
   */
  async overview(ctx) {
    const count = (uid) => strapi.db.query(uid).count();

    const [roles, courses, lessons, enrollments, quizzes, attempts, progress, blog] =
      await Promise.all([
        usersByRole(strapi),
        count('api::course.course'),
        count('api::lesson.lesson'),
        count('api::enrollment.enrollment'),
        count('api::quiz.quiz'),
        count('api::quiz-attempt.quiz-attempt'),
        count('api::lesson-progress.lesson-progress'),
        blogCounts(strapi),
      ]);

    const totalUsers = Object.values(roles).reduce((sum, n) => sum + n, 0);

    ctx.body = {
      data: {
        users: { total: totalUsers, byRole: roles },
        courses,
        lessons,
        enrollments,
        quizzes,
        quizAttempts: attempts,
        lessonsCompleted: progress,
        blogPosts: blog,
      },
    };
  },
});
