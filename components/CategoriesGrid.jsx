'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaChevronRight } from 'react-icons/fa';

export default function CategoriesGrid({ categories }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories?.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-gray-800">{c.name}</h3>
            <p className="text-xs text-gray-500">
              Created {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <Link
            href={`/categories/${c.id}`}
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900"
            title="View items"
          >
            View <FaChevronRight />
          </Link>
        </motion.div>
      ))}

      {categories?.length === 0 && (
        <div className="col-span-full text-center text-gray-500 border rounded-xl p-10 bg-white">
          No categories yet.
        </div>
      )}
    </div>
  );
}
