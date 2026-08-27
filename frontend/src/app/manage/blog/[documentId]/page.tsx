import Link from 'next/link';
import { notFound } from 'next/navigation';

import ConfirmSubmit from '@/components/ConfirmSubmit';
import PostForm from '@/components/PostForm';
import PublishControls from '@/components/PublishControls';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { getPostForEditing } from '@/lib/blog';
import { deletePost } from '@/lib/blog-actions';
import { isForbidden, isRejectedToken } from '@/lib/strapi';

type Params = { params: Promise<{ documentId: string }> };

export const metadata = { title: 'Edit post — LMS' };

export default async function EditPostPage({ params }: Params) {
  const { documentId } = await params;
  const session = await requireRole('admin', 'content-manager');

  let entry;
  try {
    entry = await getPostForEditing(documentId);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    if (isForbidden(error)) notFound();
    throw error;
  }

  if (!entry) {
    notFound();
  }

  const { post, published } = entry;

  // A content manager owns only their own posts; an admin owns them all. Asking
  // here decides whether to offer the form - the backend decides whether a save
  // is accepted, and it will refuse this same case.
  const mine = session.role === 'admin' || post.author?.id === session.userId;

  if (!mine) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="font-medium">This is somebody else&apos;s post</p>
        <p className="mt-1 text-sm text-slate-600">
          {post.author ? `${post.author.username} wrote it.` : null} Content managers can only
          edit their own.
        </p>
        <Link
          href="/manage/blog"
          className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back to the blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/manage/blog"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Blog
        </Link>
        {published ? (
          <Link
            href={`/blog/${post.slug}`}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            View it live ↗
          </Link>
        ) : null}
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{post.title}</h1>

      <div className="mt-6">
        <PublishControls documentId={post.documentId} slug={post.slug} published={published} />
      </div>

      <section className="mt-8">
        <PostForm post={post} />
      </section>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold text-red-700">Delete this post</h2>
        <p className="mt-1 text-sm text-slate-600">
          Removes the draft and the published version together.
        </p>
        <div className="mt-4">
          <ConfirmSubmit
            action={deletePost}
            fields={{ post: post.documentId, slug: post.slug }}
            label="Delete post"
            pendingLabel="Deleting…"
            confirm={`Delete "${post.title}"? This cannot be undone.`}
          />
        </div>
      </section>
    </div>
  );
}
