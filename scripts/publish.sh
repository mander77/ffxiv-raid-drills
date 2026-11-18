#!/bin/sh
# Runs the tests, then pushes main to GitHub. GitHub Pages serves main.
# Pushes as the repository owner. Ignores any GH_TOKEN or GITHUB_TOKEN in the
# shell, and switches the GitHub CLI back to the previous account at the end.
set -eu
OWNER=mander77
cd "$(dirname "$0")/.."
unset GH_TOKEN GITHUB_TOKEN
export GH_PAGER=cat

if [ "$(git branch --show-current)" != "main" ]; then
  echo "Stopped: switch to main before you publish."
  exit 1
fi

node --test

prev=$(gh api user --jq .login)
trap 'gh auth switch --hostname github.com --user "$prev" >/dev/null 2>&1 || true' EXIT
gh auth switch --hostname github.com --user "$OWNER"
who=$(gh api user --jq .login)
if [ "$who" != "$OWNER" ]; then
  echo "Stopped: the GitHub CLI is signed in as $who, not $OWNER."
  exit 1
fi

# The empty credential.helper clears inherited helpers (macOS adds osxkeychain at the
# system level, which can hold another account), so only the GitHub CLI answers.
git -c credential.helper= -c "credential.helper=!gh auth git-credential" push origin main
echo "Pushed. GitHub Pages updates https://$OWNER.github.io/m11s-healer-drills/ in about a minute."
