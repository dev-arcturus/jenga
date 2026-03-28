'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore } from '@/store';
import type { Block } from '@/types';

function DimensionBar({ label, score, color, desc }: { label: string; score: number; color: string; desc: string }) {
  const pct = Math.round(score * 100);
  const scoreColor = score >= 0.7 ? 'text-emerald-400' : score >= 0.4 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-1">
        <div>
          <span className="text-xs font-semibold text-slate-300">{label}</span>
          <span className="text-[9px] text-slate-600 ml-2">{desc}</span>
        </div>
        <span className={`text-sm font-mono font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function InferenceTypeBadge({ type }: { type: Block['inference_type'] }) {
  const styles: Record<Block['inference_type'], string> = {
    evidence: 'bg-blue-950/60 text-blue-300 border-blue-800/50',
    interpretation: 'bg-violet-950/60 text-violet-300 border-violet-800/50',
    causal: 'bg-orange-950/60 text-orange-300 border-orange-800/50',
    comparative: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50',
    conclusion: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${styles[type]}`}>
      {type}
    </span>
  );
}

export default function InspectorDrawer() {
  const { towerGraph, selectedBlockId, inspectorOpen, setInspectorOpen } = useAnalysisStore();

  // Find the selected block
  const selectedBlock: Block | null = selectedBlockId && towerGraph
    ? towerGraph.towers.flatMap(t => t.blocks).find(b => b.block_id === selectedBlockId) ?? null
    : null;

  const selectedTower = selectedBlockId && towerGraph
    ? towerGraph.towers.find(t => t.blocks.some(b => b.block_id === selectedBlockId))
    : null;

  const stateColors: Record<Block['state'], string> = {
    stable: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    wobble: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
    collapsed: 'text-red-400 bg-red-950/40 border-red-800/50',
    removed: 'text-slate-400 bg-slate-900/40 border-slate-700/50',
  };

  return (
    <AnimatePresence>
      {inspectorOpen && selectedBlock && (
        <motion.div
          key="inspector"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1526]/95 backdrop-blur-xl
            border-t border-slate-700/60 shadow-2xl"
          style={{ maxHeight: '55vh' }}
        >
          {/* Handle */}
          <div
            className="flex justify-center pt-2 pb-1 cursor-pointer"
            onClick={() => setInspectorOpen(false)}
          >
            <div className="w-12 h-1 rounded-full bg-slate-700" />
          </div>

          <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(55vh - 32px)' }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-500">{selectedBlock.block_id}</span>
                  <span className="text-[10px] font-mono text-slate-600">L{selectedBlock.level}</span>
                  <InferenceTypeBadge type={selectedBlock.inference_type} />
                  {selectedBlock.state && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${stateColors[selectedBlock.state]}`}>
                      {selectedBlock.state}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {selectedBlock.claim_text}
                </p>
                {selectedTower && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    In: <span className="text-slate-400">{selectedTower.argument_id}</span>
                    {' · '}
                    <span className="italic">{selectedTower.conclusion}</span>
                  </p>
                )}
              </div>
              <div className="text-center flex-shrink-0">
                <p className={`text-3xl font-mono font-black ${
                  selectedBlock.stability_score >= 0.7 ? 'text-emerald-400' :
                  selectedBlock.stability_score >= 0.4 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {selectedBlock.stability_score.toFixed(2)}
                </p>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest">stability</p>
              </div>
            </div>

            {/* Collapse reason */}
            {selectedBlock.collapse_reason && (
              <div className="mb-4 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">Collapse Reason</p>
                <p className="text-xs text-red-300">{selectedBlock.collapse_reason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scoring dimensions */}
              <div>
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Scoring Breakdown
                </h3>
                <DimensionBar
                  label="Evidence Grounding"
                  score={selectedBlock.dimension_scores.evidence_grounding}
                  color="bg-blue-500"
                  desc="Source accuracy"
                />
                <DimensionBar
                  label="Inferential Validity"
                  score={selectedBlock.dimension_scores.inferential_validity}
                  color="bg-violet-500"
                  desc="Logical follow-through"
                />
                <DimensionBar
                  label="Completeness"
                  score={selectedBlock.dimension_scores.completeness}
                  color="bg-cyan-500"
                  desc="Unstated assumptions"
                />
                <DimensionBar
                  label="Contradiction Check"
                  score={selectedBlock.dimension_scores.contradiction_check}
                  color="bg-orange-500"
                  desc="Conflicts with other blocks"
                />
              </div>

              <div className="space-y-4">
                {/* Unstated assumptions */}
                {selectedBlock.unstated_assumptions.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      ⚠ Unstated Assumptions
                    </h3>
                    <ul className="space-y-1">
                      {selectedBlock.unstated_assumptions.map((a, i) => (
                        <li key={i} className="text-xs text-amber-200 bg-amber-950/30 border border-amber-900/40
                          rounded px-2 py-1.5 leading-snug">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Source spans */}
                {selectedBlock.source_spans.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      📄 Source Spans
                    </h3>
                    <ul className="space-y-1">
                      {selectedBlock.source_spans.map((span, i) => (
                        <li key={i} className="text-xs text-blue-200 bg-blue-950/30 border border-blue-900/40
                          rounded px-2 py-1.5 leading-snug italic">
                          "{span}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Depends on */}
                {selectedBlock.depends_on.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      🔗 Depends On
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedBlock.depends_on.map(id => (
                        <span key={id} className="text-[9px] font-mono bg-slate-800 text-slate-400
                          border border-slate-700 rounded px-1.5 py-0.5">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scoring reasoning */}
                {selectedBlock.scoring_reasoning && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      🧠 Judge Reasoning
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/50
                      rounded px-2 py-2 border border-slate-800">
                      {selectedBlock.scoring_reasoning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
