import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import { listPublishedPosts } from '@/lib/blog';
import { StrapiError } from '@/lib/strapi';

export const metadata = { title: 'Blog — LMS' };

export default async function BlogPage() {
  let posts;
  try {
    posts = await listPublishedPosts();
  } catch (error) {
    return (
      <EmptyState title="The blog is unavailable">
        {error instanceof StrapiError ? error.message : 'Could not reach the backend.'}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-2 text-sm text-slate-600">
          Notes on how the courses are put together. Anyone can read these.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Nothing published yet">
            Drafts stay out of sight until somebody publishes them.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {posts.map((post) => (
            <li key={post.documentId}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <h2 className="font-semibold tracking-tight">{post.title}</h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  {post.author ? `${post.author.username} · ` : null}
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
