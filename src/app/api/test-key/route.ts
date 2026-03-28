import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey) return NextResponse.json({ error: 'No API key provided' }, { status: 400 });

    const client = new Anthropic({ apiKey });

    // Make a minimal test call
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid API key';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
