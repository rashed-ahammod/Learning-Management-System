'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getSession } from './auth';
import { slugify } from './slug';
import { StrapiError, strapiFetch } from './strapi';
import type { Course, Paginated } from './types';

/**
 * `saved` is what separates "has not been submitted yet" from "submitted and it
 * worked". Both have error: null, so without it every form would announce
 * success the moment it rendered.
 */
export type FormState = { error: string | null; saved?: boolean };

const ok: FormState = { error: null, saved: true };

function fail(error: unknown, fallback: string): FormState {
  return { error: error instanceof StrapiError ? error.message : fallback };
}

/**
 * Every action here starts the same way, and the reason is worth stating: the
 * token comes from the session cookie, never from the form. Which course an
 * instructor may touch is then Strapi's decision, made against that token - the
 * screens below simply do not offer buttons for things it would refuse.
 */
async function requireToken(): Promise<string> {
  const session = await getSession();

  if (!session) redirect('/login');

  return session.jwt;
}

/**
 * Finds a slug nobody has taken yet.
 *
 * Two courses called "Introduction to React" is an ordinary thing to want, and
 * the slug is unique in the schema, so without this the second one fails with a
 * database-flavoured error the author cannot act on.
 */
async function availableSlug(title: string): Promise<string> {
  const base = slugify(title) || 'course';

  const taken = await strapiFetch<Paginated<Course>>(
    `/api/courses?filters[slug][$startsWith]=${encodeURIComponent(base)}&fields[0]=slug&pagination[pageSize]=100`
  );

  const used = new Set(taken.data.map((course) => course.slug));

  if (!used.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    if (!used.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  }

  // Ninety-nine courses with the same name is not a case worth more code than this.
  return `${base}-${Date.now()}`;
}

export async function createCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!title) return { error: 'Give the course a title.' };

  const token = await requireToken();
  let slug: string;

  try {
    slug = await availableSlug(title);

    await strapiFetch('/api/courses', {
      method: 'POST',
      // No owner field. Strapi sets that from the token, which is what makes
      // "your own courses" mean anything.
      body: { data: { title, slug, description: description || null } },
      token,
    });
  } catch (error) {
    return fail(error, 'Could not create the course.');
  }

  revalidatePath('/manage');
  revalidatePath('/');
  redirect(`/manage/courses/${slug}`);
}

export async function updateCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const documentId = String(formData.get('course') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };
  if (!title) return { error: 'Give the course a title.' };

  const token = await requireToken();

  try {
    // The slug is left alone on purpose. It is in every link to this course, and
    // renaming a course should not quietly break the ones already shared.
    await strapiFetch(`/api/courses/${documentId}`, {
      method: 'PUT',
      body: { data: { title, description: description || null } },
      token,
    });
  } catch (error) {
    return fail(error, 'Could not save the course.');
  }

  revalidatePath('/manage');
  revalidatePath('/');
  if (slug) revalidatePath(`/courses/${slug}`);

  return ok;
}

export async function deleteCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const documentId = String(formData.get('course') ?? '');

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };

  const token = await requireToken();

  try {
    // The backend cascades this to the lessons, quizzes, enrolments and progress
    // that hang off the course - see the course lifecycles file.
    await strapiFetch(`/api/courses/${documentId}`, { method: 'DELETE', token });
  } catch (error) {
    return fail(error, 'Could not delete the course.');
  }

  revalidatePath('/manage');
  revalidatePath('/');
  redirect('/manage');
}

function lessonFieldsFrom(formData: FormData) {
  return {
    title: String(formData.get('title') ?? '').trim(),
    content: String(formData.get('content') ?? '').trim() || null,
    videoUrl: String(formData.get('videoUrl') ?? '').trim() || null,
    order: Number(formData.get('order') ?? 0),
  };
}

export async function createLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  const course = String(formData.get('course') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const fields = lessonFieldsFrom(formData);

  if (!course) return { error: 'Something went wrong - reload and try again.' };
  if (!fields.title) return { error: 'Give the lesson a title.' };
  if (!Number.isInteger(fields.order) || fields.order < 1) {
    return { error: 'Position has to be a whole number, 1 or more.' };
  }

  const token = await requireToken();

  try {
    await strapiFetch('/api/lessons', {
      method: 'POST',
      body: { data: { ...fields, course } },
      token,
    });
  } catch (error) {
    return fail(error, 'Could not add the lesson.');
  }

  revalidatePath(`/manage/courses/${slug}`);
  if (slug) revalidatePath(`/courses/${slug}`);

  return ok;
}

export async function updateLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  const lesson = String(formData.get('lesson') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const fields = lessonFieldsFrom(formData);

  if (!lesson) return { error: 'Something went wrong - reload and try again.' };
  if (!fields.title) return { error: 'Give the lesson a title.' };
  if (!Number.isInteger(fields.order) || fields.order < 1) {
    return { error: 'Position has to be a whole number, 1 or more.' };
  }

  const token = await requireToken();

  try {
    await strapiFetch(`/api/lessons/${lesson}`, { method: 'PUT', body: { data: fields }, token });
  } catch (error) {
    return fail(error, 'Could not save the lesson.');
  }

  revalidatePath(`/manage/courses/${slug}`);
  if (slug) revalidatePath(`/courses/${slug}`);

  return ok;
}

export async function deleteLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  const lesson = String(formData.get('lesson') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!lesson) return { error: 'Something went wrong - reload and try again.' };

  const token = await requireToken();

  try {
    await strapiFetch(`/api/lessons/${lesson}`, { method: 'DELETE', token });
  } catch (error) {
    return fail(error, 'Could not delete the lesson.');
  }

  revalidatePath(`/manage/courses/${slug}`);
  if (slug) revalidatePath(`/courses/${slug}`);

  return ok;
}
