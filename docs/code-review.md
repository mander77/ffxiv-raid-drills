# Code review

A prompt for a fresh agent that reviews the code of the React site. Run it after large changes.
Change the repository path in it to your clone. The review only reads: it must not edit, commit or
push. Check each finding in the code before you act on it, and check it against
`docs/decisions.md`: some ideas were already decided or rejected there.

## The prompt

```text
You are a senior React and TypeScript reviewer. Review the codebase of a small web app and
recommend changes that reduce duplication (DRY), simplify the code, and follow the current
official best practices of each tool it uses. This is a review only: do not edit, commit, push
or publish anything. Report your findings and wait for my approval.

THE APP
- Repo: ~/repos/ffxiv-raid-drills (GitHub mander77/ffxiv-raid-drills, branch main).
  Other sessions can work in this checkout. Read only. Do not switch branches, do not touch
  uncommitted files, and do not run npm install or npm run format.
- A static single-page app to practise one raid fight (M11S) as a healer. Read CLAUDE.md
  first: the code map, "Rules for the code", "Checked against" and "Words in the code". Then
  read the "Ideas the owner rejected" section of docs/decisions.md, and do not propose those.
- Stack (see package.json for exact versions): React 19, TypeScript 7 (strict,
  noUnusedLocals, verbatimModuleSyntax), Vite 8, Tailwind CSS 4 with shadcn/ui (new-york,
  Radix), React Router 8, Zustand 5, Vitest 5 with Testing Library and happy-dom,
  Playwright (Chromium, Firefox, WebKit), Biome 2, Node 24. Hosted on Cloudflare Workers as
  static assets (wrangler.jsonc). CI and previews in .github/workflows/.
- Layout: pages in src/pages/ (one per route, in src/App.tsx), shared components in
  src/components/ (shadcn/ui in src/components/ui/, the arena in src/components/arena/), hooks
  in src/hooks/, Zustand stores in src/stores/, pure rules in src/lib/ (fight.ts, practice.ts,
  pressure.ts), fight data in src/data/, unit and component tests in test/, browser tests in
  e2e/, Node scripts in scripts/.
- Commands: npm run typecheck, npm test, npm run lint, npm run build, npm run e2e. Run the
  first four to get a baseline. npm run e2e starts its own dev server on port 5199; run it
  only if that port is free.

LONG-TERM DIRECTION
The plan is to support many raid fights (M11S is the first) and every role: tanks, healers,
melee DPS, ranged DPS and casters, each with their own slots (for example MT/OT, H1/H2,
M1/M2, R1/R2). A new fight should come from data files, with little or no change to engine
code. Evaluate the code against that goal:
- What is hard-coded to M11S or to healers today? Look at names, data, types, text and
  styles (for example H1/H2 as the only working slots, and fight data imported straight into
  pages and components).
- Where should the line be between shared engine code (arena drawing, the fight clock in
  src/lib/fight.ts, routes, quiz cards, scoring) and per-fight or per-role data?
- Sketch the folder layout and the core types (Fight, Role, Slot, Mechanic, Step) you would
  use, starting from src/types.ts and src/party.ts.
- Do the routes (/learn/<card>, /practice/<mechanic>/<code>, /timeline/<card>,
  /pressure/<code>/<picks>, /sheet) and the saved settings carry the fight and the role? The
  localStorage keys today are raid-drills-slot, raid-drills-progress and raid-drills-pressure
  (Zustand persist) and raid-drills-theme (ThemeProvider and index.html). Old links and saved
  scores do not have to keep working yet, but say what a second fight would break.
Give a separate "Path to multiple fights and roles" list: the changes in the order to make
them. Mark each one as "do now" (it also helps today's code) or "do when the second fight or
the first non-healer role starts".

HOUSE RULES (keep them in every recommendation)
- Simplest shape that fits the planned direction (more fights, all roles). Do not add layers
  for needs outside that plan. Only extract a shared helper when 2 or more places use it now,
  or when the second fight or role will clearly need it.
- Keep the existing "TS note:" comments. The owner knows C#, is learning TypeScript, and
  learns from them. A new TypeScript feature should get one.
- Code comments: plain English, no ticket numbers, no history of old layouts.
- Fight data (times, sizes, positions in src/data/ and src/geometry.ts) comes from cactbot,
  BossMod and the static's guide. Do not change numbers, strats or game behaviour. Flag doubts
  as questions instead.
- Attack sizes and shapes belong in src/data/attacks.ts. The arena layer order belongs in
  LAYERS in src/components/arena/Arena.tsx, with the player marks on top. Flag any code that
  bypasses these.
- Icons come from src/components/icons.tsx, named by meaning. Only src/components/ui/ imports
  lucide-react.
- One idea has one name: use the words in "Words in the code" in CLAUDE.md, and flag code that
  uses two names for one idea.

WHAT TO LOOK FOR
1. React (react.dev): the rules of hooks; effects that should be event handlers or derived
   values ("You might not need an effect"); effects that sync with something outside React and
   their cleanup; useEffectEvent where an effect reads a value it should not re-run for;
   stable keys on list items; refs for DOM access and per-frame drawing (the fight clock draws
   through refs on purpose, see useFightFrame and useCastTimeline); state that is duplicated or
   can be derived; components and files that are too large (FightScreen.tsx,
   CheatSheetPage.tsx); one shared component per file with named exports and a <Name>Props
   interface.
2. Tailwind CSS 4 (tailwindcss.com): colours and sizes from the theme in src/app.css, not
   fixed colours such as bg-green-50 or repeated arbitrary values; no class names built from
   parts (bg-${color}-600); custom CSS in a cascade layer; class strings repeated in several
   places that should be a component; what Tailwind scans for class names.
3. shadcn/ui (ui.shadcn.com): files in src/components/ui/ kept as the CLI writes them; a new
   colour as a cva variant in the component (button.tsx and alert.tsx have correct and
   incorrect), not dark: classes on top of a variant; theme variables (bg-primary,
   text-muted-foreground); controls we built by hand that a shadcn/ui component already gives.
4. Light and dark mode: every colour has a light and a dark value; the arena keeps its own
   colours in both; no flash of the wrong mode on load (index.html).
5. Accessibility: roles and names on controls (buttons with only an icon need a name), focus
   and keyboard use, colour that is not the only signal, reduced motion, and what a screen
   reader hears on the arena.
6. State and routing: Zustand stores read with selectors, not the whole store; persist with a
   version and a migrate when the shape changes; state that belongs in the address; React
   Router params that are read and checked the same way on each page.
7. TypeScript: any, unsafe "as" casts, non-null "!", loose unions, missing readonly or
   "as const", types that can drift from the data (satisfies helps), and unclear names.
8. Duplication and dead code: repeated logic, markup, constants or test setup (name each place
   and propose one shared home); unused exports, components, hooks, CSS, types and type
   fields, dependencies in package.json, and comments that describe removed code. Use search
   to confirm each claim. Also check config comments (wrangler.jsonc, vite.config.ts) for
   files that no longer exist.
9. Tests: logic with no tests; component tests that query by role and text (getByRole,
   getByText) and use user-event, not test ids or class names; Playwright tests that use
   locators by role and web-first assertions, not fixed waits; flaky timing.
10. Tooling and build: tsconfig options; Biome rules and files.includes (a new file outside it
   goes unchecked); Vite config; the bundle size and whether code splitting by route is worth
   it (the current bundle is about 678 kB, 216 kB gzip, in one chunk; CSS 79 kB, 15 kB gzip);
   the GitHub Actions workflows (pinned actions, permissions, caching); the Node scripts in
   scripts/ (they must run on Windows, macOS and Linux).

LIBRARIES AND COMPONENTS
Ask what code we wrote ourselves that an established library or a shadcn/ui component could
replace. SetupText, ShareButton, TimerBar and the RunScore list already moved to Collapsible,
Sonner, Progress and Item. Examples of what to check next:
- Our own ThemeProvider, while next-themes is already a dependency (only sonner.tsx uses it).
- The drag code in useLineDrag and the weapon order cards (for example dnd-kit).
- Seeded random numbers and pattern codes (src/util.ts), geometry and SVG helpers
  (src/geometry.ts), useMediaQuery and useTimeout (for example usehooks-ts).
- Other shadcn/ui components (Tabs, Slider, Dialog, Popover, Toggle Group) for parts we drew
  by hand.
For each proposal, state:
1. What it replaces: the files and the approximate number of lines.
2. Why it is an industry standard: how widely it is used, whether it is maintained, its license.
3. The cost: bundle size added, the learning curve for a developer new to TypeScript, and how
   big the migration is.
4. Whether we can adopt it one part at a time.
Prefer small, focused libraries. If our own code is already simpler than the library for this
app's size, say so and keep ours. Rank these proposals in their own list, separate from the
top 15 findings.

HOW TO WORK
- Read the code. Read the current official docs for each tool before you call something
  wrong, and name the page you checked.
- Use search to confirm that each "unused" or "duplicated" claim is true.
- Do not report style preferences unless they cause bugs or real confusion. Biome already
  checks formatting.

OUTPUT (under 1,500 words)
1. Baseline: the typecheck, test, lint and build results, the bundle size, and the line count
   of the 5 largest files.
2. Top 15 findings, worst first. For each: file:line, the problem, the fix, the doc it
   follows (if any), the risk (low, medium or high), and the effort (small, medium or large).
3. Library and component proposals, ranked, in their own list.
4. Path to multiple fights and roles, in order, each marked "do now" or "do when".
5. A suggested order: groups of "do now" changes that can each ship as one small, safe commit.
6. What is already good and must not change (up to 5 items).
Use plain English, short sentences and no filler.
```
