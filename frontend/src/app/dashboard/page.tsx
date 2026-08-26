import { redirect } from 'next/navigation';

import { requireSession } from '@/lib/auth';
import { homePathFor } from '@/lib/roles';

/**
 * Not a page anyone lingers on.
 *
 * Signing in has to land somewhere, but "somewhere" depends on the role, and the
 * middleware cannot send people to a role-specific path before it knows the role
 * is genuine. So everything points here and this forwards on - one place that
 * decides where a role belongs, rather than the answer being spread across every
 * redirect in the app.
 */
export default async function DashboardPage() {
  const session = await requireSession();

  redirect(homePathFor(session.role));
}
