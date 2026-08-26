import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { rolesAllowedFor, type Role } from './roles';
import { SESSION_COOKIE, parseSession, serializeSession, type Session } from './session';

/** A week. Strapi's own JWT outlives this, so the cookie is what expires first. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getSession(): Promise<Session | null> {
  const store = await cookies();

  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(session: Session): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, serializeSession(session), {
    // The three that matter:
    //   httpOnly - browser JavaScript cannot read the JWT, so an XSS bug on any
    //              page cannot walk off with the user's token
    //   sameSite - the cookie is not attached to cross-site requests, which is
    //              what stops another site posting to our forms as this user
    //   secure   - HTTPS only in production; left off locally so http://localhost works
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();

  store.delete(SESSION_COOKIE);
}

/**
 * For server components that need a signed-in user.
 *
 * The proxy already turns anonymous visitors away, so reaching this with no
 * session should not happen - but a page is not entitled to assume that. If the
 * matcher is ever narrowed, this is what stops the page rendering anyway.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireRole(...allowed: Role[]): Promise<Session> {
  const session = await requireSession();

  if (!allowed.includes(session.role)) {
    redirect('/unauthorized');
  }

  return session;
}

/** Same question the middleware asks, for use inside a page. */
export async function canOpen(pathname: string): Promise<boolean> {
  const allowed = rolesAllowedFor(pathname);

  if (!allowed) return true;

  const session = await getSession();

  return Boolean(session && allowed.includes(session.role));
}
