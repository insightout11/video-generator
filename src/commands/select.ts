import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import type { Script, BatchJson } from '../types.js';
import { validateScript, scoreScript } from '../validators/script.js';
import {
  readDraftScripts,
  copyScriptToSelected,
  copyScriptToQa,
  ensureDir,
} from '../utils/files.js';
import { getBatchDir } from '../config.js';

export interface SelectOptions {
  batch: string;
  keepTeacher: number;
  keepStudent: number;
  qaSample: number;
}

function selectChannel(
  scripts: Script[],
  keep: number,
  qaSample: number,
  label: string
): { selected: Script[]; qa: Script[]; total: number; valid: number } {
  const total = scripts.length;

  // Validate + score each script
  const scored = scripts.map((s) => {
    const validation = validateScript(s);
    const score = scoreScript(s, validation);
    return { script: s, validation, score };
  });

  const valid = scored.filter((x) => x.validation.valid);
  console.log(
    `  ${label}: ${total} drafts, ${valid.length} valid, selecting top ${keep}`
  );

  // Log any scripts that failed validation
  scored
    .filter((x) => !x.validation.valid)
    .forEach(({ script, validation }) => {
      console.warn(`  [${script.id}] invalid: ${validation.errors.join('; ')}`);
    });

  // Sort valid by score descending
  valid.sort((a, b) => b.score - a.score);

  // Take top N
  const topN = valid.slice(0, keep);
  if (topN.length < keep) {
    console.warn(
      `  ${label}: only ${topN.length} valid scripts available (wanted ${keep})`
    );
  }

  // Mark status as selected and annotate score
  const selectedScripts: Script[] = topN.map(({ script, score }) => ({
    ...script,
    status: 'selected' as const,
    score,
  }));

  // QA sample
  const qaCount = qaSample > 0 ? Math.max(1, Math.floor(topN.length * qaSample)) : 0;
  const qaScripts: Script[] = [];
  if (qaCount > 0) {
    // Random sample without replacement using Fisher-Yates partial shuffle
    const indices = selectedScripts.map((_, i) => i);
    for (let i = 0; i < qaCount; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < qaCount; i++) {
      qaScripts.push({ ...selectedScripts[indices[i]], status: 'qa' as const });
    }
  }

  return {
    selected: selectedScripts,
    qa: qaScripts,
    total,
    valid: valid.length,
  };
}

export async function runSelect(opts: SelectOptions): Promise<void> {
  const { batch, keepTeacher, keepStudent, qaSample } = opts;
  console.log(`\nSelecting from batch "${batch}" — keep ${keepTeacher} teacher, ${keepStudent} student (qaSample=${qaSample})\n`);

  const teacherDrafts = readDraftScripts(batch, 'teacher');
  const studentDrafts = readDraftScripts(batch, 'student');

  const teacherResult = selectChannel(teacherDrafts, keepTeacher, qaSample, 'teacher');
  const studentResult = selectChannel(studentDrafts, keepStudent, qaSample, 'student');

  // Write selected scripts
  for (const s of teacherResult.selected) {
    copyScriptToSelected(batch, s);
  }
  for (const s of studentResult.selected) {
    copyScriptToSelected(batch, s);
  }

  // Write QA scripts
  for (const s of teacherResult.qa) {
    copyScriptToQa(batch, s);
  }
  for (const s of studentResult.qa) {
    copyScriptToQa(batch, s);
  }

  // Write batch.json
  const batchDir = getBatchDir(batch);
  ensureDir(batchDir);
  const batchJson: BatchJson = {
    batchId: batch,
    createdAt: new Date().toISOString(),
    teacher: {
      total: teacherResult.total,
      valid: teacherResult.valid,
      selected: teacherResult.selected.map((s) => s.id),
      qa: teacherResult.qa.map((s) => s.id),
    },
    student: {
      total: studentResult.total,
      valid: studentResult.valid,
      selected: studentResult.selected.map((s) => s.id),
      qa: studentResult.qa.map((s) => s.id),
    },
  };
  writeFileSync(join(batchDir, 'batch.json'), JSON.stringify(batchJson, null, 2));

  console.log(`\nteacher: ${teacherResult.selected.length} selected, ${teacherResult.qa.length} QA`);
  console.log(`student: ${studentResult.selected.length} selected, ${studentResult.qa.length} QA`);
  console.log(`batch.json written to ${batchDir}\n`);
}
