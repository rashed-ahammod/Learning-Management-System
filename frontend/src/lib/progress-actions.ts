'use server';

import { revalidatePath } from 'next/cache';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';

export type ProgressState = { error: string | null };

/**
 * Ticks a lesson off, or un-ticks it.
 *
 * The form sends the state it wants rather than "toggle", matching the endpoint
 * behind it. That matters here more than it looks: a double-submitted form or a
 * retried request would flip a toggle back, and the tick would end up
 * disagreeing with the percentage next to it.
 */
export async function setLessonProgress(
  _previous: ProgressState,
  formData: FormData
): Promise<ProgressState> {
  const lessonId = String(formData.get('lesson') ?? '');
  const completed = formData.get('completed') === 'true';
  const slug = String(formData.get('slug') ?? '');

  if (!lessonId) {
    return { error: 'Something went wrong - reload the page and try again.' };
  }

  const session = await getSession();

  if (!session) {
    return { error: 'Your session has ended. Sign in again.' };
  }

  try {
    await strapiFetch(`/api/lessons/${lessonId}/progress`, {
      method: 'PUT',
      body: { completed },
      token: session.jwt,
    });
  } catch (error) {
    return {
      error: error instanceof StrapiError ? error.message : 'Could not save that. Try again.',
    };
  }

  // The percentage shows on all three of these, so all three are now stale.
  revalidatePath('/my-courses');
  if (slug) {
    revalidatePath(`/courses/${slug}`);
    revalidatePath(`/courses/${slug}/lessons/${lessonId}`);
  }

  return { error: null };
}
