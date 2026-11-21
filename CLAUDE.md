# FFXIV Raid Drills: notes for Claude

This file tells a new Claude session how to continue the work on this repository. Read it before
you change anything. Read `docs/decisions.md` before you change a mechanic, a position, a strat or
the layout of a screen.

This repository is public. Everything you commit is public too, so never commit personal data,
tokens or account details.

## What the site is

- A personal hobby site to practice M11S (The Tyrant, Savage) as a healer, away from the raid.
  Today it has one fight and one role. More roles and fights can come later.
- The owner is the GitHub account `mander77`. The owner plays a healer in a static and shares the
  live link with the static.
- Live site: https://ffxiv-raid-drills.app (built from `main`).
- Branch previews: `https://<branch>.test.ffxiv-raid-drills.app/`. The bare `test.` host does not
  load.
- Hosting: Cloudflare Workers Builds on the owner's personal Cloudflare account. Each push builds.
  See `docs/decisions.md` for the hosting details.

## The aim of the tool

A raid lead said the tool was too complicated. Since then, the aim is narrow: learn the fight
mechanics, learn the role positions, and answer the same questions under time pressure. A screen
must work with very little reading. Keep each intro to one short line. Before you add text or a
control, ask what a new, impatient player does with it.

The owner tests the site with role-played new players. The prompt is in
`docs/new-player-review.md`. Run it in a fresh agent that does not know the code, then check each
claim on the live site before you act on it.

## Tabs and routes

| Tab | Route | What it does |
|-----|-------|--------------|
| Home | `/` | "Start here" cards, an arena picture from a Learn card, and About me. |
| Learn | `/mech/<card>` | Quiz cards with arena pictures. Pick an answer to see it, then Lock in. Back, Next and one chip per mechanic. |
| Practice | `/map/<drill>[/<code>]` | Click where you stand, one mechanic at a time. Show me, Again, New pattern. |
| Timeline | `/next/<card>` | Which mechanic comes next, with a cactbot-style list. |
| Pressure | `/pressure` | A quick round of 12 timed questions, or the full fight: "Start the run" (scored) and "Watch the right moves" (a replay). |
| Pressure, player | `/pressure/<code>[/<picks>][?t=s]` | A shared link opens "Watch the right moves" at that fight pattern and moment. |
| Cheat sheet | `/sheet` | One line per mechanic, the timeline for your role, and sources. |

