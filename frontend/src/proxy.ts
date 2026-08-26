import { NextResponse, type NextRequest } from 'next/server';

// Next 16 renamed this convention: what used to be middleware.ts is now proxy.ts,
// exporting a default `proxy` function. Same execution point, same job.

import { rolesAllowedFor } from './lib/roles';
import { SESSION_COOKIE, parseSession } from './lib/session';

const PUBLIC_ONLY = ['/login', '/signup'];

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
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);

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

  if (!allowed.includes(session.role)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
