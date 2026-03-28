'use client';

import { motion } from 'framer-motion';

interface SkeletonTowerProps {
  blocks: number;
  delay?: number;
}

export default function SkeletonTower({ blocks, delay = 0 }: SkeletonTowerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center gap-1.5"
      style={{ width: 220 }}
    >
      {/* Header skeleton */}
      <div className="w-full h-14 rounded-lg bg-slate-800/60 skeleton-pulse mb-2" />

      {/* Block skeletons — reversed so they appear bottom-to-top */}
      <div className="flex flex-col-reverse gap-1.5 w-full">
        {Array.from({ length: blocks }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: delay + i * 0.12, duration: 0.3, ease: 'easeOut' }}
            className="w-full h-12 rounded-lg bg-slate-800/60 skeleton-pulse"
            style={{ originY: 1 }}
          />
        ))}
      </div>

      {/* Base */}
      <div className="w-full mt-1 border-t border-slate-700/40 pt-1">
        <div className="h-2 w-16 mx-auto rounded bg-slate-800/40 skeleton-pulse" />
      </div>
    </motion.div>
  );
}
