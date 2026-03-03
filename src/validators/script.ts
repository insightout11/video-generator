import type { Script, ValidationResult } from '../types.js';
import { getScriptDuration, getScriptText } from '../types.js';

export const MECHANIC_KEYWORDS = [
  'simultaneous',
  'submit',
  'lock',
  'reveal',
  'countdown',
  'timer',
  'hard stop',
  'spotlight',
] as const;

function containsMechanicKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return MECHANIC_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateScript(script: Script): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field checks
  switch (script.format) {
    case 'T1':
      if (!script.hook.trim()) errors.push('hook is empty');
      if (!script.why.trim()) errors.push('why is empty');
      if (!script.fix.trim()) errors.push('fix is empty');
      if (!script.closer.trim()) errors.push('closer is empty');
      if (script.fix.trim() && !containsMechanicKeyword(script.fix)) {
        errors.push(
          'T1 fix must contain at least one mechanic keyword ' +
            `(${MECHANIC_KEYWORDS.join(', ')})`
        );
      }
      break;

    case 'T2': {
      if (!script.hook.trim()) errors.push('hook is empty');
      if (!script.before?.length) errors.push('before array is empty');
      script.before.forEach((b, i) => {
        if (!b.trim()) errors.push(`before[${i}] is empty`);
      });
      if (!script.after?.length) errors.push('after array is empty');
      script.after.forEach((a, i) => {
        if (!a.trim()) errors.push(`after[${i}] is empty`);
      });
      if (!script.closer.trim()) errors.push('closer is empty');

      const afterHasKeyword = script.after.some((a) => containsMechanicKeyword(a));
      const closerHasPhrase =
        script.closer.toLowerCase().includes('simultaneous responses') ||
        script.closer.toLowerCase().includes('lock then reveal');

      if (!afterHasKeyword && !closerHasPhrase) {
        errors.push(
          'T2 requires a mechanic keyword in after[] or ' +
            '"simultaneous responses"/"lock then reveal" in closer'
        );
      }
      break;
    }

    case 'S1':
      if (!script.hook.trim()) errors.push('hook is empty');
      if (!script.line.trim()) errors.push('line is empty');
      if (!script.variants?.length) errors.push('variants array is empty');
      script.variants.forEach((v, i) => {
        if (!v.trim()) errors.push(`variants[${i}] is empty`);
      });
      if (!script.end.trim()) errors.push('end is empty');
      break;

    case 'S2':
      if (!script.hook.trim()) errors.push('hook is empty');
      if (!script.they_say.trim()) errors.push('they_say is empty');
      if (!script.followups?.length) errors.push('followups array is empty');
      script.followups.forEach((f, i) => {
        if (!f.trim()) errors.push(`followups[${i}] is empty`);
      });
      if (!script.end.trim()) errors.push('end is empty');
      break;
  }

  // Duration validation
  const duration = getScriptDuration(script);

  if (duration < 11) {
    errors.push(
      `estimated duration ${duration.toFixed(1)}s is too short (minimum 11s)`
    );
  } else if (duration > 27) {
    errors.push(
      `estimated duration ${duration.toFixed(1)}s is too long (maximum 27s)`
    );
  } else if (duration < 12) {
    warnings.push(
      `estimated duration ${duration.toFixed(1)}s is in the short warning zone (11–12s)`
    );
  } else if (duration > 25) {
    warnings.push(
      `estimated duration ${duration.toFixed(1)}s is in the long warning zone (25–27s)`
    );
  }

  return { valid: errors.length === 0, errors, warnings, duration };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

export function scoreScript(script: Script, validation: ValidationResult): number {
  if (!validation.valid) return 0;

  let score = 50;
  const d = validation.duration;

  // Brevity bonus
  if (d >= 15 && d <= 22) {
    score += 20;
  } else if (d > 12 && d < 25) {
    score += 10;
  } else {
    // Warning zones: 11–12s or 25–27s (still valid)
    score += 5;
  }

  // Specificity: average word length (letters only)
  const allText = getScriptText(script);
  const words = allText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 0) {
    const avgLen =
      words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) /
      words.length;
    if (avgLen > 5.0) score += 15;
    else if (avgLen > 4.5) score += 10;
    else if (avgLen > 4.0) score += 5;
  }

  // Mechanic keyword count (capped at 5, +5 each)
  const textLower = allText.toLowerCase();
  let kwCount = 0;
  for (const kw of MECHANIC_KEYWORDS) {
    if (textLower.includes(kw)) kwCount++;
  }
  score += Math.min(kwCount, 5) * 5;

  // Repetition penalty: max frequency of any content word (>3 chars)
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length > 3) {
      wordFreq.set(clean, (wordFreq.get(clean) ?? 0) + 1);
    }
  }
  let maxFreq = 0;
  for (const freq of wordFreq.values()) {
    if (freq > maxFreq) maxFreq = freq;
  }
  if (maxFreq >= 5) score -= 15;
  else if (maxFreq >= 4) score -= 10;
  else if (maxFreq >= 3) score -= 5;

  return score;
}
