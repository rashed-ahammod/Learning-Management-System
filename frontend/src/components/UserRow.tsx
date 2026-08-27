'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import ConfirmSubmit from './ConfirmSubmit';
import { FormError } from './form/Fields';
import { changeUserRole, deleteUser, type AdminState } from '@/lib/admin-actions';
import type { AssignableRole, ManagedUser } from '@/lib/types';

function SaveRole({ changed }: { changed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      // Nothing to save until the dropdown actually moves, so the button stays
      // out of the way rather than inviting a write that changes nothing.
      disabled={pending || !changed}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export default function UserRow({
  user,
  roles,
  isSelf,
}: {
  user: ManagedUser;
  roles: AssignableRole[];
  isSelf: boolean;
}) {
  const currentRoleId = user.role?.id ?? 0;

  const [selected, setSelected] = useState(currentRoleId);
  const [state, formAction] = useActionState<AdminState, FormData>(changeUserRole, {
    error: null,
  });

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user.username}
            {isSelf ? <span className="ml-2 text-xs text-slate-400">you</span> : null}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>

        {isSelf ? (
          // An admin who demotes themselves loses the only screen that could put
          // it back - so the controls are not offered, rather than offered and
          // then refused by the action.
          <p className="text-xs text-slate-500">{user.role?.name} · your own account</p>
        ) : (
          <>
            <form action={formAction} className="flex items-center gap-2">
              <input type="hidden" name="user" value={user.id} />
              <label className="sr-only" htmlFor={`role-${user.id}`}>
                Role for {user.username}
              </label>
              <select
                id={`role-${user.id}`}
                name="role"
                value={selected}
                onChange={(event) => setSelected(Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <SaveRole changed={selected !== currentRoleId} />
            </form>

            <ConfirmSubmit
              action={deleteUser}
              fields={{ user: String(user.id) }}
              label="Delete"
              pendingLabel="Deleting…"
              confirm={`Delete ${user.username}? Their enrolments, progress and quiz results go too.`}
            />
          </>
        )}
      </div>

      {state.error ? (
        <div className="mt-2">
          <FormError message={state.error} />
        </div>
      ) : null}
      {state.saved ? <p className="mt-2 text-xs text-emerald-700">Role updated.</p> : null}
    </li>
  );
}
