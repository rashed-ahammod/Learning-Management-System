/**
 * One headline number.
 *
 * A stat tile rather than a one-bar chart: when the job is "report a single
 * current value", a chart adds axes and gridlines around a number the reader
 * could simply have been told. The label stays in muted ink and the value in
 * primary ink - no colour is doing any work here, because nothing is being
 * distinguished from anything else.
 */
export default function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}
