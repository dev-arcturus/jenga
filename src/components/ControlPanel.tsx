'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore, type LogEntry, type LogLevel } from '@/store';

// ============================================================
// Score bar
// ============================================================

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

// ============================================================
// Log entry icons & colors
// ============================================================

const LEVEL_CONFIG: Record<LogLevel, { icon: string; color: string; bg: string }> = {
  info:       { icon: 'i', color: 'text-slate-400',   bg: 'bg-slate-700' },
  thinking:   { icon: '~', color: 'text-blue-400',    bg: 'bg-blue-900/40' },
  scoring:    { icon: '#', color: 'text-amber-400',   bg: 'bg-amber-900/30' },
  verdict:    { icon: '!', color: 'text-violet-400',  bg: 'bg-violet-900/30' },
  strengthen: { icon: '+', color: 'text-cyan-400',    bg: 'bg-cyan-900/30' },
  done:       { icon: '*', color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  error:      { icon: 'x', color: 'text-red-400',     bg: 'bg-red-900/30' },
};

function LogItem({ entry }: { entry: LogEntry }) {
  const cfg = LEVEL_CONFIG[entry.level];
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={`px-2.5 py-1.5 rounded-md text-[10px] font-mono leading-snug ${cfg.bg}`}
    >
      <div className="flex items-start gap-1.5">
        <span className={`font-bold flex-shrink-0 ${cfg.color}`}>[{cfg.icon}]</span>
        <span className={`flex-1 break-words ${cfg.color}`}>{entry.message}</span>
        <span className="text-slate-600 flex-shrink-0 ml-1">{timeStr}</span>
      </div>
      {entry.detail && (
        <div className="text-[9px] text-slate-500 mt-0.5 ml-4 break-words">{entry.detail}</div>
      )}
    </motion.div>
  );
}

// ============================================================
// Collapsible section
// ============================================================

