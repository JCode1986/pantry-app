'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LuClock3,
  LuMapPin,
  LuPackage,
  LuShoppingBasket,
  LuTriangleAlert,
} from 'react-icons/lu';

const cards = [
  {
    key: 'items',
    label: 'Total Items',
    subtext: 'Across your home',
    icon: LuPackage,
    href: '/items',
  },
  {
    key: 'expiringSoonItems',
    label: 'Expiring Soon',
    subtext: 'Need attention',
    icon: LuClock3,
    href: '/items?expiration=soon&days=3',
  },
  {
    key: 'lowStockItems',
    label: 'Low Stock',
    subtext: 'One or fewer left',
    icon: LuTriangleAlert,
    href: '/items',
  },
  {
    key: 'locations',
    label: 'Locations',
    subtext: 'Organized spaces',
    icon: LuMapPin,
    href: '/locations',
  },
  {
    key: 'shoppingListNeededItems',
    label: 'Shopping List',
    subtext: 'Items to restock',
    icon: LuShoppingBasket,
    href: '/shopping-list',
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--stocksense-brand-soft)]" />
      <div className="mt-4 h-7 w-14 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

export default function StatsCards({ totals, isLoading = false }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const value = totals?.[card.key] ?? 0;

        return (
          <motion.div
            key={card.key}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.32,
              delay: index * 0.04,
              type: 'spring',
              stiffness: 130,
            }}
          >
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <Link
                href={card.href}
                className="group block h-full rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-semibold tracking-tight text-gray-950">
                    {value.toLocaleString()}
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-gray-950">
                    {card.label}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-gray-500">
                    {card.subtext}
                  </p>
                </div>
              </Link>
            )}
          </motion.div>
        );
      })}
    </section>
  );
}
