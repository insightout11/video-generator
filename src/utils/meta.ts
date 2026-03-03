import type { Script, Channel } from '../types.js';
import { getScriptWordCount, getScriptDuration } from '../types.js';

export interface MetaJson {
  id: string;
  batch: string;
  format: string;
  channel: Channel;
  wordCount: number;
  estimatedDuration: number;
  score: number;
  hook_vibe?: string;
  packedAt: string;
}

export function generateMeta(script: Script, channel: Channel): MetaJson {
  return {
    id: script.id,
    batch: script.batch,
    format: script.format,
    channel,
    wordCount: getScriptWordCount(script),
    estimatedDuration: parseFloat(getScriptDuration(script).toFixed(2)),
    score: script.score ?? 0,
    hook_vibe: (script as any).hook_vibe ?? undefined,
    packedAt: new Date().toISOString(),
  };
}
