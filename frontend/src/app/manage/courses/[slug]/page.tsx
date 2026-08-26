import Link from 'next/link';
import { notFound } from 'next/navigation';

import ConfirmSubmit from '@/components/ConfirmSubmit';
import CourseForm from '@/components/CourseForm';
import LessonForm from '@/components/LessonForm';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { getCourseBySlug } from '@/lib/courses';
import { deleteCourse, deleteLesson } from '@/lib/manage-actions';
import { canManageCourse } from '@/lib/permissions';
import { isRejectedToken } from '@/lib/strapi';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  return { title: course ? `Editing ${course.title} — LMS` : 'Course — LMS' };
}

export default async function EditCoursePage({ params }: Params) {
  const { slug } = await params;
  const session = await requireRole('admin', 'content-manager', 'instructor');

  let course;
  try {
    course = await getCourseBySlug(slug);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  if (!course) {
    notFound();
  }

  /**
   * The same question Strapi will ask when a save is attempted.
   *
   * Asking it here too is not duplicated enforcement - it is the difference
   * between a form that saves and one that fails after the author has typed
   * into it. If this and the backend ever disagree, the backend wins and the
   * save is refused; this only decides whether to offer the form at all.
   */
  if (!canManageCourse(session, course)) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="font-medium">This is somebody else&apos;s course</p>
        <p className="mt-1 text-sm text-slate-600">
          {course.owner ? `${course.owner.username} owns it.` : null} Instructors can only edit
          courses they own.
        </p>
        <Link
          href="/manage"
          className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back to your courses
        </Link>
      </div>
    );
  }

  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const nextPosition = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/manage" className="text-sm text-slate-500 transition hover:text-slate-900">
          ← Manage courses
        </Link>
        <Link
          href={`/courses/${course.slug}`}
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          View as a student ↗
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{course.title}</h1>

      <section className="mt-8">
        <CourseForm course={course} />
      </section>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Lessons ({lessons.length})
        </h2>

        {lessons.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No lessons yet. Add the first one below.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {lessons.map((lesson) => (
              <li key={lesson.documentId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-sm text-slate-400">{lesson.order}</span>
                <span className="flex-1 text-sm">{lesson.title}</span>
                <Link
                  href={`/manage/courses/${course.slug}/lessons/${lesson.documentId}`}
                  className="text-sm text-slate-600 transition hover:text-slate-900"
                >
                  Edit
                </Link>
                <ConfirmSubmit
                  action={deleteLesson}
                  fields={{ lesson: lesson.documentId, slug: course.slug }}
                  label="Delete"
                  pendingLabel="Deleting…"
                  confirm={`Delete "${lesson.title}"? This cannot be undone.`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Add a lesson</h2>
        <div className="mt-4">
          <LessonForm courseId={course.documentId} slug={course.slug} nextPosition={nextPosition} />
        </div>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold text-red-700">Delete this course</h2>
        <p className="mt-1 text-sm text-slate-600">
          Its lessons, quizzes, enrolments and everybody&apos;s progress go with it.
        </p>
        <div className="mt-4">
          <ConfirmSubmit
            action={deleteCourse}
            fields={{ course: course.documentId }}
            label="Delete course"
            pendingLabel="Deleting…"
            confirm={`Delete "${course.title}" and everything in it? This cannot be undone.`}
          />
        </div>
      </section>
    </div>
  );
}
