import Link from 'next/link';
import { notFound } from 'next/navigation';

import EmptyState from '@/components/EmptyState';
import QuizRunner from '@/components/QuizRunner';
import SessionExpired from '@/components/SessionExpired';
import { requireSession } from '@/lib/auth';
import { getCourseBySlug, isEnrolledIn } from '@/lib/courses';
import { getQuizForCourse, listMyAttempts } from '@/lib/quizzes';
import { isRejectedToken } from '@/lib/strapi';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  return { title: course ? `Quiz — ${course.title}` : 'Quiz — LMS' };
}

export default async function TakeQuizPage({ params }: Params) {
  const { slug } = await params;
  const session = await requireSession();

  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  let quiz;
  let attempts;

  try {
    quiz = await getQuizForCourse(course.documentId);
    attempts = quiz ? await listMyAttempts(quiz.documentId) : [];
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  const enrolled = session.role === 'student' ? await isEnrolledIn(course.documentId) : false;

  const header = (
    <Link
      href={`/courses/${course.slug}`}
      className="text-sm text-slate-500 transition hover:text-slate-900"
    >
      ← {course.title}
    </Link>
  );

  if (session.role === 'student' && !enrolled) {
    return (
      <div className="max-w-xl">
        {header}
        <div className="mt-6">
          <EmptyState title="Enrol first">
            The quiz is for students on this course.
          </EmptyState>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-xl">
        {header}
        <div className="mt-6">
          <EmptyState title="No quiz on this course yet">
            The instructor has not added one.
          </EmptyState>
        </div>
      </div>
    );
  }

  const best = attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : null;

  return (
    <div className="max-w-2xl">
      {header}

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{quiz.title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}. You are marked as
        soon as you submit.
      </p>

      {session.role === 'student' ? (
        <div className="mt-8">
          <QuizRunner quiz={quiz} slug={course.slug} />
        </div>
      ) : (
        // Staff can look at the quiz, but their copy still arrives without the
        // answer key - the backend decides that from the token, and being able
        // to edit the quiz is not the same as asking for it as a reader.
        <div className="mt-8">
          <EmptyState title="This is how students see it">
            Sitting the quiz is for students.{' '}
            <Link
              href={`/manage/courses/${course.slug}/quiz`}
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              Edit the questions
            </Link>
          </EmptyState>
        </div>
      )}

      {attempts.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your attempts {best !== null ? `· best ${best}%` : null}
          </h2>

          <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{attempt.percentage}%</span>
                <span className="text-slate-500">
                  {attempt.score} of {attempt.totalQuestions}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(attempt.submittedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
