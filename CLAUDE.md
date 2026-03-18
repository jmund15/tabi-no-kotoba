# Japan Trip Apps — Project Guide

## Project Overview

This directory contains single-file apps for Jacob's Japan trip (March 22 – April 10, 2026):

- **`ultimate.jsx`** — Japanese learning app (React). Phrases, grammar, quizzes, flashcards. This is the primary app — merged from `initjsx.jsx` (v1) and `second.jsx` (v2).
- **`booking_tracker.html`** — Trip itinerary and booking tracker (standalone HTML, no build step).
- **`initjsx.jsx`** / **`second.jsx`** — Legacy versions of the learning app. Do not edit these; they exist for reference only.

## Verification Workflow (MANDATORY)

After ANY edit to a `.jsx` or `.html` file, you MUST run the verification script and review the screenshots before considering the work done.

### Steps

1. **Edit** the file
2. **Run verification**:
   ```bash
   node verify.mjs                       # for ultimate.jsx (default)
   node verify.mjs booking_tracker.html   # for HTML files
   node verify.mjs <filename>             # for any other JSX file
   ```
3. **Check the exit code** — `0` = pass, `1` = errors found
4. **Read the screenshots** in `./screenshots/` to visually inspect all tabs/sections
5. **If errors or visual issues**: fix them and re-run from step 2
6. **Only report completion** once verification passes with no errors AND screenshots look correct

### What the script checks
- JSX compilation (via Vite)
- Page loads without console errors or page crashes
- Screenshots of every tab (JSX apps) or full page + scrolled view (HTML files)
- All screenshots saved to `./screenshots/` (cleared on each run)

### Quick build-only check (no browser)
```bash
npx vite build
```
This catches JSX syntax/import errors in ~1 second without launching a browser.

## Architecture

### ultimate.jsx (Japanese Learning App)

Single-file React component (~1730 lines). No external UI libraries — all inline styles.

**Data layer** (top of file):
- `GRAMMAR` — 24 keyed grammar entries with type, explanation, usage examples
- `PARTICLES`, `CONNECTORS`, `QUESTION_WORDS`, `SENTENCE_PATTERNS`, `USEFUL_VOCAB` — pedagogical content arrays
- `PHRASES` — 11 categories, ~118 phrases, each with `breakdown[]` arrays containing `grammarId` links
- `TYPE_COLORS` — visual coding for grammar types

**Components**:
- `AudioBtn` — play normal (0.82x) or slow (0.55x) Japanese TTS
- `GrammarSection` — collapsible section with open/close toggle
- `PhraseCard` — expandable phrase card with breakdown, grammar linking, audio, favorites
- `App` — main app with 5 tabs

**5 Tabs**: Phrases, Grammar (7 sub-tabs), Saved, Practice (5 quiz modes), Deck

**Key features**:
- localStorage persistence: favorites (`jp-favs2`), deck (`jp-deck`)
- Bidirectional navigation: phrase breakdown → grammar entry → back to phrase
- 5 quiz modes: Fill Gap, Particle Pick, Build It, Translate, Listening
- Grammar sub-tabs: Reference, Structure, Particles, Connectors, Questions, Vocab, Pronunciation

### booking_tracker.html

Standalone HTML/CSS — no JavaScript framework, no build step. Pure CSS styling with CSS variables. Day cards expand/collapse via `onclick="this.classList.toggle('expanded')"`.

## Build Setup

- **Vite** + **@vitejs/plugin-react** for JSX compilation
- **Playwright** (Chromium) for headless browser verification
- Entry point: `index.html` → `src/main.jsx` → target JSX file

The `src/main.jsx` file is auto-updated by `verify.mjs` to point at whichever JSX file is being verified.

## Style Guide

- Warm brown/sepia color palette (#1a1412 bg, #c4a484 accents, #8b6940 highlights)
- Fonts: Noto Serif (English), Noto Sans JP (Japanese), Zen Antique (headers)
- All styles are inline — no external CSS files for JSX apps
- Animations: fadeIn (cards), slideUp (quiz questions), staggered delays on lists

## Content Notes

- Trip context: Kyushu solo leg → Tokyo/Kyoto/Osaka/Kawaguchiko with Kyle
- Spanish speaker context: pronunciation sections reference Spanish vowels, R sounds
- All phrase content is curated for practical travel use, not academic study
- Audio uses Web Speech API with Google Japanese voice preference
