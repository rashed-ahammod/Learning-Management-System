'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getSession } from './auth';
import { slugify } from './slug';
import { StrapiError, strapiFetch } from './strapi';
import type { BlogPost, Paginated } from './types';

export type PostState = { error: string | null; saved?: boolean };

function fail(error: unknown, fallback: string): PostState {
  return { error: error instanceof StrapiError ? error.message : fallback };
}

async function requireToken(): Promise<string> {
  const session = await getSession();

  if (!session) redirect('/login');

  return session.jwt;
}

/** Refreshes both the public blog and the management list. */
function revalidateBlog(slug?: string) {
  revalidatePath('/blog');
  revalidatePath('/manage/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
}

async function availableSlug(title: string, token: string): Promise<string> {
  const base = slugify(title) || 'post';

  // Drafts have to be included, or a slug already taken by an unpublished post
  // reads as free and the save fails on a uniqueness error instead.
  const taken = await strapiFetch<Paginated<BlogPost>>(
    `/api/blog-posts?status=draft&filters[slug][$startsWith]=${encodeURIComponent(base)}&pagination[pageSize]=100`,
    { token }
  );

  const used = new Set(taken.data.map((post) => post.slug));

  if (!used.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    if (!used.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  }

  return `${base}-${Date.now()}`;
}

function fieldsFrom(formData: FormData) {
  return {
    title: String(formData.get('title') ?? '').trim(),
    excerpt: String(formData.get('excerpt') ?? '').trim() || null,
    body: String(formData.get('body') ?? '').trim() || null,
    coverImageUrl: String(formData.get('coverImageUrl') ?? '').trim() || null,
  };
}

export async function createPost(_previous: PostState, formData: FormData): Promise<PostState> {
  const fields = fieldsFrom(formData);

  if (!fields.title) return { error: 'Give the post a title.' };

  const token = await requireToken();
  let documentId: string;

  try {
    const slug = await availableSlug(fields.title, token);

    // A new post is always a draft - the backend creates it that way, and
    // publishing is a separate decision made on the next screen.
    const created = await strapiFetch<{ data: BlogPost }>('/api/blog-posts', {
      method: 'POST',
      body: { data: { ...fields, slug } },
      token,
    });

    documentId = created.data.documentId;
  } catch (error) {
    return fail(error, 'Could not create the post.');
  }

  revalidateBlog();
  redirect(`/manage/blog/${documentId}`);
}

export async function updatePost(_previous: PostState, formData: FormData): Promise<PostState> {
  const documentId = String(formData.get('post') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const fields = fieldsFrom(formData);

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };
  if (!fields.title) return { error: 'Give the post a title.' };

  const token = await requireToken();

  try {
    /**
     * Writes the draft, and stops there.
     *
     * With draft and publish on, an update touches the working copy only - what
     * the public sees does not change until Publish is pressed again. That is
     * the behaviour we want and worth being explicit about, because it surprises
     * people: editing a live post does not edit the live post.
     */
    await strapiFetch(`/api/blog-posts/${documentId}`, {
      method: 'PUT',
      body: { data: fields },
      token,
    });
  } catch (error) {
    return fail(error, 'Could not save the post.');
  }

  revalidateBlog(slug);

  return { error: null, saved: true };
}

export async function publishPost(_previous: PostState, formData: FormData): Promise<PostState> {
  const documentId = String(formData.get('post') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };

  const token = await requireToken();

  try {
    await strapiFetch(`/api/blog-posts/${documentId}/publish`, { method: 'POST', token });
  } catch (error) {
    return fail(error, 'Could not publish the post.');
  }

  revalidateBlog(slug);

  return { error: null, saved: true };
}

export async function unpublishPost(_previous: PostState, formData: FormData): Promise<PostState> {
  const documentId = String(formData.get('post') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };

  const token = await requireToken();

  try {
    await strapiFetch(`/api/blog-posts/${documentId}/unpublish`, { method: 'POST', token });
  } catch (error) {
    return fail(error, 'Could not unpublish the post.');
  }

  revalidateBlog(slug);

  return { error: null, saved: true };
}

export async function deletePost(_previous: PostState, formData: FormData): Promise<PostState> {
  const documentId = String(formData.get('post') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!documentId) return { error: 'Something went wrong - reload and try again.' };

  const token = await requireToken();

  try {
    await strapiFetch(`/api/blog-posts/${documentId}`, { method: 'DELETE', token });
  } catch (error) {
    return fail(error, 'Could not delete the post.');
  }

  revalidateBlog(slug);
  redirect('/manage/blog');
}
