# Decisions, rejected ideas and fight facts

This file holds what the owner decided while the site was built. A new person or a new Claude
session reads it first, so nobody asks again or undoes a decision. Dates are in 2026. When the owner changes a decision, update
this file in the same commit.

## Direction

- November 20: the aim is narrow. Learn the fight mechanics, learn the role positions, and answer
  the same questions under time pressure. A screen must work with very little reading.
- The tabs are Home, Learn, Practice, Timeline, Pressure and Cheat sheet. The tabs "My job" and
  "Someone died" were deleted. Git history keeps their code.
- The site has one fight and one role today. The long-term plan is many raid fights and every
  role (tanks, healers, melee, ranged and casters), each with its own slots (MT/OT, H1/H2, M1/M2,
  R1/R2). A new fight comes from data files, with little or no change to the engine code.
- The site does not replace wtfdig. The owner likes the site's own diagrams, so the plan has a
  reference view of every mechanic in fight order, for a second screen (issue #2).

## Planned work

The plans are GitHub issues in `mander77/ffxiv-raid-drills`. Read them with `gh issue list` and
`gh issue view <number>`. The issues were written on November 20, before some later changes, so
make sure that each one still matches the code before you start it.

- Issue #2, the reference view: every mechanic in fight order, grouped by phase. Each one gets
  the site's diagram for your role, a summary of one to three lines, and a link to wtfdig. Two
  questions are still open for the owner: does it live on the Cheat sheet or in a new tab, and is
  it one scrolling page or one mechanic at a time?
- Issues #18 to #22, label "rebuild": rebuild the site in React, one step per issue and per
  branch, in order. Each step brings its tabs back.
  - Why: the owner set new long-term goals. The site must be easy to maintain, simple, fast and
    the same in every browser, and it should use trusted standard libraries over home-made code.
    The owner was fine with a full rebuild, so React won as the most widely known choice.
    Tailwind and shadcn/ui replace the hand-written CSS and controls, and Playwright tests in
    Chromium, Firefox and WebKit check every browser.
  - November 21: the owner switched from the Preact plan to this rebuild. Pull request #17
    (Preact phase 2) was closed without a merge, and issues #5 to #10 were closed as not
    planned. Phases 0 and 1 of the Preact plan were published. Svelte, Blazor WebAssembly and Elm
    were rejected earlier, and that still stands: Blazor on download size and start time on
    phones, Svelte because its reactivity already changed once (runes).
  - November 21, later: the rebuild starts from scratch on its own branch, `rebuild`. The owner
    dropped the old tabs there and chose the default Tailwind and shadcn/ui look over the old
    site's look. Each step is a branch from `rebuild` and a pull request into it. The live site
    stays on `main`, with the old version and all its tabs, until every tab is back. Then
    `rebuild` merges into `main` in one go. The old code stays in git history on `main`.
  - The stack: React 19, TypeScript and Vite; Tailwind CSS v4 and shadcn/ui (Radix) with its
    standard theme; React Router for the routes; Zustand with `persist` for state kept in the
    browser; Vitest and Testing Library for unit tests; Playwright on Chromium, Firefox and
    WebKit for browser tests; Biome to lint and format; lucide-react for icons. Hosting stays on
    Cloudflare.
  - Keep `src/data/` and `src/geometry.ts` as they are. They are checked against cactbot and
    BossMod.
  - The arena stays SVG, drawn by React components, not a canvas or a game library. The full
    fight's per-frame parts run in a requestAnimationFrame loop that updates elements through refs.
  - Rebuild 1 (#18): the header and the Cheat sheet, in the default look. Any other address opens
    the Cheat sheet until its tab is back. The Cheat sheet lost its "Learn →" links and "Your
    progress" box for now: Learn and the scores come back in later steps.
  - The slot is in a Zustand store (`src/stores/slot.ts`), saved under "raid-drills-slot".
  - The React code follows the usual React layout, so a React developer finds things at once:
    `pages/` (one per route), `components/` (shared parts), `components/ui/` (shadcn/ui, as its
    CLI writes them), `hooks/`, `stores/` and `lib/`. Click logic lives in handlers, not in
    effects (React's "You might not need an effect").
  - Biome checks the new code (`files.includes` in `biome.json`), not `src/data/` and the other
    files kept from the old site.
  - The bundle is 129 kB (gzip), from 61.5 kB for the old site with every tab. React DOM is about
    65 kB of that, and Radix and floating-ui, behind the tooltip and the toggles, about 35 kB.
  - Keep the `TS note:` comments, and add notes for the React features too.
  - Rebuild 2 (#19): the arena pictures are React components in `src/components/arena/`. Before
    the old `arena.ts` was removed, a test drew every Learn picture (before, after and with each
    answer previewed) and the pieces of 25 random patterns of every Practice drill with both, and
    they were the same. Snapshot tests of every Learn picture keep them the same from now on. The
    arena's own styles (`arena.css`) sit under the `.arena` class, so its short class names, such
    as `ring` and `tag`, never touch the rest of the page. The shared pieces (rule box, last
    answer, step chips, setup text, tally, chip row, HUD prompt) use shadcn/ui's Alert and Badge.
  - Rebuild 3 (#20): Home, Learn and Timeline are back. A card is in the address
    (`/learn/k-sword`), and `/learn` alone opens the card you were on, or the first one. Your
    scores are in a Zustand store (`src/stores/progress.ts`) under "raid-drills-progress"; each
    tab's round count (right of done) is kept until you reload, and an answer for another slot
    starts a new round. Home's "Start here" cards link only to tabs that exist. On a phone the
    Lock in bar is fixed to the bottom of the screen once you pick an answer: a sticky bar would
    stay inside the answers' column, under the picture, off screen.
  - Rebuild 4 (#21): Practice is back. The address always names the pattern
    (`/practice/<mechanic>/<code>`): a mechanic with no code, or a broken one, gets a new code, and
    Next mechanic and New pattern make a new one. The rules (build a pattern from its code, answer
    a step, the phase after it, where the boss stands) are plain functions in
    `src/lib/practice.ts`, with tests. The pictures and the boss's turns match the live site for
    the same code. A try with Show me does not count in your score, as before. Choosing a spot on
    the arena takes a pointer; the buttons around it all work from the keyboard.
  - November 21: a naming clean-up, so one idea has one name (CLAUDE.md, "Words in the code").
    The addresses and round names are the tabs' names (`/learn`, `/practice`, `/timeline`); a
    Practice mechanic is a drill (`Drill`, `DRILLS`, `DrillRun`); Learn and Timeline cards are
    `LEARN_CARDS` and `TIMELINE_CARDS`; "phase" means only a fight phase, so a step's state is its
    status; `look` is a colour, so a look-ahead step is `Step.lookAhead`; the ability categories
    are spelled out (`Category`, `CategoryDots`); `f1` (which rounds to 2 decimals) is `round2`.
    Only names changed, never a value, in `src/data/` too, with the owner's OK.
  - Rebuild 5 (#22): Pressure is back: the quick round, the run and Watch the right moves, with
    shared player links (`/pressure/<code>[/<picks>][?t=<s>]`). The fight clock's rules (the skip
    to 3 seconds before a mechanic, when a step can be answered, the result hold, the 3-2-1, the
    look-ahead answer) moved from the old screen code into plain functions in `src/lib/fight.ts`,
    with tests; the numbers are the same. The clock runs outside React, in a ref; one frame loop
    moves it, and the parts that change every frame (cast bar, timeline, your marker, the ring)
    update through refs (`useFightFrame`), so React draws the arena only when what it shows
    changes. New picks or another slot build the same fight again at the same moment. The quick
    round keeps its own counts and adds each answer to your scores, as before. `PracticeArena` is
    `LiveArena`, since the fight uses it too. The unused `LS`, `esc` and `el` helpers are gone.
    "Run" now means only the scored full fight, with the owner's OK: Practice's `DrillRun` is
    `DrillScreen` (one go at a drill is a try), the quick round ends with Go again like the other
    rounds, and a weapon run in `src/data/drills.ts` is a jump set (`JumpSet`, `buildJumpSet`).
    Names only, never a value.
  - Rebuild 5, after review: the player's Settings opens in a shadcn/ui Sheet, from the right on a
    wide screen (the arena stays in view) and from the bottom on a phone. The owner chose Sheet
    over Drawer: Drawer's drag to close would fight the drag of the weapon cards, and it needs a
    second component on a wide screen. The fight's keys leave Settings alone, and the player does
    not pause while it is open: a pick builds the fight again at the same moment.
  - Rebuild 5, after review: the whole arena must be on the screen during the fight, with no
    scroll. The arena is as large as the room from its top to the bottom of the screen
    (`useFitToScreen`). On a wide screen the play bar sits beside it, above the panel; it is no
    longer sticky, since it covered the map. The prompt is always two lines tall, so a longer one
    does not push the arena down.
  - November 21: the rebuild went live. `rebuild` merged into `main` with a fast-forward, and
    the `rebuild` branch is no longer used: new work branches from `main`. The old site's
    addresses open Home, and its saved scores and settings (`m11s.` keys) do not carry over.
  - November 21: the owner asked that every change be checked against the official best
    practices of its framework or language (React, Tailwind CSS, shadcn/ui, TypeScript and the
    test tools), so a developer who knows them finds their way at once. CLAUDE.md lists what
    each check looks at. The first check moved the page width into a `PageContainer` component
    (Tailwind advises a component over a string of classes), put the arena styles in the
    "components" cascade layer, and turned a function that returned JSX into a component.
- Issue #11: make the repository self-contained. A new person should get Node 24, the GitHub CLI
  and the other tools in one step after the clone.
- Party slots (#13, done). A slot has two parts, the light party (1 or 2) and the role (Tank,
  Healer, Melee, Ranged). Casters count as Ranged. The header shows both parts. The light party control is labelled "Group", with 1 and 2, as on wtfdig. The owner chose
  to show every role now: a role with no drills yet is greyed out, and pointing at it, focusing
  it or tapping it shows "not yet available". Saved settings and links keep the short names
  (H1, H2). `ROLES` in `src/party.ts` marks which roles are ready.

## What the reviews say must not change

- The Home "Start here" cards, in learning order.
- The Learn picture with the answer drawn on it. A player who skips the text still gets the
  answer from the picture.
- Practice's Show me with the blue "Go here" area. It teaches before it tests.
- "Watch the right moves". The new-player tests liked it best.

## Ideas the owner rejected or declined

Do not propose these again unless the owner brings them up.

- A one-line explainer of H1 and H2 next to the role switch, and moving the strat names out of the
  header. Declined twice after usability tests.
- A big red facing arrow on the boss. It looks too different from the game. Keep the small arrow on
  his ring, and let the HUD point at it.
- A page wider than 1160 px on big screens. The Practice map grows with the window height instead.
- A long "Go to question" drop-down on Learn and Timeline. Back, Next and chips replaced it.
- For weapon order picks: a drop-down, number buttons and a separate "This order" button. The
  control is Random or Set order, with cards you drag.
- Tilt bars to show which weapon goes first in the second set.
- White "clear slices" between protean cones. The floor got lighter instead (`--sand` #F8F2E6).
- A flat layer for attacks. Each attack has its own fill, and overlaps get darker.
- A slot name (H1, H2) on the green answer area. The tag says "Right spot", because the moving
  marker already shows your slot.
- An order control for weak spots. The static always uses fight order.
- Sound cues. Offered, not built.
- Old links. The site was new, so old link formats do not have to keep working.
- Go as the language. The site is TypeScript with Vite.

## Screens

### Learn

- Pick an answer (click or a number key) to preview it in blue on the picture, then Lock in (or
  Enter). The preview also draws the attack that the answer assumes, because the quiz tests what
  the boss does, not only where you stand.
- After an answer, the right answer holds its explanation, and a wrong pick gets a "Your pick" tag.
- Cards whose answer is your own spot show your role marker on the answer picture.
- Back, Next and one chip per mechanic (`LEARN_GROUPS` in `src/data/questions.ts`). A test makes sure
  that each card is in exactly one chip.
- On a phone, Lock in answer and Next stay in a bar at the bottom of the screen.

### Timeline

- The picture is a cactbot-style list. The coming names show "? ? ?" until you answer, with the
  line "Coming up: the names show after you answer." A strip shows P1 to P4 and where you are.
- When the next raidwide is the same one again (Crown of Arcadia comes five times), the answer says
  "Crown of Arcadia again".

### Practice

- The map is the main thing on the screen. It grows until the whole arena fits in the window
  height, but it is never smaller than 420 px.
- On a phone the long list of mechanics becomes a bar with Back, Next and chips "Phase 1" to
  "Phase 4".
- Show me draws the right spot in blue with the tag "Go here", shows the answer text in the bar and
  the rule in the panel. A try with Show me does not count in the score.
- Again and Next mechanic are in the bar above the map after a mechanic.

### Pressure: the quick round

- 12 timed questions from Learn and Timeline. One click per answer, no preview.
- On a phone the answers come before the picture, so all of them are on screen at the start of
  the timer.

### Pressure: the run (scored)

- A 3-2-1 with the mechanic's name comes before each mechanic. It runs on the fight clock, so Pause
  stops it.
- The quiet time between mechanics is skipped: the run goes to 3 seconds before the next one.
- After your last click on a mechanic, its last hit lands at once and the result shows for 2
  seconds.
- After each answer, the result and the green area show for 1.2 seconds. Then the green area
  clears, so it is not taken for the answer to the next step.
- A weapon question waits for the tell, the boss's turn, plus 1 second. Until then the HUD says
  "Watch the boss: the arrow on his ring turns to the first weapon." A click before then does not
  answer.
- The end screen shows the score and links to Practice each missed mechanic. Quit shows the score
  so far.
- The option "Stop at each new mechanic, so I can look first" waits at each new mechanic until you
  press Go.

### Pressure: Watch the right moves (the player)

- A replay. A marker with your role runs the right spots. You do not click answers.
- The HUD gives the right move (the step's answer text), and nothing turns red.
- Click the map, or press Space, to pause or play. A "Paused" badge shows above the map.
- The play bar (play, slider, speeds, Settings) sticks to the bottom of the screen while the arena
  is in view. Settings holds only the fight pattern picks.
- The green answer area has no "Right spot" tag here.
- The first weapon of Void Stardust is answered 4 seconds early and shows as "Saved for later"
  until its due time, so you have time to see it.

### Home and Cheat sheet

- Home: "Start here" cards in learning order. The top picture is the answer picture of the Learn
  card `k-raw-first` (on a phone, a 110 px strip from the boss to the party stack). The owner's
  character picture is in About me with a wide crop of the face, the card and both arms.
- Cheat sheet: one line per mechanic, written for your role, with a link to its Learn card.

### Everywhere

- Player marks are always the top layer (see `LAYERS` in `src/components/arena/Arena.tsx`).
- The boss turns smoothly to face his next target. He does not flip.
- "Saved for later" (purple) marks a mechanic shown early and resolved later, for example the
  first weapon during Void Stardust. It is never a spot to stand on.
- On a phone the six tabs show as two rows of three, and keyboard hints do not show on touch
  screens.
- Start over and New fight are buttons, not text links.

## Fight facts and strat corrections

These come from the owner, the owner's static and the sources below. When a guide disagrees, the
static wins.

### Raw Steel Trophy (he holds the weapon)

- Scythe: three cleaves. One cone on each tank, and one cone behind him that the rest of the party
  shares. Tanks spread, and the party stacks south behind him.
- Axe: the reverse. A shared tank buster, and six spread hits. Tanks stack, and the party spreads.
- The held weapon is drawn east of the boss.

### Assault Evolved (he jumps to the weapons)

- First set (0:48): the three weapons spawn at once. The tell is his facing. At the start of the
  6-second cast, he turns to the first weapon. Then he goes clockwise.
- Second set (1:33, during the first Void Stardust): the first weapon is the one with its flat side
  square to him. Then clockwise. Each weapon of this set faces where he jumps from.
- Sword: stand in the pocket behind him, on the side he jumped from. H1 takes his left, H2 his
  right, and the light party stacks on the healer. Stand a few steps in from the inner corner,
  about 2 yalms clear of each arm. The whole pocket inside the arena counts as right.
- Scythe: proteans, so everyone takes a clock spot close around him. He always lands on the flat
  side, so you can pre-position on the weapon. H1 takes the butt (handle end), H2 the point (blade
  end).
- Axe: the whole party stacks in the middle, out of the axe hit.

### Void Stardust

- Puddles: start north of the boss. Drop each one just outside the last, a small step clockwise.
- A puddle (Cometite in BossMod) has a 3.0-second cast and goes off once. The drops are 2 seconds
  apart, so at the stack or spread only the third puddle is still on the floor. The map fades each
  puddle 3 seconds after it drops.
- The stack after the puddles follows three rules, in this order:
  1. In max melee range of the boss, for uptime.
  2. Not on a puddle that is still on the floor.
  3. As close as you can get to your safe spot for the next weapon.
- Comet spread: healers and ranged take any open spot. Tanks and melee each take a fixed spot:
  MT NW, OT NE, M1 SW, M2 SE.
- If the first weapon of the second set is a sword or a scythe, stack or spread toward it. For a
  long run, use Sprint, a movement ability or a scholar's Expedient.
- The second Void Stardust: the boss stays on the third weapon. The group starts at his butt,
  right behind him, and goes clockwise around him.

### Later mechanics

- Dance of Domination: seven hits. The lines on the floor show just after the 7th hit.
- Ultimate Trophy Weapons: the first spawn is south. Slightly west means clockwise, slightly east
  means counterclockwise. The second is NW or NE, then the cardinals. He resolves them in spawn
  order. No source supports "the last one is always north", so the site does not ask it.
- Orbital Omen (Hector's dodge): stay against the boss hitbox, at his side, where the #2 lines
  cross. After #1, cross through him to the other side. After #2, cross back.
- Meteorain, your meteor: H1 drops it NW, inside the boss hitbox. H2 drops it SW, in line with the
  first SW rock, farther out. Icy Veins swaps H1 and H2 here. The site follows wtfdig.
- The tank tethers in Meteorain are tank busters at 5:09, 5:19 and 5:29.
- Crown of Arcadia, a raidwide, comes five times.

### The moving marker (data/route.ts)

- It runs to the middle of each spot, never to the edge, because an edge can clip the next player.
  The sword is the exception: it stands at its best spot near the inner corner.
- It leaves a spot 0.2 seconds after the hit, starts for a new mechanic 0.5 seconds after it shows,
  and runs at 15 arena units a second.
- After 8 quiet seconds it goes to the next mechanic's pre-position. The default is right up at the
  boss (50, 56). Both Void Stardusts pre-position at the first puddle.
- A weapon step shows only from the boss's turn (`showOf`). Before he turns, nobody can know the
  spot.

### Scale and sizes

- The arena is 40 by 40 yalms. One arena unit is 0.4 yalm. No guide states the size. It follows
  from the M11S waymark presets (A to D 10 yalms from the center).
- Sizes come from BossMod (`BossMod.Modules/Dawntrail/Savage/RM11STheTyrant`, read on GitHub). The
  boss hitbox is 5 yalms. The shared sizes and shapes live in `src/data/attacks.ts`.
- Times come from cactbot (`ui/raidboss/data/07-dt/raid/r11s.txt`). Branch labels in that file add
  offsets, so subtract them.

## Hosting

- Cloudflare Workers Builds, project `ffxiv-raid-drills`, on the owner's personal account. Build
  `npm run build`, deploy `npx wrangler deploy`, preview `npx wrangler preview`.
- `wrangler.jsonc` needs `"previews": {}`, or the preview build fails. It also sets
  `not_found_handling` to `single-page-application`, so deep links load.
- `vite.config.ts` uses base `/`. The base `./` breaks deep paths.
- Custom domains: `ffxiv-raid-drills.app` (live) and `<branch>.test.ffxiv-raid-drills.app`
  (previews).
- The Cloudflare check run on GitHub has no log text. Read the state with
  `gh api repos/mander77/ffxiv-raid-drills/commits/<sha>/check-runs`. The owner can paste logs from
  the dashboard.
- The repository merges by fast-forward push, not by pull requests. The publish script deletes
  merged branches on GitHub.

## Tips

- Vitest hides `console.log` in a passing test. To see a value in a probe test, throw it.
- An arena picture's view box is `-4 -6 108 110`. The row above the floor (y -6 to 0) holds only the
  "N", which is where the player's "Paused" badge sits.
