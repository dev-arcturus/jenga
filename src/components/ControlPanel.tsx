'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore, type LogEntry, type LogLevel } from '@/store';
import { buildBlockNumberMap } from './Tower3DScene';
import type { Block, Tower } from '@/types';

// ============================================================
// Helpers
// ============================================================

function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 0.7) return 'bg-emerald-500';
  if (score >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

function stateTag(state: Block['state']) {
  const styles: Record<Block['state'], string> = {
    stable: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40',
    wobble: 'text-amber-400 bg-amber-950/50 border-amber-800/40',
    collapsed: 'text-red-400 bg-red-950/50 border-red-800/40',
    removed: 'text-slate-500 bg-slate-900/50 border-slate-700/40',
  };
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded border ${styles[state]}`}>
      {state}
    </span>
  );
}

function inferenceIcon(type: Block['inference_type']): string {
  const icons: Record<Block['inference_type'], string> = {
    evidence: 'E',
    interpretation: 'I',
    causal: 'C',
    comparative: '~',
    conclusion: '*',
  };
  return icons[type];
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden flex-1">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.4 }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

// ============================================================
// Section wrapper
// ============================================================

function Section({ title, children, defaultOpen = true, badge, noPad }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  noPad?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className={`w-2.5 h-2.5 text-slate-600 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 6 10" fill="currentColor">
            <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</span>
        </div>
        {badge}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={noPad ? '' : 'px-4 pb-3'}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Block row — single numbered block in the argument list
// ============================================================

function BlockRow({ block, label, isSelected, onSelect }: {
  block: Block;
  label: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group transition-colors rounded-md ${
        isSelected ? 'bg-blue-950/40 ring-1 ring-blue-700/50' : 'hover:bg-slate-800/30'
      }`}
    >
      <button
        onClick={() => onSelect(block.block_id)}
        className="w-full text-left px-2.5 py-1.5 flex items-start gap-2"
      >
        {/* Number badge */}
        <span className={`flex-shrink-0 w-6 h-5 rounded text-[9px] font-bold font-mono flex items-center justify-center mt-px ${
          block.state === 'collapsed' || block.state === 'removed'
            ? 'bg-slate-800 text-slate-500'
            : block.stability_score >= 0.7
              ? 'bg-emerald-900/60 text-emerald-300'
              : block.stability_score >= 0.4
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-red-900/60 text-red-300'
        }`}>
          {label}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-mono font-bold ${scoreColor(block.stability_score)}`}>
              {block.stability_score > 0 ? block.stability_score.toFixed(2) : '---'}
            </span>
            <span className="text-[8px] font-mono text-slate-600 bg-slate-800/60 px-1 rounded">
              {inferenceIcon(block.inference_type)}
            </span>
            {stateTag(block.state)}
          </div>
          <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">
            {block.claim_text}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex-shrink-0 mt-0.5 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2 ml-8 space-y-1.5">
              {/* Dimension scores */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  { label: 'Evidence', val: block.dimension_scores.evidence_grounding, c: 'bg-blue-500' },
                  { label: 'Inference', val: block.dimension_scores.inferential_validity, c: 'bg-violet-500' },
                  { label: 'Complete', val: block.dimension_scores.completeness, c: 'bg-cyan-500' },
                  { label: 'No Contradictions', val: block.dimension_scores.contradiction_check, c: 'bg-orange-500' },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span className="text-[8px] text-slate-500 w-12 truncate">{d.label}</span>
                    <MiniBar value={d.val} color={d.c} />
                    <span className="text-[8px] font-mono text-slate-500 w-5 text-right">{(d.val * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Dependencies */}
              {block.depends_on.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[8px] text-slate-600">deps:</span>
                  {block.depends_on.map(id => (
                    <span key={id} className="text-[8px] font-mono bg-slate-800/80 text-slate-500 px-1 rounded">{id}</span>
                  ))}
                </div>
              )}

              {/* Assumptions */}
              {block.unstated_assumptions.length > 0 && (
                <div>
                  <span className="text-[8px] text-amber-500/70">Assumptions:</span>
                  {block.unstated_assumptions.map((a, i) => (
                    <p key={i} className="text-[8px] text-amber-300/60 leading-snug ml-1">- {a}</p>
                  ))}
                </div>
              )}

              {/* Collapse reason */}
              {block.collapse_reason && (
                <p className="text-[8px] text-red-400/80 bg-red-950/20 rounded px-1.5 py-1">
                  {block.collapse_reason}
                </p>
              )}

              {/* Scoring reasoning */}
              {block.scoring_reasoning && (
                <p className="text-[8px] text-slate-500 leading-snug italic">
                  {block.scoring_reasoning.slice(0, 200)}{block.scoring_reasoning.length > 200 ? '...' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Tower card — groups blocks for one argument
// ============================================================

function TowerCard({ tower, towerIdx, blockNumberMap, selectedBlockId, onSelect }: {
  tower: Tower;
  towerIdx: number;
  blockNumberMap: Map<string, { towerIdx: number; blockIdx: number }>;
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
}) {
  const collapsed = tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const health = 1 - collapsed / Math.max(tower.blocks.length, 1);
  const healthColor = health >= 0.7 ? 'bg-emerald-500' : health >= 0.4 ? 'bg-amber-500' : 'bg-red-500';
  const healthText = health >= 0.7 ? 'text-emerald-400' : health >= 0.4 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-slate-900/30 rounded-lg border border-slate-800/40 overflow-hidden">
      {/* Tower header */}
      <div className="px-3 py-2 border-b border-slate-800/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-300">T{towerIdx + 1}</span>
            <span className={`text-[10px] font-mono font-bold ${healthText}`}>{Math.round(health * 100)}%</span>
          </div>
          <span className="text-[9px] font-mono text-slate-600">
            {tower.blocks.length} blocks
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{tower.conclusion}</p>
        <div className="mt-1.5 h-1 rounded-full bg-slate-800/60 overflow-hidden">
          <motion.div
            animate={{ width: `${health * 100}%` }}
            className={`h-full rounded-full ${healthColor}`}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Block list */}
      <div className="py-1 space-y-px">
        {tower.blocks.map(block => {
          const nums = blockNumberMap.get(block.block_id);
          const label = nums ? `${nums.towerIdx}.${nums.blockIdx}` : '?';
          return (
            <BlockRow
              key={block.block_id}
              block={block}
              label={label}
              isSelected={selectedBlockId === block.block_id}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Activity log
// ============================================================

const LEVEL_CONFIG: Record<LogLevel, { icon: string; color: string }> = {
  info:       { icon: 'i', color: 'text-slate-500' },
  thinking:   { icon: '~', color: 'text-blue-400' },
  scoring:    { icon: '#', color: 'text-amber-400' },
  verdict:    { icon: '!', color: 'text-violet-400' },
  strengthen: { icon: '+', color: 'text-cyan-400' },
  done:       { icon: '*', color: 'text-emerald-400' },
  error:      { icon: 'x', color: 'text-red-400' },
};

function LogItem({ entry }: { entry: LogEntry }) {
  const cfg = LEVEL_CONFIG[entry.level];
  const t = new Date(entry.timestamp);
  const ts = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;

  return (
    <div className="flex items-start gap-1.5 text-[9px] font-mono leading-tight py-0.5">
      <span className={`${cfg.color} flex-shrink-0`}>[{cfg.icon}]</span>
      <span className="text-slate-500 flex-1 break-words">{entry.message}</span>
      <span className="text-slate-700 flex-shrink-0">{ts}</span>
    </div>
  );
}

// ============================================================
// Main Control Panel
// ============================================================

export default function ControlPanel() {
  const towerGraph = useAnalysisStore(s => s.towerGraph);
  const threshold = useAnalysisStore(s => s.threshold);
  const setThreshold = useAnalysisStore(s => s.setThreshold);
  const activityLog = useAnalysisStore(s => s.activityLog);
  const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);
  const analysisComplete = useAnalysisStore(s => s.analysisComplete);
  const judgeVerdict = useAnalysisStore(s => s.judgeVerdict);
  const finalAnswer = useAnalysisStore(s => s.finalAnswer);
  const tokenCount = useAnalysisStore(s => s.tokenCount);
  const selectedBlockId = useAnalysisStore(s => s.selectedBlockId);
  const setSelectedBlock = useAnalysisStore(s => s.setSelectedBlock);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog.length]);

  const hasTowers = towerGraph && towerGraph.towers.length > 0;

  const blockNumberMap = useMemo(() => {
    if (!towerGraph) return new Map<string, { towerIdx: number; blockIdx: number }>();
    return buildBlockNumberMap(towerGraph.towers);
  }, [towerGraph]);

  // Aggregate stats
  const allBlocks = towerGraph?.towers.flatMap(t => t.blocks) ?? [];
  const stableCount = allBlocks.filter(b => b.state === 'stable').length;
  const wobbleCount = allBlocks.filter(b => b.state === 'wobble').length;
  const collapsedCount = allBlocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const avgScore = allBlocks.length > 0
    ? allBlocks.reduce((s, b) => s + b.stability_score, 0) / allBlocks.length
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0f1c]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-800/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Arguments</span>
          {isAnalyzing && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
            </span>
          )}
          {analysisComplete && !isAnalyzing && (
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          )}
        </div>
        {tokenCount > 0 && (
          <span className="text-[9px] font-mono text-slate-600">{tokenCount.toLocaleString()} tok</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Summary stats row */}
        {hasTowers && (
          <div className="px-4 py-2.5 border-b border-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {[
                { n: allBlocks.length, label: 'total', c: 'text-slate-300' },
                { n: stableCount, label: 'stable', c: 'text-emerald-400' },
                { n: wobbleCount, label: 'wobble', c: 'text-amber-400' },
                { n: collapsedCount, label: 'down', c: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-xs font-mono font-bold ${s.c}`}>{s.n}</p>
                  <p className="text-[7px] text-slate-600 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className={`text-sm font-mono font-bold ${scoreColor(avgScore)}`}>{avgScore.toFixed(2)}</p>
              <p className="text-[7px] text-slate-600 uppercase">avg score</p>
            </div>
          </div>
        )}

        {/* Tower argument cards */}
        {hasTowers && (
          <div className="p-3 space-y-2">
            {towerGraph!.towers.map((tower, i) => (
              <TowerCard
                key={tower.argument_id}
                tower={tower}
                towerIdx={i}
                blockNumberMap={blockNumberMap}
                selectedBlockId={selectedBlockId}
                onSelect={setSelectedBlock}
              />
            ))}
          </div>
        )}

        {/* Judge verdict */}
        {judgeVerdict && (
          <Section title="Judge Verdict">
            <div className="bg-violet-950/20 border border-violet-800/20 rounded-md p-2.5">
              <p className="text-[10px] text-violet-300/90 leading-relaxed">{judgeVerdict}</p>
            </div>
          </Section>
        )}

        {/* Final answer */}
        {finalAnswer && (
          <Section title="Final Answer">
            <div className="bg-emerald-950/15 border border-emerald-800/20 rounded-md p-2.5">
              <p className="text-[10px] text-emerald-200/80 leading-relaxed whitespace-pre-wrap">
                {finalAnswer}
              </p>
            </div>
          </Section>
        )}

        {/* Threshold */}
        <Section title="Threshold" defaultOpen={false}>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-slate-500">Collapse tolerance</span>
              <span className="text-xs font-mono font-bold text-white">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 accent-blue-500"
              disabled={!hasTowers}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[7px] text-slate-600">Lenient</span>
              <span className="text-[7px] text-slate-600">Strict</span>
            </div>
          </div>
        </Section>

        {/* Activity log */}
        <Section
          title="Activity"
          defaultOpen={isAnalyzing || activityLog.length > 0}
          badge={activityLog.length > 0 ? <span className="text-[9px] font-mono text-slate-600">{activityLog.length}</span> : undefined}
        >
          {activityLog.length === 0 ? (
            <p className="text-[9px] text-slate-600 italic">No activity yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto pr-0.5 space-y-0">
              {activityLog.slice(-60).map(entry => (
                <LogItem key={entry.id} entry={entry} />
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </Section>

        {/* Empty state */}
        {!hasTowers && !isAnalyzing && (
          <div className="px-4 py-8 text-center">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Submit text to analyze. Arguments will appear here as numbered blocks matching the 3D towers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
