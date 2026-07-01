'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Skeleton } from '@heroui/react';
import {
  FaBoxOpen,
  FaMapMarkedAlt,
  FaShoppingBasket,
  FaTags,
  FaWarehouse,
} from 'react-icons/fa';

const cards = [
  {
    key: 'locations',
    label: 'Locations',
    icon: FaMapMarkedAlt,
    accent: 'var(--entity-location-accent)',
    accentSoft: 'var(--entity-location-soft)',
    accentBorder: 'var(--entity-location-border)',
    href: '/locations',
  },
  {
    key: 'areas',
    label: 'Storage Areas',
    icon: FaWarehouse,
    accent: 'var(--entity-area-accent)',
    accentSoft: 'var(--entity-area-soft)',
    accentBorder: 'var(--entity-area-border)',
    href: '/areas',
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: FaTags,
    accent: 'var(--entity-category-accent)',
    accentSoft: 'var(--entity-category-soft)',
    accentBorder: 'var(--entity-category-border)',
    href: '/categories',
  },
  {
    key: 'items',
    label: 'Items',
    icon: FaBoxOpen,
    accent: 'var(--entity-item-accent)',
    accentSoft: 'var(--entity-item-soft)',
    accentBorder: 'var(--entity-item-border)',
    href: '/items',
  },
  {
    key: 'shoppingListItems',
    label: 'Shopping List',
    icon: FaShoppingBasket,
    accent: 'var(--entity-shopping-accent)',
    accentSoft: 'var(--entity-shopping-soft)',
    accentBorder: 'var(--entity-shopping-border)',
    href: '/shopping-list',
  },
];

function SkeletonCard({ accent, accentSoft, accentBorder }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-300">
      {/* gradient accent */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl"
        style={{ background: accentSoft }}
      />

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-3 shadow-sm border"
              style={{ background: accent, borderColor: accentBorder }}
            >
              <Skeleton className="h-5 w-5 rounded-md bg-white/40" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>

          <Skeleton className="h-3 w-10 rounded-md" />
        </div>

        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-14 rounded-md" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>

          <Skeleton className="h-4 w-4 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function StatsCards({ totals, isLoading = false }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        const value = totals?.[c.key] ?? 0;

        return (
          <motion.div
            key={c.key}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.35,
              delay: idx * 0.06,
              type: 'spring',
              stiffness: 120,
            }}
          >
            {isLoading ? (
              <SkeletonCard
                accent={c.accent}
                accentSoft={c.accentSoft}
                accentBorder={c.accentBorder}
              />
            ) : (
              <Link
                href={c.href}
                className="group relative block overflow-hidden rounded-2xl bg-white shadow-sm
                           border border-gray-300
                           hover:shadow-md hover:-translate-y-[1px] transition
                           focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]/60"
              >
                {/* gradient accent */}
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl"
                  style={{ background: c.accentSoft }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: c.accent }}
                />

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-xl p-3 text-white shadow-sm border"
                        style={{
                          background: c.accent,
                          borderColor: c.accentBorder,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm md:text-base font-semibold text-[var(--stocksense-brand)]">
                        {c.label}
                      </h3>
                    </div>
                    <span className="text-xs text-gray-400">total</span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-semibold tracking-tight text-gray-600">
                        {value}
                      </span>
                      <span className="text-xs text-gray-400">records</span>
                    </div>

                    <motion.div
                      initial={{ x: 4, opacity: 0 }}
                      whileHover={{ x: 0, opacity: 1 }}
                      className="text-gray-300 group-hover:text-gray-400"
                    >
                      →
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.05 }}
                  className="absolute inset-0 bg-black"
                />
              </Link>
            )}
          </motion.div>
        );
      })}
    </section>
  );
}