The slot switch is in the header: the role (only Healer works today; the others show "not yet
available") and the group, which is the light party (1 or 2, as wtfdig names it). Each drill and question builds its answer for the
role.

## First time on a new computer

A clone does not bring the repository's git config. Do these steps once, and make sure that each
one worked before you go on:

1. Install git, Node.js 24 and the GitHub CLI (`gh`). mise is optional.
2. Sign in to the GitHub CLI as `mander77`: `gh auth login`. Then run `gh auth setup-git`, so git
   uses the GitHub CLI to sign in.
3. Clone the repository: `gh repo clone mander77/ffxiv-raid-drills`.
4. In the clone, set the commit identity:
   `git config user.name mander77` and
   `git config user.email 220622142+mander77@users.noreply.github.com`.
   Then run `git var GIT_AUTHOR_IDENT` and make sure that it shows this name and address.
5. Run `npm ci`, then `npm run typecheck` and `npm test`. For the browser tests, run
   `npx playwright install` once, then `npm run e2e`.
6. If mise is installed, run `mise trust mise.toml` in the clone.

## Commands

You need Node.js 24 (the version in `.node-version`).

```sh
npm ci              # install
npm run dev         # local site; add -- --port 5174 --strictPort for a second checkout
npm run typecheck   # tsc, strict
npm test            # Vitest: unit and component tests
npm run e2e         # Playwright: browser tests in Chromium, Firefox and WebKit
npm run lint        # Biome: lint and format check of the rebuilt code
npm run format      # Biome: format and fix the rebuilt code
npm run build       # tsc, then Vite writes dist/
```

## Code map

```text
index.html           the page: #root for React, #view for the old screens
src/main.tsx         start-up: draws the React app (App.tsx) into #root
src/App.tsx          the header, the routes (React Router), links from the old screens
src/app.css          Tailwind, the site colours as Tailwind names, the cascade layers
src/tabs.ts          the tabs: id, label and one-line intro
src/router.ts        paths and routes: parseRoute, routeLink, tabOf, showRoute
src/share.ts         sharing the address of the screen
src/stores/slot.ts   your slot (H1 or H2), a Zustand store kept in the browser
src/components/      React components: Header, SlotSwitch, ShareButton, TabNav, Marks, CatKey,
                     LegacyScreen (shows an old screen)
src/components/ui/   shadcn/ui components (button, toggle, toggle-group, tooltip)
src/screens/         React screens: CheatSheet
src/lib/             cn() for class names, WRAP for the page width
src/core.ts          old screens: shared state, decks, scores, the MapCur and McqCur types
src/types.ts         drills, steps, zones, overlays, questions
src/party.ts         party slots: roles, light parties, slot names
src/util.ts          helpers, LS (localStorage with the "m11s." prefix), seeded random
src/geometry.ts      arena geometry: zones, rotation, inZone
src/arena.ts         SVG drawing: arenaSVG with layers, drawBoss, figSVG, sceneSVG
src/data/drills.ts   Practice drills (MAPS), scenes, safe spots, stack and spread rules
src/data/figs.ts     Learn card pictures (MECH_FIGS)
src/data/questions.ts  Learn cards (MECH, MECH_GROUPS) and Timeline cards (NEXT_ITEMS)
src/data/fight.ts    the full fight: segments, due times, pattern picks and codes
src/data/route.ts    the moving marker's route (rightRoute, clickRoute, runnerAt, showOf)
src/data/timeline.ts the fight timeline and "what you do" per row
src/data/abilities.ts  the ability list, phases and colour categories
src/data/attacks.ts  attack sizes and shapes (from BossMod). Put new sizes here.
src/views/           the old screens, built as HTML text, until the rebuild replaces them
src/views/legacy.ts  shows and hides the old screens; their keyboard keys and their slot
src/views/home.ts    Home
src/views/quiz.ts    Learn and Timeline cards, and the quick round's card
src/views/practice.ts  Practice
src/views/pressure.ts  Pressure start screen and the quick round
src/views/fight.ts   the full fight: the run and the player
src/views/map.ts     paintArena: the answer layers that Practice and the fight share
src/views/tlfig.ts   the Timeline card picture
src/views/tlnav.ts   colour marks for the timeline categories, as text
src/views/pattern.ts fight pattern picks (Settings on the player)
src/views/common.ts  tab header, HUD prompt, fadeEdges, round-done panel
src/styles.css       the old screens' styles, and the site colours (:root)
test/                Vitest tests; test/components and test/screens for React
e2e/                 Playwright browser tests
```

## How to work with the owner

1. Make a branch from the latest `main`. When another session can use the main checkout, work in
   a git worktree, for example
   `git worktree add -b <branch> ../ffxiv-raid-drills-<name> origin/main`, and run `npm ci` there.
   If mise is installed, run `mise trust <worktree>/mise.toml` once.
2. Run the dev server and check the change in a browser at desktop width (1280 px) and phone width
   (375 px). Measure positions in the page. Do not guess.
3. Run the type check, the tests (`npm test` and `npm run e2e`) and `npm run lint`.
4. Commit. The header is a Conventional Commit (`feat:`, `fix:`, `chore:`). The body is plain,
   simple English: short sentences, active voice, what changed for the player and why. Write the
   message to a file and run `git commit -F <file>`.
5. Tell the owner what changed, and ask: "Publish, or more changes first?" The owner reviews in a
   browser before a publish. Publish only after the owner says so.

## How to publish

1. `git fetch origin`, then make sure that the branch contains `origin/main`:
   `git merge-base --is-ancestor origin/main <branch>`. Another session can publish in between. If
   main moved, rebase the branch and check again.
2. Run `npm run build` and note the bundle name, `dist/assets/index-<hash>.js`.
3. From the branch checkout, run `sh scripts/publish.sh`. With mise installed, run it through mise
   so the repository's `mise.toml` applies:
   `mise -C <checkout> exec -- sh <checkout>/scripts/publish.sh`. The script runs the type check
   and the tests, then pushes the branch as `mander77`.
4. Run `sh scripts/wait-deploy.sh https://<branch>.test.ffxiv-raid-drills.app index-<hash>.js`,
   then test the preview in a browser.
5. In the main checkout, make sure that it is on `main` and has no changes. Run
   `git merge --ff-only <branch>`, then run the publish script there. On `main` the script also
   deletes every branch on GitHub that `main` already contains.
6. Run `sh scripts/wait-deploy.sh https://ffxiv-raid-drills.app index-<hash>.js` and check the
   live site. Then remove the worktree and delete the local branch.

## Accounts and identity

- Commit and push only as `mander77`. The repository's git config sets the identity:
  `mander77 <220622142+mander77@users.noreply.github.com>`. Before your first commit, run
  `git var GIT_AUTHOR_IDENT`. If it shows another name or address, stop and fix it. Environment
  variables (`GIT_AUTHOR_*`, `GIT_COMMITTER_*`) win over the git config.
- `mise.toml` unsets `GH_TOKEN`, `GITHUB_TOKEN` and the git identity variables in this
  repository. It matters on a machine where the shell sets them for another account.
- The publish script clears `GH_TOKEN` and `GITHUB_TOKEN`, switches the GitHub CLI to `mander77`
  and pushes through the GitHub CLI's credential helper. It needs `gh auth login` as `mander77`.
- To read a Cloudflare build result without the dashboard, run
  `gh api repos/mander77/ffxiv-raid-drills/commits/<sha>/check-runs`.

## Rules for the code

- The owner knows C# and basic JavaScript, and is new to TypeScript. Add a short `// TS note:`
  comment where the code uses a TypeScript feature for the first time. Keep
  `docs/typescript-for-csharp.md` current.
- Light theme only. No company branding.
- Code comments: plain English. No ticket numbers, no history of old layouts.
- Build the simplest shape for today's need. Do not add hooks for features nobody asked for.
- The site is being rebuilt in React (issues #18 to #22). New screens and parts are React
  components with Tailwind classes, in the usual React shape:
  - A component used by more than one screen gets its own file in `src/components/`, named after
    it (`SlotSwitch.tsx` exports `SlotSwitch`). A screen goes in `src/screens/`. A small part that
    only one screen uses stays in that screen's file.
  - Function components with named exports. The props are a named interface, `<Name>Props`.
  - State in hooks (`useState`), or in a Zustand store (`src/stores/`) when more than one screen
    needs it. Events are JSX props (`onClick`). Do not change a React element's classes or add
    listeners to it by hand.
  - Use shadcn/ui for common controls (`npx shadcn@latest add <name>`), and style them with the
    site's Tailwind colours (`bg-card`, `text-ink-2`, `border-heal`).
  - Each component has a test in `test/components/` or `test/screens/`. Find elements by role and
    text, the way a player would.
  - Add new files to `files.includes` in `biome.json`, so Biome checks them.
- Leave `src/data/` and `src/geometry.ts` as they are when you rebuild a screen. They are checked
  against cactbot and BossMod.
- The player marks are always the top layer of an arena picture.
- New attack sizes go in `src/data/attacks.ts`, not in a drill or a picture.
- A drill pattern comes from a seeded code (`withSeed`), so the same code builds the same pattern.
  Keep every random choice inside `random()`, or old codes change.

## Rules for the content

- Positions follow the owner's static, which uses the wtfdig guide:
  https://wtfdig.info/74/m11s#hector:nobuddies:fixed (Hector/Toxic, Kindred No Buddies split,
  Fixed (3CJ) Ecliptic).
- Every fight time and attack size must come from a source that anyone can check: fight times
  from the cactbot timeline (`r11s.txt`), attack sizes and shapes from the BossMod module
  (`RM11STheTyrant`). `src/data/sources.ts` links both. Never guess, round or invent one, and
  never take one from a video, a guide's picture or memory. Name the source line or shape in a
  comment next to the number. When a source is missing or unclear, ask the owner.
- A number the app chooses for itself is not a fight time. Examples: how long the clock runs past
  the enrage (`AFTER_ENRAGE`), and the made-up attacks in wrong answers (`FAKE` in
  `src/data/figs.ts`). Give it a name and a comment that says it is the app's choice.
- Never change a strat, a position or a rule without the owner. When a source and the owner
  disagree, ask.
- Words: "pattern", not "layout". "Saved for later" is a mechanic that the boss shows early and
  resolves later (a look-ahead step, `Step.look`). "The run" is the scored full fight. "Watch the
  right moves" is the replay.
- Never quiz an exact raidwide time. Ask which one comes next and whether it is soon.

## Planned work

The plans are GitHub issues. Run `gh issue list --repo mander77/ffxiv-raid-drills`.

- Issue #2: a reference view of every mechanic in fight order, with the site's diagrams. Two
  questions are open for the owner. Ask them before you build it.
- Issues #18 to #22 (label "rebuild"): rebuild the site in React, one step per issue and per
  branch, in order. Rebuild 1 (#18) is done, so the next one is Rebuild 2 (#19).
  `docs/decisions.md` has the decisions behind the plan.
- Issue #11: make the repository self-contained, so a clone plus one step gives every tool. Three
  questions are open for the owner.
- Issue #14: a script that imports fight times and attack sizes from cactbot and BossMod.
- The issues were written before some later changes. Before you start one, make sure that it
  still matches the code.

## Where to find more

- `docs/decisions.md`: decisions, ideas the owner rejected (do not propose them again), fight
  facts and corrections, planned work, and hosting details.
- `docs/new-player-review.md`: the role-play prompt for a usability test.
- `docs/ux-review.md`: the prompt for a UX review of the live site.
- `docs/code-review.md`: the prompt for a TypeScript code review.
- `docs/typescript-for-csharp.md`: TypeScript features mapped to C#.
- `README.md`: set-up for a person.
