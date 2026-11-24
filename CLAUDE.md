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
- Live site: https://ffxiv-raid-drills.app (built from `main`). It runs the React site.
- The site was rebuilt in React, Tailwind CSS and shadcn/ui in five steps (issues #18 to #22) on
  a `rebuild` branch, which merged into `main` when every tab was back. Git history on `main`
  keeps the old code (`src/views/`).
- Branch previews: `https://<branch>.ffxiv-raid-drills.app/`, with "/" in the branch name as "-".
- Hosting: Cloudflare Workers Builds on the owner's personal Cloudflare account. A push to
  `main` deploys the live site only when it changes the app, not for only docs, tests or tooling
  (build watch paths). Branch previews come from GitHub Actions (`preview.yml`): when a branch
  push changes the app, the Preview workflow waits for the owner's approval, then makes the preview.
  See `docs/decisions.md` for the hosting details.
- CI: GitHub Actions (`.github/workflows/ci.yml`) runs lint, the type check, the unit tests, the
  build and the browser tests on pull requests to `main` and on pushes to `main`, not on a
  branch push alone, to save Actions minutes. Every change reaches `main` through a pull
  request, merged with "Rebase and merge": a ruleset on `main` merges one only after both CI
  jobs passed on its last commit, and blocks force pushes, deletion and merge commits. GitHub
  rebases the branch as it merges, so a branch that fell behind `main` needs no new CI run.
- Merged branches: GitHub deletes a pull request's branch when the pull request merges (the
  repository setting "Automatically delete head branches").

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
| Home | `/` | An arena picture from a Learn card, "Start here" cards, and About me. |
| Learn | `/learn/<card>` | Quiz cards with arena pictures. Pick an answer to see it, then Lock in. Back, Next and one chip per mechanic. |
| Practice | `/practice/<mechanic>/<code>` | Click where you stand, one mechanic at a time. Show me, Reset, New pattern. The code names the pattern. |
| Timeline | `/timeline/<card>` | Which mechanic comes next, with a cactbot-style list. |
| Pressure | `/pressure`, `/pressure/<code>[/<picks>][?t=<s>]` | A quick round of 12 timed cards, or the full fight: the run (you click) and Watch the correct moves (the player). The player's address names its fight, its picks and, paused, its moment. |
| Cheat sheet | `/sheet` | Every mechanic in fight order with its picture, rules, your own answer and links to train it, the timeline for your role, sources and your progress. |

The footer, at the bottom of every page, links to the pages that are not tabs. The styles page,
`/styles`, has no tab; the footer links to it. It shows how the site shows an answer (the real
components), and every icon the site uses, with what it means and which mechanics use it. A click
on an icon's card opens it zoomed in. Check it when you add or change an icon or an answer style.
Any other address opens Home, including the old site's addresses (`/mech/...`, `/map/...`).

