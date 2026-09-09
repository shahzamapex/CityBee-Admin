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
  border: '1px solid #e7e5e4',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: 12,
  fontWeight: 600,
};

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
          <span className="text-3xl font-extrabold tabular-nums">{total}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Businesses
          </span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            {entry.name}
            <span className="ml-auto tabular-nums text-slate-400">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryBars({
  data,
  color = '#FF6F00',
}: {
  data: { name: string; count: number }[];
  color?: string;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efed" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fontWeight: 600, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={44}
          />
          <YAxis
            tick={{ fontSize: 10, fontWeight: 600, fill: '#a8a29e' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#FFF3E0' }} />
          <Bar dataKey="count" name="Businesses" fill={color} radius={[6, 6, 0, 0]} maxBarSize={38} />
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
            <linearGradient id="orangeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6F00" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF6F00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efed" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontWeight: 600, fill: '#a8a29e' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fontWeight: 600, fill: '#a8a29e' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="count"
            name="Submissions"
            stroke="#FF6F00"
            strokeWidth={2.5}
            fill="url(#orangeFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#FF6F00' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
