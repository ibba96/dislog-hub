"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useTheme } from "./useTheme";

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(1);
}

interface TrendPoint { period: string; ca: number; marge: number; ebitda: number; }

export function EntityTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const theme = useTheme();
  const dark = theme === "dark";

  const grid  = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const tick  = dark ? "#475569" : "#94a3b8";
  const marge = dark ? "#64748b" : "#94a3b8";
  const ebitda = dark ? "#334155" : "#cbd5e1";
  const tooltipBg     = dark ? "rgba(8,14,26,0.98)"  : "#ffffff";
  const tooltipBorder = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: any, name: any) => [`${fmt(Number(v))} MAD`, String(name).toUpperCase()]}
          contentStyle={{
            fontSize: 12, borderRadius: 10,
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            color: dark ? "#e2e8f0" : "#0f172a",
            boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.12)",
          }}
          labelStyle={{ color: dark ? "#64748b" : "#94a3b8", fontSize: 10, marginBottom: 4 }}
        />
        <Line type="monotone" dataKey="ca"     name="CA"     stroke={color}  strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="marge"  name="Marge"  stroke={marge}  strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke={ebitda} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface KpiBar { label: string; value: number; target: number; }

export function KpiBarChart({ data }: { data: KpiBar[] }) {
  const theme = useTheme();
  const dark = theme === "dark";

  const grid  = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const tick  = dark ? "#475569" : "#94a3b8";
  const targetColor = dark ? "#1e293b" : "#e2e8f0";
  const tooltipBg     = dark ? "rgba(8,14,26,0.98)"  : "#ffffff";
  const tooltipBorder = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: tick }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: any) => [fmt(Number(v)), ""]}
          contentStyle={{
            fontSize: 12, borderRadius: 10,
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            color: dark ? "#e2e8f0" : "#0f172a",
          }}
        />
        <Bar dataKey="value"  name="Réel"     fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="target" name="Objectif" fill={targetColor} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