The slot switch is in the header: the role (only Healer works today; the others show "not yet
available") and the light party (1 or 2; wtfdig calls it the group). Each drill and question builds its answer for the
role.

## First time on a new computer

The tools are git and Node.js 24. Everything else comes from npm. The same steps work on
Windows, macOS and Linux, and in any shell (PowerShell too):

1. Install git and Node.js 24 (Windows: `winget install Git.Git OpenJS.NodeJS.24`; macOS:
   `brew install git node@24`). Open a new terminal.
2. Clone the repository and run `npm run setup` in the clone. It checks the Node.js version,
   runs `npm ci`, installs the browsers for `npm run e2e`, runs the type check and the tests,
   and ends with a "To do" list for anything it cannot fix itself.
   `package.json` (`devEngines`) refuses any other Node.js major version.
3. The setup only shows the commit identity; it never sets it. A clone does not bring the
   repository's git config, so on the owner's computer set it in the clone:
   `git config user.name mander77` and
   `git config user.email 220622142+mander77@users.noreply.github.com`.
   Then run `git var GIT_AUTHOR_IDENT` and make sure that it shows this name and address.
4. To publish (the owner only), install the GitHub CLI (`winget install GitHub.cli`), run
   `gh auth login` as `mander77`, then `gh auth setup-git`. The setup says if it is missing.

## Commands

You need Node.js 24 (the version in `.node-version`).

```sh
npm run setup       # first time: checks, install, test browsers, type check, tests
npm ci              # install
npm run dev         # local site; add -- --port 5174 --strictPort for a second checkout
npm run typecheck   # tsc, strict
npm test            # Vitest: unit and component tests
npm run e2e         # Playwright: browser tests in Chromium, Firefox and WebKit
npm run lint        # Biome: lint and format check
npm run format      # Biome: format and fix
npm run build       # tsc, then Vite writes dist/
npm run publish     # the owner: checks, then pushes the branch (see "How to publish")
npm run wait-deploy -- <site> <bundle>   # waits until a deploy serves that bundle
npm run import:sources   # downloads the pinned cactbot and BossMod files, writes src/data/source.gen.ts
npm run check:sources    # fails if source.gen.ts is out of date, then runs test/sources.test.ts
```

## Code map

```text
index.html           the page: React draws into #root
src/main.tsx         start-up: draws the React app (App.tsx) into #root
src/App.tsx          the header and the routes (React Router): one page per path
src/app.css          Tailwind and the shadcn/ui theme colours, light and dark (ink, slate header,
                     celery highlight; success, danger, warning and later answers; the blue hint),
                     the fonts, the ability category colours
src/tabs.ts          the tabs: path, label and one-line intro; tabOf
src/share.ts         sharing the address of the page
src/stores/slot.ts   your slot (H1 or H2), a Zustand store kept in the browser
src/stores/progress.ts  your scores (kept in the browser) and the round of Learn, Practice and Timeline
src/stores/pressure.ts  your Pressure settings: seconds to decide, stops, pattern picks, speed
src/components/      React components: Header, Footer (links to the pages that are not tabs),
                     PageContainer, SlotSwitch, ShareButton (a toast
                     says the link was copied), TabNav, TabMenu (the tabs as one button below lg), ThemeProvider and ModeToggle (light and
                     dark mode),
                     CategoryIcons and CategoryKey (the ability category icons, in their colours), icons (every icon
                     the site uses, named by its meaning, and the rules they follow), MechanicIcon
                     (the icon of a mechanic's kind), CastSquare (a row's square on Pressure's casts
                     coming up and Practice's list: filled for a hit, outlined for the boss's
                     cast, ink with its kind's icon for a mechanic), RoundDone,
                     and the pieces Learn, Practice and the fight share: RuleBox, LastAnswer,
                     StepChips, SetupText, LineList (mechanic text as a bulleted or numbered
                     list, one short line each), Tally, ChipRow, PromptBar (the question and its buttons,
                     then how the answer went, on every tab that asks), StickyBar (keeps a prompt
                     bar at the top of a narrow screen), IconButton (a button with
                     only an icon, named by its tooltip)
src/components/arena/  the arena pictures: Arena (floor, waymarks, layers, clicks), Shape (one
                     attack, weapon or mark), Weapon (a boss weapon: its icon on the line it rests along), BossMark, ZoneArea (a zone's coloured area),
                     ArenaLabel (a name tag), ZoneLabel (a label placed over a zone), LearnPicture
                     (a Learn picture), LiveArena (the live arena), ArenaFrame (the one size rule for
                     every arena you play on), TurningBoss, arena.css
src/components/ui/   shadcn/ui components, as the shadcn CLI writes them
src/pages/           React pages, one per route: HomePage (/), LearnPage (/learn), PracticePage
                     (/practice), TimelinePage (/timeline), PressurePage (/pressure),
                     CheatSheetPage (/sheet), StylesPage (/styles, linked from the footer)
src/components/practice/  Practice: DrillScreen (one drill's screen, in the layout of Pressure's
                     player: clicks, Show me, the prompt, the panel, the bar and the list),
                     MechanicList (the mechanics under their phases: a click opens one)
src/lib/practice.ts  Practice rules as plain functions: buildPattern, answerStep, statusAfter, bossFor
src/components/pressure/  Pressure: PressureStart, QuickRound, FightScreen (the run and the player:
                     frame loop, clicks, keys), FightArena, CastBar, FightPrompt, FightHud (the
                     two together, in the run), CastList (the casts coming up, WoW-style squares
                     rising to a now mark, down the box or sideways), CastKey (its key) and
                     CastButton (a cast you click to go to it, in the player), FightPanel, FightPlayBar, FightSettings (the Settings button
                     and its sheet of pattern picks), RunOverlays (over the arena: a hit's name, and the
                     run's result, 3-2-1 and progress),
                     RunScore and WatchDone (the end screens)
src/lib/fight.ts     the fight clock's rules as plain functions: newFightState, tickFight, seek,
                     answerFightStep, viewOf, promptOf, castOf, castsAhead, castPositions
src/lib/pressure.ts  the quick round's rules (weighted cards, the timer) and playerLink
src/components/quiz/ the question cards: QuizDeck (Back, Next, chips, the round), QuestionCard
                     (answers, previews, Lock in, keys, the timer of a timed card), AnswerButton
                     (one answer, before and after you answer), TimerBar,
                     TimelinePicture
src/hooks/           custom hooks: useTimeout, useScrollToTopOnNewTab, useCastTimeline (the casts coming up, moving with the fight clock), useLineDrag (drag the
                     casts coming up, or the list of mechanics), useFightFrame (run code on
                     each frame of the fight clock), useFightKeys (the fight's keys: Space, the arrows, Enter),
                     useMediaQuery, useFitToScreen, useTheme, useSectionInView (the section you have scrolled to)
src/lib/             cn() for class names; dom.ts: isPageKey (a key belongs to the page, not to a
                     button, an input or a dialog) and prefersLessMotion
scripts/             setup.mjs (npm run setup), publish.mjs (npm run publish), wait-deploy.mjs
                     (npm run wait-deploy), import-sources.mjs (npm run import:sources and
                     check:sources): plain Node.js, so they run the same on every OS
src/types.ts         drills, steps, zones, overlays, questions
src/party.ts         party slots: roles, light parties, slot names
src/util.ts          helpers: bySlot, seeded random, pattern codes, shuffle, readingMs
src/geometry.ts      arena geometry: zones, rotation, inZone
src/data/fightInfo.ts  the fight's names and the strats (FIGHT_INFO), for the header and Home
src/data/drills.ts   Practice drills (DRILLS), scenes, safe spots, stack and spread rules
src/data/rules.ts    rule lines that a drill and a Learn card both show, written once
src/data/pictures.ts Learn card pictures (LEARN_PICTURES)
src/data/questions.ts  Learn cards (LEARN_CARDS, LEARN_GROUPS) and Timeline cards (TIMELINE_CARDS)
src/data/fight.ts    the full fight: segments, due times, pattern picks and codes
src/data/route.ts    the moving marker's route (correctRoute, clickRoute, runnerAt, showOf)
src/data/timeline.ts the fight timeline and "what you do" per row
src/data/reference.ts  the Cheat sheet's mechanics in fight order (REFERENCE): a Learn picture
                     and the Learn cards whose rules each one lists, its drills and Timeline card
src/data/abilities.ts  the ability list, phases and colour categories
src/data/attacks.ts  attack sizes and shapes (from BossMod). Put new sizes here.
src/data/source.gen.ts  generated by npm run import:sources: the cactbot lines and the BossMod
                     abilities at the pinned commits. Never edit it by hand.
src/data/sources.ts  the links to the sources, and the lookups into source.gen.ts: cactbot(name, n)
                     (the nth time of a line), bossmod(ability) (its cast and shape), castStart
src/data/vocabulary.ts  the conversion table and the Checklist searches of docs/vocabulary.md
test/                Vitest tests; test/components and test/pages for React
e2e/                 Playwright browser tests
```

## How to work with the owner

1. Make a branch from the latest `main`. When another session can use the main checkout, work in
   a git worktree, for example
   `git worktree add -b <branch> ../ffxiv-raid-drills-<name> origin/main`, and run `npm ci` there.
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

These steps put a branch on `main`, the live site, through its pull request. Other sessions
can publish in between: GitHub rebases the branch onto `main` as it merges, so you do not
rebase, run CI or approve a preview again when `main` moves.

1. Run `npm run build` and note the bundle name, `dist/assets/index-<hash>.js`.
2. From the branch checkout, run `npm run publish` (any shell, PowerShell too). The script runs
   the type check, the tests and the lint, pushes the branch as `mander77` and opens its pull
   request, if it has none yet. The pull request starts CI on GitHub.
3. If the branch changed the app, wait for CI to pass, then ask the owner to approve the
   waiting Preview run on GitHub. Then run
   `npm run wait-deploy -- https://<branch>.ffxiv-raid-drills.app index-<hash>.js` and
   test the preview in a browser. A branch with only docs, tests or tooling gets no preview: skip
   this step.
4. From the same branch checkout, run `npm run publish -- main`. Never use the main checkout:
   another session may be working there. The script pushes the branch, waits for CI on its last
   commit and stops if it failed, then merges the pull request with "Rebase and merge". GitHub
   deletes the branch on GitHub. If GitHub cannot rebase the branch (a conflict with `main`),
   rebase it on `origin/main` yourself and run the script again; that push needs a new CI run.
   A branch that merged `main` into itself must be rebased first, because `main` takes no merge
   commits.
5. Run `npm run wait-deploy -- https://ffxiv-raid-drills.app index-<hash>.js` and check the
   live site (again, only when the app changed). CI also runs on `main` after the merge; if it
   fails, two branches that passed on their own broke each other, so fix it at once. Then remove
   the worktree and delete the local branch (`git branch -D <branch>`: its commits reached
   `main` with new names, so `-d` does not see them as merged).

## Accounts and identity

- Commit and push only as `mander77`. The repository's git config sets the identity:
  `mander77 <220622142+mander77@users.noreply.github.com>`. Before your first commit, run
  `git var GIT_AUTHOR_IDENT`. If it shows another name or address, stop and fix it. Environment
  variables (`GIT_AUTHOR_*`, `GIT_COMMITTER_*`) win over the git config.
- The publish script clears `GH_TOKEN` and `GITHUB_TOKEN`, switches the GitHub CLI to `mander77`
  and pushes through the GitHub CLI's credential helper. It needs `gh auth login` as `mander77`.
- To read a Cloudflare build result without the dashboard, run
  `gh api repos/mander77/ffxiv-raid-drills/commits/<sha>/check-runs`.

## Rules for the code

- The owner knows C# and basic JavaScript, and is new to TypeScript. Add a short `// TS note:`
  comment where the code uses a TypeScript feature for the first time. Keep
  `docs/typescript-for-csharp.md` current.
- Light and dark mode. Colours come from the theme in `src/app.css` (`bg-header`,
  `bg-success text-success-foreground`...), each with a light and a dark value, not from fixed
  Tailwind colours such as `bg-green-50`. Colours come in shadcn's pairs: the name is the
  background, `-foreground` the text and border on it. Keep the chrome quiet (ink, gray, the slate header and
  the celery highlight), so the arena stays the focus: green, red, blue and purple mean correct,
  incorrect, the arena's hints and the roles. The arena keeps its own colours in both modes. No
  company branding.
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
    A colour a variant does not give comes from a new variant in the component (`cva`), as
    shadcn/ui's customization guide shows, not from `dark:` classes on top of a variant.
    `button.tsx` and `alert.tsx` each have two: `correct` and `incorrect`, the colours of an
    answer after you answer. Keep them when the CLI updates the files. `slider.tsx` gives its
    `aria-label` to the thumb, the element a screen reader reads as the slider; keep that too.
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
  - Icons come from `src/components/icons.tsx`, each named by its meaning (`ResetIcon`,
    `NextMechanicIcon`), never straight from `lucide-react`; lint stops a direct import. Only the
    shadcn/ui files in `ui/` import lucide themselves, as the CLI writes them. A new icon goes in
    `icons.tsx` and follows the rules at its top.
  - Each component and page has a test in `test/components/` or `test/pages/`. Find elements by role and
    text, the way a player would.
  - Biome checks every file in `src/`, `test/`, `e2e/` and `scripts/` by itself (globs in
    `files.includes` in `biome.json`), so a new file needs no entry. Only `src/data/` stays
    out, except `fightInfo.ts` and `reference.ts`.
- Leave the values in `src/data/` and `src/geometry.ts` as they are. They are checked against
  cactbot and BossMod. Names may change, with the owner's OK.
- A fight time or an attack size is never typed by hand: read it from `source.gen.ts` with
  `cactbot("Crown of Arcadia", 2)` or `bossmod("CometSpread").range` (in `src/data/sources.ts`).
  `test/sources.test.ts` fails on a time that matches no cactbot line or cast start, and on a
  time in the text that is not a cactbot line rounded to the second. Its list `SCENE_STARTS`
  holds the values that are still questions for the owner.
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
- **Correct** and **incorrect**: an answer that was or was not the one to give. Not "right" or
  "wrong": "right" is only a direction, so write "directly behind", not "right behind".
- **Step**: one question of a drill. Its **status** (`StepStatus`) is ask, correct or incorrect.
- **Phase**: a phase of the fight (Phase 1 to 4), and nothing else.
- **Look ahead**: a step where you spot something early and act on it later (`Step.lookAhead`).
  The screen says "Look Ahead", at the start of the line, every time.
- **Look**: the colour of a zone's area or a label (`ZoneLook`, `LabelLook`).
- **Zone**: a spot on the arena. `ZoneArea` draws its area, `ZoneLabel` its label.
- **Overlay**: a piece drawn on the arena (an attack, a weapon, a tag, a player mark); `Shape`
  draws one.
- **Mark**: a player's mark on the arena, or the boss (`BossMark`).
- **Kind**: what you do in a Practice mechanic: spread, a stack (party, pair, light party or role
  stack), line stack, bait, puddle drop sequence, proteans (clock spots), dodge sequence, tower,
  knockback tower, tank tower, wild charge, look ahead, knockback, chains, pair
  tether, tank buster or shared tank buster (`DrillKind`, `Drill.kind`). A mechanic that can end in more than one way
  has several kinds (the weapons: party stack, proteans, light party stack); `kindsOf` gives them.
  `MechanicIcon` draws its icon; the rules for
  the icons are at the top of `src/components/icons.tsx`. Not a category.
- **Category**: an ability category of the timeline (raid damage, tank damage...).
  `CategoryIcons` draws its icon, in its colour (rule 14 in `icons.tsx`).
- **Picture**: an arena picture with its data (`Picture`, `LEARN_PICTURES`, `LearnPicture`).
- **Round**: the answers so far on one tab, for one slot. The **quick round** is Pressure's 12
  timed cards (`QuickRound`).
- **Fight**: the full fight on the clock (`Fight`, `FightScreen`), in two modes (`FightMode`):
  **the run** (`"run"`), where you click your spots and get a score ("run" means only this), and **Watch the correct moves**
  (`"watch"`), the player. A **frame** is one step of the fight clock (`tickFight`,
  `useFightFrame`).
- **Jump set**: the weapons the boss jumps to in order, in Assault Evolved and Ultimate Trophy
  Weapons (`JumpSet`, `buildJumpSet`).
- **Pick**: one random part of the full fight, such as the first weapon order. `Picks` are the
  parts a fight has; `Choices` are your settings, a pick or Random each (`CHOICE_ROWS`). The
  player's address calls them picks.
- **Casts coming up**: Pressure's line of casts that moves with the fight clock (`CastList`).
  Practice's **list of mechanics** (`MechanicList`) looks like it but stands still: it is for
  picking a mechanic. They share the square (`CastSquare`) and the drag (`useLineDrag`).
- **Prompt bar**: the bar with the question and its buttons (`PromptBar`), the same on Learn,
  Timeline, the quick round and Practice. After the answer it turns green or red and says how
  it went. On a narrow screen a `StickyBar` keeps it at the top of the screen.
- **Review**: after a try (and always in Watch the correct moves), the step chips (`StepChips`
  with `onPick`) go to a step. During a test they only show progress. **Try from here** answers
  the step shown and the ones after it again.

## Rules for the content

- Positions follow the owner's static, which uses the wtfdig guide:
  https://wtfdig.info/74/m11s#hector:nobuddies:fixed (Hector/Toxic, Kindred No Buddies split,
  Fixed (3CJ) Ecliptic).
