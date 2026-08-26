'use strict';

/**
 * Shared answers to "who is allowed to touch this row".
 *
 * The permission matrix in src/bootstrap/permissions.js decides which endpoints
 * a role may call. It cannot decide which *rows* they may call them on, because
 * a permission is only an action name. That second half lives here, and is used
 * by the policies and controllers that need it.
 */

const ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content-manager',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
};

const roleOf = (user) => user?.role?.type ?? null;

const isAdmin = (user) => roleOf(user) === ROLES.ADMIN;
const isInstructor = (user) => roleOf(user) === ROLES.INSTRUCTOR;
const isStudent = (user) => roleOf(user) === ROLES.STUDENT;

/** Admins and content managers work across the entire library, not a subset of it. */
const managesWholeLibrary = (user) =>
  roleOf(user) === ROLES.ADMIN || roleOf(user) === ROLES.CONTENT_MANAGER;

/** Anyone whose job involves authoring content, as opposed to consuming it. */
const isStaff = (user) => managesWholeLibrary(user) || isInstructor(user);

/**
 * May this user edit or delete this course?
 *
 * Written to fail closed: an unknown role, a missing user or a course we could
 * not load all return false rather than falling through to "allowed".
 */
function canManageCourse(user, course) {
  if (!user || !course) return false;
  if (managesWholeLibrary(user)) return true;
  if (isInstructor(user)) return course.owner?.id === user.id;
  return false;
}

/** Loads just enough of a course to answer an ownership question. */
async function loadCourseForAccess(strapi, documentId) {
  if (!documentId) return null;

  return strapi.documents('api::course.course').findOne({
    documentId,
    populate: { owner: { fields: ['id'] } },
  });
}

async function isEnrolledIn(strapi, userId, courseDocumentId) {
  if (!userId || !courseDocumentId) return false;

  const count = await strapi.db.query('api::enrollment.enrollment').count({
    where: { student: { id: userId }, course: { documentId: courseDocumentId } },
  });

  return count > 0;
}

/** Every course document id this student is enrolled in. */
async function enrolledCourseIds(strapi, userId) {
  if (!userId) return [];

  const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
    where: { student: { id: userId } },
    populate: { course: true },
  });

  return enrollments.map((enrollment) => enrollment.course?.documentId).filter(Boolean);
}

/**
 * Adds a restriction to a query that the caller cannot escape.
 *
 * Spreading our filter over theirs would not be enough. The client controls
 * ctx.query.filters, and a crafted filters[$or][...] could widen the result set
 * straight back out again. Combining both sides under $and means our condition
 * always has to hold as well, whatever they sent.
 */
function restrictFilters(query, restriction) {
  if (!restriction || Object.keys(restriction).length === 0) {
    return query;
  }

  const clientFilters = query?.filters;

  return {
    ...query,
    filters: clientFilters ? { $and: [clientFilters, restriction] } : restriction,
  };
}

module.exports = {
  ROLES,
  roleOf,
  isAdmin,
  isInstructor,
  isStudent,
  isStaff,
  managesWholeLibrary,
  canManageCourse,
  loadCourseForAccess,
  isEnrolledIn,
  enrolledCourseIds,
  restrictFilters,
};
