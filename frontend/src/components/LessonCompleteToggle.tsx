'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { setLessonProgress, type ProgressState } from '@/lib/progress-actions';

function Submit({ completed }: { completed: boolean }) {
  const { pending } = useFormStatus();

  const base =
    'rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        completed
          ? `${base} border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`
          : `${base} bg-slate-900 text-white hover:bg-slate-700`
      }
    >
      {pending ? 'Saving…' : completed ? '✓ Completed — undo' : 'Mark as complete'}
    </button>
  );
}

export default function LessonCompleteToggle({
  lessonId,
  slug,
  completed,
}: {
  lessonId: string;
  slug: string;
  completed: boolean;
}) {
  const [state, formAction] = useActionState<ProgressState, FormData>(setLessonProgress, {
    error: null,
  });

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="lesson" value={lessonId} />
        <input type="hidden" name="slug" value={slug} />
        {/* The state we want, not "the opposite of now" - so submitting twice
            lands in the same place rather than flipping back. */}
        <input type="hidden" name="completed" value={completed ? 'false' : 'true'} />
        <Submit completed={completed} />
      </form>

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
