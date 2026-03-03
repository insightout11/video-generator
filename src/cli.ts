#!/usr/bin/env node
import { Command } from 'commander';
import { runGenerate } from './commands/generate.js';
import { runSelect } from './commands/select.js';
import { runPack } from './commands/pack.js';

const program = new Command();

program
  .name('video-factory')
  .description('TikTok video pack generator — teacher + student channels')
  .version('1.0.0');

// ── generate ─────────────────────────────────────────────────────────────────
program
  .command('generate')
  .description('Generate draft scripts for a batch')
  .requiredOption('--batch <id>', 'Batch identifier')
  .option('--countTeacher <n>', 'Number of teacher scripts to generate', '4')
  .option('--countStudent <n>', 'Number of student scripts to generate', '4')
  .option('--llm <type>', 'LLM provider: mock | claude', 'mock')
  .action(async (opts: { batch: string; countTeacher: string; countStudent: string; llm: string }) => {
    const llm = opts.llm as 'mock' | 'claude';
    if (llm !== 'mock' && llm !== 'claude') {
      console.error('--llm must be "mock" or "claude"');
      process.exit(1);
    }
    await runGenerate({
      batch: opts.batch,
      countTeacher: parseInt(opts.countTeacher, 10),
      countStudent: parseInt(opts.countStudent, 10),
      llm,
    });
  });

// ── select ────────────────────────────────────────────────────────────────────
program
  .command('select')
  .description('Validate, score, and select the best scripts from drafts')
  .requiredOption('--batch <id>', 'Batch identifier')
  .option('--keepTeacher <n>', 'Number of teacher scripts to keep', '3')
  .option('--keepStudent <n>', 'Number of student scripts to keep', '3')
  .option('--qaSample <f>', 'Fraction of selected scripts to copy to QA (0–1)', '0')
  .action(async (opts: { batch: string; keepTeacher: string; keepStudent: string; qaSample: string }) => {
    const qaSample = parseFloat(opts.qaSample);
    if (isNaN(qaSample) || qaSample < 0 || qaSample > 1) {
      console.error('--qaSample must be a number between 0 and 1');
      process.exit(1);
    }
    await runSelect({
      batch: opts.batch,
      keepTeacher: parseInt(opts.keepTeacher, 10),
      keepStudent: parseInt(opts.keepStudent, 10),
      qaSample,
    });
  });

// ── pack ──────────────────────────────────────────────────────────────────────
program
  .command('pack')
  .description('Generate output files for each selected script')
  .requiredOption('--batch <id>', 'Batch identifier')
  .option('--tts <mode>', 'TTS mode: elevenlabs | none', 'none')
  .option('--voiceId <id>', 'Override ElevenLabs voice ID')
  .action(async (opts: { batch: string; tts: string; voiceId?: string }) => {
    const tts = opts.tts as 'elevenlabs' | 'none';
    if (tts !== 'elevenlabs' && tts !== 'none') {
      console.error('--tts must be "elevenlabs" or "none"');
      process.exit(1);
    }
    await runPack({ batch: opts.batch, tts, voiceId: opts.voiceId });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
