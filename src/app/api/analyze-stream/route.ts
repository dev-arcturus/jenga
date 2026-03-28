import { NextRequest } from 'next/server';
import { createClient, callLLM, parseJSON, REASONING_MODEL, JUDGE_MODEL } from '@/lib/llm';
import type { Block, Tower, InferenceType } from '@/types';

export const maxDuration = 300; // 5 minutes max

// Limits to prevent infinite loops
const MAX_TOWERS = 5;
const MAX_BLOCKS_PER_TOWER = 8;
const MAX_TOTAL_BLOCKS = 30;
const MIN_SATISFACTION_SCORE = 0.55;
const MAX_STRENGTHEN_ROUNDS = 2;

interface StreamEvent {
  type: string;
  data: unknown;
}

function encode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ============================================================
// Prompts
// ============================================================

const IDENTIFY_PROMPT = `You are a logical analyst. Given a text, identify every distinct ARGUMENT (a chain of reasoning leading to a conclusion). Two claims belong to the SAME argument if one depends on the other. Two claims belong to DIFFERENT arguments if they are logically independent.

For each argument, output:
- argument_id: unique identifier (e.g., "ARG-001")
- conclusion: the final claim
- text_spans: the exact text spans

Output ONLY valid JSON: { "arguments": [...] }`;

const EXTRACT_PROMPT = `Decompose this argument into atomic logical steps. Order from FOUNDATIONAL to DERIVED:
Level 1: Direct evidence/factual claims
Level 2: Interpretations of evidence
Level 3: Causal or analytical claims
Level 4: Comparative judgments
Level 5+: Final conclusions

For each block output:
- block_id, level, claim_text, depends_on (array of block_ids), inference_type ("evidence"|"interpretation"|"causal"|"comparative"|"conclusion")

Output ONLY valid JSON: { "blocks": [...] }`;

const SCORE_PROMPT = `You are a logical validity judge. Evaluate this claim on 4 dimensions.

Given:
- CLAIM: The claim to evaluate
- PREMISES: Claims this depends on (may be empty for base evidence)
- ALL_CLAIMS: Other claims in the analysis for contradiction checking

Score each dimension 0.0-1.0:
1. evidence_grounding: How well is this grounded in stated facts? (1.0=well-grounded, 0.0=no evidence)
2. inferential_validity: Does the conclusion follow from premises? (1.0=necessarily follows, 0.0=non-sequitur)
3. completeness: Are there unstated assumptions? (1.0=none needed, 0.0=critical assumptions missing)
4. contradiction_check: Does it contradict other claims? (1.0=no contradictions, 0.0=direct contradiction)

Output ONLY valid JSON:
{
  "evidence_grounding": float,
  "inferential_validity": float,
  "completeness": float,
  "contradiction_check": float,
  "overall_score": float,
  "reasoning": "string",
  "unstated_assumptions": ["string"],
  "placement_recommendation": "foundation" | "middle" | "top" | "weak_spot"
}`;

const JUDGE_SATISFACTION_PROMPT = `You are the master judge of an argument analysis system called Evidence Jenga.

Given the current state of argument towers (each tower is a chain of reasoning with scored blocks), decide:
1. Are the arguments collectively strong enough? (score > 0.55 avg)
2. Are there obvious gaps or weak points that need strengthening?
3. Should we generate more arguments or strengthen existing ones?

Respond with:
{
  "satisfied": boolean,
  "overall_quality": float (0-1),
  "verdict": "string explaining your assessment",
  "action": "done" | "strengthen" | "add_argument",
  "strengthen_target": "tower argument_id to strengthen, if applicable",
  "weakness_description": "what to address, if applicable"
}`;

const STRENGTHEN_PROMPT = `You are strengthening a weak argument by adding better evidence or more rigorous intermediate steps.

Given an existing argument tower with its blocks and scores, generate 1-2 NEW blocks that would make the argument stronger. These could be:
- Additional evidence that supports a weak interpretation
- A missing intermediate step that bridges a logical gap
- A qualification that makes an overreach more defensible

For each new block:
- block_id, level, claim_text, depends_on (existing block_ids), inference_type

Output ONLY valid JSON: { "new_blocks": [...] }`;

