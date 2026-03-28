'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import InputZone from '@/components/InputZone';
import TowerZone from '@/components/TowerZone';
import ControlPanel from '@/components/ControlPanel';
import InspectorDrawer from '@/components/InspectorDrawer';
import VerdictModal from '@/components/VerdictModal';

const MIN_PANEL_W = 240;
const MAX_PANEL_W = 600;
const DEFAULT_PANEL_W = 340;

export default function HomePage() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_W);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX; // panel is on right, so moving left = wider
      const next = Math.min(MAX_PANEL_W, Math.max(MIN_PANEL_W, startW.current + delta));
      setPanelWidth(next);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col overflow-hidden" style={{ height: '100vh' }}>
      <Navbar />
      <InputZone />
      <div className="flex flex-1 overflow-hidden">
        {/* Tower view — fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <TowerZone />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onMouseDown}
          className="w-1 flex-shrink-0 cursor-col-resize relative group"
        >
          <div className="absolute inset-0 bg-slate-800/40 group-hover:bg-blue-600/40 transition-colors" />
          {/* Visible grip dots */}
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-0.5 rounded-full bg-slate-500" />
            <div className="w-0.5 h-0.5 rounded-full bg-slate-500" />
            <div className="w-0.5 h-0.5 rounded-full bg-slate-500" />
          </div>
        </div>

        {/* Side panel */}
        <div
          className="flex-shrink-0 overflow-hidden border-l border-slate-800/30"
          style={{ width: panelWidth }}
        >
          <ControlPanel />
        </div>
      </div>
      <InspectorDrawer />
      <VerdictModal />
    </div>
  );
}
