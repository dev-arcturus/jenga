import Anthropic from '@anthropic-ai/sdk';
import { callLLM, parseJSON, JUDGE_MODEL } from './llm';
import type { Tower, Block, ScoringResult } from '@/types';

// ============================================================
// Layer 3: Stability Scorer
// Uses Haiku as the judge model for fast, parallel scoring
// ============================================================

const EVIDENCE_GROUNDING_PROMPT = `You are evaluating evidence grounding. You are given:
- CLAIM: A claim that allegedly comes from a source
- SOURCE_SPANS: The exact text from the source

Evaluate how well the source supports the claim.
Score 1.0: The source directly and exactly supports the claim.
Score 0.7: The source supports the claim with minor paraphrasing.
Score 0.5: The source partially supports the claim but with some drift.
Score 0.3: The source loosely relates but doesn't directly support the claim.
Score 0.0: The source does not support the claim at all.

Output JSON only: { "score": float, "reasoning": "string" }`;

const INFERENTIAL_VALIDITY_PROMPT = `You are evaluating logical validity. You are given:
- PREMISES: A set of claims assumed to be true
- CONCLUSION: A claim that allegedly follows from the premises

Evaluate ONLY whether the conclusion follows logically. Do NOT evaluate whether the premises are true.

Score 1.0: The conclusion follows necessarily.
Score 0.7: The conclusion follows with reasonable, commonly-accepted assumptions.
Score 0.4: The conclusion requires significant unstated assumptions to hold.
Score 0.1: The conclusion is weakly related but does not follow.
Score 0.0: The conclusion is a non-sequitur.

Output JSON only: { "score": float, "reasoning": "string", "unstated_assumptions": ["string"] }`;

const COMPLETENESS_PROMPT = `You are evaluating argument completeness. You are given:
- CLAIM: A claim or conclusion
- STATED_PREMISES: The premises explicitly provided

Identify any UNSTATED assumptions that the claim implicitly requires but does not declare.

Score 1.0: No unstated assumptions needed. The claim follows from stated premises alone.
Score 0.7: Minor, commonly-accepted assumptions needed.
Score 0.5: Moderate assumptions needed that reasonable people might disagree on.
Score 0.3: Major unstated assumptions that significantly affect the claim's validity.
Score 0.0: Critical unstated assumptions that could invalidate the claim entirely.

Output JSON only: { "score": float, "reasoning": "string", "unstated_assumptions": ["string"] }`;

const CONTRADICTION_PROMPT = `You are checking for contradictions. You are given:
- CLAIM: A claim to check
- OTHER_CLAIMS: Other claims in the same analysis

Check if the claim contradicts any of the other claims.

Score 1.0: No contradictions found.
Score 0.7: Minor tension but not direct contradiction.
Score 0.5: Significant tension that weakens the overall argument.
Score 0.3: Near-contradiction that undermines credibility.
Score 0.0: Direct contradiction found.

Output JSON only: { "score": float, "reasoning": "string" }`;

async function scoreEvidenceGrounding(
  client: Anthropic,
  block: Block,
): Promise<ScoringResult> {
  if (block.inference_type !== 'evidence' || block.source_spans.length === 0) {
    return { score: 1.0, reasoning: 'Non-evidence block; evidence grounding N/A' };
  }

  const result = await callLLM(
    client,
    JUDGE_MODEL,
    EVIDENCE_GROUNDING_PROMPT,
    `CLAIM: ${block.claim_text}\n\nSOURCE_SPANS:\n${block.source_spans.join('\n')}`,
  );
  return parseJSON<ScoringResult>(result.text);
}

async function scoreInferentialValidity(
  client: Anthropic,
  block: Block,
  dependencies: Block[],
): Promise<ScoringResult> {
  if (dependencies.length === 0 && block.inference_type === 'evidence') {
    return { score: 1.0, reasoning: 'Base evidence block; no inference to validate', unstated_assumptions: [] };
  }

  const premises = dependencies.map(d => `- ${d.claim_text}`).join('\n');
  const result = await callLLM(
    client,
    JUDGE_MODEL,
    INFERENTIAL_VALIDITY_PROMPT,
    `PREMISES:\n${premises || '(No explicit premises; this is a standalone claim)'}\n\nCONCLUSION: ${block.claim_text}`,
  );
  return parseJSON<ScoringResult>(result.text);
}

