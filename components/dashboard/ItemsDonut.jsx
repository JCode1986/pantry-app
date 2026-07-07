'use client';

import { Tooltip as HeroTooltip } from '@heroui/react';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { FaInfoCircle } from 'react-icons/fa';

const palette = [
  '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#22C55E', '#F97316', '#14B8A6', '#3B82F6'
];

export default function ItemsDonut({
  data,
  title = 'Items',
  emptyText = 'No items available for data.',
  tooltip,
  groupSingular = 'group',
  groupPlural = 'groups',
}) {
  const chartData = (data || []).map((d, i) => ({
    id: d.id ?? d.location_id ?? d.storage_area_id ?? d.category_id ?? i,
    name: d.name ?? d.location_name ?? d.storage_area_name ?? d.category_name ?? 'Unknown',
    value: d.item_count ?? 0,
    color: palette[i % palette.length],
  }));

  const activeData = chartData.filter((d) => d.value > 0);
  const total = chartData.reduce((s, d) => s + d.value, 0);
  const topEntry = activeData.reduce(
    (best, entry) => (!best || entry.value > best.value ? entry : best),
    null
  );
  const groupLabel = chartData.length === 1 ? groupSingular : groupPlural;

  return (
    <div className="rounded-2xl bg-white shadow-sm border-gray-300 border">
      <div className="p-5 border-b border-gray-300">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          {tooltip ? (
            <HeroTooltip
              content={tooltip}
              placement="left"
              className="max-w-xs text-sm"
            >
              <button
                type="button"
                aria-label={`${title} info`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
              >
                <FaInfoCircle className="h-4 w-4" />
              </button>
            </HeroTooltip>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {total === 0
            ? `No ${groupPlural} contain items yet.`
            : `${activeData.length} of ${chartData.length} ${groupLabel} ${
                activeData.length === 1 ? 'has' : 'have'
              } items.`}
        </p>
      </div>

      <div className="relative h-72 p-4">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {emptyText}
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-28 text-center">
                <div className="text-2xl font-semibold leading-none text-gray-700">
                  {topEntry?.value ?? 0}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase text-gray-400">
                  Top
                </div>
                <div className="truncate text-xs text-gray-500">
                  {topEntry?.name}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                >
                  {activeData.map((entry) => (
                    <Cell key={`slice-${entry.id}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {activeData.length > 0 ? (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2"
        >
          {activeData.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: d.color }} />
                <span className="truncate text-gray-600">{d.name}</span>
              </div>
              <span className="shrink-0 text-gray-500">{d.value}</span>
            </li>
          ))}
        </motion.ul>
      ) : null}
    </div>
  );
}
