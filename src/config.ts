import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SECRETS_FILE = '/home/matt/clawd/secrets/elevenlabs.env';

function loadSecretsFile(): void {
  if (!existsSync(SECRETS_FILE)) return;
  const content = readFileSync(SECRETS_FILE, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadSecretsFile();

export const BASE_DIR =
  process.env.VIDEO_FACTORY_BASE ?? join(process.cwd(), 'data');

export function getBatchDir(batchId: string): string {
  return join(BASE_DIR, 'batches', batchId);
}

export function getChannelDir(batchId: string, channel: 'teacher' | 'student'): string {
  return join(getBatchDir(batchId), channel);
}

export function getDraftsDir(batchId: string, channel: 'teacher' | 'student'): string {
  return join(getChannelDir(batchId, channel), 'drafts');
}

export function getSelectedDir(batchId: string, channel: 'teacher' | 'student'): string {
  return join(getChannelDir(batchId, channel), 'selected');
}

export function getQaDir(batchId: string, channel: 'teacher' | 'student'): string {
  return join(getChannelDir(batchId, channel), 'qa');
}

export function getPacksDir(batchId: string, channel: 'teacher' | 'student'): string {
  return join(getChannelDir(batchId, channel), 'packs');
}

export function getElevenLabsApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY;
}

export function getElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
}

export function getElevenLabsModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2_5';
}

export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}
