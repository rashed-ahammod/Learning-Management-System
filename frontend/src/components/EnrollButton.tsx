'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { enroll, type EnrollState } from '@/lib/course-actions';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? 'Enrolling…' : 'Enrol in this course'}
    </button>
  );
}

export default function EnrollButton({ courseId, slug }: { courseId: string; slug: string }) {
  const [state, formAction] = useActionState<EnrollState, FormData>(enroll, { error: null });

  return (
    <div>
      <form action={formAction}>
        {/* The course is named here; the student is not. The backend takes that
            from the session, so there is no field to point at anyone else. */}
        <input type="hidden" name="course" value={courseId} />
        <input type="hidden" name="slug" value={slug} />
        <Submit />
      </form>

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
