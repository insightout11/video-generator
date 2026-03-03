import type { Script } from '../types.js';
import { getScriptSegments } from '../types.js';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const rest = Math.floor(ms % 1_000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(rest)}`;
}

/** Wrap text into lines of at most maxChars characters. */
function wrapToLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current === '') {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generate an SRT caption file for a script.
 * Rules: max 42 chars/line, max 2 lines/block, cumulative timestamps at 2.7 wps.
 */
export function generateSrt(script: Script): string {
  const segments = getScriptSegments(script);
  const blocks: string[] = [];
  let counter = 1;
  let timeCursor = 0; // milliseconds

  for (const segment of segments) {
    const lines = wrapToLines(segment, 42);

    // Group lines into blocks of at most 2
    for (let i = 0; i < lines.length; i += 2) {
      const blockLines = lines.slice(i, Math.min(i + 2, lines.length));
      const wordCount = blockLines
        .join(' ')
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      const durationMs = Math.round((wordCount / 2.7) * 1_000);

      const start = formatSrtTime(timeCursor);
      timeCursor += durationMs;
      const end = formatSrtTime(timeCursor);

      blocks.push(`${counter}\n${start} --> ${end}\n${blockLines.join('\n')}`);
      counter++;
    }
  }

  return blocks.join('\n\n') + '\n';
}
