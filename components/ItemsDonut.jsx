// components/ItemsDonut.jsx
'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const palette = [
  '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#22C55E', '#F97316', '#14B8A6', '#3B82F6'
];

export default function ItemsDonut({ data }) {
  const chartData = (data || []).map((d, i) => ({
    name: d.location_name ?? 'Unknown',
    value: d.item_count ?? 0,
    color: palette[i % palette.length],
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm h-full border-gray-300 border">
      <div className="p-5 border-b border-gray-300">
        <h2 className="text-lg font-semibold text-stocksense-teal">Items by location</h2>
        <p className="text-xs text-gray-500 mt-1">Total: {total}</p>
      </div>

      <div className="p-4 h-80">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No items available for data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`slice-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* legend */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 pb-5"
      >
        {chartData.map((d, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </div>
            <span className="text-gray-500">{d.value}</span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
