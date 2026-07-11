'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectItem } from '@heroui/react';
import {
  FaBolt,
  FaBoxOpen,
  FaMapMarkedAlt,
  FaShoppingBasket,
  FaTags,
  FaUserCircle,
  FaWarehouse,
} from 'react-icons/fa';
import { getRecentActivityAction } from '@/app/actions/activity';
import { themedSelectClassNames } from '@/components/modals/modalTheme';
import { INVENTORY_CHANGE_EVENT } from '@/utils/clientEvents';

const PAGE_SIZE = 12;
const DASHBOARD_ACTIVITY_LIMIT = 5;
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
    shopping_list_item: [
      'item_name',
      'name_at_event',
      'changes.name.from',
      'changes.name.to',
      'changes.snapshot.name',
      'changes.from_deleted_item.name',
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
      'changes.source.location',
      'changes.source.Location',
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
      'changes.source.area',
      'changes.source.Area',
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
      'changes.source.category',
      'changes.source.Category',
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

function shoppingListUpdateText(changes) {
  const statusTo = changes?.status?.to;
  const statusFrom = changes?.status?.from;

  if (statusTo === 'purchased') return 'Purchased';
  if (statusTo === 'needed' && statusFrom) return 'Marked needed';
  if (statusTo === 'dismissed') return 'Dismissed';

  return formatChanges(changes);
}

function ActionBadge({ action }) {
  const normalized = (action || '').toLowerCase();
  const map = {
    added: {
      text: 'Added',
      style: {
        backgroundColor: 'color-mix(in oklab, var(--entity-category-accent) 12%, white)',
        borderColor: 'color-mix(in oklab, var(--entity-category-accent) 28%, white)',
        color: 'var(--entity-category-accent)',
      },
    },
    updated: {
      text: 'Updated',
      style: {
        backgroundColor: 'var(--entity-warning-soft)',
        borderColor: 'var(--entity-warning-border)',
        color: 'var(--entity-warning-accent)',
      },
    },
    deleted: {
      text: 'Removed',
      style: {
        backgroundColor: 'color-mix(in oklab, var(--entity-item-accent) 12%, white)',
        borderColor: 'color-mix(in oklab, var(--entity-item-accent) 32%, white)',
        color: 'color-mix(in oklab, var(--entity-item-accent) 72%, #991b1b)',
      },
    },
    moved: {
      text: 'Moved',
      style: {
        backgroundColor: 'var(--entity-area-soft)',
        borderColor: 'var(--entity-area-border)',
        color: 'var(--entity-area-accent)',
      },
    },
  };
  const config = map[normalized] ?? map.updated;

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={config.style}
    >
      {config.text}
    </span>
  );
}

function entityIcon(entity) {
  switch (entity) {
    case 'location':
      return <FaMapMarkedAlt className="h-4 w-4 text-[var(--stocksense-brand)]" />;
    case 'storage_area':
      return <FaWarehouse className="h-4 w-4 text-[var(--stocksense-brand)]" />;
    case 'category':
      return <FaTags className="h-4 w-4 text-[var(--stocksense-brand)]" />;
    case 'shopping_list_item':
      return <FaShoppingBasket className="h-4 w-4 text-[var(--stocksense-brand)]" />;
    default:
      return <FaBoxOpen className="h-4 w-4 text-[var(--stocksense-brand)]" />;
  }
}

function activityImageUrl(row) {
  return row?.imageUrl || row?.image_url || row?.thumbnailUrl || null;
}

function ActivityThumb({ row, entity }) {
  const imageUrl = activityImageUrl(row);

  if (imageUrl) {
    return (
      <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]">
      {entityIcon(entity)}
    </span>
  );
}

function detailLine(row) {
  const action = (row.action || '').toLowerCase();
  const entity = (row.entity_type || '').toLowerCase();
  const itemPath = formatPath(buildPath(row, ['category', 'area', 'location']));

  if (entity === 'shopping_list_item') {
    const sourceParts = buildPath(row, ['category', 'area', 'location']);
    const sourcePath = formatPath(sourceParts);
    const fromDeletedItem = row.changes?.from_deleted_item;
    const quantity = fromDeletedItem?.quantity ?? row.quantity ?? 0;

    if (action === 'added') {
      return fromDeletedItem
        ? `Moved from inventory to shopping list | Qty ${quantity} | From: ${sourcePath}`
        : `Added to shopping list | Qty ${quantity}${
            sourceParts.length ? ` | From: ${sourcePath}` : ''
          }`;
    }

    if (action === 'deleted') {
      const movedToInventory = row.changes?.moved_to_inventory;
      if (movedToInventory) {
        const destinationPath = formatPath([
          movedToInventory.category,
          movedToInventory.area,
          movedToInventory.location,
        ]);
        return `Moved to inventory | Qty ${quantity} | To: ${destinationPath}`;
      }

      return `Removed from shopping list | Qty ${quantity}`;
    }

    if (action === 'updated') {
      return shoppingListUpdateText(row.changes);
    }

    return `Shopping list activity | ${formatChanges(row.changes)}`;
  }

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
  }).format(date);
}

function actorName(row, memberByUserId) {
  const actorUserId = row.actor_user_id ? String(row.actor_user_id) : null;
  const member = actorUserId ? memberByUserId.get(actorUserId) : null;

  return (
    row.actor_email ||
    row.actor_name ||
    row.user_email ||
    row.member_email ||
    member?.email ||
    (actorUserId ? `User ${actorUserId.slice(0, 8)}` : null)
  );
}

function memberLabel(member) {
  if (!member) return 'Unknown user';
  return member.email || `User ${String(member.userId).slice(0, 8)}`;
}

