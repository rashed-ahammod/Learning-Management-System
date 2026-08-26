import 'server-only';

import { getSession } from './auth';
import { StrapiError, isRejectedToken, strapiFetch } from './strapi';
import type { Course, CourseProgress, Enrollment, Paginated, Single } from './types';

/** Query string for a page of courses, newest first. */
function catalogueQuery(page = 1, pageSize = 24): string {
  return `pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`;
}

/**
 * The public catalogue.
 *
 * No token is attached, so Strapi answers as the public role - which is the
 * point: this is the same data a logged-out visitor sees, and the page cannot
 * accidentally show more just because a staff member happens to be signed in.
 */
export async function listCourses(): Promise<Course[]> {
  const response = await strapiFetch<Paginated<Course>>(`/api/courses?${catalogueQuery()}`);

  return response.data;
}

/**
 * Courses belonging to the signed-in user, for the manage screens.
 *
 * Content managers and admins work across the whole library, so they get
 * everything; an instructor only sees their own. Filtering by owner is done here
 * rather than trusted to the caller.
 */
export async function listCoursesIOwn(): Promise<Course[]> {
  const session = await getSession();

  if (!session) return [];

  const ownerFilter =
    session.role === 'instructor' ? `&filters[owner][id][$eq]=${session.userId}` : '';

  const response = await strapiFetch<Paginated<Course>>(
    `/api/courses?${catalogueQuery(1, 100)}${ownerFilter}`,
    { token: session.jwt }
  );

  return response.data;
}

/**
 * One course, by its slug.
 *
 * Strapi addresses documents by documentId, so a readable URL means looking the
 * slug up as a filter. Worth the extra hop: /courses/intro-to-react is a link
 * somebody can read, and it survives the course being edited.
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const response = await strapiFetch<Paginated<Course>>(
    `/api/courses?filters[slug][$eq]=${encodeURIComponent(slug)}`
  );

  return response.data[0] ?? null;
}

export async function getCourseByDocumentId(documentId: string): Promise<Course | null> {
  try {
    const response = await strapiFetch<Single<Course>>(`/api/courses/${documentId}`);

    return response.data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}

/** Every course the signed-in student is enrolled in. */
export async function listMyEnrollments(): Promise<Enrollment[]> {
  const session = await getSession();

  if (!session) return [];

  const response = await strapiFetch<Paginated<Enrollment>>(
    '/api/enrollments?populate=course&pagination[pageSize]=100&sort=createdAt:desc',
    { token: session.jwt }
  );

  // The backend already narrows this to the caller's own rows - there is no
  // filter here because there does not need to be one.
  return response.data;
}

export async function getCourseProgress(courseDocumentId: string): Promise<CourseProgress | null> {
  const session = await getSession();

  if (!session) return null;

  try {
    const response = await strapiFetch<Single<CourseProgress>>(
      `/api/courses/${courseDocumentId}/progress`,
      { token: session.jwt }
    );

    return response.data;
  } catch (error) {
    // A rejected token is the caller's problem to handle - it means the whole
    // session is dead, not that this one course has no progress.
    if (isRejectedToken(error)) throw error;

    // Otherwise progress is a nice-to-have on a listing, and a course that
    // cannot report it should not take the page down with it.
    return null;
  }
}

/**
 * Enrolled courses with their progress, for the My courses page.
 *
 * The progress calls are fired together rather than in sequence. One request per
 * course is unavoidable without a bulk endpoint, but waiting for each in turn
 * would make the page as slow as the number of courses the student has.
 */
export async function listMyCoursesWithProgress(): Promise<
  { enrollment: Enrollment; course: Course; progress: CourseProgress | null }[]
> {
  const enrollments = await listMyEnrollments();
  const enrolled = enrollments.filter(
    (enrollment): enrollment is Enrollment & { course: Course } => Boolean(enrollment.course)
  );

  const progresses = await Promise.all(
    enrolled.map((enrollment) => getCourseProgress(enrollment.course.documentId))
  );

  return enrolled.map((enrollment, index) => ({
    enrollment,
    course: enrollment.course,
    progress: progresses[index],
  }));
}

/** Is the signed-in user already enrolled in this course? */
export async function isEnrolledIn(courseDocumentId: string): Promise<boolean> {
  const enrollments = await listMyEnrollments();

  return enrollments.some((enrollment) => enrollment.course?.documentId === courseDocumentId);
}
