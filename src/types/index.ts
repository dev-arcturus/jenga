// ============================================================
// Evidence Jenga — Core Types
// ============================================================

export type SourceMode = 'live' | 'paste' | 'research';
export type InferenceType = 'evidence' | 'interpretation' | 'causal' | 'comparative' | 'conclusion';
export type BlockState = 'stable' | 'wobble' | 'collapsed' | 'removed';

export interface Source {
  id: string;
  url?: string;
  title: string;
  retrieved_text: string;
  domain_authority: number;
  recency?: string;
}

export interface InputPayload {
  raw_text: string;
  source_mode: SourceMode;
  sources: Source[];
}

export interface Block {
  block_id: string;
  level: number;
  claim_text: string;
  depends_on: string[];
  source_refs: string[];
  source_spans: string[];
  inference_type: InferenceType;
  stability_score: number;
  dimension_scores: {
    evidence_grounding: number;
    inferential_validity: number;
    completeness: number;
    contradiction_check: number;
  };
  state: BlockState;
  collapse_reason: string | null;
  unstated_assumptions: string[];
  scoring_reasoning: string;
}

export interface Tower {
  argument_id: string;
  conclusion: string;
  blocks: Block[];
}

export interface SharedBlock {
  block_id: string;
  used_by: string[];
  claim_text: string;
  source_refs: string[];
}

export interface TowerGraph {
  towers: Tower[];
  shared_blocks: SharedBlock[];
  threshold: number;
  raw_text: string;
  source_mode: SourceMode;
}

export interface AnalysisResponse {
  analysis_id: string;
  towers: Tower[];
  shared_blocks: SharedBlock[];
  raw_text: string;
}

export interface RescoreRequest {
  analysis_id: string;
  block_id: string;
  new_source: Source;
}

// LLM Output Schemas (what we expect from prompts)

export interface ArgumentIdentification {
  argument_id: string;
  conclusion: string;
  text_spans: string[];
  shared_premises: string[];
}

export interface BlockExtraction {
  block_id: string;
  level: number;
  claim_text: string;
  depends_on: string[];
  source_refs: string[];
  source_spans: string[];
  inference_type: InferenceType;
}

export interface ScoringResult {
  score: number;
  reasoning: string;
  unstated_assumptions?: string[];
}
