'use client';

import { motion } from 'framer-motion';
import { FaLeaf } from 'react-icons/fa';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0.7 }}
        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="rounded-full p-6"
      >
        <FaLeaf className="text-stocksense-teal text-4xl" />
      </motion.div>

      {/* Loading Text */}
      <motion.p
        className="mt-6 text-lg font-medium text-stocksense-dark-gray"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        Loading...
      </motion.p>
    </div>
  );
}
