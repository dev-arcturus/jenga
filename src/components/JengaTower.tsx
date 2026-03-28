'use client';

import { motion } from 'framer-motion';
import type { Tower } from '@/types';
import { useAnalysisStore } from '@/store';
import JengaBlock from './JengaBlock';

interface JengaTowerProps {
  tower: Tower;
  index: number;
}

function getTowerStatus(tower: Tower) {
  const collapsed = tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const wobbling = tower.blocks.filter(b => b.state === 'wobble').length;
  const total = tower.blocks.length;
  if (collapsed > total * 0.5) return 'collapsed';
  if (collapsed > 0 || wobbling > total * 0.3) return 'wobble';
  return 'stable';
}

function getTowerHeaderColors(status: string) {
  if (status === 'collapsed') return 'text-red-400 border-red-800/50 bg-red-950/30';
  if (status === 'wobble') return 'text-amber-300 border-amber-700/50 bg-amber-950/30';
  return 'text-emerald-300 border-emerald-700/50 bg-emerald-950/30';
}

function getCollapseLineIndex(tower: Tower): number | null {
  // Find lowest level block that is collapsed (not due to removed dep)
  const sorted = [...tower.blocks].sort((a, b) => a.level - b.level);
  for (const b of sorted) {
    if (b.state === 'collapsed') return b.level;
  }
  return null;
}

export default function JengaTower({ tower, index }: JengaTowerProps) {
  const removeBlock = useAnalysisStore(s => s.removeBlock);
  const status = getTowerStatus(tower);
  const headerColors = getTowerHeaderColors(status);
  const collapseAtLevel = getCollapseLineIndex(tower);

  // Sort blocks bottom-to-top (level 1 at bottom → highest level at top)
  const sortedBlocks = [...tower.blocks].sort((a, b) => a.level - b.level);

  const avgScore = tower.blocks.length > 0
    ? tower.blocks.reduce((s, b) => s + b.stability_score, 0) / tower.blocks.length
    : 0;

  const truncatedConclusion = tower.conclusion.length > 55
    ? tower.conclusion.slice(0, 55) + '…'
    : tower.conclusion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
      className="flex flex-col items-center"
      style={{ minWidth: 240 }}
    >
      {/* Tower header — conclusion */}
      <div className={`
        w-full rounded-lg border px-3 py-2 mb-3 text-center
        ${headerColors}
      `}>
        <div className="flex items-center justify-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
            {status === 'collapsed' ? '🔴 Collapsed' : status === 'wobble' ? '🟡 Wobbling' : '🟢 Standing'}
          </span>
          <span className="text-[10px] font-mono opacity-60">avg {avgScore.toFixed(2)}</span>
        </div>
        <p className="text-xs font-semibold leading-snug" title={tower.conclusion}>
          {truncatedConclusion}
        </p>
        <p className="text-[9px] opacity-50 mt-0.5 font-mono">{tower.argument_id}</p>
      </div>

      {/* Block stack — rendered bottom-to-top visually */}
      <div className="flex flex-col-reverse items-center w-full relative">
        {sortedBlocks.map((block, bIdx) => (
          <div key={block.block_id} className="relative w-full flex flex-col items-center">
            {/* Collapse line — dashed red line at the collapse level */}
            {collapseAtLevel !== null && block.level === collapseAtLevel && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                className="w-full flex items-center gap-2 my-1 px-1"
              >
                <div className="flex-1 border-t-2 border-dashed border-red-500/70" />
                <span className="text-[9px] text-red-400 font-bold tracking-wider uppercase whitespace-nowrap">
                  ⚡ breaks here
                </span>
                <div className="flex-1 border-t-2 border-dashed border-red-500/70" />
              </motion.div>
            )}
            <JengaBlock
              block={block}
              index={bIdx}
              totalBlocks={sortedBlocks.length}
              onRemove={removeBlock}
            />
          </div>
        ))}

        {/* Base label */}
        <div className="w-full mt-1 border-t border-slate-700/60 pt-1 text-center">
          <span className="text-[9px] text-slate-500 font-mono tracking-wider">FOUNDATION</span>
        </div>
      </div>

      {/* Block count summary */}
      <div className="mt-2 flex gap-2 text-[9px] font-mono">
        <span className="text-emerald-400">{tower.blocks.filter(b => b.state === 'stable').length} stable</span>
        <span className="text-amber-400">{tower.blocks.filter(b => b.state === 'wobble').length} wobble</span>
        <span className="text-red-400">{tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length} fallen</span>
      </div>
    </motion.div>
  );
}
