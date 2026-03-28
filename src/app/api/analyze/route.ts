import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/llm';
import { decompose } from '@/lib/decomposer';
import { scoreTowers } from '@/lib/scorer';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, mode, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required. Please add it in Settings.' }, { status: 400 });
    }
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    const client = createClient(apiKey);
    const analysisId = `analysis-${Date.now()}`;

    // Layer 2: Decompose into arguments and blocks (uses Sonnet)
    const { towers, shared_blocks } = await decompose(client, text);

    if (towers.length === 0) {
      return NextResponse.json({ error: 'No arguments detected in the provided text.' }, { status: 422 });
    }

    // Layer 3: Score all blocks (uses Haiku as judge)
    const scoredTowers = await scoreTowers(client, towers);

    return NextResponse.json({
      analysis_id: analysisId,
      towers: scoredTowers,
      shared_blocks,
      raw_text: text,
      source_mode: mode || 'paste',
    });
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
