import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { listCoursesIOwn } from '@/lib/courses';
import { ROLE_LABELS } from '@/lib/roles';
import { isRejectedToken } from '@/lib/strapi';

export const metadata = { title: 'Manage courses — LMS' };

export default async function ManagePage() {
  const session = await requireRole('admin', 'content-manager', 'instructor');

  let courses;
  try {
    courses = await listCoursesIOwn();
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  const instructor = session.role === 'instructor';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage courses</h1>
          <p className="mt-2 text-sm text-slate-600">
            {instructor
              ? 'The courses you own. You can edit these and nothing else.'
              : `Every course on the platform — you are signed in as a ${ROLE_LABELS[session.role]}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Instructors manage courses but do not write the blog, so the link
              is only offered to the roles that can actually open it. */}
          {session.role !== 'instructor' ? (
            <Link
              href="/manage/blog"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
            >
              Blog
            </Link>
          ) : null}
          <Link
            href="/manage/courses/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            New course
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={instructor ? 'You have no courses yet' : 'No courses yet'}>
            Create one and it appears in the public catalogue straight away.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {courses.map((course) => {
            const lessonCount = course.lessons?.length ?? 0;

            return (
              <li key={course.documentId}>
                <Link
                  href={`/manage/courses/${course.slug}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition hover:bg-slate-50"
                >
                  <span className="font-medium">{course.title}</span>
                  <span className="text-xs text-slate-500">
                    {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                  </span>
                  {/* Whose course it is only needs saying when it might not be yours. */}
                  {!instructor && course.owner ? (
                    <span className="text-xs text-slate-500">· {course.owner.username}</span>
                  ) : null}
                  <span className="ml-auto text-sm text-slate-400">Edit →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
