#!/bin/sh
# Waits until a deploy is live: the site at $1 serves the JavaScript bundle named $2.
# Get the name from `npm run build`: it is the file in dist/assets that ends in .js.
# Checks every 10 seconds, for up to 10 minutes.
#
#   sh scripts/wait-deploy.sh https://my-branch.test.ffxiv-raid-drills.app index-AbCd1234.js
#   sh scripts/wait-deploy.sh https://ffxiv-raid-drills.app index-AbCd1234.js
set -u
base=$1
want=$2
i=0
js=""
while [ "$i" -lt 60 ]; do
  js=$(curl -s "$base/" | grep -o 'assets/[A-Za-z0-9_.-]*\.js' | head -n 1)
  if [ "$js" = "assets/$want" ]; then
    echo "ready: $js"
    exit 0
  fi
  i=$((i + 1))
  sleep 10
done
echo "timed out, last bundle: $js"
exit 1
