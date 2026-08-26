import Link from 'next/link';

import CourseForm from '@/components/CourseForm';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'New course — LMS' };

export default async function NewCoursePage() {
  await requireRole('admin', 'content-manager', 'instructor');

  return (
    <div className="max-w-xl">
      <Link href="/manage" className="text-sm text-slate-500 transition hover:text-slate-900">
        ← Manage courses
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New course</h1>
      <p className="mt-2 text-sm text-slate-600">
        Lessons and a quiz come next, once the course exists.
      </p>

      <div className="mt-8">
        <CourseForm />
      </div>
    </div>
  );
}
