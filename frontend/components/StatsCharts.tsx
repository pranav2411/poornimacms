"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface StatChartProps {
  stats: Array<{ label: string; value: number }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

export default function StatsCharts({ stats }: StatChartProps) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Pie Chart */}
      <div className="rounded-lg border border-accent/20 bg-white/10 backdrop-blur p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Complaints Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={stats}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ label, value }) => `${label}: ${value}`}
            >
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => value} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div className="rounded-lg border border-accent/20 bg-white/10 backdrop-blur p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Stats Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.7)"
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="rgba(255,255,255,0.7)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