async function scoreCompleteness(
  client: Anthropic,
  block: Block,
  dependencies: Block[],
): Promise<ScoringResult> {
  const premises = dependencies.map(d => `- ${d.claim_text}`).join('\n');
  const result = await callLLM(
    client,
    JUDGE_MODEL,
    COMPLETENESS_PROMPT,
    `CLAIM: ${block.claim_text}\n\nSTATED_PREMISES:\n${premises || '(None)'}`,
  );
  return parseJSON<ScoringResult>(result.text);
}

async function scoreContradiction(
  client: Anthropic,
  block: Block,
  allBlocks: Block[],
): Promise<ScoringResult> {
  const others = allBlocks
    .filter(b => b.block_id !== block.block_id)
    .map(b => `- ${b.claim_text}`)
    .join('\n');

  const result = await callLLM(
    client,
    JUDGE_MODEL,
    CONTRADICTION_PROMPT,
    `CLAIM: ${block.claim_text}\n\nOTHER_CLAIMS:\n${others || '(None)'}`,
  );
  return parseJSON<ScoringResult>(result.text);
}

async function scoreBlock(
  client: Anthropic,
  block: Block,
  tower: Tower,
  allBlocks: Block[],
): Promise<Block> {
  const dependencies = block.depends_on
    .map(id => tower.blocks.find(b => b.block_id === id))
    .filter((b): b is Block => b !== undefined);

  // Run all 4 scoring dimensions in parallel
  const [evidenceResult, inferenceResult, completenessResult, contradictionResult] =
    await Promise.all([
      scoreEvidenceGrounding(client, block),
      scoreInferentialValidity(client, block, dependencies),
      scoreCompleteness(client, block, dependencies),
      scoreContradiction(client, block, allBlocks),
    ]);

  const isEvidence = block.inference_type === 'evidence' && block.source_spans.length > 0;

  let stabilityScore: number;
  if (isEvidence) {
    stabilityScore =
      evidenceResult.score * 0.35 +
      inferenceResult.score * 0.30 +
      completenessResult.score * 0.20 +
      contradictionResult.score * 0.15;
  } else {
    stabilityScore =
      inferenceResult.score * 0.45 +
      completenessResult.score * 0.30 +
      contradictionResult.score * 0.25;
  }

  // Round to 2 decimal places
  stabilityScore = Math.round(stabilityScore * 100) / 100;

  const allAssumptions = [
    ...(inferenceResult.unstated_assumptions || []),
    ...(completenessResult.unstated_assumptions || []),
  ];

  const reasoningParts = [
    `Evidence: ${evidenceResult.reasoning}`,
    `Inference: ${inferenceResult.reasoning}`,
    `Completeness: ${completenessResult.reasoning}`,
    `Contradiction: ${contradictionResult.reasoning}`,
  ];

  return {
    ...block,
    stability_score: stabilityScore,
    dimension_scores: {
      evidence_grounding: evidenceResult.score,
      inferential_validity: inferenceResult.score,
      completeness: completenessResult.score,
      contradiction_check: contradictionResult.score,
    },
    unstated_assumptions: allAssumptions,
    scoring_reasoning: reasoningParts.join(' | '),
  };
}

export async function scoreTowers(
  client: Anthropic,
  towers: Tower[],
): Promise<Tower[]> {
  // Collect all blocks across all towers for contradiction checking
  const allBlocks = towers.flatMap(t => t.blocks);

  const scoredTowers: Tower[] = [];

  for (const tower of towers) {
    // Group blocks by level
    const levels = [...new Set(tower.blocks.map(b => b.level))].sort((a, b) => a - b);
    const scoredBlocks = new Map<string, Block>();

    // Score bottom-up by level
    for (const level of levels) {
      const blocksAtLevel = tower.blocks.filter(b => b.level === level);

      // Score all blocks at this level in parallel
      const scored = await Promise.all(
        blocksAtLevel.map(block => scoreBlock(client, block, tower, allBlocks))
      );

      scored.forEach(b => scoredBlocks.set(b.block_id, b));
    }

    scoredTowers.push({
      ...tower,
      blocks: tower.blocks.map(b => scoredBlocks.get(b.block_id) || b),
    });
  }

  return scoredTowers;
}
