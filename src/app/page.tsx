'use client';

import Navbar from '@/components/Navbar';
import InputZone from '@/components/InputZone';
import TowerZone from '@/components/TowerZone';
import ControlPanel from '@/components/ControlPanel';
import InspectorDrawer from '@/components/InspectorDrawer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col overflow-hidden" style={{ height: '100vh' }}>
      <Navbar />
      <InputZone />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden border-r border-slate-800/60">
          <TowerZone />
        </div>
        <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-slate-800/60 bg-[#0d1526]/50">
          <ControlPanel />
        </div>
      </div>
      <InspectorDrawer />
    </div>
  );
}
