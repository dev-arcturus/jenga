import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TowerGraph, Tower, Block, SharedBlock } from '@/types';

// ============================================================
// API Keys Store
// ============================================================
interface ApiKeysState {
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set) => ({
      anthropicApiKey: '',
      setAnthropicApiKey: (key: string) => set({ anthropicApiKey: key }),
    }),
    { name: 'evidence-jenga-keys' }
  )
);

// ============================================================
// Activity Log Entry
// ============================================================
export type LogLevel = 'info' | 'thinking' | 'scoring' | 'verdict' | 'strengthen' | 'done' | 'error';

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  message: string;
  detail?: string;
  towerId?: string;
  blockId?: string;
  score?: number;
}

// ============================================================
// Analysis Store
// ============================================================
interface AnalysisState {
  towerGraph: TowerGraph | null;
  analysisId: string | null;

  // UI state
  isAnalyzing: boolean;
  analysisComplete: boolean;
  analysisProgress: string;
  judgeVerdict: string | null;
  finalAnswer: string | null;
  selectedBlockId: string | null;
  inspectorOpen: boolean;
  threshold: number;
  viewMode: '3d' | '2d';
  tokenCount: number;

  // Activity log
  activityLog: LogEntry[];

  // Actions
  setTowerGraph: (graph: TowerGraph) => void;
  setAnalysisId: (id: string) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalysisComplete: (v: boolean) => void;
  setAnalysisProgress: (msg: string) => void;
  setJudgeVerdict: (v: string | null) => void;
  setFinalAnswer: (v: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setInspectorOpen: (open: boolean) => void;
  setThreshold: (t: number) => void;
  setViewMode: (mode: '3d' | '2d') => void;
  addTokens: (n: number) => void;
  addLog: (level: LogLevel, message: string, detail?: string, extra?: Partial<LogEntry>) => void;
  removeBlock: (blockId: string) => void;
  resetTowers: () => void;
  updateBlocks: (updatedBlocks: Block[]) => void;

  // Progressive streaming
  addTower: (argumentId: string, conclusion: string) => void;
  addBlockToTower: (argumentId: string, block: Block) => void;
  updateBlockInTower: (argumentId: string, block: Block) => void;
  clearAnalysis: () => void;
}

function propagateCollapse(towers: Tower[], _shared: SharedBlock[], threshold: number): Tower[] {
  return towers.map(tower => {
    const blockMap = new Map<string, Block>();
    tower.blocks.forEach(b => blockMap.set(b.block_id, { ...b }));

    for (const block of blockMap.values()) {
      if (block.state !== 'removed') {
        block.state = 'stable';
        block.collapse_reason = null;
      }
    }

    const levels = [...new Set(tower.blocks.map(b => b.level))].sort((a, b) => a - b);
    for (const level of levels) {
      const blocksAtLevel = tower.blocks.map(b => blockMap.get(b.block_id)!).filter(b => b.level === level);
      for (const block of blocksAtLevel) {
        if (block.state === 'removed') continue;
        const depCollapsed = block.depends_on.some(id => {
          const dep = blockMap.get(id);
          return dep && (dep.state === 'collapsed' || dep.state === 'removed');
        });
        if (depCollapsed) {
          block.state = 'collapsed';
          block.collapse_reason = 'Dependency collapsed: foundation removed';
          continue;
        }
        if (block.stability_score < threshold) {
          block.state = 'collapsed';
          block.collapse_reason = `Score ${block.stability_score.toFixed(2)} below threshold ${threshold}`;
        } else if (block.stability_score < 0.7) {
          block.state = 'wobble';
        }
      }
    }

    return { ...tower, blocks: tower.blocks.map(b => blockMap.get(b.block_id)!) };
  });
}

let originalTowers: Tower[] | null = null;
let logCounter = 0;

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  towerGraph: null,
  analysisId: null,
  isAnalyzing: false,
  analysisComplete: false,
  analysisProgress: '',
  judgeVerdict: null,
  finalAnswer: null,
  selectedBlockId: null,
  inspectorOpen: false,
  threshold: 0.4,
  viewMode: '3d',
  tokenCount: 0,
  activityLog: [],

  setTowerGraph: (graph: TowerGraph) => {
    originalTowers = JSON.parse(JSON.stringify(graph.towers));
    const propagated = propagateCollapse(graph.towers, graph.shared_blocks, graph.threshold);
    set({ towerGraph: { ...graph, towers: propagated } });
  },

