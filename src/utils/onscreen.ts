import type { Script, T1Script, T2Script, S1Script, S2Script } from '../types.js';

function section(label: string, text: string): string {
  return `[${label}]\n${text}`;
}

function t1OnScreen(s: T1Script): string {
  return [
    section('HOOK', s.hook),
    section('WHY', s.why),
    section('FIX', s.fix),
    section('CLOSER', s.closer),
  ].join('\n\n');
}

function t2OnScreen(s: T2Script): string {
  const afterLines = s.after.map((a) => `- ${a}`).join('\n');
  return [
    section('HOOK', s.hook),
    section('SETUP', s.setup),
    section('AFTER', afterLines),
    section('CLOSER', s.closer),
  ].join('\n\n');
}

function s1OnScreen(s: S1Script): string {
  return [
    section('HOOK', s.hook),
    section('STRUGGLE', s.struggle),
    section('SOLUTION', s.solution),
    section('RESULT', s.result),
  ].join('\n\n');
}

function s2OnScreen(s: S2Script): string {
  return [
    section('HOOK', s.hook),
    section('MISTAKE', s.mistake),
    section('CORRECTION', s.correction),
    section('TIP', s.tip),
  ].join('\n\n');
}

/** Generate plain-text on_screen.txt content (no markdown). */
export function generateOnScreen(script: Script): string {
  switch (script.format) {
    case 'T1': return t1OnScreen(script);
    case 'T2': return t2OnScreen(script);
    case 'S1': return s1OnScreen(script);
    case 'S2': return s2OnScreen(script);
  }
}
