'use client';

import { motion } from 'framer-motion';
import {
  FaBoxOpen,
  FaMapMarkedAlt,
  FaTags,
  FaWarehouse,
} from 'react-icons/fa';

function label(key) {
  switch (key) {
    case 'expiration_date':
      return 'Expiration';
    case 'quantity':
      return 'Qty';
    case 'name':
      return 'Name';
    default:
      return String(key)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function serializeValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return objectToPairs(value);
  return String(value);
}

function objectToPairs(obj) {
  return Object.entries(obj || {})
    .map(([key, value]) => `${label(key)}: ${serializeValue(value)}`)
    .join(', ');
}

function readNested(obj, paths) {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((current, key) => current?.[key], obj);
    if (value !== null && value !== undefined && value !== '') return value;
  }

  return null;
}

function entityName(row) {
  const entity = (row.entity_type || '').toLowerCase();
  const changes = row.changes || {};

  const candidates = {
    location: [
      'location_name',
      'name_at_event',
      'item_or_entity_name',
      'changes.name.from',
      'changes.name.to',
      'changes.old.name',
      'changes.snapshot.name',
    ],
    storage_area: [
      'storage_area_name',
      'name_at_event',
      'item_or_entity_name',
      'changes.name.from',
      'changes.name.to',
      'changes.old.name',
      'changes.snapshot.name',
    ],
    category: [
      'category_name',
      'name_at_event',
      'item_or_entity_name',
      'changes.name.from',
      'changes.name.to',
      'changes.old.name',
      'changes.snapshot.name',
    ],
    item: [
      'item_name',
      'name_at_event',
      'item_or_entity_name',
      'changes.name.from',
      'changes.name.to',
      'changes.old.name',
      'changes.snapshot.name',
    ],
  };

  return (
    readNested({ ...row, changes }, candidates[entity] || candidates.item) ||
    entity.replace('_', ' ') ||
    'item'
  );
}

function pathValue(row, key) {
  const changes = row.changes || {};
  const pathsByKey = {
    location: [
      'location_name',
      'changes.location_name',
      'changes.location',
      'changes.old.location_name',
      'changes.old.location',
      'changes.snapshot.location_name',
      'changes.snapshot.location',
      'changes.from.location',
      'changes.from.Location',
    ],
    area: [
      'storage_area_name',
      'changes.storage_area_name',
      'changes.storage_area',
      'changes.area',
      'changes.old.storage_area_name',
      'changes.old.storage_area',
      'changes.old.area',
      'changes.snapshot.storage_area_name',
      'changes.snapshot.storage_area',
      'changes.snapshot.area',
      'changes.from.area',
      'changes.from.Area',
    ],
    category: [
      'category_name',
      'changes.category_name',
      'changes.category',
      'changes.old.category_name',
      'changes.old.category',
      'changes.snapshot.category_name',
      'changes.snapshot.category',
      'changes.from.category',
      'changes.from.Category',
    ],
  };

  return readNested({ ...row, changes }, pathsByKey[key] || []);
}

function buildPath(row, keys) {
  return keys.map((key) => pathValue(row, key)).filter(Boolean);
}

function formatPath(parts, fallback = 'Location unavailable') {
  return parts.length ? parts.join(' / ') : fallback;
}

function formatMovePath(value) {
  if (!value || typeof value !== 'object') return '';

  return [
    value.location || value.Location || value.location_name,
    value.area || value.Area || value.storage_area || value.storage_area_name,
    value.category || value.Category || value.category_name,
  ]
    .filter(Boolean)
    .join(' / ');
}

function formatChanges(changes) {
  if (!changes || typeof changes !== 'object') return 'Updated';

  const looksCanonical = Object.values(changes).every(
    (value) =>
      value &&
      typeof value === 'object' &&
      ('from' in value || 'to' in value)
  );

  if (!looksCanonical) {
    const parts = Object.entries(changes).map(
      ([key, value]) => `${label(key)}: ${serializeValue(value)}`
    );
    return parts.length ? `Updated ${parts.join(' | ')}` : 'Updated';
  }

  const parts = [];

  for (const [field, diff] of Object.entries(changes)) {
    if (!diff) continue;

    const fromRaw = diff.from;
    const toRaw = diff.to;
    const same = JSON.stringify(fromRaw ?? null) === JSON.stringify(toRaw ?? null);
    if (same) continue;

    parts.push(
      `${label(field)}: ${serializeValue(fromRaw)} to ${serializeValue(toRaw)}`
    );
  }

  return parts.length ? parts.join(' | ') : 'Updated';
}

