// Runs the type check, the tests and the lint, then pushes the current branch to GitHub:
// `npm run publish`. Runs on Windows, macOS and Linux.
// `npm run publish -- main` puts the current branch on main instead, from any checkout, so the
// main checkout is never needed: the branch must contain origin/main (a fast-forward), and its
// CI must have passed.
// GitHub runs CI on each push. Cloudflare builds main as the live site, and skips the build
// when only docs, tests or tooling changed. For another branch, GitHub Actions makes a
// preview when the push changed the app and the owner approved it.
// main takes only a commit on which CI already passed (when its branch was pushed). To publish
// main, the script waits for those checks, and stops if they failed or never ran.
// After it pushed main, it deletes every branch that main already contains, on GitHub and locally.
// Pushes as the repository owner. Ignores any GH_TOKEN or GITHUB_TOKEN in the
// shell, and switches the GitHub CLI back to the previous account at the end.
import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const OWNER = "mander77";
const REPO = `${OWNER}/ffxiv-raid-drills`;

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
delete process.env.GH_TOKEN;
delete process.env.GITHUB_TOKEN;
process.env.GH_PAGER = "cat";

/** Runs a program, shows its output, and stops if it fails. */
function run(program, args) {
  const result = spawnSync(program, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Stopped: ${program} ${args.join(" ")} failed.`);
}

/** Runs a program and returns what it printed. Stops if it fails. */
function output(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Stopped: ${program} ${args.join(" ")} failed.\n${result.stderr}`);
  return result.stdout.trim();
}

/** Runs an npm script. npm is a script on Windows, so it runs in the shell. */
function npm(script) {
  const result = spawnSync(`npm run ${script}`, { shell: true, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Stopped: npm run ${script} failed.`);
}

/**
 * git through the GitHub CLI's credential helper only. The empty credential.helper clears
 * inherited helpers (macOS adds osxkeychain at the system level, and Windows adds Git
 * Credential Manager; either can hold another account).
 */
function gitgh(args) {
  run("git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", ...args]);
}

/** Waits for the two CI checks that main requires. Checks every 15 seconds, for up to 30 minutes. */
async function waitForCi(sha) {
  console.log(`Waiting for CI on ${sha}...`);
  const query = `
    [.check_runs[] | select(.app.slug == "github-actions")
      | select(.name == "Lint, types, tests, build" or .name == "Browser tests")]
    | if length < 2 then "missing"
      elif any(.status != "completed") then "running"
      elif all(.conclusion == "success") then "passed"
      else "failed" end`;
  for (let i = 0; i <= 120; i++) {
    const state = output("gh", ["api", `repos/${REPO}/commits/${sha}/check-runs`, "--jq", query]);
    if (state === "passed") return;
    if (state === "failed") throw new Error(`Stopped: CI failed on ${sha}. See: gh run list --commit ${sha}`);
    if (i === 120) throw new Error(`Stopped: CI has not passed on ${sha} (${state}). Publish its branch first, then main.`);
    await sleep(15_000);
  }
}

/** Deletes every branch on GitHub that main already contains, and its local copy. */
function deleteMergedBranches() {
  gitgh(["fetch", "--prune", "origin"]);
  const refs = output("git", ["for-each-ref", "--merged", "origin/main", "--format=%(refname:short)", "refs/remotes/origin"]);
  for (const ref of refs.split("\n").filter(Boolean)) {
    const branch = ref.replace(/^origin\//, "");
    if (["main", "HEAD", "origin"].includes(branch)) continue;
    gitgh(["push", "origin", "--delete", branch]);
    spawnSync("git", ["branch", "-d", branch], { stdio: "ignore" });
    console.log(`Deleted the merged branch ${branch}.`);
  }
}

async function publish() {
  const branch = output("git", ["branch", "--show-current"]);
  if (branch === "") throw new Error("Stopped: check out a branch before you publish.");
  // Publish to main: from main itself, or with "main" after npm run publish --.
  const toMain = branch === "main" || process.argv.slice(2).includes("main");

  npm("typecheck");
  npm("test");
  npm("lint");

  const prev = output("gh", ["api", "user", "--jq", ".login"]);
  try {
    run("gh", ["auth", "switch", "--hostname", "github.com", "--user", OWNER]);
    const who = output("gh", ["api", "user", "--jq", ".login"]);
    if (who !== OWNER) throw new Error(`Stopped: the GitHub CLI is signed in as ${who}, not ${OWNER}.`);

    if (toMain) {
      gitgh(["fetch", "origin"]);
      const ahead = spawnSync("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"]);
      if (ahead.status !== 0) throw new Error("Stopped: main moved. Rebase the branch on origin/main, publish it, then try again.");
      await waitForCi(output("git", ["rev-parse", "HEAD"]));
    }

    if (!toMain) {
      gitgh(["push", "-u", "origin", branch]);
      console.log(`Pushed ${branch}. CI runs on GitHub: gh run list --branch ${branch}`);
      console.log("If the app changed, approve its Preview run on GitHub once CI passed.");
      return;
    }
    gitgh(["push", "origin", "HEAD:refs/heads/main"]);
    console.log("Pushed main. Cloudflare deploys the live site in about a minute if the app changed.");
    deleteMergedBranches();
  } finally {
    spawnSync("gh", ["auth", "switch", "--hostname", "github.com", "--user", prev], { stdio: "ignore" });
  }
}

try {
  await publish();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
