import 'server-only';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export class StrapiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'StrapiError';
    this.status = status;
  }
}

/**
 * Did Strapi turn our token down?
 *
 * 401 is the token itself being no good - expired, revoked, or invented. 403 is
 * a valid token without the right permission, which is a different problem and
 * deliberately not included here.
 */
export function isRejectedToken(error: unknown): boolean {
  return error instanceof StrapiError && error.status === 401;
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** The caller's JWT. Without one the request is made as the public role. */
  token?: string;
  /** Seconds to cache for; false disables caching. Defaults to no cache. */
  revalidate?: number | false;
};

/**
 * The single place this app talks to Strapi.
 *
 * It is server-only on purpose. Every authenticated call needs the JWT, the JWT
 * lives in an httpOnly cookie, and the whole point of that cookie is that
 * browser JavaScript cannot read it. So requests are made from server
 * components and server actions, and the token never reaches the client at all.
 */
export async function strapiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, token, revalidate = false } = options;

  const response = await fetch(`${STRAPI_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(revalidate === false ? { cache: 'no-store' } : { next: { revalidate } }),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new StrapiError(errorMessageFrom(payload, response.status), response.status);
  }

  return payload as T;
}

/**
 * Strapi wraps failures as { error: { message, details } }. Pulling the message
 * out means a validation failure can be shown to the user as written - "You are
 * already enrolled in this course" reads better than "Request failed with 400".
 */
function errorMessageFrom(payload: unknown, status: number): string {
  const message = (payload as { error?: { message?: string } } | null)?.error?.message;

  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }

  if (status === 401 || status === 403) return 'You are not allowed to do that.';
  if (status === 404) return 'That does not exist.';

  return `Request to Strapi failed (${status}).`;
}
