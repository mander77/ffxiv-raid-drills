// Runs the type check, the tests and the lint, then pushes the current branch to GitHub and
// opens its pull request to main, if it has none yet: `npm run publish`. Runs on Windows,
// macOS and Linux.
// `npm run publish -- main` also merges that pull request, from any checkout, so the main
// checkout is never needed. It waits for CI on the branch's last commit, then merges with
// "Rebase and merge": GitHub puts the branch's commits on top of main, so a branch that fell
// behind main needs no local rebase and no new CI run. It stops when GitHub cannot rebase the
// branch (a conflict): rebase it on origin/main yourself, then run it again.
// CI runs on pull requests and on main, not on a branch push alone. Cloudflare builds main as
// the live site, and skips the build when only docs, tests or tooling changed. For another
// branch, GitHub Actions makes a preview when the push changed the app and the owner approved it.
// GitHub deletes the branch on GitHub when its pull request merges (the repository setting
// "Automatically delete head branches").
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
    if (i === 120) throw new Error(`Stopped: CI has not passed on ${sha} (${state}). See: gh run list --commit ${sha}`);
    await sleep(15_000);
  }
}

/** Returns the number of the branch's open pull request to main, and opens one if it has none. */
function pullRequestOf(branch) {
  const query = ["--head", branch, "--base", "main", "--state", "open", "--json", "number", "--jq", ".[0].number // empty"];
  const open = output("gh", ["pr", "list", "--repo", REPO, ...query]);
  if (open !== "") return open;
  // The title and the description come from the branch's first commit.
  run("gh", ["pr", "create", "--repo", REPO, "--base", "main", "--head", branch, "--fill-first"]);
  return output("gh", ["pr", "list", "--repo", REPO, ...query]);
}

async function publish() {
  const branch = output("git", ["branch", "--show-current"]);
  if (branch === "" || branch === "main") throw new Error("Stopped: check out a branch other than main before you publish.");
  // Merge into main too, with "main" after npm run publish --.
  const toMain = process.argv.slice(2).includes("main");

  npm("typecheck");
  npm("test");
  npm("lint");

  const prev = output("gh", ["api", "user", "--jq", ".login"]);
  try {
    run("gh", ["auth", "switch", "--hostname", "github.com", "--user", OWNER]);
    const who = output("gh", ["api", "user", "--jq", ".login"]);
    if (who !== OWNER) throw new Error(`Stopped: the GitHub CLI is signed in as ${who}, not ${OWNER}.`);

    // A rebased branch needs a force push. --force-with-lease replaces the branch on GitHub only
    // if it is still where this checkout last saw it, and --force-if-includes only if this
    // checkout has had that commit, so a push from another session is never lost.
    gitgh(["push", "--force-with-lease", "--force-if-includes", "-u", "origin", branch]);
    const number = pullRequestOf(branch);
    console.log(`Pushed ${branch}, pull request #${number}. CI runs on GitHub: gh pr checks ${number}`);
    if (!toMain) {
      console.log("If the app changed, approve its Preview run on GitHub once CI passed.");
      return;
    }

    const sha = output("git", ["rev-parse", "HEAD"]);
    await waitForCi(sha);
    // --match-head-commit: merge only the commit that CI checked, never a newer push.
    const merged = spawnSync("gh", ["pr", "merge", number, "--repo", REPO, "--rebase", "--match-head-commit", sha], { stdio: "inherit" });
    if (merged.status !== 0) {
      throw new Error(
        `Stopped: GitHub did not merge #${number}. If it cannot rebase the branch, rebase it on origin/main, then run this again.`,
      );
    }
    gitgh(["fetch", "--prune", "origin"]);
    console.log(`Merged #${number} into main. Cloudflare deploys the live site in about a minute if the app changed.`);
    console.log(`Delete the local branch when you are done with it: git branch -D ${branch}`);
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
