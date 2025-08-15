'use client';

import { motion } from 'framer-motion';
import {
  FaBoxOpen,        // item
  FaMapMarkerAlt,   // location
  FaBoxes,          // storage area
  FaTags            // category
} from 'react-icons/fa';

/** Helpers */
function label(k) {
  switch (k) {
    case 'expiration_date': return 'Expiration';
    case 'quantity': return 'Qty';
    case 'name': return 'Name';
    default: return k.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function serializeValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return objectToPairs(v);
  return String(v);
}

function objectToPairs(obj) {
  return Object.entries(obj || {})
    .map(([k, val]) => `${label(k)}: ${serializeValue(val)}`)
    .join(', ');
}

function formatChanges(changes) {
  if (!changes || typeof changes !== 'object') return 'Updated';

  const looksCanonical = Object.values(changes).every(
    (v) => v && typeof v === 'object' && ('from' in v || 'to' in v)
  );

  if (looksCanonical) {
    const parts = [];
    for (const [field, diff] of Object.entries(changes)) {
      const fromVal = serializeValue(diff.from);
      const toVal =
        typeof diff.to === 'object' && diff.to !== null
          ? objectToPairs(diff.to)
          : serializeValue(diff.to);
      parts.push(`${label(field)}: ${fromVal} to ${toVal}`);
    }
    return parts.join(' • ');
  }

  // Snapshot (fallback)
  const pretty = [];
  for (const [k, v] of Object.entries(changes)) {
    pretty.push(`${label(k)}: ${serializeValue(v)}`);
  }
  return pretty.length ? `Updated ${pretty.join(' • ')}` : 'Updated';
}

function ActionBadge({ action }) {
  const map = {
    added: {
      text: 'Added',
      className:
        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50',
    },
    updated: {
      text: 'Updated',
      className:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/50',
    },
    deleted: {
      text: 'Removed',
      className:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/50',
    },
  };
  const cfg = map[action] ?? map.updated;
  return (
    <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${cfg.className}`}>
      {cfg.text}
    </span>
  );
}

function entityIcon(entity) {
  switch (entity) {
    case 'location': return <FaMapMarkerAlt className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    case 'storage_area': return <FaBoxes className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    case 'category': return <FaTags className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    default: return <FaBoxOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />; // item
  }
}

function breadcrumb(r) {
  // r.entity_type: 'location' | 'storage_area' | 'category' | 'item'
  switch ((r.entity_type || '').toLowerCase()) {
    case 'location':
      return <span className="font-medium">{r.location_name}</span>;

    case 'storage_area':
      return (
        <>
          <span className="font-medium">{r.storage_area_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> @ </span>
          <span className="text-gray-700 dark:text-gray-300">{r.location_name}</span>
        </>
      );

    case 'category':
      return (
        <>
          <span className="font-medium">{r.category_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> · </span>
          <span className="text-gray-700 dark:text-gray-300">{r.storage_area_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> @ </span>
          <span className="text-gray-700 dark:text-gray-300">{r.location_name}</span>
        </>
      );

    default: // item
      return (
        <>
          <span className="font-medium">{r.item_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> in </span>
          <span className="font-medium">{r.category_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> · </span>
          <span className="text-gray-700 dark:text-gray-300">{r.storage_area_name}</span>
          <span className="text-gray-500 dark:text-gray-400"> @ </span>
          <span className="text-gray-700 dark:text-gray-300">{r.location_name}</span>
        </>
      );
  }
}

function detailLine(r) {
  const action = (r.action || '').toLowerCase();

  // Non-item entities: show simple rename (when present) or generic message
  if (r.entity_type !== 'item') {
    console.log(r, 'whats this????')
    if (action === 'deleted') return `Removed ${r.item_or_entity_name}`;
    if (action === 'added') return `Created ${r.item_or_entity_name}`;
    // show only name change if provided
    if (r.changes?.name) {
      const { from, to } = r.changes.name;
      return `Name: ${serializeValue(from)} to ${serializeValue(to)}`;
    }
    return 'Updated';
  }

  // Item-specific
  if (action === 'added') {
    return `Qty ${r.quantity ?? 0}${r.expiration_date ? ` · Exp ${r.expiration_date}` : ''}`;
  }
  if (action === 'deleted') {
    return `Removed ${r.item_or_entity_name} from ${r.entity_type}`;
  }
  return formatChanges(r.changes);
}

/** Component */
export default function RecentActivity({ items }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-stocksense-teal dark:text-stocksense-sky">
          Recent activity
        </h2>
        <span className="text-xs text-gray-600 dark:text-gray-400">{items.length} items</span>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
        {items.length === 0 ? (
          <li className="p-5 text-gray-600 dark:text-gray-400 text-sm">No recent activity yet.</li>
        ) : (
          items.map((r, idx) => {
            const action = (r.action || '').toLowerCase(); // added | updated | deleted

            return (
              <motion.li
                key={`${r.id ?? r.item_id ?? r.entity_id ?? idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className="flex items-start justify-between gap-3 p-4 text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-xl p-2 bg-gray-100 dark:bg-zinc-800 shrink-0">
                    {entityIcon((r.entity_type || 'item').toLowerCase())}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm">
                      <ActionBadge action={action} /> {breadcrumb(r)}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-normal break-words">
                      {detailLine(r)}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] leading-5 text-gray-500 dark:text-gray-400 shrink-0">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                </span>
              </motion.li>
            );
          })
        )}
      </ul>
    </div>
  );
}
