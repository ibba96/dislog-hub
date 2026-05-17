"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

interface EntityBar {
  name: string;
  ca: number;
  color: string;
}

export function CABarChart({ data }: { data: EntityBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          formatter={(v: any) => [`${fmt(Number(v))} MAD`, "CA"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="ca" radius={[4, 4, 0, 0]} fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TrendPoint {
  period: string;
  Food: number;
  Hygiene: number;
  Health: number;
}

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          formatter={(v: any, name: any) => [`${fmt(Number(v))} MAD`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Food" stroke="#f97316" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Hygiene" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Health" stroke="#22c55e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
