'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
};

// UrbanPulse status colors.
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const ROSE = '#ef4444';
const SLATE = '#94a3b8';
const INDIGO = '#4338ca';
const TEAL = '#0d9488';

export function StatusDonut({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-headline text-3xl font-bold tabular-nums text-ink">{total}</span>
          <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Businesses
          </span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 font-body text-xs font-semibold text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            {entry.name}
            <span className="ml-auto tabular-nums text-ink-muted">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryBars({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fontWeight: 600, fill: '#464554', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={44}
          />
          <YAxis
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#e3dfff' }} />
          <Bar dataKey="count" name="Businesses" fill={INDIGO} radius={[6, 6, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SubmissionsArea({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="indigoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INDIGO} stopOpacity={0.25} />
              <stop offset="100%" stopColor={INDIGO} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="count"
            name="Submissions"
            stroke={INDIGO}
            strokeWidth={2.5}
            fill="url(#indigoFill)"
            dot={false}
            activeDot={{ r: 4, fill: INDIGO }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
