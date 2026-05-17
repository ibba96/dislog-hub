"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTheme } from "./useTheme";

interface TrendPoint { p: string; Food: number; Hygiene: number; Health: number; }
interface EntityBar  { name: string; ca: number; color: string; }

export default function WarRoomCharts({ trendData, entityData }: { trendData: TrendPoint[]; entityData: EntityBar[] }) {
  const theme = useTheme();
  const dark = theme === "dark";

  const grid        = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.07)";
  const tick        = dark ? "#475569"                : "#94a3b8";
  const tooltipBg   = dark ? "rgba(8,14,26,0.98)"    : "#ffffff";
  const tooltipBd   = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = dark ? "#e2e8f0"                : "#0f172a";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: tooltipBg, border: `1px solid ${tooltipBd}`,
        borderRadius: 12, padding: "10px 14px",
        boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)",
      }}>
        <p style={{ fontSize: 10, color: tick, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs" style={{ color: tooltipText }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color, display: "inline-block" }} />
            <span style={{ color: tick, fontSize: 11 }}>{p.dataKey}</span>
            <span style={{ fontWeight: 700, marginLeft: "auto", paddingLeft: 12 }}>{p.value?.toFixed(1)}M</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Area trend */}
      <div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {[
                { id: "gradFood",   color: "#f97316" },
                { id: "gradHyg",    color: "#3b82f6" },
                { id: "gradHealth", color: "#22c55e" },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={dark ? 0.25 : 0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="p" tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Food"    stroke="#f97316" strokeWidth={2} fill="url(#gradFood)"   dot={false} />
            <Area type="monotone" dataKey="Hygiene" stroke="#3b82f6" strokeWidth={2} fill="url(#gradHyg)"    dot={false} />
            <Area type="monotone" dataKey="Health"  stroke="#22c55e" strokeWidth={2} fill="url(#gradHealth)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar entity */}
      <div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={entityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: tick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBd}`,
                borderRadius: 12, fontSize: 11,
                color: tooltipText,
                boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.12)",
              }}
              formatter={(v: any) => [`${Number(v).toFixed(1)}M MAD`, "CA"]}
              labelStyle={{ color: tick, fontSize: 10 }}
            />
            <Bar dataKey="ca" radius={[4, 4, 0, 0]} fill="#10b981" opacity={dark ? 0.85 : 0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
