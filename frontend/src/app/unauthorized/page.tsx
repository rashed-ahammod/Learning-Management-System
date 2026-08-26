import Link from 'next/link';

import { getSession } from '@/lib/auth';
import { ROLE_LABELS, homePathFor } from '@/lib/roles';

export const metadata = { title: 'Not allowed — LMS' };

export default async function UnauthorizedPage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not your page</h1>
      <p className="mt-3 text-sm text-slate-600">
        {session
          ? `You are signed in as a ${ROLE_LABELS[session.role]}, and this page is for a different role.`
          : 'You need to sign in to see this page.'}
      </p>
      <Link
        href={session ? homePathFor(session.role) : '/login'}
        className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        {session ? 'Back to your dashboard' : 'Sign in'}
      </Link>
    </div>
  );
}
