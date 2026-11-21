#!/bin/sh
# Prints "true" when a file of the app changed between two commits, else "false".
# CI uses it to make a branch preview only when the app changed.
# The list below must match the exclude paths of Cloudflare's build watch paths for main
# (docs/decisions.md, "Hosting"). Any other file counts as the app.
#
#   sh scripts/app-changed.sh <from-commit> <to-commit>
set -eu
from=$1
to=$2

for f in $(git diff --name-only "$from" "$to"); do
  case "$f" in
    docs/* | *.md | .github/* | .claude/* | skills-lock.json | test/* | e2e/* | scripts/* | \
      playwright.config.ts | biome.json | mise.toml | components.json | .gitignore | \
      .gitattributes | .nojekyll) ;;
    *)
      echo true
      exit 0
      ;;
  esac
done
echo false
