import Link from 'next/link';
import { notFound } from 'next/navigation';

import LessonForm from '@/components/LessonForm';
import SessionExpired from '@/components/SessionExpired';
import { requireRole } from '@/lib/auth';
import { getCourseBySlug } from '@/lib/courses';
import { getLesson } from '@/lib/lessons';
import { canManageCourse } from '@/lib/permissions';
import { isForbidden, isRejectedToken } from '@/lib/strapi';

type Params = { params: Promise<{ slug: string; lessonId: string }> };

export const metadata = { title: 'Edit lesson — LMS' };

export default async function EditLessonPage({ params }: Params) {
  const { slug, lessonId } = await params;
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

  let lesson;
  try {
    lesson = await getLesson(lessonId);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    if (isForbidden(error)) notFound();
    throw error;
  }

  if (!lesson) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/manage/courses/${course.slug}`}
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← {course.title}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Edit lesson</h1>

      <div className="mt-8">
        <LessonForm courseId={course.documentId} slug={course.slug} lesson={lesson} />
      </div>
    </div>
  );
}
