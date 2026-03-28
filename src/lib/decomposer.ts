import Anthropic from '@anthropic-ai/sdk';
import { callLLM, parseJSON, REASONING_MODEL } from './llm';
import type { ArgumentIdentification, BlockExtraction, Tower, SharedBlock } from '@/types';

// ============================================================
// Layer 2: Argument Decomposer
// ============================================================

const ARGUMENT_IDENTIFIER_PROMPT = `You are a logical analyst. Given a text, identify every distinct ARGUMENT (a chain of reasoning leading to a conclusion). Two claims belong to the SAME argument if one depends on the other. Two claims belong to DIFFERENT arguments if they are logically independent (removing one does not affect the other).

For each argument, output:
- argument_id: unique identifier (e.g., "ARG-001")
- conclusion: the final claim this argument supports
- text_spans: the exact text spans that constitute this argument
- shared_premises: any premises shared with other arguments

Output ONLY valid JSON in this format:
{
  "arguments": [
    {
      "argument_id": "ARG-001",
      "conclusion": "...",
      "text_spans": ["..."],
      "shared_premises": ["..."]
    }
  ]
}

No preamble. No explanation. Just JSON.`;

const BLOCK_EXTRACTOR_PROMPT = `You are decomposing an argument into its logical steps. Each step must be an ATOMIC claim (one idea, one inference). Order them from FOUNDATIONAL to DERIVED:

Level 1: Direct evidence claims (things stated by sources or presented as facts)
Level 2: Interpretations of evidence
Level 3: Causal or analytical claims built on interpretations
Level 4: Comparative judgments or syntheses
Level 5+: Final conclusions

For each block, output:
- block_id: unique within this argument (e.g., "ARG-001-B1")
- level: integer (1 = base)
- claim_text: the atomic claim
- depends_on: array of block_ids this block relies on
- source_refs: array of source IDs (if evidence-level)
- source_spans: exact quotes from sources (if applicable)
- inference_type: "evidence" | "interpretation" | "causal" | "comparative" | "conclusion"

Output ONLY valid JSON in this format:
{
  "blocks": [
    {
      "block_id": "...",
      "level": 1,
      "claim_text": "...",
      "depends_on": [],
      "source_refs": [],
      "source_spans": [],
      "inference_type": "evidence"
    }
  ]
}

No preamble. No explanation. Just JSON.`;

export async function identifyArguments(
  client: Anthropic,
  text: string,
): Promise<ArgumentIdentification[]> {
  const result = await callLLM(
    client,
    REASONING_MODEL,
    ARGUMENT_IDENTIFIER_PROMPT,
    `Analyze this text and identify all distinct arguments:\n\n${text}`,
  );
  const parsed = parseJSON<{ arguments: ArgumentIdentification[] }>(result.text);
  return parsed.arguments;
}

export async function extractBlocks(
  client: Anthropic,
  argumentId: string,
  conclusion: string,
  textSpans: string[],
): Promise<BlockExtraction[]> {
  const result = await callLLM(
    client,
    REASONING_MODEL,
    BLOCK_EXTRACTOR_PROMPT,
    `Decompose this argument into logical blocks.

Argument ID: ${argumentId}
Conclusion: ${conclusion}

Argument text:
${textSpans.join('\n\n')}`,
  );
  const parsed = parseJSON<{ blocks: BlockExtraction[] }>(result.text);
  return parsed.blocks;
}

export async function decompose(
  client: Anthropic,
  text: string,
): Promise<{ towers: Tower[]; shared_blocks: SharedBlock[] }> {
  // Step 1: Identify arguments
  const args = await identifyArguments(client, text);

  // Step 2: Extract blocks for each argument (in parallel)
  const towerPromises = args.map(async (arg) => {
    const blocks = await extractBlocks(
      client,
      arg.argument_id,
      arg.conclusion,
      arg.text_spans,
    );

    const tower: Tower = {
      argument_id: arg.argument_id,
      conclusion: arg.conclusion,
      blocks: blocks.map(b => ({
        ...b,
        stability_score: 0,
        dimension_scores: {
          evidence_grounding: 0,
          inferential_validity: 0,
          completeness: 0,
          contradiction_check: 0,
        },
        state: 'stable' as const,
        collapse_reason: null,
        unstated_assumptions: [],
        scoring_reasoning: '',
      })),
    };

    return tower;
  });

  const towers = await Promise.all(towerPromises);

  // Identify shared blocks
  const shared_blocks: SharedBlock[] = [];
  const allSharedPremises = new Map<string, string[]>();

  args.forEach(arg => {
    arg.shared_premises.forEach(premise => {
      const existing = allSharedPremises.get(premise) || [];
      existing.push(arg.argument_id);
      allSharedPremises.set(premise, existing);
    });
  });

  let sharedIdx = 0;
  allSharedPremises.forEach((usedBy, claim) => {
    if (usedBy.length > 1) {
      shared_blocks.push({
        block_id: `SHARED-${String(sharedIdx++).padStart(3, '0')}`,
        used_by: usedBy,
        claim_text: claim,
        source_refs: [],
      });
    }
  });

  return { towers, shared_blocks };
}