  setAnalysisId: (id: string) => set({ analysisId: id }),
  setIsAnalyzing: (v: boolean) => set({ isAnalyzing: v }),
  setAnalysisComplete: (v: boolean) => set({ analysisComplete: v }),
  setAnalysisProgress: (msg: string) => set({ analysisProgress: msg }),
  setJudgeVerdict: (v: string | null) => set({ judgeVerdict: v }),
  setFinalAnswer: (v: string | null) => set({ finalAnswer: v }),
  setViewMode: (mode: '3d' | '2d') => set({ viewMode: mode }),
  addTokens: (n: number) => set(s => ({ tokenCount: s.tokenCount + n })),

  addLog: (level, message, detail, extra) => {
    const entry: LogEntry = {
      id: ++logCounter,
      timestamp: Date.now(),
      level,
      message,
      detail,
      ...extra,
    };
    set(s => ({ activityLog: [...s.activityLog, entry] }));
  },

  setSelectedBlock: (blockId: string | null) => set({
    selectedBlockId: blockId,
    inspectorOpen: blockId !== null,
  }),

  setInspectorOpen: (open: boolean) => set({
    inspectorOpen: open,
    selectedBlockId: open ? get().selectedBlockId : null,
  }),

  setThreshold: (t: number) => {
    const graph = get().towerGraph;
    if (!graph) return;
    const propagated = propagateCollapse(graph.towers, graph.shared_blocks, t);
    set({ threshold: t, towerGraph: { ...graph, towers: propagated, threshold: t } });
  },

  removeBlock: (blockId: string) => {
    const graph = get().towerGraph;
    if (!graph) return;
    const towers = graph.towers.map(tower => ({
      ...tower,
      blocks: tower.blocks.map(b =>
        b.block_id === blockId ? { ...b, state: 'removed' as const, collapse_reason: 'Manually removed' } : b
      ),
    }));
    const propagated = propagateCollapse(towers, graph.shared_blocks, get().threshold);
    set({ towerGraph: { ...graph, towers: propagated } });
  },

  resetTowers: () => {
    const graph = get().towerGraph;
    if (!graph || !originalTowers) return;
    const restored = JSON.parse(JSON.stringify(originalTowers)) as Tower[];
    const propagated = propagateCollapse(restored, graph.shared_blocks, get().threshold);
    set({ towerGraph: { ...graph, towers: propagated } });
  },

  updateBlocks: (updatedBlocks: Block[]) => {
    const graph = get().towerGraph;
    if (!graph) return;
    const updateMap = new Map(updatedBlocks.map(b => [b.block_id, b]));
    const towers = graph.towers.map(tower => ({
      ...tower, blocks: tower.blocks.map(b => updateMap.get(b.block_id) || b),
    }));
    const propagated = propagateCollapse(towers, graph.shared_blocks, get().threshold);
    set({ towerGraph: { ...graph, towers: propagated } });
  },

  addTower: (argumentId: string, conclusion: string) => {
    const graph = get().towerGraph || {
      towers: [], shared_blocks: [], threshold: get().threshold,
      raw_text: '', source_mode: 'paste' as const,
    };
    const newTower: Tower = { argument_id: argumentId, conclusion, blocks: [] };
    set({ towerGraph: { ...graph, towers: [...graph.towers, newTower] } });
  },

  addBlockToTower: (argumentId: string, block: Block) => {
    const graph = get().towerGraph;
    if (!graph) return;
    const towers = graph.towers.map(t =>
      t.argument_id === argumentId ? { ...t, blocks: [...t.blocks, block] } : t
    );
    set({ towerGraph: { ...graph, towers } });
  },

  updateBlockInTower: (argumentId: string, block: Block) => {
    const graph = get().towerGraph;
    if (!graph) return;
    const towers = graph.towers.map(t =>
      t.argument_id === argumentId
        ? { ...t, blocks: t.blocks.map(b => b.block_id === block.block_id ? block : b) }
        : t
    );
    const propagated = propagateCollapse(towers, graph.shared_blocks, get().threshold);
    set({ towerGraph: { ...graph, towers: propagated } });
    originalTowers = JSON.parse(JSON.stringify(propagated));
  },

  clearAnalysis: () => {
    originalTowers = null;
    logCounter = 0;
    set({
      towerGraph: null, analysisId: null, judgeVerdict: null, finalAnswer: null,
      selectedBlockId: null, inspectorOpen: false, analysisComplete: false,
      tokenCount: 0, activityLog: [],
    });
  },
}));
