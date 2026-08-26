'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';

export type EnrollState = { error: string | null };

/**
 * Enrols the signed-in student in a course.
 *
 * Note what is *not* sent: the student. The backend takes that from the token,
 * so this form has no field an attacker could point at somebody else - and the
 * duplicate check lives there too, which is why a second click comes back as a
 * readable message rather than a second row.
 */
export async function enroll(_previous: EnrollState, formData: FormData): Promise<EnrollState> {
  const courseId = String(formData.get('course') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!courseId) {
    return { error: 'Something went wrong - reload the page and try again.' };
  }

  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    await strapiFetch('/api/enrollments', {
      method: 'POST',
      body: { data: { course: courseId } },
      token: session.jwt,
    });
  } catch (error) {
    if (error instanceof StrapiError) {
      return { error: error.message };
    }

    return { error: 'Could not reach the server. Try again in a moment.' };
  }

  // Both pages now show something different, so both need rebuilding.
  revalidatePath('/my-courses');
  if (slug) revalidatePath(`/courses/${slug}`);

  redirect('/my-courses');
}
