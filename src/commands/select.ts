import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
  autoReplaceLint?: 'none' | 'ollama';
  lintThreshold?: 'low' | 'medium' | 'high';
}

type LintSeverity = 'none' | 'low' | 'medium' | 'high';

interface LintResult {
  ok: boolean;
  issues: string[];
  severity: LintSeverity;
  suggested_edits: Record<string, unknown>;
}

function lintScriptFromFile(filePath: string): LintResult {
  const nodeBin = process.execPath;
  const lintScript = process.env.OLLAMA_LINT_SCRIPT || '/home/matt/clawd/ops/bin/ollama-lint-script.mjs';
  const r = spawnSync(nodeBin, [lintScript, filePath], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024,
  });

  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    return { ok: false, issues: [err || 'lint failed'], severity: 'high', suggested_edits: {} };
  }

  try {
    return JSON.parse((r.stdout || '').trim()) as LintResult;
  } catch {
    return { ok: false, issues: ['lint returned non-JSON output'], severity: 'high', suggested_edits: {} };
  }
}

function severityRank(s: LintSeverity): number {
  return s === 'none' ? 0 : s === 'low' ? 1 : s === 'medium' ? 2 : 3;
}

function selectChannel(
  scripts: Script[],
  keep: number,
  qaSample: number,
  label: string,
  batchId: string,
  autoReplaceLint: 'none' | 'ollama',
  lintThreshold: LintSeverity
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
  let selectedScripts: Script[] = topN.map(({ script, score }) => ({
    ...script,
    status: 'selected' as const,
    score,
  }));

  // Optional: auto-replace scripts that fail Ollama lint with next-best candidates
  if (autoReplaceLint === 'ollama' && valid.length > selectedScripts.length) {
    const threshold = severityRank(lintThreshold);
    const candidates = valid.slice(selectedScripts.length); // next-best
    let replaced = 0;
    for (let i = 0; i < selectedScripts.length; i++) {
      const s = selectedScripts[i];
      const draftPath = join(getBatchDir(batchId), label, 'drafts', `${s.id}.json`);
      const lint = lintScriptFromFile(draftPath);
      if (severityRank(lint.severity) >= threshold) {
        const next = candidates.shift();
        if (!next) break;

        console.warn(
          `  [${s.id}] lint=${lint.severity} → replacing with [${next.script.id}] (next-best)`
        );

        selectedScripts[i] = {
          ...next.script,
          status: 'selected' as const,
          score: next.score,
        };
        replaced++;
      }
    }

    if (replaced > 0) {
      console.log(`  ${label}: auto-replaced ${replaced} script(s) based on lint threshold=${lintThreshold}`);
    }
  }

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

  const autoReplaceLint = opts.autoReplaceLint ?? 'none';
  const lintThreshold = opts.lintThreshold ?? 'medium';

  const teacherResult = selectChannel(teacherDrafts, keepTeacher, qaSample, 'teacher', batch, autoReplaceLint, lintThreshold);
  const studentResult = selectChannel(studentDrafts, keepStudent, qaSample, 'student', batch, autoReplaceLint, lintThreshold);

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
