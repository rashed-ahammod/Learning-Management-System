import Link from 'next/link';
import { notFound } from 'next/navigation';

import LessonCompleteToggle from '@/components/LessonCompleteToggle';
import ProgressBar from '@/components/ProgressBar';
import SessionExpired from '@/components/SessionExpired';
import { requireSession } from '@/lib/auth';
import { getCourseBySlug, getCourseProgress } from '@/lib/courses';
import { getLesson } from '@/lib/lessons';
import { isForbidden, isRejectedToken } from '@/lib/strapi';
import { resolveVideo } from '@/lib/video';

type Params = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  return { title: course ? `${course.title} — LMS` : 'Lesson — LMS' };
}

export default async function LessonPage({ params }: Params) {
  const { slug, lessonId } = await params;

  await requireSession();

  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  // The syllabus decides the running order, so sequence comes from the course
  // rather than from whatever order the API happened to return lessons in.
  const syllabus = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const position = syllabus.findIndex((entry) => entry.documentId === lessonId);

  if (position === -1) {
    notFound();
  }

  let lesson;
  try {
    lesson = await getLesson(lessonId);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;

    // 403 from the lesson endpoint means one thing: not enrolled. The backend is
    // the only place that decides this, and it just did.
    if (isForbidden(error)) {
      return (
        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="font-medium">This lesson is for students on the course</p>
          <p className="mt-1 text-sm text-slate-600">
            Enrol in {course.title} to read it.
          </p>
          <Link
            href={`/courses/${course.slug}`}
            className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Go to the course
          </Link>
        </div>
      );
    }

    throw error;
  }

  if (!lesson) {
    notFound();
  }

  const progress = await getCourseProgress(course.documentId);
  const completedIds = progress?.completedLessonIds ?? [];
  const isComplete = completedIds.includes(lessonId);

  // Progress only exists for someone enrolled, so this is also what tells us
  // whether to offer the tick box at all - staff previewing a lesson do not get
  // one, because they have nothing to track.
  const canTrack = Boolean(progress && progress.totalLessons > 0);

  const previous = position > 0 ? syllabus[position - 1] : null;
  const next = position < syllabus.length - 1 ? syllabus[position + 1] : null;

  const video = resolveVideo(lesson.videoUrl);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <article className="min-w-0">
        <Link
          href={`/courses/${course.slug}`}
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← {course.title}
        </Link>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Lesson {position + 1} of {syllabus.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        </header>

        {video?.kind === 'embed' ? (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
            <iframe
              src={video.src}
              title={`${lesson.title} (${video.provider})`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : null}

        {video?.kind === 'link' ? (
          <p className="mt-6 text-sm">
            <a
              href={video.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              Watch the video for this lesson ↗
            </a>
          </p>
        ) : null}

        {lesson.content ? (
          // whitespace-pre-wrap keeps the paragraph breaks an author typed,
          // without running their text through a markdown renderer.
          <div className="mt-6 whitespace-pre-wrap text-slate-700">{lesson.content}</div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">This lesson has no written content.</p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6">
          {canTrack ? (
            <LessonCompleteToggle lessonId={lessonId} slug={course.slug} completed={isComplete} />
          ) : (
            <p className="text-sm text-slate-500">
              You are previewing this lesson, so there is nothing to tick off.
            </p>
          )}

          <div className="ml-auto flex gap-3 text-sm">
            {previous ? (
              <Link
                href={`/courses/${course.slug}/lessons/${previous.documentId}`}
                className="text-slate-600 transition hover:text-slate-900"
              >
                ← Previous
              </Link>
            ) : null}
            {next ? (
              <Link
                href={`/courses/${course.slug}/lessons/${next.documentId}`}
                className="font-medium text-slate-900 transition hover:text-slate-600"
              >
                Next lesson →
              </Link>
            ) : null}
          </div>
        </div>
      </article>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        {progress ? (
          <div className="mb-5">
            <ProgressBar
              percentage={progress.percentage}
              completed={progress.completedLessons}
              total={progress.totalLessons}
            />
          </div>
        ) : null}

        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          In this course
        </h2>

        <ol className="mt-3 space-y-1">
          {syllabus.map((entry, index) => {
            const current = entry.documentId === lessonId;
            const done = completedIds.includes(entry.documentId);

            return (
              <li key={entry.documentId}>
                <Link
                  href={`/courses/${course.slug}/lessons/${entry.documentId}`}
                  aria-current={current ? 'page' : undefined}
                  className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                    current ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={current ? 'text-slate-400' : 'text-slate-400'}>{index + 1}</span>
                  <span className="flex-1">{entry.title}</span>
                  {done ? (
                    <span className={current ? 'text-emerald-300' : 'text-emerald-600'}>✓</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
