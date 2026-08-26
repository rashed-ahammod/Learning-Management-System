import CourseCard from '@/components/CourseCard';
import EmptyState from '@/components/EmptyState';
import { getSession } from '@/lib/auth';
import { listCourses } from '@/lib/courses';
import { StrapiError } from '@/lib/strapi';

export const metadata = { title: 'Courses — LMS' };

export default async function HomePage() {
  const session = await getSession();

  let courses;
  try {
    courses = await listCourses();
  } catch (error) {
    // The catalogue is the first thing anyone sees, so a backend that is not
    // running should say so plainly rather than throw a stack trace at them.
    return (
      <EmptyState title="The course catalogue is unavailable">
        {error instanceof StrapiError
          ? error.message
          : 'Could not reach the backend. Is Strapi running?'}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-2 text-sm text-slate-600">
          {session
            ? 'Browse everything on offer and enrol in whatever looks useful.'
            : 'Browse what is on offer. Sign in to enrol and track your progress.'}
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No courses published yet">
            Once a content manager or instructor adds one, it shows up here.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.documentId} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
