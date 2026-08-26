import { isRole, type Role } from './roles';

export const SESSION_COOKIE = 'lms_session';

export type Session = {
  /** The Strapi JWT. Never leaves the server - see lib/auth.ts. */
  jwt: string;
  userId: number;
  username: string;
  email: string;
  role: Role;
};

/**
 * The cookie carries base64, not raw JSON.
 *
 * A cookie value cannot legally contain braces, quotes or commas, and different
 * layers disagree about whether to percent-encode them for you - which is the
 * sort of thing that works locally and then loses everyone's session behind a
 * proxy. Base64 sidesteps the argument: every character it produces is already
 * safe, and nothing along the way is tempted to re-encode it.
 *
 * This is not a security measure. Anyone can decode it; that is fine, because
 * the contents are the user's own name and role, and the JWT inside is only
 * useful to somebody who already has the cookie.
 */
function encode(value: string): string {
  // btoa only speaks latin1, so widen through URI encoding first - otherwise a
  // username with an accent in it throws.
  return btoa(encodeURIComponent(value));
}

function decode(value: string): string {
  return decodeURIComponent(atob(value));
}

export function serializeSession(session: Session): string {
  return encode(JSON.stringify(session));
}

/**
 * Reads a session out of the raw cookie value.
 *
 * Deliberately kept free of `next/headers` and anything Node-only, because the
 * proxy runs on the edge runtime and has to import this too.
 */
export function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decode(raw)) as Partial<Session>;

    if (typeof parsed.jwt !== 'string' || !parsed.jwt) return null;
    if (!isRole(parsed.role)) return null;

    return {
      jwt: parsed.jwt,
      userId: Number(parsed.userId),
      username: String(parsed.username ?? ''),
      email: String(parsed.email ?? ''),
      role: parsed.role,
    };
  } catch {
    // A malformed cookie is treated as no session at all rather than an error -
    // the visitor just gets sent to the login page.
    return null;
  }
}