- Every fight time and attack size must come from a source that anyone can check: fight times
  from the cactbot timeline (`r11s.txt`), attack sizes and shapes from the BossMod module
  (`RM11STheTyrant`). `npm run import:sources` brings both in at pinned commits, and
  `src/data/sources.ts` reads them. Never guess, round or invent one, and never take one from a
  video, a guide's picture or memory. When a source is missing or unclear, ask the owner.
- To move a pin (a new cactbot or BossMod commit), change the commit in
  `scripts/import-sources.mjs`, run `npm run import:sources` and `npm test`, and commit the new
  `source.gen.ts` on its own. A changed time or size goes to the owner before it ships.
- To add a fight: add its pins and paths to `scripts/import-sources.mjs` (one fight today, so
  the script has one set), run the import, and read every time and size through the lookups.
- A number the app chooses for itself is not a fight time. Examples: how long the clock runs past
  the enrage (`AFTER_ENRAGE`), and the made-up attacks in incorrect answers (`FAKE` in
  `src/data/pictures.ts`). Give it a name and a comment that says it is the app's choice.
- Never change a strat, a position or a rule without the owner. When a source and the owner
  disagree, ask.
- Words: "pattern", not "layout". "Look Ahead" is a mechanic that the boss shows early and
  resolves later (`Step.lookAhead`). Any line that tells the player to spot something early starts
  with "Look Ahead:". It replaced "Saved for later". "The run" is the scored full fight. "Watch the
  correct moves" is the replay.
