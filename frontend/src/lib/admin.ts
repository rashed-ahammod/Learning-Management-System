import 'server-only';

import { getSession } from './auth';
import { strapiFetch } from './strapi';
import type { AssignableRole, ManagedUser, PlatformStats, Single } from './types';

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const session = await getSession();

  if (!session) return null;

  const response = await strapiFetch<Single<PlatformStats>>('/api/stats/overview', {
    token: session.jwt,
  });

  return response.data;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const session = await getSession();

  if (!session) return [];

  // A bare array, not { data: [...] } - see the note on ManagedUser.
  return strapiFetch<ManagedUser[]>('/api/users?populate=role&sort=createdAt:desc', {
    token: session.jwt,
  });
}

/** The four application roles, for the reassignment dropdown. */
export async function listAssignableRoles(): Promise<AssignableRole[]> {
  const session = await getSession();

  if (!session) return [];

  const response = await strapiFetch<{ roles: AssignableRole[] }>(
    '/api/users-permissions/roles',
    { token: session.jwt }
  );

  // public and authenticated are Strapi's own; nobody is assigned them here.
  return response.roles.filter(
    (role) => role.type !== 'public' && role.type !== 'authenticated'
  );
}
