'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore, useApiKeysStore } from '@/store';
import type { Block, Tower, SourceMode } from '@/types';

const EXAMPLE_TEXTS = [
  {
    label: 'Social Media & Democracy',
    text: `Social media platforms are undermining democratic institutions and should face strict content regulation. First, algorithmic amplification of outrage-driven content has been documented by Facebook's own internal research (the 2021 "Facebook Files") to increase political polarization by up to 30%. Second, the spread of misinformation on these platforms directly influenced the outcomes of recent elections — a MIT study found false news stories spread 6x faster than true ones on Twitter. Third, the business model of engagement-based advertising creates a structural incentive to promote divisive content over accurate information; platforms earn more revenue when users are angry and engaged. Fourth, countries that have implemented content moderation laws, like Germany's NetzDG, have seen measurable reductions in hate speech without significant impacts on free expression. Fifth, social media companies have consistently failed at self-regulation — every major platform has been caught allowing known harmful content to remain because it drove engagement metrics.

However, there is also a strong case that social media has democratized information access. Traditional media gatekeepers controlled public discourse for decades, and social media gave voice to marginalized communities during events like the Arab Spring and Black Lives Matter. The cost of regulation could fall disproportionately on smaller platforms, entrenching Big Tech dominance. Free speech advocates argue that government content regulation sets a dangerous precedent that authoritarian regimes will exploit. Therefore, the solution may lie in algorithmic transparency requirements rather than direct content regulation.`,
  },
  {
    label: 'Universal Basic Income',
    text: `Universal Basic Income (UBI) is the most effective solution to technological unemployment and should be implemented immediately in developed nations. Automation will eliminate 47% of US jobs within two decades according to Oxford researchers. The Alaska Permanent Fund has distributed unconditional payments since 1982, proving UBI is administratively feasible at scale. Finland's UBI experiment showed recipients were happier and healthier, though employment effects were modest. UBI would replace the complex welfare bureaucracy that currently costs $500 billion annually in administrative overhead alone.

The economic argument against UBI — that it causes inflation — is contradicted by evidence from direct cash transfer programs in Kenya and India, where local economies grew without significant price increases. The concern about work disincentives is also overstated: the Mincome experiment in Manitoba, Canada showed only a 1% decrease in work effort among primary earners. Critics who point to cost often ignore that a UBI funded by a value-added tax on automation would be largely self-financing.

Meanwhile, the psychological impact of UBI cannot be ignored. Studies show that economic insecurity is the primary driver of populist movements, and a guaranteed income floor could restore social stability. However, one must acknowledge that UBI alone cannot address the skills gap — without parallel investment in education and retraining, people may have income but lack purpose and social integration.`,
  },
  {
    label: 'Mars Colonization',
    text: `Establishing a permanent human colony on Mars within the next 30 years is not only feasible but essential for the survival of human civilization. SpaceX has reduced launch costs by 90% since 2000 and Starship promises to bring per-kilogram costs below $100, making regular Mars transport economically viable. The discovery of subsurface water ice at Mars's mid-latitudes by NASA's Mars Reconnaissance Orbiter solves the critical water supply problem. ISRU (In-Situ Resource Utilization) technology demonstrated by the MOXIE experiment on Perseverance proves we can produce oxygen from Mars's CO2 atmosphere.

Multiple existential risks — asteroid impacts, supervolcanic eruptions, engineered pandemics, and nuclear war — threaten Earth-bound civilization. Having a self-sustaining backup population on another planet is the only true insurance policy against species extinction. The Chicxulub impact wiped out 75% of all species 66 million years ago, and similar events are inevitable on geological timescales.

However, the radiation environment on Mars presents serious challenges: without a magnetic field, colonists would receive 0.67 millisieverts per day, dramatically increasing cancer risk. The psychological toll of permanent isolation in a hostile environment with 24-minute communication delays has no historical precedent. Cost estimates range from $500 billion to $1 trillion over 25 years — money that critics argue would be better spent addressing climate change, poverty, and disease on Earth.`,
  },
];

