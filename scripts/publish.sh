#!/bin/sh
# Runs the type check and the tests, then pushes the current branch to GitHub.
# Cloudflare builds main as the live site and every other branch as a preview.
# Pushes as the repository owner. Ignores any GH_TOKEN or GITHUB_TOKEN in the
# shell, and switches the GitHub CLI back to the previous account at the end.
set -eu
OWNER=mander77
cd "$(dirname "$0")/.."
unset GH_TOKEN GITHUB_TOKEN
export GH_PAGER=cat

branch=$(git branch --show-current)
if [ -z "$branch" ]; then
  echo "Stopped: check out a branch before you publish."
  exit 1
fi

npm run typecheck
npm test

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
git -c credential.helper= -c "credential.helper=!gh auth git-credential" push -u origin "$branch"
if [ "$branch" = "main" ]; then
  echo "Pushed main. Cloudflare deploys the live site in about a minute."
else
  echo "Pushed $branch. Cloudflare builds a preview of this branch in about a minute."
fi
