import Link from 'next/link';

import CourseCard from '@/components/CourseCard';
import EmptyState from '@/components/EmptyState';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { listMyCoursesWithProgress } from '@/lib/courses';
import { isRejectedToken } from '@/lib/strapi';

export const metadata = { title: 'My courses — LMS' };

export default async function MyCoursesPage() {
  // The proxy already keeps other roles out. This is the same rule stated again
  // where the data is actually read, so the page is safe on its own terms.
  const session = await requireRole('student');

  let enrolled;
  try {
    enrolled = await listMyCoursesWithProgress();
  } catch (error) {
    // The cookie said "student" but Strapi would not accept the token in it.
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  const finished = enrolled.filter((entry) => (entry.progress?.percentage ?? 0) >= 100).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
          <p className="mt-2 text-sm text-slate-600">
            {enrolled.length === 0
              ? `Nothing yet, ${session.username}.`
              : `${enrolled.length} enrolled${finished > 0 ? ` · ${finished} finished` : ''}.`}
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-600 transition hover:text-slate-900">
          Browse all courses →
        </Link>
      </div>

      {enrolled.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="You have not enrolled in anything yet">
            <Link href="/" className="font-medium text-slate-900 underline underline-offset-4">
              Have a look at the catalogue
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrolled.map(({ course, progress }) => (
            <CourseCard key={course.documentId} course={course} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}
