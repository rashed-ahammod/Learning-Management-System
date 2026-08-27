import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import SessionExpired from '@/components/SessionExpired';
import UserRow from '@/components/UserRow';
import { listAssignableRoles, listUsers } from '@/lib/admin';
import { requireRole } from '@/lib/auth';
import { isRejectedToken } from '@/lib/strapi';

export const metadata = { title: 'Users — LMS' };

export default async function AdminUsersPage() {
  const session = await requireRole('admin');

  let users;
  let roles;

  try {
    [users, roles] = await Promise.all([listUsers(), listAssignableRoles()]);
  } catch (error) {
    if (isRejectedToken(error)) return <SessionExpired />;
    throw error;
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-slate-500 transition hover:text-slate-900">
        ← Admin
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-2 text-sm text-slate-600">
        Everyone who has signed up. New accounts start as students — change a role here to
        promote somebody.
      </p>

      {users.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No users yet" />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              roles={roles}
              isSelf={user.id === session.userId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
