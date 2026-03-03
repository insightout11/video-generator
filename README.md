# Video Factory Runner v1

Local Node.js + TypeScript CLI that generates TikTok "video packs" for two channels: **teacher** and **student**. Three commands: `generate`, `select`, `pack`.

## Setup

```bash
npm install
npm run typecheck   # 0 errors
npm test            # validator tests
```

## Commands

### `generate` — create draft scripts

```bash
npm run dev -- generate \
  --batch <id> \
  --countTeacher <n> \
  --countStudent <n> \
  [--llm mock|claude]
```

- `--llm mock` (default): uses built-in templates (no API key needed)
- `--llm claude`: calls Anthropic API (`ANTHROPIC_API_KEY` required)
- Teacher scripts alternate T1/T2 formats; student scripts alternate S1/S2

### `select` — validate, score, and select the best drafts

```bash
npm run dev -- select \
  --batch <id> \
  --keepTeacher <n> \
  --keepStudent <n> \
  --qaSample <0..1>
```

- Reads all drafts, validates and scores each, copies top N to `selected/`
- `--qaSample 0.33` → copies `max(1, floor(N × 0.33))` random scripts to `qa/`
- Writes `batch.json` summary

### `pack` — generate output files per selected script

```bash
npm run dev -- pack \
  --batch <id> \
  --tts elevenlabs|none \
  [--voiceId <id>]
```

Each pack directory contains:

| File | Description |
|------|-------------|
| `script.json` | Full script data |
| `on_screen.txt` | Labeled sections (no markdown) |
| `captions.srt` | Auto-timed SRT captions (max 42 chars/line, 2 lines/block) |
| `meta.json` | ID, format, duration, score, channel |
| `voice.mp3` | TTS audio (if `--tts elevenlabs` + key present) |
| `notes.md` | Manual TTS instructions (if TTS skipped or unavailable) |

## End-to-End Example

```bash
npm run dev -- generate --batch testbatch --countTeacher 4 --countStudent 4 --llm mock
npm run dev -- select  --batch testbatch --keepTeacher 3 --keepStudent 3 --qaSample 0.33
npm run dev -- pack    --batch testbatch --tts none
```

Inspect results:
```
data/batches/testbatch/teacher/packs/T1-0001/
  script.json
  on_screen.txt
  captions.srt
  meta.json
  notes.md
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `VIDEO_FACTORY_BASE` | `./data` | Root output directory |
| `ANTHROPIC_API_KEY` | — | Required for `--llm claude` |
| `ELEVENLABS_API_KEY` | — | Required for `--tts elevenlabs` |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` (Rachel) | ElevenLabs voice |
| `ELEVENLABS_MODEL_ID` | `eleven_turbo_v2_5` | ElevenLabs model |

Secrets file `/home/matt/clawd/secrets/elevenlabs.env` is loaded automatically if present.

## Script Formats

| Format | Channel | Fields |
|--------|---------|--------|
| T1 | teacher | hook, why, fix*, closer |
| T2 | teacher | hook, setup, after[]*, closer |
| S1 | student | hook, struggle, solution, result |
| S2 | student | hook, mistake, correction, tip |

\* Mechanic keywords required: `simultaneous`, `submit`, `lock`, `reveal`, `countdown`, `timer`, `hard stop`, `spotlight`

## Duration Rules

| Range | Status |
|-------|--------|
| < 11s | Hard error (rejected) |
| 11–12s | Warning (selectable) |
| 12–25s | Clean pass |
| 25–27s | Warning (selectable) |
| > 27s | Hard error (rejected) |

## Scoring (0–100+ scale)

- Base: 50
- Brevity bonus: +20 (15–22s), +10 (12–25s), +5 (warning zones)
- Specificity: +15/+10/+5 by average word length (>5.0/>4.5/>4.0)
- Mechanic keywords: +5 per keyword found (up to 5)
- Repetition penalty: max content word frequency ≥5/≥4/≥3 → −15/−10/−5
