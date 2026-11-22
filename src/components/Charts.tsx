import { inrCompact } from '../lib/format';

export function BarChart({
  data,
  height = 150,
  accent = '#0f172a',
  format = inrCompact,
  showLabels = true,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  accent?: string;
  format?: (n: number) => string;
  showLabels?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-1 text-[10px] font-semibold text-white group-hover:block">
              {format(d.value)}
            </div>
            <div
              className="w-full rounded-t-[3px] transition group-hover:opacity-80"
              style={{
                height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%`,
                backgroundColor: accent,
              }}
            />
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="mt-2 flex gap-1">
          {data.map((d, i) => (
            <div key={`${d.label}-l-${i}`} className="flex-1 truncate text-center text-[9px] text-slate-400">
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupedBars({
  data,
  height = 190,
  format = inrCompact,
}: {
  data: Array<{ label: string; revenue: number; profit: number }>;
  height?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.flatMap((d) => [d.revenue, d.profit]), 1);
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              <div
                title={`Revenue ${format(d.revenue)}`}
                className="w-1/3 rounded-t bg-slate-800"
                style={{ height: `${Math.max(d.revenue ? 3 : 0, (d.revenue / max) * 100)}%` }}
              />
              <div
                title={`Gross profit ${format(d.profit)}`}
                className="w-1/3 rounded-t bg-amber-400"
                style={{ height: `${Math.max(d.profit ? 3 : 0, (d.profit / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {data.map((d) => (
          <div key={`${d.label}-l`} className="flex-1 text-center text-[10px] text-slate-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 150,
  thickness = 20,
  center,
  sub,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  center?: string;
  sub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let angle = 0;
  const stops = segments.map((s) => {
    const start = angle;
    const sweep = (s.value / total) * 360;
    angle += sweep;
    return `${s.color} ${start}deg ${angle}deg`;
  });
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: total > 0 ? `conic-gradient(${stops.join(',')})` : '#e2e8f0',
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white" style={{ margin: thickness }}>
          {center && <span className="text-lg font-bold text-slate-900">{center}</span>}
          {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="font-semibold text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({
  data,
  format,
}: {
  data: Array<{ label: string; value: number; hint?: string; tone?: string }>;
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700">{d.label}</span>
            <span className="text-slate-500">{d.hint ?? format?.(d.value) ?? d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: d.tone ?? '#f59e0b' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
