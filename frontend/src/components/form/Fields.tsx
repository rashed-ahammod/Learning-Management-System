'use client';

import { useFormStatus } from 'react-dom';

const inputStyles =
  'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string | number;
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

export function TextField({ name, label, defaultValue, placeholder, hint, required }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={inputStyles}
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function NumberField({ name, label, defaultValue, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={1}
        step={1}
        defaultValue={defaultValue}
        required
        className={`${inputStyles} max-w-28`}
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  rows = 4,
  placeholder,
  hint,
}: FieldProps & { rows?: number }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputStyles}
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  tone = 'primary',
}: {
  label: string;
  pendingLabel?: string;
  tone?: 'primary' | 'danger';
}) {
  const { pending } = useFormStatus();

  const styles =
    tone === 'danger'
      ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
      : 'bg-slate-900 text-white hover:bg-slate-700';

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending ? (pendingLabel ?? 'Saving…') : label}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

export function SavedHint({ show }: { show: boolean }) {
  if (!show) return null;

  return <p className="text-sm text-emerald-700">Saved.</p>;
}
