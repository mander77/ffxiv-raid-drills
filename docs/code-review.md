# TypeScript code review

The owner asked a fresh agent for a code review with the prompt below. The first review led to a
Preact plan, which the owner later replaced with a React rebuild (issues #18 to #22, see
`docs/decisions.md`). Run the prompt again after large
changes. Change the repository path in it to your clone. The review only reads: it must not edit,
commit or push.

## The prompt

```text
You are a senior TypeScript reviewer. Review the codebase of a small web app and recommend
changes that reduce duplication (DRY), simplify the code, and follow current best practices
for TypeScript, Vite and Vitest. This is a review only: do not edit, commit, push or publish
anything. Report your findings and wait for my approval.

THE APP
- Repo: ~/repos/ffxiv-raid-drills (GitHub mander77/ffxiv-raid-drills, branch main).
  Other sessions can work in this checkout. Read only. Do not switch branches or touch
  uncommitted files.
- A static single-page app: React 19, TypeScript (strict, noUnusedLocals), Vite, Tailwind CSS
  and shadcn/ui, React Router, Zustand, Vitest, Playwright, Biome, Node 24. Deployed on
  Cloudflare Workers.
- Layout: see the code map in CLAUDE.md. Pages in src/pages/, components in src/components/,
  hooks in src/hooks/, stores in src/stores/, fight data in src/data/, tests in test/ and e2e/.
- Commands: npm run typecheck, npm test, npm run lint, npm run build. Run them to get a baseline.

LONG-TERM DIRECTION
The plan is to support many raid fights (M11S is the first) and every role: tanks, healers,
melee DPS, ranged DPS and casters, each with their own slots (for example MT/OT, H1/H2,
M1/M2, R1/R2). Evaluate the code against that goal:
- What is hard-coded to M11S or to healers today? Look at names, data, types, text and CSS
  (for example H1/H2 as the only working slots, and fight data mixed
  into view code).
- Where should the line be between shared engine code (arena drawing, the fight clock,
  routes, quizzes, scoring) and per-fight data or per-role data?
- Can one fight be added by adding data files, with little or no change to engine code?
  Sketch the folder layout and the core types (Fight, Role, Slot, Mechanic, Step) you
  would use.
- Do the routes, saved settings (localStorage keys start with "m11s.") and share links
  carry the fight and the role, so old links keep working after more fights exist?
- Which proposed library or framework becomes more worth it at that size, and which does not?
Give a separate "Path to multiple fights and roles" list: the changes in the order to make
them. Mark each one as "do now" (it also helps today's code) or "do when the second fight
or the first non-healer role starts".

HOUSE RULES (keep them in every recommendation)
- Simplest shape that fits the planned direction (more fights, all roles). Do not add
  layers for needs outside that plan. Only extract a shared helper when 2 or more places
  use it now, or when the second fight or role will clearly need it.
- Keep the existing "TS note:" comments. The owner is learning TypeScript from them.
- Code comments: no ticket numbers, no history of old layouts.
- Fight data (times, sizes, positions) comes from cactbot, BossMod and the group's guide.
  Do not change numbers or game behaviour. Flag doubts as questions instead.
- Attack sizes and shapes belong in src/data/attacks.ts. The arena layer order belongs in
  arena.ts (LAYERS). Flag any code that bypasses these.

WHAT TO LOOK FOR
1. Duplication: repeated logic, markup strings, constants, CSS rules or test setup.
   Name each place and propose one shared home.
2. Dead code: unused exports, functions, CSS selectors, types and type fields, and
   comments that describe removed features.
3. TypeScript practice: any, unsafe "as" casts, non-null "!", loose unions, missing
   readonly, types that can drift from the data, and names that are unclear.
4. Structure: very long files or functions (src/views/fight.ts, src/data/drills.ts), mixed
   concerns, and module-level mutable state that is hard to follow.
5. DOM and safety: innerHTML with values that are not escaped, event listeners added again
   on each render, requestAnimationFrame or timers that never stop.
6. CSS: duplicate or conflicting rules, magic numbers that repeat, and selectors that are
   too broad (for example a "div" rule that also matches nested divs).
7. Tests: logic that has no tests, and tests that check implementation details instead of
   behaviour.
8. Tooling: tsconfig options, lint or format setup, and dependency versions.

LIBRARIES AND FRAMEWORKS
You may propose an established, widely used library, framework or tool when it can replace
code we wrote ourselves. Examples of what to check:
- UI rendering and state: the views build HTML strings by hand and set innerHTML. Would a
  small standard option (for example lit-html, Preact or Svelte) cut code and bugs?
- Routing (src/router.ts), seeded random numbers (src/util.ts), geometry and SVG helpers,
  drag and drop, and localStorage access.
- Linting and formatting (for example ESLint with typescript-eslint, and Prettier or Biome),
  and test helpers for DOM tests.
For each proposal, state:
1. What it replaces: the files and the approximate number of lines.
2. Why it is an industry standard: how widely it is used, whether it is maintained, its license.
3. The cost: bundle size added (the current bundle is about 158 kB, 54 kB gzip), the
   learning curve for a developer new to TypeScript, and how big the migration is.
4. Whether we can adopt it one part at a time or must change everything at once.
Prefer small, focused libraries over a full framework unless the gain is large. If our own
code is already simpler than the library for this app's size, say so and keep ours.
Rank these proposals in their own list, separate from the top 15 findings.

HOW TO WORK
- Read the code. Use search to confirm that each "unused" or "duplicated" claim is true.
- Do not report style preferences unless they cause bugs or real confusion.

OUTPUT (under 1,500 words)
1. Baseline: the typecheck, test and build results, and the line count of the 5 largest files.
2. Top 15 findings, worst first. For each: file:line, the problem, the fix, the risk
   (low, medium or high), and the effort (small, medium or large).
3. Library and framework proposals, ranked, in their own list.
4. Path to multiple fights and roles, in order, each marked "do now" or "do when".
5. A suggested order: groups of "do now" changes that can each ship as one small, safe commit.
6. What is already good and must not change (up to 5 items).
Use plain English, short sentences and no filler.
```