const FINAL_ANSWER_PROMPT = `You are synthesizing a final, well-supported answer based on the surviving argument towers from an Evidence Jenga analysis.

Given the towers and their block scores, write a concise, balanced answer that:
1. Only relies on claims that scored well (stable blocks)
2. Acknowledges weaknesses where blocks collapsed or wobbled
3. Presents the strongest surviving reasoning chain
4. Notes important caveats or unstated assumptions

Write 2-4 paragraphs. Be direct and authoritative where evidence is strong, but honest about limitations.`;

// ============================================================
// Score a single block
// ============================================================

async function scoreBlock(
  client: ReturnType<typeof createClient>,
  block: Block,
  premises: Block[],
  allBlocks: Block[],
): Promise<{ scored: Block; tokens: number }> {
  const premiseText = premises.map(p => `- [${p.block_id}] ${p.claim_text}`).join('\n');
  const allText = allBlocks.filter(b => b.block_id !== block.block_id)
    .map(b => `- ${b.claim_text}`).join('\n');

  try {
    const result = await callLLM(client, JUDGE_MODEL,
      SCORE_PROMPT,
      `CLAIM: ${block.claim_text}\n\nPREMISES:\n${premiseText || '(Base evidence - no premises)'}\n\nALL_CLAIMS:\n${allText || '(None yet)'}`,
    );
    const tokens = result.inputTokens + result.outputTokens;
    const parsed = parseJSON<{
      evidence_grounding: number;
      inferential_validity: number;
      completeness: number;
      contradiction_check: number;
      overall_score: number;
      reasoning: string;
      unstated_assumptions: string[];
      placement_recommendation: string;
    }>(result.text);

    const isEvidence = block.inference_type === 'evidence';
    const score = isEvidence
      ? parsed.evidence_grounding * 0.35 + parsed.inferential_validity * 0.30 + parsed.completeness * 0.20 + parsed.contradiction_check * 0.15
      : parsed.inferential_validity * 0.45 + parsed.completeness * 0.30 + parsed.contradiction_check * 0.25;

    return {
      scored: {
        ...block,
        stability_score: Math.round(score * 100) / 100,
        dimension_scores: {
          evidence_grounding: parsed.evidence_grounding,
          inferential_validity: parsed.inferential_validity,
          completeness: parsed.completeness,
          contradiction_check: parsed.contradiction_check,
        },
        unstated_assumptions: parsed.unstated_assumptions || [],
        scoring_reasoning: parsed.reasoning,
      },
      tokens,
    };
  } catch {
    return {
      scored: {
        ...block,
        stability_score: 0.5,
        dimension_scores: { evidence_grounding: 0.5, inferential_validity: 0.5, completeness: 0.5, contradiction_check: 0.5 },
        unstated_assumptions: [],
        scoring_reasoning: 'Scoring parse error — assigned default',
      },
      tokens: 0,
    };
  }
}