- Never quiz an exact raidwide time. Ask which one comes next and whether it is soon.
- Player words: `docs/vocabulary.md` is the reference for every word the site shows. Check new
  or converted text against it, and add a rule there when a new idea comes in. In short: one
  idea has one phrase; mechanic names are in Title Case; "under the boss" and "max melee" are the
  only hitbox words; "the party", "light party 1" and "light party 2"; towers are soaked.
- Mechanic text (a setup, a rule, a step's answer, a card's explanation, the timeline's "what you
  do") is a list of short lines (`Lines`), one step or fact each, 16 words at most. Never write it
  as a paragraph. A step's first answer line is the move itself: the prompt bar and the HUD show
  only that line, and the Correct or Not there card shows them all.

## Planned work

The plans are GitHub issues. Run `gh issue list --repo mander77/ffxiv-raid-drills`.

- The React rebuild (issues #18 to #22, label "rebuild") is done and live. `docs/decisions.md`
  has the decisions behind it.
- Issue #29: use shadcn/ui Collapsible, Sonner, Progress and Item for parts the site built itself.
- Issue #15: the white frame around the Home picture.
- The issues were written before some later changes. Before you start one, make sure that it
  still matches the code.

## Where to find more

- `docs/vocabulary.md`: the words the site shows, with a conversion table for outside sources.
- `docs/decisions.md`: decisions, ideas the owner rejected (do not propose them again), fight
  facts and corrections, planned work, and hosting details.
- `docs/new-player-review.md`: the role-play prompt for a usability test.
- `docs/ux-review.md`: the prompt for a UX review of the live site.
- `docs/code-review.md`: the prompt for a TypeScript code review.
- `docs/typescript-for-csharp.md`: TypeScript features mapped to C#.
- `README.md`: set-up for a person.
- `.claude/skills/shadcn/`: the official shadcn/ui skill for Claude Code (from
  https://ui.shadcn.com/docs/skills). It loads by itself when you work on shadcn/ui parts and
  reads the project's set-up with `npx shadcn@latest info`. `skills-lock.json` pins its version.
  To update it: `npx skills update shadcn -p -y`. Keep its files as the tool writes them.
