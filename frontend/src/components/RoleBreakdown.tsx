import { ROLE_LABELS, ROLES, type Role } from '@/lib/roles';

/**
 * How the user base splits across the four roles.
 *
 * Bars in a single hue, not four different ones. The question being asked is
 * "how many of each" - a magnitude comparison - and magnitude is a job for one
 * hue varying in length. Giving each role its own colour would imply the colours
 * mean something, when the labels beside them already say everything.
 *
 * The roles are listed in a fixed order, so a role dropping to zero does not
 * reshuffle the rows underneath it.
 */
export default function RoleBreakdown({ byRole }: { byRole: Record<string, number> }) {
  const counts = ROLES.map((role: Role) => ({ role, count: byRole[role] ?? 0 }));
  const largest = Math.max(1, ...counts.map((entry) => entry.count));

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Users by role</p>

      <ul className="mt-4 space-y-3">
        {counts.map(({ role, count }) => (
          <li key={role} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-slate-600">{ROLE_LABELS[role]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${(count / largest) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
              {count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
