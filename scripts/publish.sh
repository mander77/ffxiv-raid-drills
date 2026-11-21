#!/bin/sh
# Runs the type check and the tests, then pushes the current branch to GitHub.
# GitHub runs CI on each push. Cloudflare builds main as the live site, and skips the build
# when only docs, tests or tooling changed. For another branch, GitHub Actions makes a
# preview when the push changed the app and the owner approved it.
# main takes only a commit on which CI already passed (when its branch was pushed). On main,
# the script waits for those checks, and stops if they failed or never ran.
# On main, it then deletes every branch that main already contains, on GitHub and locally.
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
npm run lint

prev=$(gh api user --jq .login)
trap 'gh auth switch --hostname github.com --user "$prev" >/dev/null 2>&1 || true' EXIT
gh auth switch --hostname github.com --user "$OWNER"
who=$(gh api user --jq .login)
if [ "$who" != "$OWNER" ]; then
  echo "Stopped: the GitHub CLI is signed in as $who, not $OWNER."
  exit 1
fi

if [ "$branch" = "main" ]; then
  # Wait for the two CI checks that main requires. Checks every 15 seconds, for up to 30 minutes.
  sha=$(git rev-parse HEAD)
  echo "Waiting for CI on $sha..."
  i=0
  while :; do
    state=$(gh api "repos/$OWNER/ffxiv-raid-drills/commits/$sha/check-runs" --jq '
      [.check_runs[] | select(.app.slug == "github-actions")
        | select(.name == "Lint, types, tests, build" or .name == "Browser tests")]
      | if length < 2 then "missing"
        elif any(.status != "completed") then "running"
        elif all(.conclusion == "success") then "passed"
        else "failed" end')
    case "$state" in
      passed) break ;;
      failed)
        echo "Stopped: CI failed on $sha. See: gh run list --commit $sha"
        exit 1
        ;;
    esac
    i=$((i + 1))
    if [ "$i" -gt 120 ]; then
      echo "Stopped: CI has not passed on $sha ($state). Publish its branch first, then main."
      exit 1
    fi
    sleep 15
  done
fi

# The empty credential.helper clears inherited helpers (macOS adds osxkeychain at the
# system level, which can hold another account), so only the GitHub CLI answers.
gitgh() { git -c credential.helper= -c "credential.helper=!gh auth git-credential" "$@"; }
gitgh push -u origin "$branch"
if [ "$branch" != "main" ]; then
  echo "Pushed $branch. CI runs on GitHub: gh run list --branch $branch"
  echo "If the app changed, approve its Preview run on GitHub once CI passed."
  exit 0
fi
echo "Pushed main. Cloudflare deploys the live site in about a minute if the app changed."

# Delete every branch on GitHub that main already contains, and its local copy.
gitgh fetch --prune origin
for ref in $(git for-each-ref --merged origin/main --format='%(refname:short)' refs/remotes/origin); do
  b=${ref#origin/}
  case "$b" in main|HEAD|origin) continue ;; esac
  gitgh push origin --delete "$b"
  git branch -d "$b" 2>/dev/null || true
  echo "Deleted the merged branch $b."
done
