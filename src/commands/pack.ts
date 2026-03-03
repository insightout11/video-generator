import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import type { Script, Channel } from '../types.js';
import { getScriptText } from '../types.js';
import {
  readSelectedScripts,
  ensureDir,
  writeJson,
} from '../utils/files.js';
import { getPacksDir } from '../config.js';
import { generateSrt } from '../utils/srt.js';
import { generateOnScreen } from '../utils/onscreen.js';
import { generateMeta } from '../utils/meta.js';
import { synthesize, buildNotesContent } from '../tts/elevenlabs.js';

export interface PackOptions {
  batch: string;
  tts: 'elevenlabs' | 'none';
  voiceId?: string;
}

function cleanHook(hook: string): string {
  return hook.trim().replace(/\s+/g, ' ').replace(/\?+$/, '').trim();
}

function getHookVariants(hook: string) {
  const base = cleanHook(hook);
  const conversational = hook.trim();
  return {
    direct: base.endsWith('.') ? base : base + '.',
    conversational,
    spicy: `Stop this: ${cleanHook(conversational)}.`,
  };
}

function chooseHookVibe(): 'direct' | 'conversational' | 'spicy' {
  const env = (process.env.HOOK_VIBE || '').toLowerCase().trim();
  if (env === 'direct' || env === 'conversational' || env === 'spicy') return env;
  const day = Math.floor(Date.now() / 86_400_000);
  const idx = day % 3;
  return idx === 0 ? 'direct' : idx === 1 ? 'conversational' : 'spicy';
}

async function packScript(
  script: Script,
  channel: Channel,
  opts: PackOptions
): Promise<void> {
  const packDir = join(getPacksDir(opts.batch, channel), script.id);
  ensureDir(packDir);

  // Apply hook vibe rotation at pack-time (A/B/C test)
  const hook_variants = getHookVariants(script.hook);
  const hook_vibe = chooseHookVibe();
  const packedScript: Script = {
    ...script,
    hook_original: script.hook,
    hook_vibe,
    hook_variants,
    hook: hook_variants[hook_vibe],
  } as any;

  // script.json
  writeJson(join(packDir, 'script.json'), packedScript);

  // on_screen.txt
  writeFileSync(join(packDir, 'on_screen.txt'), generateOnScreen(packedScript), 'utf-8');

  // captions.srt
  writeFileSync(join(packDir, 'captions.srt'), generateSrt(packedScript), 'utf-8');

  // meta.json
  writeJson(join(packDir, 'meta.json'), generateMeta(packedScript, channel));

  // TTS: voice.mp3 or notes.md
  const fullText = getScriptText(packedScript);

  if (opts.tts === 'elevenlabs') {
    try {
      const wrote = await synthesize(
        fullText,
        join(packDir, 'voice.mp3'),
        opts.voiceId
      );
      if (!wrote) {
        // No API key — fall back to notes.md
        const notes = buildNotesContent(
          fullText,
          script.estimatedDuration,
          opts.voiceId
        );
        writeFileSync(join(packDir, 'notes.md'), notes, 'utf-8');
        console.log(`  [${script.id}] no ELEVENLABS_API_KEY — wrote notes.md`);
      } else {
        console.log(`  [${script.id}] voice.mp3 written`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  [${script.id}] TTS failed (${msg}) — writing notes.md`);
      const notes = buildNotesContent(
        fullText,
        script.estimatedDuration,
        opts.voiceId
      );
      writeFileSync(join(packDir, 'notes.md'), notes, 'utf-8');
    }
  } else {
    // tts=none: always write notes.md
    const notes = buildNotesContent(fullText, script.estimatedDuration, opts.voiceId);
    writeFileSync(join(packDir, 'notes.md'), notes, 'utf-8');
    console.log(`  [${script.id}] notes.md written (tts=none)`);
  }
}

export async function runPack(opts: PackOptions): Promise<void> {
  const { batch } = opts;
  console.log(`\nPacking batch "${batch}" (tts=${opts.tts})\n`);

  const teacherScripts = readSelectedScripts(batch, 'teacher');
  const studentScripts = readSelectedScripts(batch, 'student');

  if (teacherScripts.length === 0 && studentScripts.length === 0) {
    console.warn('No selected scripts found. Run "select" first.');
    return;
  }

  console.log('Teacher packs:');
  for (const script of teacherScripts) {
    await packScript(script, 'teacher', opts);
  }

  console.log('Student packs:');
  for (const script of studentScripts) {
    await packScript(script, 'student', opts);
  }

  const total = teacherScripts.length + studentScripts.length;
  console.log(`\nDone. ${total} pack(s) written to ${getPacksDir(batch, 'teacher')} / ${getPacksDir(batch, 'student')}\n`);
}
