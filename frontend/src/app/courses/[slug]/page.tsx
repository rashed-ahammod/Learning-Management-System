import Link from 'next/link';
import { notFound } from 'next/navigation';

import EnrollButton from '@/components/EnrollButton';
import ProgressBar from '@/components/ProgressBar';
import { getSession } from '@/lib/auth';
import { getCourseBySlug, getCourseProgress, isEnrolledIn } from '@/lib/courses';
import { canManageCourse } from '@/lib/permissions';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  return { title: course ? `${course.title} — LMS` : 'Course not found — LMS' };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const session = await getSession();
  const isStudent = session?.role === 'student';

  // Only a student can enrol, so only a student needs either of these looked up.
  const enrolled = isStudent ? await isEnrolledIn(course.documentId) : false;
  const progress = enrolled ? await getCourseProgress(course.documentId) : null;

  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);

  // Staff reach this page from the editor's "View as a student" link. Without a
  // way back they are stranded in the student view, since the only other exit
  // is the public catalogue - so offer the return trip to whoever came from it.
  const canEdit = canManageCourse(session, course);

  return (
    <article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-900">
          ← All courses
        </Link>

        {canEdit ? (
          <Link
            href={`/manage/courses/${course.slug}`}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← Back to editing
          </Link>
        ) : null}
      </div>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        {course.owner ? (
          <p className="mt-1 text-sm text-slate-500">Taught by {course.owner.username}</p>
        ) : null}
        {course.description ? (
          <p className="mt-4 max-w-2xl text-slate-700">{course.description}</p>
        ) : null}
      </header>

      {enrolled && progress ? (
        <section className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium">Your progress</p>
          <div className="mt-2">
            <ProgressBar
              percentage={progress.percentage}
              completed={progress.completedLessons}
              total={progress.totalLessons}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Syllabus
        </h2>

        {lessons.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No lessons have been added yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {lessons.map((lesson, index) => {
              const done = progress?.completedLessonIds.includes(lesson.documentId) ?? false;

              const row = (
                <>
                  <span className="w-6 shrink-0 text-sm text-slate-400">{index + 1}</span>
                  <span className="flex-1 text-sm">{lesson.title}</span>
                  {done ? (
                    <span className="text-xs font-medium text-emerald-600">Done</span>
                  ) : null}
                </>
              );

              // The titles are public - a syllabus is how someone decides whether
              // to enrol. The lesson bodies are not, and the backend refuses them
              // to anyone unenrolled, so there is no link to follow until then.
              return (
                <li key={lesson.documentId}>
                  {enrolled ? (
                    <Link
                      href={`/courses/${course.slug}/lessons/${lesson.documentId}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 text-slate-500">{row}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="mt-8">
        {!session ? (
          <p className="text-sm text-slate-600">
            <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">
              Sign in
            </Link>{' '}
            to enrol in this course.
          </p>
        ) : !isStudent ? (
          <p className="text-sm text-slate-500">
            Enrolling is for students. You are signed in with a staff account.
          </p>
        ) : enrolled ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-emerald-700">
              You are enrolled. Pick a lesson above to carry on.
            </p>
            <Link
              href={`/courses/${course.slug}/quiz`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
            >
              Take the quiz
            </Link>
          </div>
        ) : (
          <EnrollButton courseId={course.documentId} slug={course.slug} />
        )}
      </div>
    </article>
  );
}
