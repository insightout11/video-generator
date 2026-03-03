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

  T2: `Generate a TikTok script for an ESL teacher comparing BEFORE vs AFTER participation design.
Return ONLY a JSON object with these exact fields:
{
  "hook": "4-8 word attention-grabbing statement",
  "before": ["before bullet 1 (4-8 words)", "before bullet 2 (4-8 words)", "before bullet 3 (4-8 words)"],
  "after": ["after bullet 1 (6-10 words)", "after bullet 2 (6-10 words)", "after bullet 3 (6-12 words)"],
  "closer": "4-8 word mechanic-based closing"
}
Rules: at least one "after" bullet MUST contain one of: simultaneous, submit, lock, reveal, countdown, timer, hard stop, spotlight. OR closer must contain "simultaneous responses" or "lock then reveal". Total 35-60 words. No generic platitudes. Return ONLY valid JSON.`,

  S1: `Generate a TikTok script that teaches an ESL conversation rescue line.
Return ONLY a JSON object with these exact fields:
{
  "hook": "4-8 word hook",
  "line": "the main rescue line (5-10 words)",
  "variants": ["variant 1 (4-10 words)", "variant 2 (4-10 words)"],
  "end": "short closing (3-8 words)"
}
Rules: total 20-45 words. Conversational, globally understandable. Return ONLY valid JSON.`,

  S2: `Generate a TikTok script that teaches follow-up questions to keep a conversation going.
Return ONLY a JSON object with these exact fields:
{
  "hook": "4-8 word hook",
  "they_say": "a short quote of what someone says",
  "followups": ["follow-up question 1", "follow-up question 2", "follow-up question 3"],
  "end": "short closing (3-8 words)"
}
Rules: total 20-50 words. Follow-ups must be real questions. Return ONLY valid JSON.`,
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
      const beforeRaw = parsed.before;
      const afterRaw = parsed.after;
      const before = (Array.isArray(beforeRaw) ? beforeRaw.map(String) : []) as string[];
      const after = (Array.isArray(afterRaw) ? afterRaw.map(String) : []) as string[];
      const s = {
        id,
        format: 'T2' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        before: [String(before[0] ?? ''), String(before[1] ?? ''), String(before[2] ?? '')] as [string, string, string],
        after: [String(after[0] ?? ''), String(after[1] ?? ''), String(after[2] ?? '')] as [string, string, string],
        closer: String(parsed.closer ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
    case 'S1': {
      const variantsRaw = parsed.variants;
      const variants = (Array.isArray(variantsRaw) ? variantsRaw.map(String) : []) as string[];
      const s = {
        id,
        format: 'S1' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        line: String(parsed.line ?? ''),
        variants: [String(variants[0] ?? ''), String(variants[1] ?? '')] as [string, string],
        end: String(parsed.end ?? ''),
        estimatedDuration: 0,
        status: 'draft' as const,
        createdAt: now,
      };
      s.estimatedDuration = parseFloat(getScriptDuration(s).toFixed(2));
      return s;
    }
    case 'S2': {
      const followupsRaw = parsed.followups;
      const followups = (Array.isArray(followupsRaw) ? followupsRaw.map(String) : []) as string[];
      const s = {
        id,
        format: 'S2' as const,
        batch,
        hook: String(parsed.hook ?? ''),
        they_say: String(parsed.they_say ?? ''),
        followups: [String(followups[0] ?? ''), String(followups[1] ?? ''), String(followups[2] ?? '')] as [string, string, string],
        end: String(parsed.end ?? ''),
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