function selectedKey(keys) {
  if (!keys || keys === ALL_FILTER) return null;
  return Array.from(keys)[0] ?? null;
}

export default function RecentActivity({
  items = [],
  members = [],
  effectivePlanId = 'free',
  initialCursor = null,
  initialHasMore = false,
  initialError = null,
  variant = 'dashboard',
}) {
  const isFullView = variant === 'full';
  const [activityItems, setActivityItems] = useState(() =>
    isFullView ? items : items.slice(0, DASHBOARD_ACTIVITY_LIMIT)
  );
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
  const memberByUserId = useMemo(
    () =>
      new Map(
        members
          .filter((member) => member?.userId)
          .map((member) => [String(member.userId), member])
      ),
    [members]
  );
  const showUserFilter =
    isFullView && (effectivePlanId === 'family' || memberOptions.length > 1);

  useEffect(() => {
    if (!isFullView) {
      setActivityItems(items.slice(0, DASHBOARD_ACTIVITY_LIMIT));
      setError(initialError);
      return;
    }

    if (actorUserId !== ALL_FILTER || action !== ALL_FILTER) return;

    setActivityItems(items);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
    setError(initialError);
  }, [
    action,
    actorUserId,
    initialCursor,
    initialError,
    initialHasMore,
    isFullView,
    items,
  ]);

  const loadActivity = useCallback(async function loadActivity({
    nextActorUserId = actorUserId,
    nextAction = action,
    mode = 'replace',
  } = {}) {
    const append = isFullView && mode === 'append';

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsRefreshing(true);
      setCursor(null);
      setHasMore(false);
    }

    try {
      const result = await getRecentActivityAction(
        isFullView
          ? {
              limit: PAGE_SIZE,
              action: nextAction,
              actorUserId:
                nextActorUserId === ALL_FILTER ? null : nextActorUserId,
              cursor: append ? cursor : null,
            }
          : {
              limit: DASHBOARD_ACTIVITY_LIMIT,
            }
      );

      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
      }

      const nextItems = result.data?.items ?? [];
      setActivityItems((current) => {
        const rows = append ? [...current, ...nextItems] : nextItems;
        return isFullView ? rows : rows.slice(0, DASHBOARD_ACTIVITY_LIMIT);
      });
      setCursor(result.data?.nextCursor ?? null);
      setHasMore(Boolean(result.data?.hasMore));
    } catch (err) {
      setError(err?.message || 'Could not load recent activity.');
    } finally {
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [action, actorUserId, cursor, isFullView]);

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

  useEffect(() => {
    const refreshActivity = () => {
      void loadActivity();
    };

    window.addEventListener(INVENTORY_CHANGE_EVENT, refreshActivity);
    return () => {
      window.removeEventListener(INVENTORY_CHANGE_EVENT, refreshActivity);
    };
  }, [loadActivity]);

  return (
    <div className="rounded-2xl border border-white/70 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Recent activity
          </h2>
          {isFullView ? (
            <span className="shrink-0 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
              {activityItems.length}
              {hasMore ? '+' : ''} items
            </span>
          ) : (
            <Link
              href="/activity"
              className="shrink-0 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
            >
              See all
            </Link>
          )}
        </div>

        {isFullView ? (
          <div
            className={`mt-4 grid gap-3 ${
              showUserFilter ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
            }`}
          >
            {showUserFilter ? (
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
                classNames={themedSelectClassNames}
              >
                <SelectItem key={ALL_FILTER}>All users</SelectItem>
                {memberOptions.map((member) => (
                  <SelectItem key={member.value} textValue={member.label}>
                    {member.label}
                  </SelectItem>
                ))}
              </Select>
            ) : null}

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
              classNames={themedSelectClassNames}
            >
              {ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="grid gap-2 px-3 pb-3">
        {activityItems.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/60 p-5 text-sm text-gray-600">
            {isRefreshing
              ? 'Loading activity...'
              : isFullView
                ? 'No activity matches these filters.'
                : 'No recent activity yet.'}
          </li>
        ) : (
          activityItems.map((row, index) => {
            const action = (row.action || '').toLowerCase();
            const entity = (row.entity_type || 'item').toLowerCase();
            const actor = actorName(row, memberByUserId);

            return (
              <motion.li
                key={`${row.id ?? row.item_id ?? row.entity_id ?? index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/40 p-3.5 text-gray-700"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <ActivityThumb row={row} entity={entity} />

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <ActionBadge action={action} />{' '}
                      <span className="font-semibold text-gray-900">{entityName(row)}</span>
                    </p>
                    <p className="mt-1 whitespace-normal break-words text-xs text-gray-500">
                      {detailLine(row)}
                    </p>
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-500">
                      <FaUserCircle className="h-3 w-3 shrink-0 text-[var(--stocksense-brand)]" />
                      <span className="truncate">
                        {actor ? `By ${actor}` : 'Household activity'}
                      </span>
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-[11px] font-medium leading-5 text-gray-500">
                  {formatTimestamp(row.created_at)}
                </span>
              </motion.li>
            );
          })
        )}
      </ul>

      {isFullView ? (
        hasMore ? (
          <div className="border-t border-gray-100 p-4 text-center">
            <button
              type="button"
              onClick={() => void loadActivity({ mode: 'append' })}
              disabled={isRefreshing || isLoadingMore}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              {isLoadingMore ? 'Loading...' : 'View more'}
            </button>
          </div>
        ) : null
      ) : (
        <div className="border-t border-gray-100 p-4 text-center">
          <Link
            href="/activity"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
