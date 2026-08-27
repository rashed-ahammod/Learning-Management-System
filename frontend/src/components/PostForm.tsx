'use client';

import { useActionState } from 'react';

import { FormError, SavedHint, SubmitButton, TextArea, TextField } from './form/Fields';
import { createPost, updatePost, type PostState } from '@/lib/blog-actions';
import type { BlogPost } from '@/lib/types';

export default function PostForm({ post }: { post?: BlogPost }) {
  const editing = Boolean(post);
  const [state, formAction] = useActionState<PostState, FormData>(
    editing ? updatePost : createPost,
    { error: null }
  );

  return (
    <form action={formAction} className="space-y-4">
      {post ? (
        <>
          <input type="hidden" name="post" value={post.documentId} />
          <input type="hidden" name="slug" value={post.slug} />
        </>
      ) : null}

      <TextField
        name="title"
        label="Title"
        defaultValue={post?.title}
        placeholder="How we think about course design"
        required
      />

      <TextArea
        name="excerpt"
        label="Excerpt"
        rows={2}
        defaultValue={post?.excerpt ?? ''}
        hint="One or two lines, shown on the blog listing."
      />

      <TextArea
        name="body"
        label="Body"
        rows={14}
        defaultValue={post?.body ?? ''}
        placeholder="Write the post."
        hint="A post needs a body before it can be published."
      />

      <TextField
        name="coverImageUrl"
        label="Cover image URL"
        defaultValue={post?.coverImageUrl ?? ''}
        placeholder="https://…"
        hint="Optional."
      />

      <FormError message={state.error} />

      <div className="flex items-center gap-4">
        <SubmitButton label={editing ? 'Save draft' : 'Create post'} />
        <SavedHint show={Boolean(state.saved)} />
      </div>
    </form>
  );
}
