'use client';

import { motion } from 'framer-motion';
import { FaBoxOpen } from 'react-icons/fa';

export default function RecentActivity({ items }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <span className="text-xs text-gray-400">{items.length} items</span>
      </div>

      <ul className="divide-y">
        {items.length === 0 ? (
          <li className="p-5 text-gray-500 text-sm">No recent activity yet.</li>
        ) : (
          items.map((r, idx) => (
            <motion.li
              key={r.item_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2 bg-gray-100">
                  <FaBoxOpen className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{r.item_name}</span>
                    <span className="text-gray-500"> in </span>
                    <span className="font-medium">{r.category_name}</span>
                    <span className="text-gray-500"> · </span>
                    <span className="text-gray-600">{r.storage_area_name}</span>
                    <span className="text-gray-500"> @ </span>
                    <span className="text-gray-600">{r.location_name}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Qty {r.quantity ?? 0}
                    {r.expiration_date ? ` · Exp ${r.expiration_date}` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  );
}
