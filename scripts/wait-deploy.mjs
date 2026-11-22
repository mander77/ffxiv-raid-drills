// Waits until a deploy is live: the site at the first argument serves the JavaScript bundle named
// in the second. Get the name from `npm run build`: it is the file in dist/assets that ends in .js.
// Checks every 10 seconds, for up to 10 minutes.
//
//   npm run wait-deploy -- https://my-branch.ffxiv-raid-drills.app index-AbCd1234.js
//   npm run wait-deploy -- https://ffxiv-raid-drills.app index-AbCd1234.js
import { setTimeout as sleep } from "node:timers/promises";

const [base, want] = process.argv.slice(2);
if (!base || !want) {
  console.error("Usage: npm run wait-deploy -- <site address> <bundle name, such as index-AbCd1234.js>");
  process.exit(1);
}

let js = "";
for (let i = 0; i < 60; i++) {
  try {
    const page = await (await fetch(`${base}/`)).text();
    js = page.match(/assets\/[A-Za-z0-9_.-]*\.js/)?.[0] ?? "";
  } catch {
    // The site did not answer this time. Try again.
  }
  if (js === `assets/${want}`) {
    console.log(`ready: ${js}`);
    process.exit(0);
  }
  await sleep(10_000);
}
console.log(`timed out, last bundle: ${js}`);
process.exit(1);
