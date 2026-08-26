import 'server-only';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';
import type { Lesson, Single } from './types';

/**
 * One lesson, with its body.
 *
 * There is no enrolment check here, and that is deliberate rather than an
 * oversight: /api/lessons/:id already refuses anyone who is not enrolled or
 * staff. Repeating the rule in the frontend would mean two versions of it to
 * keep in step, and only one of them would actually be enforcing anything.
 *
 * A 403 is left to travel up so the page can say something useful about it - it
 * means "not enrolled", which is a thing worth telling somebody, not an error.
 */
export async function getLesson(documentId: string): Promise<Lesson | null> {
  const session = await getSession();

  if (!session) return null;

  try {
    const response = await strapiFetch<Single<Lesson>>(`/api/lessons/${documentId}`, {
      token: session.jwt,
    });

    return response.data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}
