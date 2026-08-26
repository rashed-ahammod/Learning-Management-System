'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { AuthState } from '@/lib/auth-actions';

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  hint?: string;
};

type Props = {
  title: string;
  subtitle: string;
  fields: Field[];
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  footer: React.ReactNode;
  /** Where to go after signing in, carried through from the middleware. */
  next?: string;
};

function SubmitButton({ label }: { label: string }) {
  // Comes from the enclosing <form>, so the button knows the action is running
  // without any state of our own.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? 'Just a moment…' : label}
    </button>
  );
}

export default function AuthForm({
  title,
  subtitle,
  fields,
  action,
  submitLabel,
  footer,
  next,
}: Props) {
  const [state, formAction] = useActionState(action, { error: null });

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

      <form action={formAction} className="mt-8 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {field.hint ? <p className="mt-1 text-xs text-slate-500">{field.hint}</p> : null}
          </div>
        ))}

        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton label={submitLabel} />
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-slate-900 underline underline-offset-4">
      {children}
    </Link>
  );
}
