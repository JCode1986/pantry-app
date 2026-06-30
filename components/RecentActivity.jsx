'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectItem } from '@heroui/react';
import {
  FaBolt,
  FaBoxOpen,
  FaMapMarkedAlt,
  FaTags,
  FaUserCircle,
  FaWarehouse,
} from 'react-icons/fa';
import { getRecentActivityAction } from '@/app/actions/activity';

const PAGE_SIZE = 12;
const ALL_FILTER = 'all';
const ACTION_OPTIONS = [
  { value: ALL_FILTER, label: 'All activity' },
  { value: 'added', label: 'Added' },
  { value: 'deleted', label: 'Removed' },
  { value: 'moved', label: 'Moved' },
  { value: 'updated', label: 'Updated' },
];

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

function actorName(row) {
  return (
    row.actor_email ||
    row.actor_name ||
    row.user_email ||
    row.member_email ||
    (row.actor_user_id ? `User ${String(row.actor_user_id).slice(0, 8)}` : null) ||
    'Unknown user'
  );
}

function memberLabel(member) {
  if (!member) return 'Unknown user';
  return member.email || `User ${String(member.userId).slice(0, 8)}`;
}

function selectedKey(keys) {
  if (!keys || keys === 'all') return null;
  return Array.from(keys)[0] ?? null;
}

export default function RecentActivity({
  items = [],
  members = [],
  initialCursor = null,
  initialHasMore = false,
  initialError = null,
}) {
  const [activityItems, setActivityItems] = useState(items);
  const [actorUserId, setActorUserId] = useState(ALL_FILTER);
  const [action, setAction] = useState(ALL_FILTER);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const memberOptions = useMemo(
    () =>
      members.filter((member) => member?.userId).map((member) => ({
        value: member.userId,
        label: memberLabel(member),
      })),
    [members]
  );

  async function loadActivity({
    nextActorUserId = actorUserId,
    nextAction = action,
    mode = 'replace',
  } = {}) {
    const append = mode === 'append';
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsRefreshing(true);
      setCursor(null);
      setHasMore(false);
    }

    try {
      const result = await getRecentActivityAction({
        limit: PAGE_SIZE,
        action: nextAction,
        actorUserId: nextActorUserId === ALL_FILTER ? null : nextActorUserId,
        cursor: append ? cursor : null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
      }

      const nextItems = result.data?.items ?? [];
      setActivityItems((current) => (append ? [...current, ...nextItems] : nextItems));
      setCursor(result.data?.nextCursor ?? null);
      setHasMore(Boolean(result.data?.hasMore));
    } catch (err) {
      setError(err?.message || 'Could not load recent activity.');
    } finally {
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }

  function handleActorChange(keys) {
    const nextActorUserId = String(selectedKey(keys) || ALL_FILTER);
    setActorUserId(nextActorUserId);
    void loadActivity({ nextActorUserId, mode: 'replace' });
  }

  function handleActionChange(keys) {
    const nextAction = String(selectedKey(keys) || ALL_FILTER);
    setAction(nextAction);
    void loadActivity({ nextAction, mode: 'replace' });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stocksense-teal">
            Recent activity
          </h2>
          <span className="shrink-0 text-xs text-gray-600">
            {activityItems.length}
            {hasMore ? '+' : ''} items
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            aria-label="Filter recent activity by user"
            label={
              <span className="inline-flex items-center gap-1.5">
                <FaUserCircle className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                User
              </span>
            }
            selectedKeys={new Set([actorUserId])}
            onSelectionChange={handleActorChange}
            isDisabled={isRefreshing}
            variant="bordered"
            radius="lg"
            classNames={{
              trigger: "border-gray-200 bg-white",
              value: "text-gray-700",
            }}
          >
            <SelectItem key={ALL_FILTER}>All users</SelectItem>
            {memberOptions.map((member) => (
              <SelectItem key={member.value} textValue={member.label}>
                {member.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            aria-label="Filter recent activity by action"
            label={
              <span className="inline-flex items-center gap-1.5">
                <FaBolt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                Action
              </span>
            }
            selectedKeys={new Set([action])}
            onSelectionChange={handleActionChange}
            isDisabled={isRefreshing}
            variant="bordered"
            radius="lg"
            classNames={{
              trigger: "border-gray-200 bg-white",
              value: "text-gray-700",
            }}
          >
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-gray-200">
        {activityItems.length === 0 ? (
          <li className="p-5 text-sm text-gray-600">
            {isRefreshing ? 'Loading activity...' : 'No activity matches these filters.'}
          </li>
        ) : (
          activityItems.map((row, index) => {
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
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500">
                      <FaUserCircle className="h-3 w-3 shrink-0 text-[var(--stocksense-brand)]" />
                      <span className="truncate">By {actorName(row)}</span>
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

      {hasMore ? (
        <div className="border-t border-gray-200 p-4 text-center">
          <button
            type="button"
            onClick={() => void loadActivity({ mode: 'append' })}
            disabled={isRefreshing || isLoadingMore}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:border-[var(--stocksense-brand)] hover:text-[var(--stocksense-brand)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          >
            {isLoadingMore ? 'Loading...' : 'View more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
