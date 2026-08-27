export const ROLES = ['admin', 'content-manager', 'instructor', 'student'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  'content-manager': 'Content Manager',
  instructor: 'Instructor',
  student: 'Student',
};

/** Roles that author content, as opposed to consuming it. */
export const STAFF_ROLES: Role[] = ['admin', 'content-manager', 'instructor'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

type RouteRule = {
  prefix: string;
  roles: readonly Role[];
};

/**
 * Which roles may open which part of the app.
 *
 * Note /manage/blog is narrower than /manage: instructors manage courses but do
 * not write the blog. That only works if the more specific rule is checked
 * first, so rather than relying on the order somebody happens to type them in,
 * the list is sorted by prefix length below. Getting this wrong would silently
 * hand instructors the blog, which is exactly the sort of mistake that never
 * announces itself.
 */
const RULES: RouteRule[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/manage/blog', roles: ['admin', 'content-manager'] },
  { prefix: '/manage', roles: STAFF_ROLES },
  { prefix: '/my-courses', roles: ['student'] },
  { prefix: '/dashboard', roles: ROLES },
];

const ROUTE_RULES = [...RULES].sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * The roles allowed to open a path, or null if the path is open to everyone.
 */
export function rolesAllowedFor(pathname: string): readonly Role[] | null {
  const rule = ROUTE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return rule ? rule.roles : null;
}

/** Where a user should land after signing in. */
export function homePathFor(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'student') return '/my-courses';

  return '/manage';
}
