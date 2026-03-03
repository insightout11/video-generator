import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { Channel, Script } from '../types.js';
import { readSelectedScripts, ensureDir, writeJson } from '../utils/files.js';
import { getBatchDir } from '../config.js';

export interface LintOptions {
  batch: string;
  channel: 'teacher' | 'student' | 'both';
}

export interface LintResult {
  ok: boolean;
  issues: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  suggested_edits: Record<string, unknown>;
}

function getLintScriptPath(): string {
  // Can be overridden if running outside this machine.
  return process.env.OLLAMA_LINT_SCRIPT || '/home/matt/clawd/ops/bin/ollama-lint-script.mjs';
}

function lintOne(scriptPath: string): LintResult {
  const nodeBin = process.execPath; // current Node
  const lintScript = getLintScriptPath();

  const r = spawnSync(nodeBin, [lintScript, scriptPath], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024,
  });

  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    return {
      ok: false,
      issues: [err || 'lint failed'],
      severity: 'high',
      suggested_edits: {},
    };
  }

  try {
    return JSON.parse((r.stdout || '').trim()) as LintResult;
  } catch {
    return {
      ok: false,
      issues: ['lint returned non-JSON output'],
      severity: 'high',
      suggested_edits: {},
    };
  }
}

function writeLintJson(batchId: string, channel: Channel, scriptId: string, data: unknown): void {
  const dir = join(getBatchDir(batchId), 'lint', channel);
  ensureDir(dir);
  writeJson(join(dir, `${scriptId}.json`), data);
}

export async function runLint(opts: LintOptions): Promise<void> {
  const { batch } = opts;
  const channels: Channel[] = opts.channel === 'both' ? ['teacher', 'student'] : [opts.channel];

  console.log(`\nLinting batch "${batch}" (channel=${opts.channel})\n`);

  const summary: any = {
    batchId: batch,
    lintedAt: new Date().toISOString(),
    channels: {},
  };

  for (const channel of channels) {
    const scripts: Script[] = readSelectedScripts(batch, channel);
    console.log(`  ${channel}: ${scripts.length} selected script(s)`);

    const channelSummary = {
      total: scripts.length,
      ok: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
      ids: [] as string[],
    };

    for (const s of scripts) {
      const scriptPath = join(getBatchDir(batch), channel, 'selected', `${s.id}.json`);
      const result = lintOne(scriptPath);
      writeLintJson(batch, channel, s.id, result);
      channelSummary.ids.push(s.id);
      if (result.ok) channelSummary.ok += 1;
      if (result.severity === 'high') channelSummary.high += 1;
      if (result.severity === 'medium') channelSummary.medium += 1;
      if (result.severity === 'low') channelSummary.low += 1;
      if (result.severity === 'none') channelSummary.none += 1;

      const flag = result.ok ? 'OK' : result.severity.toUpperCase();
      console.log(`    [${s.id}] ${flag}${result.issues?.length ? ` — ${result.issues.join('; ')}` : ''}`);
    }

    summary.channels[channel] = channelSummary;
  }

  const batchDir = getBatchDir(batch);
  ensureDir(join(batchDir, 'lint'));
  writeFileSync(join(batchDir, 'lint', 'lint.json'), JSON.stringify(summary, null, 2));

  console.log(`\nLint summary written to ${join(batchDir, 'lint', 'lint.json')}\n`);
}
