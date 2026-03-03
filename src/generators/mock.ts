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

// ── T2 Templates (mechanic keywords required in after[] or closer phrase) ──

const T2_TEMPLATES: Array<Omit<T2Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'This classroom activity gets every single student speaking.',
    setup: 'Most teachers use pair work, but pairs leave half the class completely idle. Try simultaneous group reveal instead.',
    after: [
      'Signal students to submit one sentence before the countdown ends.',
      'Lock all responses when the timer reaches zero.',
      'Reveal every answer to the whole class at once.',
    ],
    closer: 'Simultaneous responses eliminate all dead waiting time.',
  },
  {
    hook: 'Stop letting fast students completely dominate your class.',
    setup: 'The first-to-answer problem destroys motivation for slower learners. Here is a fix that works.',
    after: [
      'Give a thirty-second countdown before accepting any responses.',
      'Use lock then reveal to prevent all early answers.',
      'Everyone submits their answer at exactly the same time.',
    ],
    closer: 'Equal wait time creates equal opportunity for everyone.',
  },
  {
    hook: 'This single technique doubled participation rates in my classroom.',
    setup: 'When students know others can see their work immediately, they stop trying hard. Change that dynamic today.',
    after: [
      'Set a timer and require simultaneous responses from every student.',
      'Use a random spotlight check on three different students.',
      'Lock all answers before any feedback discussion begins.',
    ],
    closer: 'Accountability mechanics transform classroom culture very quickly.',
  },
  {
    hook: 'Why do your class discussions always fall completely flat?',
    setup: 'Students wait to see what others say first before committing. Remove that option entirely.',
    after: [
      'Hard stop all talking when the countdown reaches zero.',
      'Reveal responses simultaneously across the entire group.',
      'Submit written summaries before any verbal discussion starts.',
    ],
    closer: 'Lock then reveal removes the copycat problem forever.',
  },
];

// ── S1 Templates (student POV: struggle → solution story) ─────────────────

const S1_TEMPLATES: Array<Omit<S1Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'I used to freeze every time a teacher asked me a question.',
    struggle: 'My brain went completely blank and I would just say I do not know.',
    solution: 'I started practicing with fifteen-second response windows at home every night.',
    result: 'Now I answer confidently in class every single time without hesitation.',
  },
  {
    hook: 'Speaking English in class felt completely impossible six months ago.',
    struggle: 'I always translated everything in my head first and then lost the whole conversation.',
    solution: 'I joined a study group where we timed responses and gave immediate honest feedback.',
    result: 'My speaking speed improved dramatically within just three short weeks.',
  },
  {
    hook: 'Grammar mistakes used to destroy my confidence in every English class.',
    struggle: 'Every time I opened my mouth, I second-guessed every single word I chose.',
    solution: 'My teacher introduced short timed speaking rounds with absolutely zero corrections during speaking time.',
    result: 'I stopped overthinking and started actually communicating much more clearly.',
  },
  {
    hook: 'I was the quietest student in every single English class I attended.',
    struggle: 'The fear of making mistakes in front of my classmates felt completely overwhelming.',
    solution: 'My teacher used anonymous response cards so nobody knew who gave which answer at first.',
    result: 'Once I knew no one could directly judge me, I started participating in every lesson.',
  },
];

// ── S2 Templates (student POV: mistake → correction tip) ─────────────────

const S2_TEMPLATES: Array<Omit<S2Script, 'id' | 'batch' | 'estimatedDuration' | 'score' | 'status' | 'createdAt' | 'format'>> = [
  {
    hook: 'I used to think speaking fast meant speaking really well.',
    mistake: 'I rushed through every sentence to sound fluent and skipped all the important connectors.',
    correction: 'Slow down and use connecting words like however, although, and meanwhile between your ideas.',
    tip: 'Record yourself speaking for thirty seconds each day and listen back for missing connectors.',
  },
  {
    hook: 'The biggest mistake I ever made while learning English vocabulary.',
    mistake: 'I memorized long word lists but never actually used those words in real sentences.',
    correction: 'Learn every new word inside a full sentence with context, not just isolated definitions.',
    tip: 'Write three brand-new sentences every single day using your new words in real situations.',
  },
  {
    hook: 'I corrected my classmates too much and they stopped practicing with me entirely.',
    mistake: 'Constant corrections during speaking practice break natural flow and kill everyone motivation very fast.',
    correction: 'Save all corrections for after the activity ends, never interrupt during active speaking practice time.',
    tip: 'Write down errors quietly in your notebook and review together when the speaking round finishes.',
  },
  {
    hook: 'Daily writing practice felt completely useless until I changed just one small thing.',
    mistake: 'I only ever wrote when teachers assigned homework, never independently on my own.',
    correction: 'Write something in English for five minutes every single morning without stopping to edit.',
    tip: 'Even just three short sentences about your day builds fluency faster than any perfect essay.',
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
