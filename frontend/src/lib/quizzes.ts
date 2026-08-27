import 'server-only';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';
import type { Paginated, Quiz, QuizAttempt, Single } from './types';

/**
 * The quiz attached to a course, if there is one.
 *
 * Whether correctIndex comes back is decided entirely by the backend, from the
 * role on the token - staff get it, students do not. Nothing here asks for it or
 * strips it, which is the point: there is no way for a frontend mistake to
 * expose the answer key, because the frontend never has it.
 */
export async function getQuizForCourse(courseDocumentId: string): Promise<Quiz | null> {
  const session = await getSession();

  if (!session) return null;

  try {
    const response = await strapiFetch<Paginated<Quiz>>(
      `/api/quizzes?filters[course][documentId][$eq]=${encodeURIComponent(courseDocumentId)}`,
      { token: session.jwt }
    );

    return response.data[0] ?? null;
  } catch (error) {
    // A student who is not enrolled simply has no quiz to see.
    if (error instanceof StrapiError && error.status === 403) return null;
    throw error;
  }
}

export async function getQuizById(documentId: string): Promise<Quiz | null> {
  const session = await getSession();

  if (!session) return null;

  const response = await strapiFetch<Single<Quiz>>(`/api/quizzes/${documentId}`, {
    token: session.jwt,
  });

  return response.data;
}

/** The caller's own attempts at one quiz, newest first. */
export async function listMyAttempts(quizDocumentId: string): Promise<QuizAttempt[]> {
  const session = await getSession();

  if (!session) return [];

  try {
    const response = await strapiFetch<{ data: QuizAttempt[] }>(
      `/api/quizzes/${quizDocumentId}/attempts`,
      { token: session.jwt }
    );

    return response.data;
  } catch (error) {
    // Staff have no attempts and no permission to ask for them; that is not an
    // error worth showing anybody.
    if (error instanceof StrapiError && error.status === 403) return [];
    throw error;
  }
}
