# Japan Trip Apps — Project Guide

## Project Overview

This directory contains single-file apps for Jacob's Japan trip (March 22 – April 10, 2026):

- **`ultimate.jsx`** — Japanese learning app (React). Phrases, grammar, quizzes, flashcards. This is the primary app — merged from `initjsx.jsx` (v1) and `second.jsx` (v2).
- **`booking_tracker.html`** — Trip itinerary and booking tracker (standalone HTML, no build step).
- **`initjsx.jsx`** / **`second.jsx`** — Legacy versions of the learning app. Do not edit these; they exist for reference only.

## Live URLs

- **Learning App**: https://jmund15.github.io/tabi-no-kotoba/
- **Booking Tracker**: https://jmund15.github.io/tabi-no-kotoba/booking.html
- **Repo**: https://github.com/jmund15/tabi-no-kotoba

The site is a PWA with offline support via service worker. Both apps work without internet after first visit.

---

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
- JSX compilation (via Vite dev server)
- Page loads without console errors or page crashes
- Screenshots of every tab (JSX apps) or full page + scrolled view (HTML files)
- All screenshots saved to `./screenshots/` (cleared on each run)

### Quick build-only check (no browser)
```bash
npx vite build
```
This catches JSX syntax/import errors in ~1 second without launching a browser.

---

## Deployment Workflow

After verifying changes locally, deploy to GitHub Pages:

### One-command deploy
```bash
bash deploy.sh                    # uses default commit message "Update site"
bash deploy.sh "Add new phrases"  # with custom commit message
```

### What deploy.sh does
1. Runs `npx vite build` to compile ultimate.jsx into static files
2. Copies `booking_tracker.html` → `dist/booking.html`
3. Switches to `gh-pages` branch (orphan — only contains built files)
4. Replaces all files with the new build
5. Commits and pushes to GitHub
6. Switches back to `master`
7. GitHub Pages rebuilds automatically (~30 seconds)

### Manual deploy (if script fails)
```bash
npx vite build
cp booking_tracker.html dist/booking.html
echo ".nojekyll" > dist/.nojekyll
# Copy dist/ contents to gh-pages branch and push
```

### Important: Always work on `master` branch
- `master` = source code (JSX, HTML, config, verify script)
- `gh-pages` = built/deployed files only (managed by deploy.sh)
- Never edit files on gh-pages directly

---

## Full Edit → Verify → Deploy Cycle

The complete workflow for any change:

```bash
# 1. Make your edits (on master branch)
# 2. Verify locally
node verify.mjs
# 3. Read screenshots, fix issues, re-verify if needed
# 4. Commit source changes
git add <files> && git commit -m "description"
git push origin master
# 5. Deploy to live site
bash deploy.sh "description"
```

---

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

When editing this file, remember to also copy it to `public/booking.html` (or let deploy.sh handle it).

## Build Setup

- **Vite** + **@vitejs/plugin-react** for JSX compilation
- **Playwright** (Chromium) for headless browser verification
- Entry point: `index.html` → `src/main.jsx` → `ultimate.jsx`
- PWA: `public/sw.js` (service worker), `public/manifest.json`, `public/icon-*.svg`

The `src/main.jsx` file is auto-updated by `verify.mjs` to point at whichever JSX file is being verified. For production builds it should point at `ultimate.jsx`.

### Key files
```
master branch:
├── ultimate.jsx          # Main app source
├── booking_tracker.html  # Booking tracker source
├── index.html            # Vite entry point (PWA meta tags)
├── src/main.jsx          # React entry (points at ultimate.jsx)
├── vite.config.js        # Vite config (base: /tabi-no-kotoba/)
├── public/               # Static assets copied to dist/
│   ├── sw.js             # Service worker (offline caching)
│   ├── manifest.json     # PWA manifest
│   ├── icon-192.svg      # App icon
│   ├── icon-512.svg      # App icon (large)
│   └── booking.html      # Copy of booking_tracker.html
├── verify.mjs            # Visual verification script
├── deploy.sh             # One-command deploy to GitHub Pages
└── screenshots/          # Verification screenshots (gitignored)

gh-pages branch (auto-managed by deploy.sh):
├── index.html            # Built learning app
├── booking.html          # Booking tracker
├── assets/               # Bundled JS
├── sw.js, manifest.json  # PWA files
└── .nojekyll             # Prevents Jekyll processing
```

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

## Service Worker Notes

The service worker (`public/sw.js`) uses:
- **Network-first** for app files (always get latest, fall back to cache when offline)
- **Cache-first** for Google Fonts (they don't change)
- Cache name: `tabi-v1` — bump the version when making breaking changes to force cache refresh

To force all users to get a fresh version, change `CACHE_NAME` in `sw.js` (e.g., `tabi-v2`).
