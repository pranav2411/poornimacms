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

// Gradient IDs corresponding to each status color
const GRADIENTS = ["url(#blueGrad)", "url(#greenGrad)", "url(#yellowGrad)"];

export default function StatsCharts({ stats }: StatChartProps) {
  // Simple check to render default values if stats are empty
  const chartData = stats.map(item => ({
    ...item,
    value: item.value || 0
  }));

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Pie (Donut) Chart */}
      <div className="glass-panel p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold text-heading mb-4">
          Complaints Distribution
        </h3>
        <div className="flex-1 min-h-[300px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="yellowGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={4}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GRADIENTS[index % GRADIENTS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  borderRadius: "12px",
                  color: "#0f172a",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={10}
                formatter={(value) => <span className="text-xs font-medium text-body ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="glass-panel p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold text-heading mb-4">Stats Overview</h3>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                dx={-8}
              />
              <Tooltip
                cursor={{ fill: "rgba(15, 23, 42, 0.02)" }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  borderRadius: "12px",
                  color: "#0f172a",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                }}
              />
              <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