export default function InputZone() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SourceMode>('paste');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { anthropicApiKey } = useApiKeysStore();
  const {
    isAnalyzing, setIsAnalyzing, setAnalysisProgress, setTowerGraph,
    setAnalysisId, towerGraph, addTower, addBlockToTower,
    updateBlockInTower, clearAnalysis, setJudgeVerdict,
    addLog, addTokens, setFinalAnswer, setAnalysisComplete,
  } = useAnalysisStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Please enter some text to analyze.'); return; }
    if (!anthropicApiKey) { setError('Please set your Anthropic API key in Settings (top right).'); return; }

    setError(null);
    clearAnalysis();
    setIsAnalyzing(true);
    setIsCollapsed(true);
    setAnalysisProgress('Starting analysis…');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode, apiKey: anthropicApiKey }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const errData = await res.text();
        throw new Error(errData || 'Analysis failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);

          let event: { type: string; data: Record<string, unknown> };
          try {
            event = JSON.parse(json);
          } catch {
            continue; // Skip unparseable SSE chunks
          }

          if (event.type === 'error') {
            throw new Error((event.data.message as string) || 'Stream error');
          }

          try {
            switch (event.type) {
              case 'status':
                setAnalysisProgress(event.data.message as string);
                addLog('info', event.data.message as string);
                break;

              case 'thinking': {
                const t = event.data as { phase?: string; message?: string; towerId?: string; blockId?: string; score?: number };
                addLog('thinking', t.message || '', undefined, {
                  towerId: t.towerId,
                  blockId: t.blockId,
                  score: t.score,
                });
                break;
              }

              case 'tokens': {
                const tok = event.data as { tokens: number; total: number };
                addTokens(tok.tokens);
                break;
              }

              case 'tower_start':
                addTower(
                  event.data.argument_id as string,
                  event.data.conclusion as string,
                );
                addLog('info', `New tower: ${(event.data.conclusion as string).slice(0, 60)}`, undefined, {
                  towerId: event.data.argument_id as string,
                });
                break;

              case 'block_added':
                addBlockToTower(
                  event.data.argument_id as string,
                  event.data.block as Block,
                );
                break;

              case 'block_scored': {
                const scored = event.data.block as Block;
                updateBlockInTower(
                  event.data.argument_id as string,
                  scored,
                );
                addLog('scoring', `${scored.block_id}: ${scored.stability_score.toFixed(2)} => ${scored.state}`, scored.claim_text.slice(0, 80), {
                  towerId: event.data.argument_id as string,
                  blockId: scored.block_id,
                  score: scored.stability_score,
                });
                break;
              }

              case 'tower_complete':
                addLog('info', `Tower complete: ${(event.data.argument_id as string) || 'unknown'}`);
                break;

              case 'judge_verdict': {
                const verdict = event.data as { verdict?: string; satisfied?: boolean; overall_quality?: number };
                const vmsg = `Judge: ${verdict.verdict || 'Evaluating...'} (quality: ${((verdict.overall_quality || 0) * 100).toFixed(0)}%)`;
                setJudgeVerdict(vmsg);
                setAnalysisProgress(verdict.satisfied ? 'Judge satisfied — finalizing...' : `Judge: ${verdict.verdict || 'Strengthening arguments...'}`);
                addLog('verdict', verdict.verdict || 'Evaluating...', `Quality: ${((verdict.overall_quality || 0) * 100).toFixed(0)}% | Satisfied: ${verdict.satisfied ? 'Yes' : 'No'}`);
                break;
              }

              case 'final_answer': {
                const fa = event.data as { answer: string };
                setFinalAnswer(fa.answer);
                addLog('done', 'Final answer synthesized');
                break;
              }

              case 'done': {
                const data = event.data as { analysis_id?: string; total_tokens?: number };
                if (data.analysis_id) setAnalysisId(data.analysis_id as string);
                setAnalysisComplete(true);
                addLog('done', `Analysis complete. ${data.total_tokens ? data.total_tokens.toLocaleString() + ' tokens used.' : ''}`);
                break;
              }
            }
          } catch (dispatchErr) {
            console.warn('Event dispatch error:', dispatchErr, event);
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return; // User cancelled
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      setIsCollapsed(false);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
    setAnalysisProgress('');
  };

  const handleExample = (exText: string) => {
    setText(exText);
    textareaRef.current?.focus();
  };

  const handleNewAnalysis = () => {
    setIsCollapsed(false);
    clearAnalysis();
  };

  return (
    <motion.div layout className="border-b border-slate-800/80 bg-[#0d1526]/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-6 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-wider flex-shrink-0">
                {mode}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {text.slice(0, 80)}{text.length > 80 ? '…' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAnalyzing && (
                <button
                  onClick={handleStop}
                  className="text-[10px] text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600
                    rounded px-2 py-1 transition-colors font-mono uppercase tracking-wider"
                >
                  Stop
                </button>
              )}
              {towerGraph && (
                <span className="text-xs text-emerald-400 font-mono">
                  {towerGraph.towers.length} towers · {towerGraph.towers.reduce((s, t) => s + t.blocks.length, 0)} blocks
                </span>
              )}
              <button
                onClick={handleNewAnalysis}
                className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500
                  rounded px-2 py-1 transition-colors font-mono uppercase tracking-wider"
              >
                New Analysis
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            {/* Mode selector */}
            <div className="flex items-center gap-1 mb-4">
              {(['paste', 'live'] as SourceMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-widest transition-all
                    ${mode === m
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600'}`}
                >
                  {m === 'paste' ? '📋 Paste' : '⚡ Live Query'}
                </button>
              ))}
              <span className="ml-3 text-[10px] text-slate-600">
                {mode === 'paste' ? 'Paste any LLM output to analyze its reasoning' : 'Ask a question — we call Claude and analyze the response'}
              </span>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={
                mode === 'paste'
                  ? 'Paste any LLM output here — an argument, analysis, recommendation, or claim…'
                  : 'Ask a question — e.g. "Should remote work replace office work?"'
              }
              rows={5}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3
                text-sm text-slate-200 placeholder-slate-600 resize-none
                focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30
                font-mono leading-relaxed transition-colors"
            />

            {/* Examples */}
            <div className="flex items-center gap-2 mt-2 mb-4 flex-wrap">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Try:</span>
              {EXAMPLE_TEXTS.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => handleExample(ex.text)}
                  className="text-[10px] text-slate-500 hover:text-blue-400 border border-slate-700/50
                    hover:border-blue-600/50 rounded px-2 py-0.5 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-600">
                {text.length > 0 && `${text.length} chars`}
                <span className="ml-3 text-slate-700">Sonnet reasons · Haiku judges · Real-time streaming</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={isAnalyzing || !text.trim()}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all
                  ${isAnalyzing || !text.trim()
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'}`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Building Towers…
                  </>
                ) : (
                  <>Build Towers</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
