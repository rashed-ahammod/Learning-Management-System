'use client';

import { useActionState } from 'react';

import { FormError, SubmitButton } from './form/Fields';
import type { FormState } from '@/lib/manage-actions';

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  confirm: string;
};

/**
 * A destructive action behind a confirmation.
 *
 * The check runs in onSubmit rather than on the button's click, so it also
 * catches an Enter press in the form - and returning false from it stops the
 * submission entirely rather than letting the action fire and undoing it after.
 */
export default function ConfirmSubmit({ action, fields, label, pendingLabel, confirm }: Props) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(confirm)) event.preventDefault();
        }}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton label={label} pendingLabel={pendingLabel} tone="danger" />
      </form>
      <FormError message={state.error} />
    </div>
  );
}
