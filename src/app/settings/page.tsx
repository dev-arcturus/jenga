'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApiKeysStore } from '@/store';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function SettingsPage() {
  const { anthropicApiKey, setAnthropicApiKey } = useApiKeysStore();
  const [inputKey, setInputKey] = useState('');

  // Sync from persisted store after hydration
  useEffect(() => { setInputKey(anthropicApiKey); }, [anthropicApiKey]);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSave = () => {
    setAnthropicApiKey(inputKey.trim());
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    if (!inputKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: 'API key is valid! Models accessible.' });
      } else {
        setTestResult({ ok: false, message: data.error || 'Invalid API key.' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Network error. Check your connection.' });
    } finally {
      setTesting(false);
    }
  };

  const maskedKey = inputKey
    ? inputKey.slice(0, 8) + '•'.repeat(Math.max(0, inputKey.length - 12)) + inputKey.slice(-4)
    : '';

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-2">Settings</h1>
            <p className="text-slate-400 text-sm">
              Configure your API keys. Keys are stored locally in your browser — never sent anywhere except directly to Anthropic.
            </p>
          </div>

          {/* API Key card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#E8621A]/20 border border-[#E8621A]/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#E8621A]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Anthropic API Key</h2>
                <p className="text-[10px] text-slate-500">Powers both claude-sonnet (reasoning) and claude-haiku (judging)</p>
              </div>
            </div>

            {/* Input */}
            <div className="relative mb-3">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={e => { setInputKey(e.target.value); setTestResult(null); setSaved(false); }}
                placeholder="sk-ant-api03-…"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-4 py-3 pr-12
                  text-sm text-slate-200 placeholder-slate-600 font-mono
                  focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30
                  transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKey ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Current saved key info */}
            {anthropicApiKey && (
              <div className="flex items-center gap-2 mb-3 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Currently saved: <span className="font-mono text-slate-400">{maskedKey}</span>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-3 text-xs rounded-lg px-3 py-2 border ${
                  testResult.ok
                    ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800/40'
                    : 'text-red-300 bg-red-950/40 border-red-800/40'
                }`}
              >
                {testResult.ok ? '✓' : '✕'} {testResult.message}
              </motion.div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!inputKey.trim() || testing}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-700
                  text-slate-400 hover:text-slate-200 hover:border-slate-500
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {testing ? 'Testing…' : 'Test Key'}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!inputKey.trim()}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all
                  ${saved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                {saved ? '✓ Saved!' : 'Save Key'}
              </motion.button>
            </div>
          </div>

          {/* Model info card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-bold text-white mb-4">Model Configuration</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/20 border border-blue-900/30">
                <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-300">Reasoning Model</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">claude-sonnet-4-20250514</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Used for: argument identification, block extraction. Higher intelligence for
                    complex decomposition tasks.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-950/20 border border-violet-900/30">
                <span className="w-2 h-2 rounded-full bg-violet-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-violet-300">Judge Model</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">claude-haiku-4-5-20251001</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Used for: all 4 scoring dimensions (evidence grounding, inferential validity,
                    completeness, contradiction). Fast and cost-efficient for high-volume parallel scoring.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-[10px] text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-400 mb-1">🔒 Privacy</p>
            Your API key is stored exclusively in your browser's localStorage using Zustand persist.
            It is sent only in requests from your browser directly to Anthropic's API endpoints.
            It is never logged, stored server-side, or transmitted to any third party.
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
            >
              ← Back to Evidence Jenga
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
