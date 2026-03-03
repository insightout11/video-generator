import type { Format, Script, T1Script, T2Script, S1Script, S2Script } from '../types.js';
import { getScriptDuration } from '../types.js';

// ── T1 Templates (mechanic keywords required in `fix`) ────────────────────
// Word counts verified; all 18–21s at 2.7 wps

const T1_TEMPLATES: Array<Omit<T1Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'Why do students ignore speaking tasks?',
    why: 'They think silence means thinking, but real fluency needs pressure.',
    fix: 'Set a countdown timer for sixty seconds. Students lock in their answer before the timer hits zero. No changes allowed. Then reveal answers simultaneously using a hard stop signal.',
    closer: 'Pressure creates real language output.',
  },
  {
    hook: 'Do your students always answer the same way?',
    why: 'Repetitive patterns mean they stopped processing the lesson.',
    fix: 'Use a spotlight mechanic. Call one student randomly. They have thirty seconds to submit one new word. Lock the board after every response. No repeats allowed.',
    closer: 'Random selection keeps every student actively engaged.',
  },
  {
    hook: 'Students tune out during long explanations.',
    why: 'Passive listening does not build real speaking confidence.',
    fix: 'Reveal the task in three parts using a countdown timer. Students submit one response at each checkpoint. Lock all answers before moving to the next stage. Simultaneous reveal keeps everyone fully accountable.',
    closer: 'Chunked delivery eliminates passive listening completely.',
  },
  {
    hook: 'Are your activities actually measuring real fluency?',
    why: 'Most speaking tasks reward speed instead of accuracy and depth.',
    fix: 'Introduce a hard stop after ninety seconds. Show the countdown on screen. Students lock all responses simultaneously. Spotlight three student answers for whole-class discussion.',
    closer: 'Hard stops force every student to commit to real answers.',
  },
];

// ── T2 Templates (before vs after; mechanic keywords required in after[] or closer phrase) ──

const T2_TEMPLATES: Array<Omit<T2Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'Same activity. Two different outcomes.',
    before: [
      'One student answers at a time.',
      'Teacher reacts immediately.',
      'Everyone else waits.',
    ],
    after: [
      'Everyone submits before the countdown ends.',
      'Lock all responses at zero.',
      'Reveal answers simultaneously, then discuss two highlights.',
    ],
    closer: 'Don’t improve instructions. Improve mechanics.',
  },
  {
    hook: 'Same discussion prompt. Two results.',
    before: [
      'Fast students answer first.',
      'Others copy or stay silent.',
      'Energy leaks while waiting.',
    ],
    after: [
      'Give a short countdown before any talking.',
      'Lock then reveal to prevent early answers.',
      'Spotlight 2–3 submissions after everyone commits.',
    ],
    closer: 'Design for participation, not volunteers.',
  },
  {
    hook: 'Same vocabulary game. Two outcomes.',
    before: [
      'Long turns per student.',
      'Low reps for most learners.',
      'Attention drifts between turns.',
    ],
    after: [
      'Run short timed rounds with a visible timer.',
      'Everyone submits at the hard stop.',
      'Reveal results together to keep momentum.',
    ],
    closer: 'Reps create engagement.',
  },
  {
    hook: 'Same question. Two class cultures.',
    before: [
      'Students wait to see what others say.',
      'Confident voices dominate.',
      'Quiet students disappear.',
    ],
    after: [
      'Require simultaneous responses from everyone.',
      'Lock all answers before feedback.',
      'Reveal across the group, then discuss patterns.',
    ],
    closer: 'Lock then reveal removes the copycat problem.',
  },
];

// ── S1 Templates (conversation rescue line) ───────────────────────────────

