import type { Session } from './session';
import type { Course } from './types';

/**
 * Mirrors the backend's own ownership rule, for deciding what to put on screen.
 *
 * The authoritative copy lives in backend/src/utils/access.js and runs on every
 * write. This one exists so the UI can avoid offering a form that would only
 * fail - it decides what to *show*, never what is allowed. Where the two
 * disagree, the backend refuses the request and this is simply out of date.
 */
export function canManageCourse(session: Session | null, course: Course): boolean {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'content-manager') return true;
  if (session.role === 'instructor') return course.owner?.id === session.userId;

  return false;
}
