'use client';

import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore } from '@/store';
import JengaTower from './JengaTower';
import SkeletonTower from './SkeletonTower';

// Lazy load 3D scene to avoid SSR issues with Three.js
const Tower3DScene = lazy(() => import('./Tower3DScene'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-600 text-sm">Loading 3D scene…</div>
    </div>
  );
}

export default function TowerZone() {
  const towerGraph = useAnalysisStore(s => s.towerGraph);
  const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);
  const analysisProgress = useAnalysisStore(s => s.analysisProgress);
  const judgeVerdict = useAnalysisStore(s => s.judgeVerdict);
  const resetTowers = useAnalysisStore(s => s.resetTowers);
  const viewMode = useAnalysisStore(s => s.viewMode);
  const setViewMode = useAnalysisStore(s => s.setViewMode);

  const hasTowers = towerGraph && towerGraph.towers.length > 0;
  const totalBlocks = towerGraph?.towers.reduce((s, t) => s + t.blocks.length, 0) ?? 0;

  // Show 3D scene if we have towers (even while still analyzing — progressive)
  if (hasTowers) {
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {towerGraph.towers.length} tower{towerGraph.towers.length !== 1 ? 's' : ''} · {totalBlocks} blocks
            </span>
            {isAnalyzing && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-[10px] text-blue-400 font-mono"
              >
                {analysisProgress || 'Building…'}
              </motion.span>
            )}
            {judgeVerdict && !isAnalyzing && (
              <span className="text-[10px] text-violet-400 font-mono truncate max-w-xs">{judgeVerdict}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 2D / 3D toggle */}
            <div className="flex rounded-md border border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode('3d')}
                className={`text-[10px] px-2 py-0.5 font-mono tracking-wider transition-colors
                  ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                3D
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`text-[10px] px-2 py-0.5 font-mono tracking-wider transition-colors
                  ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                2D
              </button>
            </div>
            <button
              onClick={resetTowers}
              className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500
                rounded px-2 py-0.5 transition-colors font-mono tracking-wider uppercase"
            >
              Reset
            </button>
          </div>
        </div>

        {/* View content */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === '3d' ? (
            <Suspense fallback={<LoadingFallback />}>
              <Tower3DScene />
            </Suspense>
          ) : (
            <div className="h-full overflow-x-auto overflow-y-auto p-6">
              <div className="flex gap-8 items-start min-w-max pb-4">
                <AnimatePresence>
                  {towerGraph.towers.map((tower, i) => (
                    <JengaTower key={tower.argument_id} tower={tower} index={i} />
                  ))}
                </AnimatePresence>
              </div>

              {towerGraph.shared_blocks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 border border-slate-700/50 rounded-xl p-4 bg-slate-900/30"
                >
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Shared Foundations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {towerGraph.shared_blocks.map(sb => (
                      <div
                        key={sb.block_id}
                        className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-3 py-2 text-xs text-blue-300 max-w-xs"
                      >
                        <span className="font-mono text-[9px] text-blue-500 block mb-0.5">
                          {sb.block_id} · {sb.used_by.join(', ')}
                        </span>
                        {sb.claim_text.length > 80 ? sb.claim_text.slice(0, 80) + '…' : sb.claim_text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state — no towers yet
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-slate-400 text-sm font-medium mb-1">{analysisProgress}</p>
          <p className="text-slate-600 text-xs">Sonnet reasoning · Haiku judging · Streaming blocks in real-time</p>
        </motion.div>
        <div className="flex gap-8 items-end">
          <SkeletonTower blocks={4} delay={0} />
          <SkeletonTower blocks={5} delay={0.2} />
          <SkeletonTower blocks={3} delay={0.4} />
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex gap-3 items-end justify-center mb-8 opacity-20">
          {[4, 6, 3, 5, 2].map((h, i) => (
            <div key={i} className="flex flex-col gap-1">
              {Array.from({ length: h }).map((_, j) => (
                <div
                  key={j}
                  className="w-8 h-3 rounded-sm"
                  style={{ background: `hsl(${140 + i * 30}, 50%, ${30 + j * 5}%)` }}
                />
              ))}
            </div>
          ))}
        </div>
        <h2 className="text-2xl font-bold text-slate-300 mb-3">
          Where arguments become towers.
        </h2>
        <p className="text-slate-500 text-sm max-w-md leading-relaxed">
          Paste any LLM output or ask a question. Evidence Jenga will decompose
          the reasoning into logical blocks, score each step in real-time,
          and build 3D towers that collapse where the logic fails.
        </p>
        <div className="mt-6 flex gap-4 justify-center text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Solid</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Shaky</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Collapsed</span>
        </div>
      </motion.div>
    </div>
  );
}
