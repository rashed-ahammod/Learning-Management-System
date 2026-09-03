import { NextResponse, type NextRequest } from 'next/server';

// Next 16 renamed this convention: what used to be middleware.ts is now proxy.ts,
// exporting a default `proxy` function. Same execution point, same job.

import { isRole, rolesAllowedFor } from './lib/roles';
import { SESSION_COOKIE, parseSession, serializeSession, type Session } from './lib/session';

const PUBLIC_ONLY = ['/login', '/signup'];

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

/**
 * Asks Strapi who this JWT actually belongs to right now, rather than trusting
 * the role captured in the cookie at login time.
 *
 * Only called for protected routes - a public page has no role to get wrong,
 * so it is never worth the extra request. If Strapi cannot be reached, the
 * cached role is kept rather than treating a network hiccup as a role change.
 */
async function currentRole(jwt: string): Promise<string | null> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!response.ok) return null;

    const me = (await response.json()) as { role?: { type?: string } | null };

    return me.role?.type ?? null;
  } catch {
    return null;
  }
}

/**
 * Decides who gets to *open a page*. Runs before any page does.
 *
 * Worth being precise about what this is and is not. This is not the security
 * boundary. The session cookie is httpOnly, so no script can read it, but a
 * determined user can still edit cookies in their own browser and claim to be an
 * admin - and this would believe them, because it only ever looks at the cookie.
 *
 * What they would get is the shell of the page and nothing in it. Every piece of
 * data on that page comes from Strapi, over a request carrying the real JWT, and
 * Strapi checks the role attached to that token against its own permission table
 * before answering. A forged role cookie changes which page renders; it does not
 * change one row of what the API is willing to return.
 *
 * So this exists to keep honest users out of pages that would only show them
 * errors, and to send them somewhere sensible instead. The actual enforcement
 * lives in the backend - in src/bootstrap/permissions.js and the policies beside
 * it - and is verified there by `npm run check:permissions`.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);

  // No reason to show the login form to somebody already signed in.
  if (session && PUBLIC_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const allowed = rolesAllowedFor(pathname);

  if (!allowed) {
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL('/login', request.url);
    // Remember where they were headed so the login form can send them back.
    login.searchParams.set('next', pathname);

    return NextResponse.redirect(login);
  }

  // A promotion or demotion made after this session started would otherwise
  // stay invisible until the next login - check Strapi directly instead of
  // trusting whatever role was cached at sign-in.
  const freshRole = await currentRole(session.jwt);
  let refreshedCookie: string | null = null;

  if (isRole(freshRole) && freshRole !== session.role) {
    session = { ...session, role: freshRole } as Session;
    refreshedCookie = serializeSession(session);

    // Rewriting only the response cookie would fix the browser's copy for the
    // *next* request but leave this one rendering against the stale role - the
    // page underneath reads cookies() off the incoming request, not the
    // response. Setting it here too means the page that renders right after a
    // promotion already sees the new role, not one navigation later.
    request.cookies.set(SESSION_COOKIE, refreshedCookie);
  }

  if (!allowed.includes(session.role)) {
    const response = NextResponse.redirect(new URL('/unauthorized', request.url));

    if (refreshedCookie) {
      response.cookies.set(SESSION_COOKIE, refreshedCookie, SESSION_COOKIE_OPTIONS);
    }

    return response;
  }

  const response = NextResponse.next({ request });

  if (refreshedCookie) {
    response.cookies.set(SESSION_COOKIE, refreshedCookie, SESSION_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
