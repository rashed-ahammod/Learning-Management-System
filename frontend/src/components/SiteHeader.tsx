import Link from 'next/link';

import { getSession } from '@/lib/auth';
import { logout } from '@/lib/auth-actions';
import { ROLE_LABELS, STAFF_ROLES, type Role } from '@/lib/roles';

/** The nav each role gets. Everyone also sees the public links. */
function linksFor(role: Role): { href: string; label: string }[] {
  if (role === 'admin') {
    return [
      { href: '/admin', label: 'Admin' },
      { href: '/manage', label: 'Manage courses' },
    ];
  }

  if (STAFF_ROLES.includes(role)) {
    return [{ href: '/manage', label: 'Manage courses' }];
  }

  return [{ href: '/my-courses', label: 'My courses' }];
}

export default async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          LMS
        </Link>

        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <Link href="/" className="transition hover:text-slate-900">
            Courses
          </Link>
          <Link href="/blog" className="transition hover:text-slate-900">
            Blog
          </Link>
          {session
            ? linksFor(session.role).map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-slate-900">
                  {link.label}
                </Link>
              ))
            : null}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm">
          {session ? (
            <>
              <span className="hidden text-slate-600 sm:inline">
                {session.username}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {ROLE_LABELS[session.role]}
                </span>
              </span>
              {/* A form, not a link: signing out changes state, so it should not
                  be something a prefetch or a crawler can trigger. */}
              <form action={logout}>
                <button type="submit" className="text-slate-600 transition hover:text-slate-900">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 transition hover:text-slate-900">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
