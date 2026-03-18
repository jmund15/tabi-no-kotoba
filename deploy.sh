#!/bin/bash
# Deploy script for tabi-no-kotoba GitHub Pages
# Usage: bash deploy.sh [commit message]

set -e

MSG="${1:-Update site}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Ensure we're on master
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "master" ]; then
  echo "ERROR: Must be on master branch (currently on $BRANCH)"
  exit 1
fi

echo "═══ Step 1: Build ═══"
npx vite build
cp booking_tracker.html dist/booking.html
echo ".nojekyll" > dist/.nojekyll
echo "✓ Built to dist/"

echo ""
echo "═══ Step 2: Deploy to gh-pages ═══"
# Save dist to temp location
TMPDIR=$(mktemp -d)
cp -r dist/* "$TMPDIR/"
cp dist/.nojekyll "$TMPDIR/"

# Stash any uncommitted changes (e.g. verify.mjs modifying src/main.jsx)
git stash --include-untracked -q 2>/dev/null || true

# Switch to gh-pages, replace everything, commit, push
git checkout gh-pages
# Remove old files (keep .git)
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
# Copy new files
cp -r "$TMPDIR"/* .
cp "$TMPDIR/.nojekyll" .
rm -rf "$TMPDIR"

git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
  git checkout master
  exit 0
fi

git commit -m "$MSG"
git push origin gh-pages

echo "✓ Pushed to gh-pages"

# Return to master and restore stashed changes
git checkout master
git stash pop -q 2>/dev/null || true
echo ""
echo "═══ Done! ═══"
echo "Site: https://jmund15.github.io/tabi-no-kotoba/"
echo "Booking: https://jmund15.github.io/tabi-no-kotoba/booking.html"
echo "(Allow ~30s for GitHub Pages to rebuild)"
