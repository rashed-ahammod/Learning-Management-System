'use client';

import { useActionState } from 'react';

import { FormError, SubmitButton } from './form/Fields';
import { publishPost, unpublishPost, type PostState } from '@/lib/blog-actions';

/**
 * The draft/published switch for one post.
 *
 * Two separate actions rather than one that flips, for the same reason the
 * lesson tick is not a toggle: a resubmitted form should land where it was
 * aiming, not somewhere else. Here the stakes are higher - an accidental flip
 * takes a live post off the public blog.
 */
export default function PublishControls({
  documentId,
  slug,
  published,
}: {
  documentId: string;
  slug: string;
  published: boolean;
}) {
  const [state, formAction] = useActionState<PostState, FormData>(
    published ? unpublishPost : publishPost,
    { error: null }
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {published ? 'Published' : 'Draft'}
        </span>

        <p className="flex-1 text-sm text-slate-600">
          {published
            ? 'Anyone can read this on the blog.'
            : 'Only you can see this. It is not on the public blog.'}
        </p>

        <form action={formAction}>
          <input type="hidden" name="post" value={documentId} />
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton
            label={published ? 'Unpublish' : 'Publish'}
            pendingLabel={published ? 'Unpublishing…' : 'Publishing…'}
            tone={published ? 'danger' : 'primary'}
          />
        </form>
      </div>

      {published ? (
        <p className="mt-3 text-xs text-slate-500">
          Edits are saved to the draft. Press Publish again to push them live.
        </p>
      ) : null}

      <div className="mt-2">
        <FormError message={state.error} />
      </div>
    </div>
  );
}
