import type { Format, Script } from '../types.js';
import { getScriptDuration } from '../types.js';
import { getAnthropicApiKey } from '../config.js';

const MODEL = 'claude-haiku-4-5-20251001';

const PROMPTS: Record<Format, string> = {
  T1: `Generate a TikTok script for an ESL teacher sharing a quick classroom technique.
Return ONLY a JSON object with these exact fields:
{
  "hook": "5-8 word attention-grabbing question",
  "why": "8-12 word explanation of why this matters",
  "fix": "20-35 word technique description — MUST contain at least one of: simultaneous, submit, lock, reveal, countdown, timer, hard stop, spotlight",
  "closer": "5-8 word memorable closing statement"
}
Rules: total 40-65 words, practical classroom language, no filler words. Return ONLY valid JSON.`,

  T2: `Generate a TikTok script for an ESL teacher sharing a step-by-step classroom technique.
Return ONLY a JSON object with these exact fields:
{
  "hook": "6-9 word attention-grabbing statement",
  "setup": "12-18 word context/problem description",
  "after": ["step 1 (8-12 words)", "step 2 (8-12 words)", "step 3 (8-12 words)"],
  "closer": "6-9 word memorable closing"
}
Rules: at least one "after" bullet MUST contain one of: simultaneous, submit, lock, reveal, countdown, timer, hard stop, spotlight. OR closer must contain "simultaneous responses" or "lock then reveal". Total 45-65 words. Return ONLY valid JSON.`,

  S1: `Generate a TikTok script from an ESL student sharing a personal learning story.
Return ONLY a JSON object with these exact fields:
{
  "hook": "8-12 word relatable opening about a past struggle",
  "struggle": "10-15 word description of the specific problem",
  "solution": "10-15 word description of what changed",
  "result": "8-12 word description of the positive outcome"
}
Rules: total 40-55 words, first-person voice, specific and practical. Return ONLY valid JSON.`,

  S2: `Generate a TikTok script from an ESL student sharing a learning mistake and correction.
Return ONLY a JSON object with these exact fields:
{
  "hook": "7-10 word attention-grabbing opener about a mistake",
  "mistake": "10-14 word description of the wrong approach",
  "correction": "11-15 word description of the right approach",
  "tip": "11-15 word actionable daily tip"
}
Rules: total 40-55 words, first-person voice, specific and actionable. Return ONLY valid JSON.`,
};

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

function parseScriptFromText(format: Format, text: string, id: string, batch: string): Script {
  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in response');

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const now = new Date().toISOString();

  switch (format) {
    case 'T1': {
      const s = {
        id,
        format: 'T1' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        why: String(parsed.why ?? ''),
        fix: String(parsed.fix ?? ''),
        closer: String(parsed.closer ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
    case 'T2': {
      const afterRaw = parsed.after;
      const after = Array.isArray(afterRaw) ? afterRaw.map(String) : [];
      const s = {
        id,
        format: 'T2' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        setup: String(parsed.setup ?? ''),
        after,
        closer: String(parsed.closer ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
    case 'S1': {
      const s = {
        id,
        format: 'S1' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        struggle: String(parsed.struggle ?? ''),
        solution: String(parsed.solution ?? ''),
        result: String(parsed.result ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
    case 'S2': {
      const s = {
        id,
        format: 'S2' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        mistake: String(parsed.mistake ?? ''),
        correction: String(parsed.correction ?? ''),
        tip: String(parsed.tip ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
  }
}

export async function generateClaude(
  format: Format,
  batchId: string,
  id: string
): Promise<Script> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: PROMPTS[format] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content.find((c) => c.type === 'text')?.text ?? '';
  return parseScriptFromText(format, text, id, batchId);
}
