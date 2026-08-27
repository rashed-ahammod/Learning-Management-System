import Link from 'next/link';

import RoleBreakdown from '@/components/RoleBreakdown';
import SessionExpired from '@/components/SessionExpired';
import StatTile from '@/components/StatTile';
import { getPlatformStats } from '@/lib/admin';
import { requireRole } from '@/lib/auth';
import { isRejectedToken } from '@/lib/strapi';

export const metadata = { title: 'Admin — LMS' };

export default async function AdminPage() {
  const session = await requireRole('admin');

  let stats;
  try {
    stats = await getPlatformStats();
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  if (!stats) {
    return <p className="text-sm text-slate-600">Could not load the platform stats.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {session.username}. Only admins can open this page.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Manage users
          </Link>
          <Link
            href="/manage"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
          >
            All courses
          </Link>
          <Link
            href="/manage/blog"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
          >
            All posts
          </Link>
        </div>
      </div>

      {/* Headline numbers as tiles rather than charts: each is a single current
          value, and a chart would wrap axes around something the reader can
          simply be told. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Users" value={stats.users.total} />
        <StatTile
          label="Courses"
          value={stats.courses}
          detail={`${stats.lessons} lesson${stats.lessons === 1 ? '' : 's'} between them`}
        />
        <StatTile label="Enrolments" value={stats.enrollments} />
        <StatTile
          label="Blog posts"
          value={stats.blogPosts.total}
          detail={`${stats.blogPosts.published} published · ${stats.blogPosts.drafts} draft`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RoleBreakdown byRole={stats.users.byRole} />

        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Quizzes" value={stats.quizzes} />
          <StatTile label="Quiz attempts" value={stats.quizAttempts} />
          <StatTile label="Lessons completed" value={stats.lessonsCompleted} />
          <StatTile
            label="Avg lessons / course"
            value={stats.courses === 0 ? 0 : Math.round((stats.lessons / stats.courses) * 10) / 10}
          />
        </div>
      </div>
    </div>
  );
}
