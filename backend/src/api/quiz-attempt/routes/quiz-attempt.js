'use strict';

/**
 * Attempts have no generated CRUD, for the same reason progress does not: if
 * POST /api/quiz-attempts existed, a student could submit their own score and
 * skip the quiz entirely. The only way to create one is to answer the questions.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/quizzes/:documentId/attempts',
      handler: 'quiz-attempt.submit',
    },
    {
      method: 'GET',
      path: '/quizzes/:documentId/attempts',
      handler: 'quiz-attempt.mine',
    },
    {
      method: 'DELETE',
      path: '/quiz-attempts/:documentId',
      handler: 'quiz-attempt.remove',
    },
  ],
};
