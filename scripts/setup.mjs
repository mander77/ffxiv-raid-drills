// Sets up a new clone in one step, on Windows, macOS and Linux: `npm run setup`.
// It checks the tools, installs the packages and the browsers for the browser tests, and runs
// the checks. It changes nothing outside the clone, except the browsers that Playwright
// downloads to its own cache. It never changes your git identity or your GitHub sign-in: it only
// tells you when one is missing.
//
// This is plain JavaScript, not TypeScript, so it still runs, and says what to do, on an older
// Node.js that cannot run TypeScript files.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

/** Things to fix that do not stop the set-up. They are printed at the end. */
const hints = [];

/** Runs a program and returns what it printed, or null if it is missing or failed. */
function output(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** Runs a command in the shell (npm and npx are scripts on Windows), and stops if it fails. */
function step(title, command) {
  console.log(`\n== ${title}: ${command}`);
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nStopped: "${command}" failed. Fix the error above, then run npm run setup again.`);
    process.exit(1);
  }
}

// Node.js: the major version in .node-version. package.json (devEngines) asks for the same one.
const want = readFileSync(".node-version", "utf8").trim();
if (process.versions.node.split(".")[0] !== want) {
  console.error(`Stopped: this repository needs Node.js ${want}. This is Node.js ${process.versions.node}.`);
  console.error(`Install Node.js ${want}, open a new terminal, and run npm run setup again:`);
  console.error(`  Windows: winget install OpenJS.NodeJS.${want}`);
  console.error(`  macOS:   brew install node@${want}`);
  console.error("  Any OS, with mise: mise install (it reads mise.toml)");
  process.exit(1);
}
console.log(`Node.js ${process.versions.node}: OK`);

// git: the clone needs it. The identity goes into every commit, and this repository is public.
const ident = output("git", ["var", "GIT_AUTHOR_IDENT"]);
if (ident === null) {
  hints.push(
    "git has no name or address for your commits. Set them in this clone:",
    '  git config user.name "<your GitHub name>"',
    '  git config user.email "<your GitHub noreply address>"',
    "  GitHub shows your noreply address at https://github.com/settings/emails",
  );
} else {
  // The identity ends with a time stamp and a time zone. Show only the name and the address.
  console.log(`Your commits say: ${ident.replace(/\s+\d+\s+[+-]\d{4}$/, "")}`);
  console.log("  This repository is public: every commit shows this name and address.");
}

// The GitHub CLI: only to publish and to work on issues. A pull request needs only git.
if (output("gh", ["--version"]) === null) {
  hints.push("The GitHub CLI (gh) is not installed. You need it only to publish: https://cli.github.com");
} else if (output("gh", ["auth", "status"]) === null) {
  hints.push("The GitHub CLI is not signed in. To publish, run: gh auth login, then gh auth setup-git");
} else {
  console.log("GitHub CLI: signed in");
}

step("Install the packages", "npm ci");
step("Install the browsers for the browser tests", "npx playwright install");
if (process.platform === "linux") {
  hints.push("On Linux the browsers may need system libraries: sudo npx playwright install-deps");
}
step("Check the types", "npm run typecheck");
step("Run the tests", "npm test");

console.log("\nReady. Run npm run dev to start the site.");
if (hints.length > 0) {
  console.log("\nTo do:");
  for (const hint of hints) console.log(hint);
}
