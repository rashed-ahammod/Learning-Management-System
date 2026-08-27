import 'server-only';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';
import type { BlogPost, ManagedPost, Paginated } from './types';

const LIST = 'sort=publishedAt:desc&pagination[pageSize]=50';

/**
 * The public blog.
 *
 * Fetched without a token, so Strapi answers as the public role and returns the
 * published version of each document. That is the default rather than something
 * asked for here - and the backend pins it for anyone who is not blog staff, so
 * a ?status=draft on the end of the URL changes nothing.
 */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  const response = await strapiFetch<Paginated<BlogPost>>(`/api/blog-posts?${LIST}`);

  return response.data;
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const response = await strapiFetch<Paginated<BlogPost>>(
    `/api/blog-posts?filters[slug][$eq]=${encodeURIComponent(slug)}`
  );

  return response.data[0] ?? null;
}

/**
 * Every post, draft or not, for the management list.
 *
 * Two requests, because one cannot answer both halves of the question. Asking
 * for drafts returns every document - a published post still has a draft - but
 * each one reports publishedAt as null, so nothing in that response says which
 * are live. The published list supplies that.
 */
export async function listAllPosts(): Promise<ManagedPost[]> {
  const session = await getSession();

  if (!session) return [];

  const [drafts, live] = await Promise.all([
    strapiFetch<Paginated<BlogPost>>(`/api/blog-posts?${LIST}&status=draft`, {
      token: session.jwt,
    }),
    strapiFetch<Paginated<BlogPost>>(`/api/blog-posts?${LIST}`, { token: session.jwt }),
  ]);

  const publishedIds = new Set(live.data.map((post) => post.documentId));

  return drafts.data.map((post) => ({
    post,
    published: publishedIds.has(post.documentId),
  }));
}

/**
 * The draft version of a post, for editing.
 *
 * Always the draft: it is the working copy, it exists whether or not the post
 * has ever been published, and it is what an edit is meant to change.
 */
export async function getPostForEditing(documentId: string): Promise<ManagedPost | null> {
  const session = await getSession();

  if (!session) return null;

  try {
    const [draft, live] = await Promise.all([
      strapiFetch<{ data: BlogPost }>(`/api/blog-posts/${documentId}?status=draft`, {
        token: session.jwt,
      }),
      strapiFetch<{ data: BlogPost }>(`/api/blog-posts/${documentId}`, {
        token: session.jwt,
      }).catch(() => null),
    ]);

    return { post: draft.data, published: Boolean(live?.data) };
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}
