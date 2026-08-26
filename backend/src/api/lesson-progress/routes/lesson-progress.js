'use strict';

/**
 * Progress deliberately has no generated CRUD routes.
 *
 * If /api/lesson-progresses existed, a student with permission to create rows
 * there could post one naming any lesson - including lessons of courses they
 * never enrolled in - and their percentage would be whatever they decided. So
 * the collection is only reachable through these three routes, each of which
 * works out the student and the course from the session and the URL rather than
 * from the request body.
 *
 * The paths hang off /lessons and /courses because that is what the progress is
 * about; the rows themselves are an implementation detail.
 */
module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/lessons/:documentId/progress',
      handler: 'lesson-progress.set',
    },
    {
      method: 'GET',
      path: '/courses/:documentId/progress',
      handler: 'lesson-progress.mine',
    },
    {
      method: 'GET',
      path: '/courses/:documentId/progress/students',
      handler: 'lesson-progress.students',
    },
  ],
};
