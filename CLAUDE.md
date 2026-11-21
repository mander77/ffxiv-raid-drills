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
- Live site: https://ffxiv-raid-drills.app (built from `main`). It runs the old version of the
  site until the React rebuild is done.
- The rebuild happens on the `rebuild` branch (issues #18 to #22). Its preview is
  https://rebuild.test.ffxiv-raid-drills.app. Each rebuild step is a branch from `rebuild` and a
  pull request into `rebuild`. When every tab is back, `rebuild` merges into `main` in one go.
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

On the `rebuild` branch:

| Tab | Route | What it does |
|-----|-------|--------------|
| Home | `/` | An arena picture from a Learn card, "Start here" cards, and About me. |
| Learn | `/learn/<card>` | Quiz cards with arena pictures. Pick an answer to see it, then Lock in. Back, Next and one chip per mechanic. |
| Practice | `/practice/<mechanic>/<code>` | Click where you stand, one mechanic at a time. Show me, Again, New pattern. The code names the pattern. |
| Timeline | `/timeline/<card>` | Which mechanic comes next, with a cactbot-style list. |
| Pressure | `/pressure`, `/pressure/<code>[/<picks>][?t=<s>]` | A quick round of 12 timed cards, or the full fight: the run (you click) and Watch the right moves (the player). The player's address names its fight, its picks and, paused, its moment. |
| Cheat sheet | `/sheet` | One line per mechanic, the timeline for your role, sources and your progress. |

Any other address opens Home. Every tab of the live site is back; git history keeps the old code
(`src/views/` on `main`).

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
npm run lint        # Biome: lint and format check
npm run format      # Biome: format and fix
npm run build       # tsc, then Vite writes dist/
```

## Code map

```text
index.html           the page: React draws into #root
src/main.tsx         start-up: draws the React app (App.tsx) into #root
src/App.tsx          the header and the routes (React Router): one page per path
src/app.css          Tailwind and the standard shadcn/ui theme, the ability category colours
src/tabs.ts          the tabs: path, label and one-line intro; tabOf
src/share.ts         sharing the address of the page
src/stores/slot.ts   your slot (H1 or H2), a Zustand store kept in the browser
src/stores/progress.ts  your scores (kept in the browser) and the round of Learn, Practice and Timeline
src/stores/pressure.ts  your Pressure settings: seconds to decide, stops, pattern picks, speed
src/components/      React components: Header, PageContainer, SlotSwitch, ShareButton, TabNav,
                     CategoryDots and CategoryKey (the ability category colours), RoundDone,
                     and the pieces Learn, Practice and the fight share: RuleBox, LastAnswer,
                     StepChips, SetupText, Tally, ChipRow, HudPrompt
src/components/arena/  the arena pictures: Arena (floor, waymarks, layers, clicks), Shape (one
                     attack, weapon or mark), BossMark, ZoneArea (a zone's coloured area),
                     ArenaLabel (a name tag), ZoneLabel (a label placed over a zone), LearnPicture
                     (a Learn picture), LiveArena (the live arena), TurningBoss, arena.css
src/components/ui/   shadcn/ui components, as the shadcn CLI writes them
src/pages/           React pages, one per route: HomePage (/), LearnPage (/learn), PracticePage
                     (/practice), TimelinePage (/timeline), PressurePage (/pressure),
                     CheatSheetPage (/sheet)
src/components/practice/  Practice: DrillList (wide screens), DrillNav (phones),
                     DrillScreen (one drill's screen: clicks, Show me, the prompt and panel)
src/lib/practice.ts  Practice rules as plain functions: buildPattern, answerStep, statusAfter, bossFor
src/components/pressure/  Pressure: PressureStart, QuickRound, FightScreen (the run and the player:
                     frame loop, clicks, keys), FightArena, FightHud (cast bar, prompt),
                     FightTimeline, FightPanel, FightPlayBar, FightSettings (the Settings button
                     and its sheet of pattern picks),
                     RunScore and WatchDone (the end screens)
src/lib/fight.ts     the fight clock's rules as plain functions: newFightState, tickFight, seek,
                     answerFightStep, viewOf, promptOf, castOf, timelineOf
src/lib/pressure.ts  the quick round's rules (weighted cards, the timer) and playerLink
src/components/quiz/ the question cards: QuizDeck (Back, Next, chips, the round), QuestionCard
                     (answers, previews, Lock in, keys, the timer of a timed card), TimerBar,
                     TimelinePicture
src/hooks/           custom hooks: useTimeout, useScrollToTopOnNewTab, useFightFrame (run code on
                     each frame of the fight clock), useMediaQuery, useFitToScreen
src/lib/             cn() for class names
src/types.ts         drills, steps, zones, overlays, questions
src/party.ts         party slots: roles, light parties, slot names
src/util.ts          helpers: bySlot, seeded random, pattern codes, shuffle, readingMs
src/geometry.ts      arena geometry: zones, rotation, inZone
src/data/drills.ts   Practice drills (DRILLS), scenes, safe spots, stack and spread rules
src/data/pictures.ts Learn card pictures (LEARN_PICTURES)
src/data/questions.ts  Learn cards (LEARN_CARDS, LEARN_GROUPS) and Timeline cards (TIMELINE_CARDS)
src/data/fight.ts    the full fight: segments, due times, pattern picks and codes
src/data/route.ts    the moving marker's route (rightRoute, clickRoute, runnerAt, showOf)
src/data/timeline.ts the fight timeline and "what you do" per row
src/data/abilities.ts  the ability list, phases and colour categories
src/data/attacks.ts  attack sizes and shapes (from BossMod). Put new sizes here.
test/                Vitest tests; test/components and test/pages for React
e2e/                 Playwright browser tests
```

## How to work with the owner

1. Make a branch from the latest `rebuild` (for a rebuild step) or `main` (for a fix to the live
   site). When another session can use the main checkout, work in a git worktree, for example
   `git worktree add -b <branch> ../ffxiv-raid-drills-<name> origin/rebuild`, and run `npm ci` there.
   If mise is installed, run `mise trust <worktree>/mise.toml` once.
2. Run the dev server and check the change in a browser at desktop width (1280 px) and phone width
   (375 px). Measure positions in the page. Do not guess.
3. Run the type check, the tests (`npm test` and `npm run e2e`) and `npm run lint`.
4. Check the change against the official best practices of every framework and language it
   touches, before you commit. Today that is React (react.dev), Tailwind CSS (tailwindcss.com),
   shadcn/ui (ui.shadcn.com), TypeScript, Vitest, Testing Library and Playwright. Read the
   current docs (the context7 tools help), compare, and fix what does not follow them. A new
   developer who knows the framework should find their way without help. Tell the owner what
   you checked and what you changed. See "Checked against" below.
5. Commit. The header is a Conventional Commit (`feat:`, `fix:`, `chore:`). The body is plain,
   simple English: short sentences, active voice, what changed for the player and why. Write the
   message to a file and run `git commit -F <file>`.
6. Tell the owner what changed, and ask: "Publish, or more changes first?" The owner reviews in a
   browser before a publish. Publish only after the owner says so.

## How to publish

A rebuild step: run `sh scripts/publish.sh` from the step's branch (it checks, then pushes), and
open a pull request into `rebuild` with `gh pr create --base rebuild`. The owner reviews it on the
branch preview and merges it. The steps below are for `main`, the live site: a fix to the live
site, and at the end, the merge of `rebuild` into `main`.

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
- Follow the official best practices of each framework and language, so the code looks the way
  a developer who knows it expects. "Checked against" (what each review looks at):
  - React (react.dev): one component per file for shared parts, named exports, props as a named
    interface, small components over functions that return JSX, click logic in handlers and not
    in effects ("You might not need an effect"), effects only to sync with outside systems,
    keys on list items, refs for DOM access.
  - Tailwind CSS (tailwindcss.com): reuse styles with a component, not a string of class names
    or @apply. Write complete class names (never build one from parts, such as `bg-${color}-600`).
    Custom CSS goes in a cascade layer (`@layer components`). Prefer the theme's sizes and
    colours over arbitrary values.
  - shadcn/ui (ui.shadcn.com): add components with its CLI and keep them as it writes them; use
    their variants and the theme's CSS variables (`bg-primary`, `text-muted-foreground`).
  - Tests (Testing Library, Playwright): find elements by role and text, as a user would.
- The site is built with React, Tailwind CSS and shadcn/ui, in the usual React shape:
  - A component used by more than one page gets its own file in `src/components/`, named after
    it (`SlotSwitch.tsx` exports `SlotSwitch`). A page (one per route) goes in `src/pages/` and
    is named `<Name>Page`. A custom hook goes in `src/hooks/` and its name starts with `use`. A
    small part that only one page uses stays in that page's file.
  - Function components with named exports. The props are a named interface, `<Name>Props`.
  - State in hooks (`useState`), or in a Zustand store (`src/stores/`) when more than one page
    needs it. Events are JSX props (`onClick`). Do not change a React element's classes or add
    listeners to it by hand.
  - What a click starts belongs in its click handler (`handleClick`), not in an effect. An effect
    (`useEffect`) is only for keeping in step with something outside React, such as a window
    event. A timer from a handler uses `useTimeout`.
  - Use shadcn/ui for common controls (`npx shadcn@latest add <name>`) with its standard theme
    and variants (`<Button variant="outline">`). Use Tailwind's standard sizes and colours
    (`text-sm`, `text-muted-foreground`), not exact pixels. The owner chose the default look over
    the old site's look.
  - Each component and page has a test in `test/components/` or `test/pages/`. Find elements by role and
    text, the way a player would.
  - Add new files to `files.includes` in `biome.json`, so Biome checks them.
- Leave `src/data/` and `src/geometry.ts` as they are when you rebuild a tab. They are checked
  against cactbot and BossMod.
- The player marks are always the top layer of an arena picture.
- New attack sizes go in `src/data/attacks.ts`, not in a drill or a picture.
- A drill pattern comes from a seeded code (`withSeed`), so the same code builds the same pattern.
  Keep every random choice inside `random()`, or old codes change.

## Words in the code

One idea has one name. Use these, and add to the list when a new idea comes in.

- **Tab**: Home, Learn, Practice, Timeline, Pressure, Cheat sheet. The address and the round name
  are the tab's name in lower case: `/learn`, `/practice`, `/timeline`.
- **Card**: one Learn or Timeline question (`QuizItem`; `LEARN_CARDS`, `TIMELINE_CARDS`).
- **Drill**: one Practice mechanic (`Drill`, `DRILLS`). The screen says "mechanic"; the code says
  drill. A **try** is one go at a drill, on its screen (`DrillScreen`).
- **Pattern**: the random parts of a drill, built from a **code** (`buildPattern`).
- **Step**: one question of a drill. Its **status** (`StepStatus`) is ask, right or wrong.
- **Phase**: a phase of the fight (Phase 1 to 4), and nothing else.
- **Look-ahead**: a step that is saved for later (`Step.lookAhead`).
- **Look**: the colour of a zone's area or a label (`ZoneLook`, `LabelLook`).
- **Zone**: a spot on the arena. `ZoneArea` draws its area, `ZoneLabel` its label.
- **Overlay**: a piece drawn on the arena (an attack, a weapon, a tag, a player mark); `Shape`
  draws one.
- **Mark**: a player's mark on the arena, or the boss (`BossMark`).
- **Category**: an ability category of the timeline (raid damage, tank damage...).
  `CategoryDots` draws its coloured dots.
- **Picture**: an arena picture with its data (`Picture`, `LEARN_PICTURES`, `LearnPicture`).
- **Round**: the answers so far on one tab, for one slot. The **quick round** is Pressure's 12
  timed cards (`QuickRound`).
- **Fight**: the full fight on the clock (`Fight`, `FightScreen`), in two modes (`FightMode`):
  **the run** (`"run"`), where you click your spots and get a score ("run" means only this), and **Watch the right moves**
  (`"watch"`), the player. A **frame** is one step of the fight clock (`tickFight`,
  `useFightFrame`).
- **Jump set**: the weapons the boss jumps to in order, in Assault Evolved and Ultimate Trophy
  Weapons (`JumpSet`, `buildJumpSet`).
- **Pick**: one random part of the full fight, such as the first weapon order. `Picks` are the
  parts a fight has; `Choices` are your settings, a pick or Random each (`CHOICE_ROWS`). The
  player's address calls them picks.

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
  `src/data/pictures.ts`). Give it a name and a comment that says it is the app's choice.
- Never change a strat, a position or a rule without the owner. When a source and the owner
  disagree, ask.
- Words: "pattern", not "layout". "Saved for later" is a mechanic that the boss shows early and
  resolves later (a look-ahead step, `Step.lookAhead`). "The run" is the scored full fight. "Watch the
  right moves" is the replay.
- Never quiz an exact raidwide time. Ask which one comes next and whether it is soon.

## Planned work

The plans are GitHub issues. Run `gh issue list --repo mander77/ffxiv-raid-drills`.

- Issue #2: a reference view of every mechanic in fight order, with the site's diagrams. Two
  questions are open for the owner. Ask them before you build it.
- Issues #18 to #22 (label "rebuild"): rebuild the site in React on the `rebuild` branch, one
  step per issue and per branch, in order. All five are done once Rebuild 5 (#22) merges. Then
  `rebuild` merges into `main` (see "How to publish"), after the owner says so. The old code is in
  git history on `main`.
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
