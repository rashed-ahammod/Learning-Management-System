import Link from 'next/link';
import { notFound } from 'next/navigation';

import ConfirmSubmit from '@/components/ConfirmSubmit';
import QuizBuilder from '@/components/QuizBuilder';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { getCourseBySlug } from '@/lib/courses';
import { canManageCourse } from '@/lib/permissions';
import { deleteQuiz } from '@/lib/quiz-actions';
import { getQuizForCourse } from '@/lib/quizzes';
import { isRejectedToken } from '@/lib/strapi';

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: 'Quiz — LMS' };

export default async function ManageQuizPage({ params }: Params) {
  const { slug } = await params;
  const session = await requireRole('admin', 'content-manager', 'instructor');

  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  if (!canManageCourse(session, course)) {
    return (
      <p className="text-sm text-slate-600">
        That course belongs to somebody else.{' '}
        <Link href="/manage" className="font-medium text-slate-900 underline underline-offset-4">
          Back to your courses
        </Link>
      </p>
    );
  }

  let quiz;
  try {
    quiz = await getQuizForCourse(course.documentId);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/manage/courses/${course.slug}`}
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← {course.title}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {quiz ? 'Edit the quiz' : 'Add a quiz'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Students see the questions and answers but never which one is correct — marking happens
        on the server.
      </p>

      <div className="mt-8">
        <QuizBuilder courseId={course.documentId} slug={course.slug} quiz={quiz ?? undefined} />
      </div>

      {quiz ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold text-red-700">Delete this quiz</h2>
          <p className="mt-1 text-sm text-slate-600">
            Attempts students have already made are kept.
          </p>
          <div className="mt-4">
            <ConfirmSubmit
              action={deleteQuiz}
              fields={{ quiz: quiz.documentId, slug: course.slug }}
              label="Delete quiz"
              pendingLabel="Deleting…"
              confirm={`Delete "${quiz.title}"?`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
