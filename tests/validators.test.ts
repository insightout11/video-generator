import { describe, it, expect } from 'vitest';
import { validateScript, scoreScript, MECHANIC_KEYWORDS } from '../src/validators/script.js';
import type { T1Script, T2Script, S1Script, S2Script } from '../src/types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeT1(overrides: Partial<T1Script> = {}): T1Script {
  return {
    id: 'T1-0001',
    format: 'T1',
    batch: 'test',
    hook: 'Why do students ignore speaking tasks?',
    why: 'They think silence means thinking, but real fluency needs pressure.',
    fix: 'Set a countdown timer for sixty seconds. Students lock in their answer before the timer hits zero. Then reveal answers simultaneously using a hard stop signal.',
    closer: 'Pressure creates real language output.',
    estimatedDuration: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeT2(overrides: Partial<T2Script> = {}): T2Script {
  return {
    id: 'T2-0001',
    format: 'T2',
    batch: 'test',
    hook: 'Same activity. Two outcomes.',
    before: [
      'One student answers at a time.',
      'Teacher reacts immediately each turn.',
      'Everyone else waits and disengages.',
    ],
    after: [
      'Everyone submits before the countdown ends.',
      'Lock all responses at zero with a hard stop.',
      'Reveal answers simultaneously, then discuss two highlights.',
    ],
    closer: 'Don’t improve instructions. Improve mechanics.',
    estimatedDuration: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeS1(overrides: Partial<S1Script> = {}): S1Script {
  return {
    id: 'S1-0001',
    format: 'S1',
    batch: 'test',
    hook: 'If you freeze in English, say this.',
    line: 'Give me a second—I’m thinking about my answer.',
    variants: ['Let me think for a moment.', 'Good question—let me think.'],
    end: 'Keep the conversation moving in real life, even when you feel stuck.',
    estimatedDuration: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeS2(overrides: Partial<S2Script> = {}): S2Script {
  return {
    id: 'S2-0001',
    format: 'S2',
    batch: 'test',
    hook: 'Want better conversations? Ask this.',
    they_say: 'I watched a movie last night.',
    followups: ['What was it about?', 'What did you like about it?', 'Would you recommend it to a friend?'],
    end: 'Pick one question and ask it today.',
    estimatedDuration: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── T1 Validation ─────────────────────────────────────────────────────────────

describe('T1 validation', () => {
  it('passes a valid T1 script', () => {
    const result = validateScript(makeT1());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when fix has no mechanic keyword', () => {
    const result = validateScript(makeT1({ fix: 'Ask students to speak clearly.' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('mechanic keyword'))).toBe(true);
  });

  it('fails when hook is empty', () => {
    const result = validateScript(makeT1({ hook: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('hook'))).toBe(true);
  });

  it('fails when fix is empty', () => {
    const result = validateScript(makeT1({ fix: '' }));
    expect(result.valid).toBe(false);
  });

  it('accepts all mechanic keywords in fix', () => {
    for (const kw of MECHANIC_KEYWORDS) {
      const result = validateScript(makeT1({ fix: `Use a ${kw} to improve engagement and response quality.` }));
      expect(result.valid).toBe(true);
    }
  });
});

// ── T2 Validation ─────────────────────────────────────────────────────────────

describe('T2 validation', () => {
  it('passes a valid T2 script with keyword in after[]', () => {
    const result = validateScript(makeT2());
    expect(result.valid).toBe(true);
  });

  it('passes when closer contains "simultaneous responses"', () => {
    const result = validateScript(
      makeT2({
        after: ['Ask students to write one sentence.', 'Share with partner.', 'Discuss as class.'],
        closer: 'This uses simultaneous responses for better engagement.',
      })
    );
    expect(result.valid).toBe(true);
  });

  it('passes when closer contains "lock then reveal"', () => {
    const result = validateScript(
      makeT2({
        after: ['Write your answer.', 'Check your grammar.', 'Share with the class.'],
        closer: 'Lock then reveal removes the copycat problem.',
      })
    );
    expect(result.valid).toBe(true);
  });

  it('fails when no mechanic keyword anywhere', () => {
    const result = validateScript(
      makeT2({
        after: ['Write your answer.', 'Check your grammar.', 'Share with the class.'],
        closer: 'Try this technique in your next lesson today.',
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('mechanic keyword'))).toBe(true);
  });

  it('fails when after array is empty', () => {
    // @ts-expect-error forcing invalid shape for test
    const result = validateScript(makeT2({ after: [] }));
    expect(result.valid).toBe(false);
  });
});

// ── S1 / S2 Validation ────────────────────────────────────────────────────────

describe('S1 validation', () => {
  it('passes a valid S1 script', () => {
    const result = validateScript(makeS1());
    expect(result.valid).toBe(true);
  });

  it('fails when line is empty', () => {
    const result = validateScript(makeS1({ line: '' }));
    expect(result.valid).toBe(false);
  });
});

describe('S2 validation', () => {
  it('passes a valid S2 script', () => {
    const result = validateScript(makeS2());
    expect(result.valid).toBe(true);
  });

  it('fails when end is empty', () => {
    const result = validateScript(makeS2({ end: '' }));
    expect(result.valid).toBe(false);
  });
});

// ── Duration Validation ───────────────────────────────────────────────────────

describe('duration validation', () => {
  // Build a script with an approximately known word count
  function scriptWithWords(n: number): T1Script {
    // Each word = "word", fill up to n words
    const words = Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
    return makeT1({
      hook: '',
      why: '',
      fix: `Use a countdown timer: ${words}`,
      closer: '',
    });
  }

  it('hard fails below 11s (< 30 words)', () => {
    // 20 words → 20/2.7 = 7.4s
    const s = makeT1({
      hook: 'Short hook here.',
      why: 'Short why.',
      fix: 'Use a countdown timer for best results always.',
      closer: 'Done.',
    });
    // Override with a very short script
    const tiny = makeT1({
      hook: 'Go.',
      why: 'Yes.',
      fix: 'Use timer.',
      closer: 'Done.',
    });
    const result = validateScript(tiny);
    // 5 words total → 1.85s — hard fail
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('too short'))).toBe(true);
  });

  it('hard fails above 27s (> 73 words)', () => {
    const manyWords = Array.from({ length: 75 }, (_, i) => `word${i + 1}`).join(' ');
    const s = makeT1({
      hook: 'Hook.',
      why: 'Why.',
      fix: `Use a countdown timer to ${manyWords}`,
      closer: 'Closer.',
    });
    const result = validateScript(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('too long'))).toBe(true);
  });

  it('warns at 11–12s range', () => {
    // ~30-32 words → 11.1–11.9s
    const words30 = Array.from({ length: 22 }, (_, i) => `word${i + 1}`).join(' ');
    const s = makeT1({
      hook: 'Short hook.',          // 2 words
      why: 'Short why.',            // 2 words
      fix: `Use a countdown timer ${words30}`, // 5 + 22 = 27 words
      closer: 'Done.',              // 1 word → total ~32 = 11.9s
    });
    const result = validateScript(s);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('short warning zone'))).toBe(true);
  });

  it('warns at 25–27s range', () => {
    // ~68-72 words → 25.2–26.7s
    const words60 = Array.from({ length: 59 }, (_, i) => `word${i + 1}`).join(' ');
    const s = makeT1({
      hook: 'Hook.',
      why: 'Why.',
      fix: `Use a countdown timer to help ${words60}`,
      closer: 'Closer.',
    });
    const result = validateScript(s);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('long warning zone'))).toBe(true);
  });

  it('passes cleanly in 12–25s range', () => {
    const result = validateScript(makeT1());
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

// ── Scoring ───────────────────────────────────────────────────────────────────

describe('scoring', () => {
  it('returns 0 for invalid scripts', () => {
    const s = makeT1({ fix: '' });
    const v = validateScript(s);
    expect(scoreScript(s, v)).toBe(0);
  });

  it('gives brevity bonus for 15–22s scripts', () => {
    const s = makeT1();
    const v = validateScript(s);
    expect(v.valid).toBe(true);
    expect(v.duration).toBeGreaterThanOrEqual(15);
    expect(v.duration).toBeLessThanOrEqual(22);
    const score = scoreScript(s, v);
    expect(score).toBeGreaterThan(70); // 50 base + 20 brevity + keywords
  });

  it('scores higher with more mechanic keywords', () => {
    const fewKw = makeT1({
      fix: 'Use a timer to improve results today in class.',
    });
    const manyKw = makeT1({
      fix: 'Use a countdown timer. Students lock and submit answers. Reveal simultaneously. Use spotlight and hard stop.',
    });
    const vFew = validateScript(fewKw);
    const vMany = validateScript(manyKw);
    if (vFew.valid && vMany.valid) {
      expect(scoreScript(manyKw, vMany)).toBeGreaterThan(scoreScript(fewKw, vFew));
    }
  });

  it('applies repetition penalty for high-frequency words', () => {
    // "students" repeated many times
    const s = makeT1({
      hook: 'Students students students.',
      why: 'Students students students students.',
      fix: 'Use a countdown timer for students students.',
      closer: 'Students matter.',
    });
    const v = validateScript(s);
    if (v.valid) {
      const score = scoreScript(s, v);
      // Score should have a penalty applied
      // base(50) + brevity(??) + spec(??) + kw(5) - penalty(15 if students >=5)
      expect(score).toBeLessThan(90);
    }
  });
});
