'use server';

import { redirect } from 'next/navigation';

import { endSession, startSession } from './auth';
import { homePathFor, isRole } from './roles';
import { StrapiError, strapiFetch } from './strapi';

export type AuthState = { error: string | null };

type LoginResponse = {
  jwt: string;
  user: { id: number; username: string; email: string };
};

/**
 * Strapi's /api/users/me, which we extended on the backend so it returns the
 * caller's own role - the stock version strips it for everyone but admins.
 */
type MeResponse = {
  id: number;
  username: string;
  email: string;
  role: { id: number; name: string; type: string } | null;
};

async function openSessionFor(jwt: string): Promise<string> {
  const me = await strapiFetch<MeResponse>('/api/users/me', { token: jwt });

  if (!me.role || !isRole(me.role.type)) {
    throw new StrapiError('Your account has no role assigned. Ask an admin to fix this.', 500);
  }

  await startSession({
    jwt,
    userId: me.id,
    username: me.username,
    email: me.email,
    role: me.role.type,
  });

  return homePathFor(me.role.type);
}

function readableError(error: unknown): string {
  if (error instanceof StrapiError) return error.message;

  return 'Could not reach the server. Is the backend running?';
}

/** Somewhere safe to send people, so ?next= cannot bounce them off-site. */
function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === 'string' ? value : '';

  return next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export async function login(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!identifier || !password) {
    return { error: 'Enter your email and password.' };
  }

  let destination: string;

  try {
    const auth = await strapiFetch<LoginResponse>('/api/auth/local', {
      method: 'POST',
      body: { identifier, password },
    });

    destination = await openSessionFor(auth.jwt);
  } catch (error) {
    return { error: readableError(error) };
  }

  // redirect() works by throwing, so it has to sit outside the try - inside, the
  // catch above would swallow it and the user would just see the form again.
  redirect(safeNext(formData.get('next')) ?? destination);
}

export async function signup(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !email || !password) {
    return { error: 'Fill in every field.' };
  }

  if (password.length < 8) {
    return { error: 'Use a password of at least 8 characters.' };
  }

  let destination: string;

  try {
    // Note there is no role field here. The backend assigns every new account
    // the student role; anything above that is granted by an admin afterwards.
    const auth = await strapiFetch<LoginResponse>('/api/auth/local/register', {
      method: 'POST',
      body: { username, email, password },
    });

    destination = await openSessionFor(auth.jwt);
  } catch (error) {
    return { error: readableError(error) };
  }

  redirect(destination);
}

export async function logout(): Promise<void> {
  await endSession();

  redirect('/');
}
