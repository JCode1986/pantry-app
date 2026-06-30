'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaChevronRight, FaEdit } from 'react-icons/fa';

export default function AreasGrid({ areas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {areas.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-gray-800">{a.name}</h3>
            <p className="text-xs text-gray-500">
              Created {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/storage-areas/${a.id}`}
              className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900"
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
