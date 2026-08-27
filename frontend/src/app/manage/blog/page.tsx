import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { listAllPosts } from '@/lib/blog';
import { isRejectedToken } from '@/lib/strapi';

export const metadata = { title: 'Manage the blog — LMS' };

export default async function ManageBlogPage() {
  await requireRole('admin', 'content-manager');

  let posts;
  try {
    posts = await listAllPosts();
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  const drafts = posts.filter((entry) => !entry.published).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-2 text-sm text-slate-600">
            {posts.length} post{posts.length === 1 ? '' : 's'}
            {drafts > 0 ? `, ${drafts} still in draft` : null}.
          </p>
        </div>

        <Link
          href="/manage/blog/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No posts yet">Write the first one.</EmptyState>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {posts.map(({ post, published }) => (
            <li key={post.documentId}>
              <Link
                href={`/manage/blog/${post.documentId}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition hover:bg-slate-50"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {published ? 'Published' : 'Draft'}
                </span>
                <span className="font-medium">{post.title}</span>
                {post.author ? (
                  <span className="text-xs text-slate-500">· {post.author.username}</span>
                ) : null}
                <span className="ml-auto text-sm text-slate-400">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
