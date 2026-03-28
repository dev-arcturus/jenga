'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore } from '@/store';
import { buildBlockNumberMap } from './Tower3DScene';
import type { Block, Tower } from '@/types';

// ============================================================
// Helpers
// ============================================================

function scoreColor(s: number) {
  if (s >= 0.7) return 'text-emerald-400';
  if (s >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(s: number) {
  if (s >= 0.7) return 'bg-emerald-500';
  if (s >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBadge(s: number) {
  if (s >= 0.7) return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40';
  if (s >= 0.4) return 'bg-amber-900/50 text-amber-300 border-amber-700/40';
  return 'bg-red-900/50 text-red-300 border-red-700/40';
}

function stateLabel(state: Block['state']) {
  const map: Record<Block['state'], { label: string; cls: string }> = {
    stable:    { label: 'Stable',    cls: 'text-emerald-400' },
    wobble:    { label: 'Wobble',    cls: 'text-amber-400' },
    collapsed: { label: 'Collapsed', cls: 'text-red-400' },
    removed:   { label: 'Removed',   cls: 'text-slate-500' },
  };
  return map[state];
}

function Bar({ value, color, height = 'h-1.5' }: { value: number; color: string; height?: string }) {
  return (
    <div className={`${height} rounded-full bg-slate-800/80 overflow-hidden`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

// ============================================================
// Tower detail card inside the modal
// ============================================================

function TowerDetail({ tower, towerIdx, blockNumberMap }: {
  tower: Tower;
  towerIdx: number;
  blockNumberMap: Map<string, { towerIdx: number; blockIdx: number }>;
}) {
  const collapsed = tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const health = 1 - collapsed / Math.max(tower.blocks.length, 1);
  const avg = tower.blocks.length > 0
    ? tower.blocks.reduce((s, b) => s + b.stability_score, 0) / tower.blocks.length
    : 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl overflow-hidden">
      {/* Tower header */}
      <div className="px-5 py-4 border-b border-slate-800/30">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-black text-slate-300">T{towerIdx + 1}</span>
            <div>
              <p className="text-sm font-medium text-slate-200 leading-snug">{tower.conclusion}</p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{tower.argument_id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1">
            <Bar value={health} color={health >= 0.7 ? 'bg-emerald-500' : health >= 0.4 ? 'bg-amber-500' : 'bg-red-500'} height="h-2" />
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={health >= 0.7 ? 'text-emerald-400' : health >= 0.4 ? 'text-amber-400' : 'text-red-400'}>
              {Math.round(health * 100)}% health
            </span>
            <span className="text-slate-600">|</span>
            <span className={scoreColor(avg)}>{avg.toFixed(2)} avg</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{tower.blocks.length} blocks</span>
          </div>
        </div>
      </div>

      {/* Block list */}
      <div className="divide-y divide-slate-800/20">
        {tower.blocks.map(block => {
          const nums = blockNumberMap.get(block.block_id);
          const label = nums ? `${nums.towerIdx}.${nums.blockIdx}` : '?';
          const st = stateLabel(block.state);

          return (
            <div key={block.block_id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-800/10 transition-colors">
              {/* Number */}
              <span className={`flex-shrink-0 w-8 h-6 rounded text-[10px] font-bold font-mono flex items-center justify-center border ${scoreBadge(block.stability_score)}`}>
                {label}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug">{block.claim_text}</p>

                {/* Dimension bars */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { l: 'Evidence', v: block.dimension_scores.evidence_grounding, c: 'bg-blue-500' },
                    { l: 'Inference', v: block.dimension_scores.inferential_validity, c: 'bg-violet-500' },
                    { l: 'Complete', v: block.dimension_scores.completeness, c: 'bg-cyan-500' },
                    { l: 'Contradict', v: block.dimension_scores.contradiction_check, c: 'bg-orange-500' },
                  ].map(d => (
                    <div key={d.l}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[8px] text-slate-600">{d.l}</span>
                        <span className="text-[8px] font-mono text-slate-500">{(d.v * 100).toFixed(0)}</span>
                      </div>
                      <Bar value={d.v} color={d.c} />
                    </div>
                  ))}
                </div>

                {/* Dependencies */}
                {block.depends_on.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[8px] text-slate-600">depends on:</span>
                    {block.depends_on.map(id => {
                      const depNums = blockNumberMap.get(id);
                      return (
                        <span key={id} className="text-[8px] font-mono bg-slate-800/60 text-slate-400 px-1 rounded">
                          {depNums ? `${depNums.towerIdx}.${depNums.blockIdx}` : id}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Collapse reason */}
                {block.collapse_reason && (
                  <p className="text-[9px] text-red-400/80 mt-1">{block.collapse_reason}</p>
                )}
              </div>

              {/* Score + state */}
              <div className="flex-shrink-0 text-right">
                <p className={`text-sm font-mono font-bold ${scoreColor(block.stability_score)}`}>
                  {block.stability_score > 0 ? block.stability_score.toFixed(2) : '---'}
                </p>
                <p className={`text-[9px] font-mono ${st.cls}`}>{st.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Main Verdict Modal
// ============================================================

export default function VerdictModal() {
  const towerGraph = useAnalysisStore(s => s.towerGraph);
  const analysisComplete = useAnalysisStore(s => s.analysisComplete);
  const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);
  const judgeVerdict = useAnalysisStore(s => s.judgeVerdict);
  const finalAnswer = useAnalysisStore(s => s.finalAnswer);
  const tokenCount = useAnalysisStore(s => s.tokenCount);
  const setAnalysisComplete = useAnalysisStore(s => s.setAnalysisComplete);

  const blockNumberMap = useMemo(() => {
    if (!towerGraph) return new Map<string, { towerIdx: number; blockIdx: number }>();
    return buildBlockNumberMap(towerGraph.towers);
  }, [towerGraph]);

  const show = analysisComplete && !isAnalyzing && towerGraph && towerGraph.towers.length > 0;

  // Aggregate stats
  const allBlocks = towerGraph?.towers.flatMap(t => t.blocks) ?? [];
  const stableCount = allBlocks.filter(b => b.state === 'stable').length;
  const wobbleCount = allBlocks.filter(b => b.state === 'wobble').length;
  const collapsedCount = allBlocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const avgScore = allBlocks.length > 0
    ? allBlocks.reduce((s, b) => s + b.stability_score, 0) / allBlocks.length
    : 0;

  // Shared dependencies: blocks referenced by multiple towers
  const sharedDeps = useMemo(() => {
    if (!towerGraph) return [];
    const depUsage = new Map<string, string[]>();
    towerGraph.towers.forEach(tower => {
      tower.blocks.forEach(block => {
        block.depends_on.forEach(depId => {
          // Check if this dep belongs to a different tower
          towerGraph.towers.forEach(otherTower => {
            if (otherTower.argument_id !== tower.argument_id) {
              const found = otherTower.blocks.find(b => b.block_id === depId);
              if (found) {
                const existing = depUsage.get(depId) || [];
                if (!existing.includes(tower.argument_id)) {
                  existing.push(tower.argument_id);
                  depUsage.set(depId, existing);
                }
              }
            }
          });
        });
      });
    });
    return Array.from(depUsage.entries()).map(([blockId, towerIds]) => ({
      blockId,
      block: allBlocks.find(b => b.block_id === blockId),
      towerIds,
    })).filter(x => x.block);
  }, [towerGraph, allBlocks]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="verdict-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
          onClick={() => setAnalysisComplete(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-4xl mx-4 my-8 bg-[#0c1120] border border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-base font-bold text-slate-200">Analysis Complete</h2>
              </div>
              <div className="flex items-center gap-3">
                {tokenCount > 0 && (
                  <span className="text-[10px] font-mono text-slate-600">{tokenCount.toLocaleString()} tokens</span>
                )}
                <button
                  onClick={() => setAnalysisComplete(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Summary stats */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Towers', value: towerGraph!.towers.length, color: 'text-slate-200' },
                  { label: 'Total Blocks', value: allBlocks.length, color: 'text-slate-200' },
                  { label: 'Stable', value: stableCount, color: 'text-emerald-400' },
                  { label: 'Wobble', value: wobbleCount, color: 'text-amber-400' },
                  { label: 'Collapsed', value: collapsedCount, color: collapsedCount > 0 ? 'text-red-400' : 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/40 border border-slate-800/30 rounded-lg px-4 py-3 text-center">
                    <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Overall score */}
              <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Overall Stability Score</p>
                  <Bar value={avgScore} color={scoreBg(avgScore)} height="h-3" />
                </div>
                <p className={`text-3xl font-mono font-black ${scoreColor(avgScore)}`}>
                  {avgScore.toFixed(2)}
                </p>
              </div>

              {/* Judge verdict */}
              {judgeVerdict && (
                <div className="bg-violet-950/20 border border-violet-800/20 rounded-xl px-5 py-4">
                  <p className="text-[10px] text-violet-400/60 uppercase tracking-widest font-semibold mb-2">Judge Verdict</p>
                  <p className="text-sm text-violet-200/90 leading-relaxed">{judgeVerdict}</p>
                </div>
              )}

              {/* Final answer */}
              {finalAnswer && (
                <div className="bg-emerald-950/15 border border-emerald-800/20 rounded-xl px-5 py-4">
                  <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-semibold mb-2">Synthesized Answer</p>
                  <p className="text-sm text-emerald-100/80 leading-relaxed whitespace-pre-wrap">{finalAnswer}</p>
                </div>
              )}

              {/* Cross-tower relationships */}
              {sharedDeps.length > 0 && (
                <div className="bg-blue-950/15 border border-blue-800/20 rounded-xl px-5 py-4">
                  <p className="text-[10px] text-blue-400/60 uppercase tracking-widest font-semibold mb-3">Cross-Tower Dependencies</p>
                  <div className="space-y-2">
                    {sharedDeps.map(({ blockId, block, towerIds }) => {
                      const nums = blockNumberMap.get(blockId);
                      return (
                        <div key={blockId} className="flex items-start gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-300 flex-shrink-0">
                            {nums ? `${nums.towerIdx}.${nums.blockIdx}` : blockId}
                          </span>
                          <span className="text-slate-400">{block!.claim_text}</span>
                          <span className="text-slate-600 flex-shrink-0">used by {towerIds.length} towers</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {towerGraph!.shared_blocks.length > 0 && sharedDeps.length === 0 && (
                <div className="bg-blue-950/15 border border-blue-800/20 rounded-xl px-5 py-4">
                  <p className="text-[10px] text-blue-400/60 uppercase tracking-widest font-semibold mb-3">Shared Foundations</p>
                  <div className="space-y-2">
                    {towerGraph!.shared_blocks.map(sb => (
                      <div key={sb.block_id} className="flex items-start gap-2 text-xs">
                        <span className="font-mono font-bold text-blue-300 flex-shrink-0">{sb.block_id}</span>
                        <span className="text-slate-400">{sb.claim_text}</span>
                        <span className="text-slate-600 flex-shrink-0">in {sb.used_by.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Towers detail */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Argument Towers</p>
                <div className="space-y-4">
                  {towerGraph!.towers.map((tower, i) => (
                    <TowerDetail
                      key={tower.argument_id}
                      tower={tower}
                      towerIdx={i}
                      blockNumberMap={blockNumberMap}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800/40 flex justify-end">
              <button
                onClick={() => setAnalysisComplete(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Close & Explore Towers
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
