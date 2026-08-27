'use server';

import { revalidatePath } from 'next/cache';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';

export type AdminState = { error: string | null; saved?: boolean };

/**
 * Changes which role a user holds.
 *
 * The one rule enforced here rather than by the backend: an admin cannot change
 * their own role. Strapi would happily allow it - the permission says "may
 * update users" and they are a user - and the result is an admin who has just
 * demoted themselves out of the only screen that could put it back. If they are
 * the only admin, nobody can.
 */
export async function changeUserRole(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const userId = Number(formData.get('user'));
  const roleId = Number(formData.get('role'));

  if (!Number.isInteger(userId) || !Number.isInteger(roleId)) {
    return { error: 'Something went wrong - reload and try again.' };
  }

  const session = await getSession();

  if (!session) return { error: 'Your session has ended. Sign in again.' };

  if (userId === session.userId) {
    return { error: 'You cannot change your own role - ask another admin.' };
  }

  try {
    // users-permissions takes a flat body, not { data: ... }.
    await strapiFetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: { role: roleId },
      token: session.jwt,
    });
  } catch (error) {
    return {
      error: error instanceof StrapiError ? error.message : 'Could not change the role.',
    };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin');

  return { error: null, saved: true };
}

export async function deleteUser(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const userId = Number(formData.get('user'));

  if (!Number.isInteger(userId)) {
    return { error: 'Something went wrong - reload and try again.' };
  }

  const session = await getSession();

  if (!session) return { error: 'Your session has ended. Sign in again.' };

  if (userId === session.userId) {
    return { error: 'You cannot delete your own account here.' };
  }

  try {
    await strapiFetch(`/api/users/${userId}`, { method: 'DELETE', token: session.jwt });
  } catch (error) {
    return {
      error: error instanceof StrapiError ? error.message : 'Could not delete the account.',
    };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin');

  return { error: null, saved: true };
}