const S1_TEMPLATES: Array<Omit<S1Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'If you freeze in English, say this.',
    line: 'Give me a second—I’m thinking about my answer.',
    variants: ['Let me think for a moment.', 'Good question—let me think.'],
    end: 'Keep the conversation moving, even when you feel stuck.',
  },
  {
    hook: 'Don’t panic if you forget a word.',
    line: 'How do you say ___ in English?',
    variants: ['What’s the word for ___?', 'I mean the thing that ___.'],
    end: 'Don’t stop talking.',
  },
  {
    hook: 'Need time to answer?',
    line: 'That’s a good question—let me think.',
    variants: ['Hmm—let me think about that.', 'Give me a moment.'],
    end: 'Buy time. Then answer.',
  },
  {
    hook: 'If you didn’t hear them, say this.',
    line: 'Sorry—could you repeat that?',
    variants: ['Could you say that again, please?', 'I didn’t catch that—one more time?'],
    end: 'Stay calm and keep going.',
  },
];

// ── S2 Templates (follow-up question engine) ─────────────────────────────

const S2_TEMPLATES: Array<Omit<S2Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'Want better conversations? Ask this.',
    they_say: 'I watched a movie last night.',
    followups: ['What was it about?', 'What did you like about it?', 'Would you recommend it?'],
    end: 'Pick one and try it.',
  },
  {
    hook: 'Easy follow-ups that make you sound fluent.',
    they_say: 'I’m learning English.',
    followups: ['What’s your goal?', 'What’s the hardest part?', 'How do you practice?'],
    end: 'Ask one today.',
  },
  {
    hook: 'Keep the conversation going with this.',
    they_say: 'I went to Japan.',
    followups: ['Where did you go?', 'What surprised you?', 'Would you go again?'],
    end: 'Then listen.',
  },
  {
    hook: 'Don’t know what to say next? Ask this.',
    they_say: 'I started a new job.',
    followups: ['How’s it going so far?', 'What do you do there?', 'What’s the best part?'],
    end: 'One question is enough.',
  },
];

const TEMPLATE_MAP = {
  T1: T1_TEMPLATES,
  T2: T2_TEMPLATES,
  S1: S1_TEMPLATES,
  S2: S2_TEMPLATES,
};

export function generateMock(
  format: Format,
  batchId: string,
  id: string,
  templateIndex: number
): Script {
  const idx = templateIndex % 4;
  const now = new Date().toISOString();

  switch (format) {
    case 'T1': {
      const t = T1_TEMPLATES[idx];
      const partial: T1Script = {
        id,
        format: 'T1',
        batch: batchId,
        ...t,
        estimatedDuration: 0,
        status: 'draft',
        createdAt: now,
      };
      partial.estimatedDuration = parseFloat(getScriptDuration(partial).toFixed(2));
      return partial;
    }
    case 'T2': {
      const t = T2_TEMPLATES[idx];
      const partial: T2Script = {
        id,
        format: 'T2',
        batch: batchId,
        ...t,
        estimatedDuration: 0,
        status: 'draft',
        createdAt: now,
      };
      partial.estimatedDuration = parseFloat(getScriptDuration(partial).toFixed(2));
      return partial;
    }
    case 'S1': {
      const t = S1_TEMPLATES[idx];
      const partial: S1Script = {
        id,
        format: 'S1',
        batch: batchId,
        ...t,
        estimatedDuration: 0,
        status: 'draft',
        createdAt: now,
      };
      partial.estimatedDuration = parseFloat(getScriptDuration(partial).toFixed(2));
      return partial;
    }
    case 'S2': {
      const t = S2_TEMPLATES[idx];
      const partial: S2Script = {
        id,
        format: 'S2',
        batch: batchId,
        ...t,
        estimatedDuration: 0,
        status: 'draft',
        createdAt: now,
      };
      partial.estimatedDuration = parseFloat(getScriptDuration(partial).toFixed(2));
      return partial;
    }
  }
}

// Export template count for tests
export const TEMPLATE_COUNTS = { T1: 4, T2: 4, S1: 4, S2: 4 };
