'use strict';

const UID = 'api::lesson-progress.lesson-progress';

/**
 * 3 of 5 lessons done is 60%.
 *
 * The zero guard is not decoration: a content manager can create a course before
 * adding any lessons to it, and without this the dashboard would show "NaN%" the
 * moment a student opened it.
 */
function toPercentage(completed, total) {
  if (!total) return 0;

  return Math.round((completed / total) * 100);
}

/**
 * All the progress arithmetic lives here rather than in the controllers, so
 * there is exactly one definition of what a percentage means. The controllers
 * only decide who is allowed to ask.
 */
module.exports = ({ strapi }) => ({
  toPercentage,

  countLessons(courseDocumentId) {
    return strapi.db.query('api::lesson.lesson').count({
      where: { course: { documentId: courseDocumentId } },
    });
  },

  /** What one student has finished in one course. */
  async forStudent(courseDocumentId, studentId) {
    const totalLessons = await this.countLessons(courseDocumentId);

    const rows = await strapi.db.query(UID).findMany({
      where: { student: { id: studentId }, course: { documentId: courseDocumentId } },
      populate: { lesson: true },
    });

    const completedLessonIds = rows.map((row) => row.lesson?.documentId).filter(Boolean);

    return {
      courseId: courseDocumentId,
      totalLessons,
      completedLessons: completedLessonIds.length,
      percentage: toPercentage(completedLessonIds.length, totalLessons),
      // The UI needs to know *which* lessons are ticked, not just how many.
      completedLessonIds,
    };
  },

  /** What every enrolled student has finished in one course. */
  async forEveryStudent(courseDocumentId) {
    const totalLessons = await this.countLessons(courseDocumentId);

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { course: { documentId: courseDocumentId } },
      populate: { student: true },
    });

    // Fetched in one go and counted in memory. Asking for each student's count
    // inside the loop below would be an N+1, and this list grows with the class.
    const progressRows = await strapi.db.query(UID).findMany({
      where: { course: { documentId: courseDocumentId } },
      populate: { student: true },
    });

    const completedByStudent = new Map();

    for (const row of progressRows) {
      const studentId = row.student?.id;
      if (!studentId) continue;

      completedByStudent.set(studentId, (completedByStudent.get(studentId) ?? 0) + 1);
    }

    const students = enrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => {
        const completed = completedByStudent.get(enrollment.student.id) ?? 0;

        return {
          studentId: enrollment.student.id,
          // Username only. An instructor needs to know who is falling behind,
          // not their email address.
          username: enrollment.student.username,
          completedLessons: completed,
          totalLessons,
          percentage: toPercentage(completed, totalLessons),
        };
      });

    return { courseId: courseDocumentId, totalLessons, students };
  },
});