export async function POST(request: NextRequest) {
  const { text, apiKey } = await request.json();

  if (!apiKey) return new Response('API key required', { status: 400 });
  if (!text?.trim()) return new Response('Text required', { status: 400 });

  const client = createClient(apiKey);
  let totalBlockCount = 0;
  let totalTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: StreamEvent) => {
        try { controller.enqueue(new TextEncoder().encode(encode(evt))); } catch {}
      };

      const trackTokens = (n: number) => {
        totalTokens += n;
        send({ type: 'tokens', data: { tokens: n, total: totalTokens } });
      };

      try {
        // ── Step 1: Identify arguments ──
        send({ type: 'status', data: { message: 'Identifying argument chains...' } });
        send({ type: 'thinking', data: { phase: 'decompose', message: 'Analyzing text structure to find distinct lines of reasoning...' } });

        const idResult = await callLLM(client, REASONING_MODEL, IDENTIFY_PROMPT,
          `Analyze this text and identify all distinct arguments:\n\n${text}`);
        trackTokens(idResult.inputTokens + idResult.outputTokens);

        const { arguments: args } = parseJSON<{ arguments: { argument_id: string; conclusion: string; text_spans: string[] }[] }>(idResult.text);

        const limitedArgs = args.slice(0, MAX_TOWERS);
        send({ type: 'thinking', data: { phase: 'decompose', message: `Found ${limitedArgs.length} distinct argument${limitedArgs.length !== 1 ? 's' : ''} to analyze.` } });

        const allScoredBlocks: Block[] = [];
        const towers: Tower[] = [];

        // ── Step 2: For each argument, extract and score blocks progressively ──
        for (const arg of limitedArgs) {
          if (totalBlockCount >= MAX_TOTAL_BLOCKS) break;

          send({ type: 'tower_start', data: { argument_id: arg.argument_id, conclusion: arg.conclusion } });
          send({ type: 'status', data: { message: `Decomposing: ${arg.conclusion.slice(0, 50)}...` } });
          send({ type: 'thinking', data: {
            phase: 'decompose',
            towerId: arg.argument_id,
            message: `Breaking down "${arg.conclusion.slice(0, 60)}..." into atomic logical steps by level.`,
          } });

          const exResult = await callLLM(client, REASONING_MODEL, EXTRACT_PROMPT,
            `Argument ID: ${arg.argument_id}\nConclusion: ${arg.conclusion}\n\nText:\n${arg.text_spans.join('\n\n')}`);
          trackTokens(exResult.inputTokens + exResult.outputTokens);

          const { blocks: rawBlocks } = parseJSON<{ blocks: { block_id: string; level: number; claim_text: string; depends_on: string[]; inference_type: InferenceType }[] }>(exResult.text);

          const limitedBlocks = rawBlocks.slice(0, MAX_BLOCKS_PER_TOWER);
          const towerBlocks: Block[] = [];

          send({ type: 'thinking', data: {
            phase: 'decompose',
            towerId: arg.argument_id,
            message: `Extracted ${limitedBlocks.length} logical blocks across ${new Set(limitedBlocks.map(b => b.level)).size} levels. Scoring bottom-up...`,
          } });

          // Sort by level so we score bottom-up
          const sorted = [...limitedBlocks].sort((a, b) => a.level - b.level);

          for (const raw of sorted) {
            if (totalBlockCount >= MAX_TOTAL_BLOCKS) break;

            const block: Block = {
              block_id: raw.block_id,
              level: raw.level,
              claim_text: raw.claim_text,
              depends_on: raw.depends_on || [],
              source_refs: [],
              source_spans: [],
              inference_type: raw.inference_type,
              stability_score: 0,
              dimension_scores: { evidence_grounding: 0, inferential_validity: 0, completeness: 0, contradiction_check: 0 },
              state: 'stable',
              collapse_reason: null,
              unstated_assumptions: [],
              scoring_reasoning: '',
            };

            send({ type: 'block_added', data: { argument_id: arg.argument_id, block } });
            send({ type: 'status', data: { message: `Scoring: "${block.claim_text.slice(0, 40)}..."` } });
            send({ type: 'thinking', data: {
              phase: 'scoring',
              towerId: arg.argument_id,
              blockId: block.block_id,
              message: `Haiku judging L${block.level} ${block.inference_type}: "${block.claim_text.slice(0, 50)}..." against ${block.depends_on.length} premise(s).`,
            } });

            // Score it
            const premises = towerBlocks.filter(b => block.depends_on.includes(b.block_id));
            const { scored, tokens: scoreTokens } = await scoreBlock(client, block, premises, [...allScoredBlocks, ...towerBlocks]);
            trackTokens(scoreTokens);

            // Judge decides state
            scored.state = scored.stability_score >= 0.7 ? 'stable' : scored.stability_score >= 0.4 ? 'wobble' : 'collapsed';

            towerBlocks.push(scored);
            allScoredBlocks.push(scored);
            totalBlockCount++;

            // Emit detailed scoring result
            send({ type: 'block_scored', data: { argument_id: arg.argument_id, block: scored } });
            send({ type: 'thinking', data: {
              phase: 'scoring',
              towerId: arg.argument_id,
              blockId: scored.block_id,
              score: scored.stability_score,
              message: `Score: ${scored.stability_score.toFixed(2)} [EG:${scored.dimension_scores.evidence_grounding.toFixed(2)} IV:${scored.dimension_scores.inferential_validity.toFixed(2)} C:${scored.dimension_scores.completeness.toFixed(2)} CC:${scored.dimension_scores.contradiction_check.toFixed(2)}] => ${scored.state}. ${scored.scoring_reasoning?.slice(0, 100) || ''}`,
            } });
          }

          const tower: Tower = {
            argument_id: arg.argument_id,
            conclusion: arg.conclusion,
            blocks: towerBlocks,
          };
          towers.push(tower);

          const avgScore = towerBlocks.length > 0
            ? towerBlocks.reduce((s, b) => s + b.stability_score, 0) / towerBlocks.length
            : 0;
          const standing = towerBlocks.filter(b => b.state === 'stable' || b.state === 'wobble').length;

          send({ type: 'tower_complete', data: { argument_id: arg.argument_id, tower } });
          send({ type: 'thinking', data: {
            phase: 'tower_done',
            towerId: arg.argument_id,
            message: `Tower ${arg.argument_id} complete: ${towerBlocks.length} blocks, avg score ${avgScore.toFixed(2)}, ${standing}/${towerBlocks.length} standing.`,
          } });
        }

        // ── Step 3: Judge satisfaction loop ──
        let strengthenRounds = 0;

        while (strengthenRounds < MAX_STRENGTHEN_ROUNDS && totalBlockCount < MAX_TOTAL_BLOCKS) {
          send({ type: 'status', data: { message: 'Judge evaluating overall argument quality...' } });
          send({ type: 'thinking', data: { phase: 'verdict', message: `Round ${strengthenRounds + 1}: Haiku judge reviewing all ${towers.length} towers for quality and gaps...` } });

          const towerSummary = towers.map(t => {
            const avgScore = t.blocks.length > 0
              ? t.blocks.reduce((s, b) => s + b.stability_score, 0) / t.blocks.length
              : 0;
            return `Tower ${t.argument_id} (${t.conclusion.slice(0, 60)}): avg=${avgScore.toFixed(2)}, blocks=${t.blocks.length}, collapsed=${t.blocks.filter(b => b.state === 'collapsed').length}`;
          }).join('\n');

          const judgeResult = await callLLM(client, JUDGE_MODEL, JUDGE_SATISFACTION_PROMPT,
            `Current tower state:\n${towerSummary}\n\nTotal blocks: ${totalBlockCount}`);
          trackTokens(judgeResult.inputTokens + judgeResult.outputTokens);

          let verdict: { satisfied: boolean; overall_quality: number; verdict: string; action: string; strengthen_target?: string; weakness_description?: string };
          try {
            verdict = parseJSON(judgeResult.text);
          } catch {
            verdict = { satisfied: true, overall_quality: 0.5, verdict: 'Parse error — accepting current state', action: 'done' };
          }

          send({ type: 'judge_verdict', data: verdict });
          send({ type: 'thinking', data: {
            phase: 'verdict',
            message: `Judge verdict: ${verdict.verdict} (quality: ${(verdict.overall_quality * 100).toFixed(0)}%, satisfied: ${verdict.satisfied})`,
          } });

          if (verdict.satisfied || verdict.action === 'done') break;

          // Try to strengthen a weak tower
          if (verdict.action === 'strengthen' && verdict.strengthen_target) {
            const target = towers.find(t => t.argument_id === verdict.strengthen_target);
            if (target && target.blocks.length < MAX_BLOCKS_PER_TOWER) {
              send({ type: 'status', data: { message: `Strengthening ${target.argument_id}...` } });
              send({ type: 'thinking', data: {
                phase: 'strengthen',
                towerId: target.argument_id,
                message: `Strengthening ${target.argument_id}: ${verdict.weakness_description || 'improving evidence'}.`,
              } });

              const blockSummary = target.blocks.map(b =>
                `[${b.block_id}] L${b.level} (${b.stability_score.toFixed(2)}): ${b.claim_text}`
              ).join('\n');

              try {
                const strengthenResult = await callLLM(client, REASONING_MODEL, STRENGTHEN_PROMPT,
                  `Tower: ${target.argument_id}\nConclusion: ${target.conclusion}\nWeakness: ${verdict.weakness_description || 'general'}\n\nExisting blocks:\n${blockSummary}`);
                trackTokens(strengthenResult.inputTokens + strengthenResult.outputTokens);

                const { new_blocks } = parseJSON<{ new_blocks: { block_id: string; level: number; claim_text: string; depends_on: string[]; inference_type: InferenceType }[] }>(strengthenResult.text);

                for (const nb of new_blocks.slice(0, 2)) {
                  if (totalBlockCount >= MAX_TOTAL_BLOCKS) break;

                  const block: Block = {
                    block_id: nb.block_id || `${target.argument_id}-BS${totalBlockCount}`,
                    level: nb.level,
                    claim_text: nb.claim_text,
                    depends_on: nb.depends_on || [],
                    source_refs: [],
                    source_spans: [],
                    inference_type: nb.inference_type,
                    stability_score: 0,
                    dimension_scores: { evidence_grounding: 0, inferential_validity: 0, completeness: 0, contradiction_check: 0 },
                    state: 'stable',
                    collapse_reason: null,
                    unstated_assumptions: [],
                    scoring_reasoning: '',
                  };

                  send({ type: 'block_added', data: { argument_id: target.argument_id, block } });
                  send({ type: 'thinking', data: {
                    phase: 'strengthen',
                    towerId: target.argument_id,
                    blockId: block.block_id,
                    message: `Added reinforcement block: "${block.claim_text.slice(0, 50)}..."`,
                  } });

                  const premisesForBlock = target.blocks.filter(b => block.depends_on.includes(b.block_id));
                  const { scored, tokens: sTokens } = await scoreBlock(client, block, premisesForBlock, allScoredBlocks);
                  trackTokens(sTokens);
                  scored.state = scored.stability_score >= 0.7 ? 'stable' : scored.stability_score >= 0.4 ? 'wobble' : 'collapsed';

                  target.blocks.push(scored);
                  allScoredBlocks.push(scored);
                  totalBlockCount++;

                  send({ type: 'block_scored', data: { argument_id: target.argument_id, block: scored } });
                  send({ type: 'thinking', data: {
                    phase: 'strengthen',
                    towerId: target.argument_id,
                    blockId: scored.block_id,
                    score: scored.stability_score,
                    message: `Reinforcement scored ${scored.stability_score.toFixed(2)} => ${scored.state}.`,
                  } });
                }
              } catch {
                send({ type: 'thinking', data: { phase: 'strengthen', message: 'Strengthening attempt failed, moving on.' } });
              }
            }
          }

          strengthenRounds++;
        }

        // ── Step 4: Generate final synthesized answer ──
        send({ type: 'status', data: { message: 'Synthesizing final answer from surviving evidence...' } });
        send({ type: 'thinking', data: { phase: 'final', message: 'Generating a stable, evidence-backed answer based on surviving blocks...' } });

        const survivingSummary = towers.map(t => {
          const standing = t.blocks.filter(b => b.state === 'stable' || b.state === 'wobble');
          const collapsed = t.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed');
          return `Tower "${t.conclusion}":\n  Standing blocks:\n${standing.map(b => `    - [${b.stability_score.toFixed(2)}] ${b.claim_text}`).join('\n') || '    (none)'}\n  Collapsed blocks:\n${collapsed.map(b => `    - [${b.stability_score.toFixed(2)}] ${b.claim_text}`).join('\n') || '    (none)'}`;
        }).join('\n\n');

        try {
          const answerResult = await callLLM(client, REASONING_MODEL, FINAL_ANSWER_PROMPT,
            `Original text:\n${text.slice(0, 2000)}\n\nAnalysis results:\n${survivingSummary}`);
          trackTokens(answerResult.inputTokens + answerResult.outputTokens);

          send({ type: 'final_answer', data: { answer: answerResult.text } });
          send({ type: 'thinking', data: { phase: 'final', message: 'Final answer synthesized from surviving evidence.' } });
        } catch {
          send({ type: 'final_answer', data: { answer: 'Unable to generate final synthesis.' } });
        }

        // ── Done ──
        send({ type: 'done', data: {
          analysis_id: `analysis-${Date.now()}`,
          towers,
          shared_blocks: [],
          total_blocks: totalBlockCount,
          total_tokens: totalTokens,
        }});

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', data: { message: msg } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
