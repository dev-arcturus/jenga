'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Block } from '@/types';
import { useAnalysisStore } from '@/store';

interface JengaBlockProps {
  block: Block;
  index: number;
  totalBlocks: number;
  onRemove: (blockId: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Evidence',
  2: 'Interpret',
  3: 'Causal',
  4: 'Judgment',
  5: 'Conclusion',
};

function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `L${level}`;
}

function getBlockColors(state: Block['state'], score: number) {
  if (state === 'removed') return { bg: 'bg-slate-800/40', border: 'border-slate-700/30', text: 'text-slate-600', dot: 'bg-slate-600', glow: '' };
  if (state === 'collapsed') return { bg: 'bg-red-950/60', border: 'border-red-800/60', text: 'text-red-300', dot: 'bg-red-500', glow: 'shadow-red-900/40' };
  if (state === 'wobble') return { bg: 'bg-amber-950/60', border: 'border-amber-700/60', text: 'text-amber-200', dot: 'bg-amber-400', glow: 'shadow-amber-900/40' };
  // Stable — darker green = more stable
  const intensity = Math.round(score * 100);
  if (intensity >= 80) return { bg: 'bg-emerald-950/70', border: 'border-emerald-600/70', text: 'text-emerald-100', dot: 'bg-emerald-400', glow: 'shadow-emerald-900/40' };
  if (intensity >= 60) return { bg: 'bg-green-950/60', border: 'border-green-700/60', text: 'text-green-200', dot: 'bg-green-400', glow: 'shadow-green-900/30' };
  return { bg: 'bg-teal-950/60', border: 'border-teal-700/50', text: 'text-teal-200', dot: 'bg-teal-400', glow: '' };
}

export default function JengaBlock({ block, index, totalBlocks, onRemove }: JengaBlockProps) {
  const setSelectedBlock = useAnalysisStore(s => s.setSelectedBlock);
  const selectedBlockId = useAnalysisStore(s => s.selectedBlockId);
  const isSelected = selectedBlockId === block.block_id;
  const colors = getBlockColors(block.state, block.stability_score);

  // Alternating slight horizontal offset like real Jenga
  const offsetX = index % 2 === 0 ? -3 : 3;

  const animationVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: -20, scale: 0.9 },
    visible: {
      opacity: block.state === 'removed' ? 0.2 : block.state === 'collapsed' ? 0.4 : 1,
      y: 0,
      scale: 1,
      rotate: block.state === 'wobble' ? [0, -2, 2, -1, 1, 0] : 0,
      x: offsetX,
    },
    removed: {
      opacity: 0, x: 120, scale: 0.8,
      transition: { duration: 0.35, ease: 'easeIn' as const },
    },
    collapsed: {
      opacity: 0.35,
      y: [0, -8, 60],
      rotate: [0, -8, 15],
      x: [offsetX, offsetX - 20, offsetX + 40],
      scale: [1, 1.05, 0.9],
      transition: { duration: 0.5, ease: 'easeIn' as const, delay: (totalBlocks - index) * 0.08 },
    },
  };

  const truncated = block.claim_text.length > 52
    ? block.claim_text.slice(0, 52) + '…'
    : block.claim_text;

  return (
    <motion.div
      layout
      initial="hidden"
      animate={
        block.state === 'removed' ? 'removed' :
        block.state === 'collapsed' ? 'collapsed' :
        'visible'
      }
      variants={animationVariants}
      transition={{
        delay: index * 0.07,
        duration: 0.4,
        type: 'spring',
        stiffness: 260,
        damping: 22,
        rotate: block.state === 'wobble'
          ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
          : undefined,
      }}
      className={`
        relative group cursor-pointer select-none
        rounded-lg border px-3 py-2 mb-1.5
        ${colors.bg} ${colors.border} ${colors.text}
        ${colors.glow ? `shadow-lg ${colors.glow}` : ''}
        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0a0f1e]' : ''}
        ${block.state === 'wobble' ? 'wobble' : ''}
        transition-all duration-200
        hover:brightness-125 hover:scale-[1.02]
      `}
      style={{ width: 220 }}
      onClick={() => setSelectedBlock(isSelected ? null : block.block_id)}
      title={block.claim_text}
    >
      {/* Level badge + score */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold opacity-60 tracking-widest uppercase">
          L{block.level} · {getLevelLabel(block.level)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-bold opacity-80">
            {block.stability_score.toFixed(2)}
          </span>
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        </div>
      </div>

      {/* Claim text */}
      <p className="text-xs leading-snug font-medium">{truncated}</p>

      {/* Remove button — shown on hover for non-collapsed/removed */}
      {block.state !== 'collapsed' && block.state !== 'removed' && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.15 }}
          className="absolute -right-2 -top-2 hidden group-hover:flex w-5 h-5 rounded-full
            bg-red-600 hover:bg-red-500 text-white text-[10px] items-center justify-center
            shadow-lg z-10"
          onClick={e => { e.stopPropagation(); onRemove(block.block_id); }}
          title="Pull this block"
        >
          ✕
        </motion.button>
      )}

      {/* Collapse reason tooltip */}
      {block.collapse_reason && (
        <p className="text-[9px] mt-1 text-red-400 opacity-80 truncate">
          ↳ {block.collapse_reason}
        </p>
      )}
    </motion.div>
  );
}
