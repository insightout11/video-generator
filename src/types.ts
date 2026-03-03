export type Format = 'T1' | 'T2' | 'S1' | 'S2';
export type Channel = 'teacher' | 'student';
export type ScriptStatus = 'draft' | 'selected' | 'qa';

export type HookVibe = 'direct' | 'conversational' | 'spicy';

export interface HookVariants {
  direct: string;
  conversational: string;
  spicy: string;
}

export interface T1Script {
  id: string;
  format: 'T1';
  batch: string;
  hook: string;
  why: string;
  fix: string;
  closer: string;
  estimatedDuration: number;
  score?: number;
  status: ScriptStatus;
  createdAt: string;
  // Optional hook A/B test fields (applied during pack step)
  hook_original?: string;
  hook_vibe?: HookVibe;
  hook_variants?: HookVariants;
}

export interface T2Script {
  id: string;
  format: 'T2';
  batch: string;
  hook: string;
  before: [string, string, string];
  after: [string, string, string];
  closer: string;
  estimatedDuration: number;
  score?: number;
  status: ScriptStatus;
  createdAt: string;
  hook_original?: string;
  hook_vibe?: HookVibe;
  hook_variants?: HookVariants;
}

export interface S1Script {
  id: string;
  format: 'S1';
  batch: string;
  hook: string;
  line: string;
  variants: [string, string];
  end: string;
  estimatedDuration: number;
  score?: number;
  status: ScriptStatus;
  createdAt: string;
  hook_original?: string;
  hook_vibe?: HookVibe;
  hook_variants?: HookVariants;
}

export interface S2Script {
  id: string;
  format: 'S2';
  batch: string;
  hook: string;
  they_say: string;
  followups: [string, string, string];
  end: string;
  estimatedDuration: number;
  score?: number;
  status: ScriptStatus;
  createdAt: string;
  hook_original?: string;
  hook_vibe?: HookVibe;
  hook_variants?: HookVariants;
}

export type Script = T1Script | T2Script | S1Script | S2Script;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface ScoredScript {
  script: Script;
  validation: ValidationResult;
  score: number;
}

export interface BatchJson {
  batchId: string;
  createdAt: string;
  teacher: { total: number; valid: number; selected: string[]; qa: string[] };
  student: { total: number; valid: number; selected: string[]; qa: string[] };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getChannel(format: Format): Channel {
  return format.startsWith('T') ? 'teacher' : 'student';
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/** Returns all spoken text fields as an ordered array of strings. */
export function getScriptSegments(script: Script): string[] {
  switch (script.format) {
    case 'T1':
      return [script.hook, script.why, script.fix, script.closer];
    case 'T2':
      return [script.hook, ...script.before, ...script.after, script.closer];
    case 'S1':
      return [script.hook, script.line, ...script.variants, script.end];
    case 'S2':
      return [script.hook, script.they_say, ...script.followups, script.end];
  }
}

/** All text concatenated with spaces. */
export function getScriptText(script: Script): string {
  return getScriptSegments(script).join(' ');
}

export function getScriptWordCount(script: Script): number {
  return countWords(getScriptText(script));
}

/** Estimated duration in seconds at 2.7 words/sec. */
export function getScriptDuration(script: Script): number {
  return getScriptWordCount(script) / 2.7;
}
