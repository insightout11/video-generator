import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Format, Script } from '../types.js';
import {
  getDraftsDir,
  getSelectedDir,
  getQaDir,
  getChannelDir,
} from '../config.js';

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

export function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

export function copyFileEnsureDir(src: string, dst: string): void {
  const dstDir = dst.slice(0, dst.lastIndexOf('/') === -1 ? dst.lastIndexOf('\\') : dst.lastIndexOf('/'));
  ensureDir(dstDir);
  copyFileSync(src, dst);
}

/** Scan drafts/, selected/, qa/ for format-prefixed files and return max counter. */
export function getNextId(batchId: string, format: Format): string {
  const channel = format.startsWith('T') ? 'teacher' : 'student';
  const channelDir = getChannelDir(batchId, channel);
  const subdirs = ['drafts', 'selected', 'qa'];
  const prefix = `${format}-`;
  let maxN = 0;

  for (const sub of subdirs) {
    const dir = join(channelDir, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.startsWith(prefix) && f.endsWith('.json')) {
        const n = parseInt(f.slice(prefix.length, -5), 10);
        if (!isNaN(n) && n > maxN) maxN = n;
      }
    }
  }

  return `${format}-${String(maxN + 1).padStart(4, '0')}`;
}

export function writeScriptToDrafts(batchId: string, script: Script): string {
  const channel = script.format.startsWith('T') ? 'teacher' : 'student';
  const dir = getDraftsDir(batchId, channel);
  ensureDir(dir);
  const filePath = join(dir, `${script.id}.json`);
  writeJson(filePath, script);
  return filePath;
}

export function readDraftScripts(batchId: string, channel: 'teacher' | 'student'): Script[] {
  const dir = getDraftsDir(batchId, channel);
  return listJsonFiles(dir).map((f) => readJson<Script>(join(dir, f)));
}

export function copyScriptToSelected(batchId: string, script: Script): string {
  const channel = script.format.startsWith('T') ? 'teacher' : 'student';
  const dir = getSelectedDir(batchId, channel);
  ensureDir(dir);
  const filePath = join(dir, `${script.id}.json`);
  writeJson(filePath, script);
  return filePath;
}

export function copyScriptToQa(batchId: string, script: Script): string {
  const channel = script.format.startsWith('T') ? 'teacher' : 'student';
  const dir = getQaDir(batchId, channel);
  ensureDir(dir);
  const filePath = join(dir, `${script.id}.json`);
  writeJson(filePath, script);
  return filePath;
}

export function readSelectedScripts(batchId: string, channel: 'teacher' | 'student'): Script[] {
  const dir = getSelectedDir(batchId, channel);
  return listJsonFiles(dir).map((f) => readJson<Script>(join(dir, f)));
}
