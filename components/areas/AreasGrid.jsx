'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaChevronRight, FaEdit } from 'react-icons/fa';

export default function AreasGrid({ areas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {areas.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 pt-4 shadow-sm transition hover:bg-gray-50 sm:p-4"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--entity-area-accent)]" />
          <div>
            <h3 className="truncate text-[15px] font-semibold leading-5 text-gray-800 sm:text-base">{a.name}</h3>
            <p className="text-xs text-gray-500">
              Created {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/storage-areas/${a.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] px-2.5 text-xs text-[var(--entity-area-accent)] hover:brightness-95"
              title="View categories"
            >
              View <FaChevronRight />
            </Link>
          </div>
        </motion.div>
      ))}

      {areas.length === 0 && (
        <div className="col-span-full text-center text-gray-500 border rounded-xl p-10 bg-white">
          No storage areas yet.
        </div>
      )}
    </div>
  );
}
