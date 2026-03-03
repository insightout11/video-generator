import { writeFileSync } from 'node:fs';
import { getElevenLabsApiKey, getElevenLabsVoiceId, getElevenLabsModelId } from '../config.js';

const RATE_LIMIT_MS = 1_100;
let lastRequestAt = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

/**
 * Synthesize text via ElevenLabs REST API.
 * Returns true on success, false if no API key is set.
 * Throws on API error.
 */
export async function synthesize(
  text: string,
  outputPath: string,
  voiceIdOverride?: string
): Promise<boolean> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) return false;

  const voiceId = voiceIdOverride ?? getElevenLabsVoiceId();
  const modelId = getElevenLabsModelId();

  await rateLimit();

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${body}`);
  }

  const buffer = await response.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(buffer));
  return true;
}

/** Build the notes.md content when TTS is skipped or unavailable. */
export function buildNotesContent(
  text: string,
  estimatedDuration: number,
  voiceIdOverride?: string
): string {
  const voiceId = voiceIdOverride ?? getElevenLabsVoiceId();
  const modelId = getElevenLabsModelId();
  return [
    '# Voice Notes',
    '',
    'No audio generated. TTS was not run.',
    '',
    'To generate audio manually, use the following text:',
    '',
    '---',
    '',
    text,
    '',
    '---',
    '',
    `Voice ID: ${voiceId}`,
    `Model ID: ${modelId}`,
    `Estimated Duration: ${estimatedDuration.toFixed(1)}s`,
  ].join('\n');
}