function Section({ title, children, defaultOpen = true, badge }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">{open ? '-' : '+'}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
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
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll activity log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog.length]);

  const hasTowers = towerGraph && towerGraph.towers.length > 0;

  // Aggregate stats
  const allBlocks = towerGraph?.towers.flatMap(t => t.blocks) ?? [];
  const stableCount = allBlocks.filter(b => b.state === 'stable').length;
  const wobbleCount = allBlocks.filter(b => b.state === 'wobble').length;
  const collapsedCount = allBlocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const avgScore = allBlocks.length > 0
    ? allBlocks.reduce((s, b) => s + b.stability_score, 0) / allBlocks.length
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Analysis Panel</span>
        {tokenCount > 0 && (
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
            {tokenCount.toLocaleString()} tok
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status badge */}
        {(isAnalyzing || analysisComplete) && (
          <div className="px-4 py-2 border-b border-slate-800/40">
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-[10px] text-blue-400 font-mono">Analyzing...</span>
              </div>
            ) : analysisComplete ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                <span className="text-[10px] text-emerald-400 font-mono">Complete</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Threshold control */}
        <Section title="Threshold">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-slate-400">Collapse tolerance</span>
              <span className="text-xs font-mono font-bold text-white">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 accent-blue-500"
              disabled={!hasTowers}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-slate-600">Lenient</span>
              <span className="text-[8px] text-slate-600">Strict</span>
            </div>
            <div className="flex gap-1 mt-2">
              {[
                { label: '0.2', value: 0.2 },
                { label: '0.4', value: 0.4 },
                { label: '0.7', value: 0.7 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => setThreshold(p.value)}
                  disabled={!hasTowers}
                  className={`flex-1 text-[9px] py-0.5 rounded border transition-colors
                    ${Math.abs(threshold - p.value) < 0.01
                      ? 'border-blue-600 text-blue-400'
                      : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'}
                    disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Stats */}
        {hasTowers && (
          <Section
            title="Summary"
            badge={
              <span className="text-[9px] font-mono text-slate-500">
                {allBlocks.length} blocks
              </span>
            }
          >
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                { label: 'Towers', value: towerGraph.towers.length, color: 'text-slate-200' },
                { label: 'Avg', value: avgScore.toFixed(2), color: avgScore >= 0.6 ? 'text-emerald-400' : avgScore >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                { label: 'OK', value: stableCount, color: 'text-emerald-400' },
                { label: 'Down', value: collapsedCount, color: collapsedCount > 0 ? 'text-red-400' : 'text-slate-500' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] text-slate-600 uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] text-emerald-400">Stable</span>
                  <span className="text-[9px] font-mono text-slate-500">{stableCount}</span>
                </div>
                <ScoreBar value={stableCount / Math.max(allBlocks.length, 1)} color="bg-emerald-500" />
              </div>
              {wobbleCount > 0 && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-amber-400">Wobble</span>
                    <span className="text-[9px] font-mono text-slate-500">{wobbleCount}</span>
                  </div>
                  <ScoreBar value={wobbleCount / Math.max(allBlocks.length, 1)} color="bg-amber-500" />
                </div>
              )}
              {collapsedCount > 0 && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-red-400">Collapsed</span>
                    <span className="text-[9px] font-mono text-slate-500">{collapsedCount}</span>
                  </div>
                  <ScoreBar value={collapsedCount / Math.max(allBlocks.length, 1)} color="bg-red-500" />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Tower health */}
        {hasTowers && (
          <Section title="Tower Health">
            <div className="space-y-2">
              {towerGraph.towers.map(tower => {
                const collapsed = tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
                const health = 1 - collapsed / Math.max(tower.blocks.length, 1);
                const healthColor = health >= 0.8 ? 'bg-emerald-500' : health >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={tower.argument_id}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] text-slate-400 truncate max-w-[160px]">
                        {tower.conclusion.length > 40 ? tower.conclusion.slice(0, 40) + '...' : tower.conclusion}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 flex-shrink-0 ml-1">{Math.round(health * 100)}%</span>
                    </div>
                    <ScoreBar value={health} color={healthColor} />
                    <div className="text-[8px] text-slate-600 mt-0.5">
                      {tower.blocks.length} blocks | {tower.blocks.filter(b => b.state === 'stable').length} stable
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Judge verdict */}
        {judgeVerdict && (
          <Section title="Judge Verdict" defaultOpen={true}>
            <div className="bg-violet-950/30 border border-violet-800/30 rounded-lg p-2.5">
              <p className="text-[10px] text-violet-300 leading-relaxed">{judgeVerdict}</p>
            </div>
          </Section>
        )}

        {/* Final answer */}
        {finalAnswer && (
          <Section title="Final Answer" defaultOpen={true}>
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3">
              <p className="text-[10px] text-emerald-200/90 leading-relaxed whitespace-pre-wrap">
                {finalAnswer}
              </p>
            </div>
          </Section>
        )}

        {/* Activity log */}
        <Section
          title="Activity"
          defaultOpen={true}
          badge={
            activityLog.length > 0 ? (
              <span className="text-[9px] font-mono text-slate-600">{activityLog.length}</span>
            ) : undefined
          }
        >
          {activityLog.length === 0 ? (
            <p className="text-[10px] text-slate-600 italic">No activity yet. Start an analysis to see live progress.</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {activityLog.slice(-50).map(entry => (
                <LogItem key={entry.id} entry={entry} />
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </Section>

        {/* Legend — only shown when no analysis */}
        {!hasTowers && !isAnalyzing && (
          <Section title="Legend" defaultOpen={false}>
            <div className="space-y-1.5">
              {[
                { color: 'bg-emerald-500', label: 'Stable', sub: 'Score >= threshold' },
                { color: 'bg-amber-500', label: 'Wobble', sub: 'Shaky but surviving' },
                { color: 'bg-red-500', label: 'Collapsed', sub: 'Below threshold' },
                { color: 'bg-slate-600', label: 'Removed', sub: 'Manually pulled' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                  <span className="text-[9px] text-slate-400">{item.label}</span>
                  <span className="text-[8px] text-slate-600">— {item.sub}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
