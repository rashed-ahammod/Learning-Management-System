'use client';

import { useActionState } from 'react';

import { FormError, SavedHint, SubmitButton, TextArea, TextField } from './form/Fields';
import { createCourse, updateCourse, type FormState } from '@/lib/manage-actions';
import type { Course } from '@/lib/types';

/**
 * One form for both creating and editing.
 *
 * The two differ only in which action runs and whether the fields start empty,
 * so keeping them together means the labels and validation cannot drift apart
 * between the "new" screen and the "edit" screen.
 */
export default function CourseForm({ course }: { course?: Course }) {
  const editing = Boolean(course);
  const [state, formAction] = useActionState<FormState, FormData>(
    editing ? updateCourse : createCourse,
    { error: null }
  );

  // createCourse redirects away on success, so this only ever shows on an edit.
  const saved = Boolean(state.saved);

  return (
    <form action={formAction} className="space-y-4">
      {course ? (
        <>
          <input type="hidden" name="course" value={course.documentId} />
          <input type="hidden" name="slug" value={course.slug} />
        </>
      ) : null}

      <TextField
        name="title"
        label="Title"
        defaultValue={course?.title}
        placeholder="Getting Started with React"
        required
      />

      <TextArea
        name="description"
        label="Description"
        rows={4}
        defaultValue={course?.description ?? ''}
        placeholder="What will somebody be able to do after finishing this?"
        hint="Shown on the course card and the course page."
      />

      <FormError message={state.error} />

      <div className="flex items-center gap-4">
        <SubmitButton
          label={editing ? 'Save changes' : 'Create course'}
          pendingLabel={editing ? 'Saving…' : 'Creating…'}
        />
        <SavedHint show={saved} />
      </div>

      {editing ? (
        <p className="text-xs text-slate-500">
          The web address stays as <code>/courses/{course?.slug}</code>. Renaming a course does
          not change it, so links already shared keep working.
        </p>
      ) : null}
    </form>
  );
}
