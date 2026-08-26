type Props = {
  percentage: number;
  completed: number;
  total: number;
  /** Hide the "3 of 5 lessons" line when the caller says it elsewhere. */
  compact?: boolean;
};

export default function ProgressBar({ percentage, completed, total, compact = false }: Props) {
  const done = percentage >= 100 && total > 0;

  return (
    <div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentage}% complete`}
      >
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-slate-900'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {compact ? null : (
        <p className="mt-1.5 text-xs text-slate-500">
          {total === 0
            ? 'No lessons yet'
            : `${completed} of ${total} lesson${total === 1 ? '' : 's'} done · ${percentage}%`}
        </p>
      )}
    </div>
  );
}