function ActionBadge({ action }) {
  const normalized = (action || '').toLowerCase();
  const map = {
    added: {
      text: 'Added',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    },
    updated: {
      text: 'Updated',
      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    },
    deleted: {
      text: 'Removed',
      className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    },
    moved: {
      text: 'Moved',
      className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    },
  };
  const config = map[normalized] ?? map.updated;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${config.className}`}>
      {config.text}
    </span>
  );
}

function entityIcon(entity) {
  switch (entity) {
    case 'location':
      return <FaMapMarkedAlt className="h-4 w-4 text-white" />;
    case 'storage_area':
      return <FaWarehouse className="h-4 w-4 text-white" />;
    case 'category':
      return <FaTags className="h-4 w-4 text-white" />;
    default:
      return <FaBoxOpen className="h-4 w-4 text-white" />;
  }
}

function iconClass(entity) {
  switch (entity) {
    case 'location':
      return 'from-indigo-500 to-violet-500';
    case 'storage_area':
      return 'from-sky-500 to-cyan-500';
    case 'category':
      return 'from-emerald-500 to-lime-500';
    default:
      return 'from-rose-500 to-orange-500';
  }
}

function detailLine(row) {
  const action = (row.action || '').toLowerCase();
  const entity = (row.entity_type || '').toLowerCase();
  const itemPath = formatPath(buildPath(row, ['category', 'area', 'location']));

  if (action === 'deleted') {
    if (entity === 'location') return 'Removed location and everything inside it.';
    if (entity === 'storage_area') {
      return `From: ${formatPath(buildPath(row, ['location']))}`;
    }
    if (entity === 'category') {
      return `From: ${formatPath(buildPath(row, ['area', 'location']))}`;
    }
    return `From: ${itemPath}`;
  }

  if (action === 'added') {
    if (entity === 'location') return 'Created location.';
    if (entity === 'storage_area') {
      return `In: ${formatPath(buildPath(row, ['location']))}`;
    }
    if (entity === 'category') {
      return `In: ${formatPath(buildPath(row, ['area', 'location']))}`;
    }
    return `In: ${itemPath} | Qty ${row.quantity ?? 0}${
      row.expiration_date ? ` | Exp ${row.expiration_date}` : ''
    }`;
  }

  if (action === 'moved') {
    const changes = row.changes || {};
    const fromText = formatMovePath(changes.from || changes.old);
    const toText = formatMovePath(changes.to || changes.updated_to);

    if (fromText || toText) {
      return (
        <span>
          From: {fromText || 'Location unavailable'}
          <br />
          To: {toText || 'New location unavailable'}
        </span>
      );
    }

    return 'Moved';
  }

  if (entity === 'item') {
    return (
      <span>
        {formatChanges(row.changes)}
        <br />
        In: {itemPath}
      </span>
    );
  }

  return formatChanges(row.changes);
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

export default function RecentActivity({ items = [] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-stocksense-teal">
          Recent activity
        </h2>
        <span className="text-xs text-gray-600">{items.length} items</span>
      </div>

      <ul className="divide-y divide-gray-200">
        {items.length === 0 ? (
          <li className="p-5 text-sm text-gray-600">No recent activity yet.</li>
        ) : (
          items.map((row, index) => {
            const action = (row.action || '').toLowerCase();
            const entity = (row.entity_type || 'item').toLowerCase();

            return (
              <motion.li
                key={`${row.id ?? row.item_id ?? row.entity_id ?? index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="flex items-start justify-between gap-3 p-4 text-gray-700"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`shrink-0 rounded-xl bg-gradient-to-br p-2 ${iconClass(entity)}`}
                  >
                    {entityIcon(entity)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm">
                      <ActionBadge action={action} />{' '}
                      <span className="font-medium">{entityName(row)}</span>
                    </p>
                    <p className="mt-1 whitespace-normal break-words text-xs text-gray-500">
                      {detailLine(row)}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-[11px] leading-5 text-gray-500">
                  {formatTimestamp(row.created_at)}
                </span>
              </motion.li>
            );
          })
        )}
      </ul>
    </div>
  );
}
