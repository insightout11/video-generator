import type { Format, Script } from '../types.js';
import { validateScript } from '../validators/script.js';
import { generateMock } from '../generators/mock.js';
import { generateClaude } from '../generators/claude.js';
import { getNextId, writeScriptToDrafts } from '../utils/files.js';
import { getDraftsDir } from '../config.js';
import { ensureDir } from '../utils/files.js';

export interface GenerateOptions {
  batch: string;
  countTeacher: number;
  countStudent: number;
  llm: 'mock' | 'claude';
}

async function tryGenerate(
  format: Format,
  batchId: string,
  llm: 'mock' | 'claude',
  templateIndex: number
): Promise<Script | null> {
  // Always get a fresh ID scan for each script (not per attempt)
  const id = getNextId(batchId, format);

  for (let attempt = 1; attempt <= 3; attempt++) {
    let script: Script;
    try {
      if (llm === 'mock') {
        script = generateMock(format, batchId, id, templateIndex);
      } else {
        script = await generateClaude(format, batchId, id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  [${id}] attempt ${attempt} generator error: ${msg}`);
      if (attempt === 3) return null;
      continue;
    }

    const result = validateScript(script);
    if (result.valid) {
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => console.warn(`  [${id}] warning: ${w}`));
      }
      return script;
    }

    console.warn(`  [${id}] attempt ${attempt} validation failed:`);
    result.errors.forEach((e) => console.warn(`    - ${e}`));
    if (attempt === 3) {
      console.warn(`  [${id}] dropped after 3 failed attempts`);
      return null;
    }
  }

  return null;
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
  const { batch, countTeacher, countStudent, llm } = opts;
  console.log(`\nGenerating batch "${batch}" — ${countTeacher} teacher, ${countStudent} student scripts (llm=${llm})\n`);

  // Ensure draft directories exist
  ensureDir(getDraftsDir(batch, 'teacher'));
  ensureDir(getDraftsDir(batch, 'student'));

  // Per-format template cycle counters
  const templateCounters: Record<Format, number> = { T1: 0, T2: 0, S1: 0, S2: 0 };

  // Generate teacher scripts: alternate T1/T2
  let teacherOk = 0;
  for (let i = 0; i < countTeacher; i++) {
    const format: Format = i % 2 === 0 ? 'T1' : 'T2';
    const tIdx = templateCounters[format]++;
    process.stdout.write(`  teacher [${i + 1}/${countTeacher}] ${format}... `);
    const script = await tryGenerate(format, batch, llm, tIdx);
    if (script) {
      writeScriptToDrafts(batch, script);
      console.log(`saved ${script.id} (${script.estimatedDuration.toFixed(1)}s)`);
      teacherOk++;
    }
  }

  // Generate student scripts: alternate S1/S2
  let studentOk = 0;
  for (let i = 0; i < countStudent; i++) {
    const format: Format = i % 2 === 0 ? 'S1' : 'S2';
    const tIdx = templateCounters[format]++;
    process.stdout.write(`  student [${i + 1}/${countStudent}] ${format}... `);
    const script = await tryGenerate(format, batch, llm, tIdx);
    if (script) {
      writeScriptToDrafts(batch, script);
      console.log(`saved ${script.id} (${script.estimatedDuration.toFixed(1)}s)`);
      studentOk++;
    }
  }

  console.log(`\nDone. Teacher: ${teacherOk}/${countTeacher} | Student: ${studentOk}/${countStudent}\n`);
}
