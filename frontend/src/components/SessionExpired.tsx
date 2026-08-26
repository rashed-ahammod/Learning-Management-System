import { logout } from '@/lib/auth-actions';

/**
 * Shown when Strapi rejects the token in our session cookie.
 *
 * There are two ways to get here, and they look identical from the server. The
 * ordinary one: the cookie lasts a week, and the account was deleted or the JWT
 * stopped being valid somewhere in the middle of it. The other one: somebody
 * wrote themselves a session cookie by hand. Either way the page renders and the
 * data does not, which is the whole argument for enforcing on the backend.
 *
 * The way out is a sign-out button rather than an automatic redirect. Clearing a
 * cookie is a write, and Next only permits those from a server action or a route
 * handler - never while a page is rendering. Redirecting to /login without
 * clearing it would bounce straight back, since the proxy sees a session there
 * and sends signed-in visitors away.
 */
export default function SessionExpired() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
      <p className="font-medium text-amber-900">Your session is no longer valid</p>
      <p className="mt-1 text-sm text-amber-800">
        The server would not accept your sign-in. Sign in again to carry on.
      </p>
      <form action={logout} className="mt-4">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Sign in again
        </button>
      </form>
    </div>
  );
}
