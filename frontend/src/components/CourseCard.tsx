import Link from 'next/link';

import ProgressBar from './ProgressBar';
import type { Course, CourseProgress } from '@/lib/types';

type Props = {
  course: Course;
  progress?: CourseProgress | null;
};

export default function CourseCard({ course, progress }: Props) {
  const lessonCount = course.lessons?.length ?? 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
    >
      <h3 className="font-semibold tracking-tight">{course.title}</h3>

      {course.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{course.description}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No description yet.</p>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
        <span>
          {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
        </span>
        {course.owner ? <span>· {course.owner.username}</span> : null}
      </div>

      {progress ? (
        <div className="mt-4">
          <ProgressBar
            percentage={progress.percentage}
            completed={progress.completedLessons}
            total={progress.totalLessons}
          />
        </div>
      ) : null}
    </Link>
  );
}
