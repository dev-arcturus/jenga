'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApiKeysStore, useAnalysisStore } from '@/store';

export default function Navbar() {
  const pathname = usePathname();
  const { anthropicApiKey } = useApiKeysStore();
  const tokenCount = useAnalysisStore(s => s.tokenCount);
  const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hasKey = mounted && !!anthropicApiKey;

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-[#080d1a]/90 backdrop-blur-sm z-40 relative">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        {/* Mini Jenga tower icon */}
        <div className="flex flex-col gap-0.5 mr-1">
          {[3, 3, 2].map((w, i) => (
            <div key={i} className="flex gap-0.5">
              {Array.from({ length: w }).map((_, j) => (
                <div
                  key={j}
                  className="h-1.5 w-2.5 rounded-sm"
                  style={{
                    background: i === 2
                      ? '#22c55e'
                      : i === 1 ? '#f59e0b' : '#ef4444',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div>
          <span className="font-black text-white tracking-tight text-lg leading-none">
            Evidence<span className="text-blue-400">Jenga</span>
          </span>
          <p className="text-[9px] text-slate-600 leading-none font-mono tracking-widest uppercase">
            Logical Validity Framework
          </p>
        </div>
      </Link>

      {/* Nav links + settings */}
      <div className="flex items-center gap-3">
        {/* Model info */}
        <div className="hidden sm:flex items-center gap-3 mr-2 text-[9px] font-mono text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Reasoning: Sonnet
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Judge: Haiku
          </span>
        </div>

        {/* Token count badge */}
        {tokenCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border border-slate-700/50 bg-slate-800/40 text-slate-400">
            {isAnalyzing && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
            )}
            {tokenCount.toLocaleString()} tokens
          </div>
        )}

        {/* API key status */}
        <div className={`hidden sm:flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border ${
          hasKey
            ? 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30'
            : 'text-red-400 border-red-800/50 bg-red-950/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-emerald-400' : 'bg-red-500'}`} />
          {hasKey ? 'API Key Set' : 'No API Key'}
        </div>

        {/* Settings link */}
        <Link
          href="/settings"
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${pathname === '/settings'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500'}
          `}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </Link>
      </div>
    </nav>
  );
}
