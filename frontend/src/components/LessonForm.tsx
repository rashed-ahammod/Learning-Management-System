'use client';

import { useActionState, useEffect, useRef } from 'react';

import { FormError, NumberField, SavedHint, SubmitButton, TextArea, TextField } from './form/Fields';
import { createLesson, updateLesson, type FormState } from '@/lib/manage-actions';
import type { Lesson } from '@/lib/types';

type Props = {
  courseId: string;
  slug: string;
  lesson?: Lesson;
  /** Where a new lesson should land in the running order. */
  nextPosition?: number;
};

export default function LessonForm({ courseId, slug, lesson, nextPosition = 1 }: Props) {
  const editing = Boolean(lesson);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState<FormState, FormData>(
    editing ? updateLesson : createLesson,
    { error: null }
  );

  /**
   * Adding a lesson should leave an empty form ready for the next one; editing
   * should keep what is on screen.
   *
   * Done in an effect rather than by wrapping the action, which is the tempting
   * version. Passing anything other than the action itself to `action` makes it
   * a client action - Next then renders the form without the hidden fields that
   * let it submit with no JavaScript, and it quietly stops working for anyone
   * who has scripting off. `state` is a fresh object per submission, so
   * depending on it is what makes this run again on the next save.
   */
  useEffect(() => {
    if (!editing && state.saved) formRef.current?.reset();
  }, [state, editing]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {editing ? (
        <input type="hidden" name="lesson" value={lesson?.documentId} />
      ) : (
        <input type="hidden" name="course" value={courseId} />
      )}
      <input type="hidden" name="slug" value={slug} />

      <TextField
        name="title"
        label="Title"
        defaultValue={lesson?.title}
        placeholder="What React actually does"
        required
      />

      <NumberField
        name="order"
        label="Position"
        defaultValue={lesson?.order ?? nextPosition}
        hint="Lessons are shown in this order."
      />

      <TextArea
        name="content"
        label="Content"
        rows={8}
        defaultValue={lesson?.content ?? ''}
        placeholder="The written part of the lesson."
      />

      <TextField
        name="videoUrl"
        label="Video URL"
        defaultValue={lesson?.videoUrl ?? ''}
        placeholder="https://www.youtube.com/watch?v=…"
        hint="Optional. YouTube and Vimeo links are embedded; anything else becomes a link."
      />

      <FormError message={state.error} />

      <div className="flex items-center gap-4">
        <SubmitButton
          label={editing ? 'Save lesson' : 'Add lesson'}
          pendingLabel={editing ? 'Saving…' : 'Adding…'}
        />
        <SavedHint show={Boolean(state.saved)} />
      </div>
    </form>
  );
}
