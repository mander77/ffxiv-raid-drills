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
  branch, in order. Each step replaces some old screens; the old screens keep working until then.
  - Why: the owner set new long-term goals. The site must be easy to maintain, simple, fast and
    the same in every browser, and it should use trusted standard libraries over home-made code.
    The owner was fine with a full rebuild, so React won as the most widely known choice.
    Tailwind and shadcn/ui replace the hand-written CSS and controls, and Playwright tests in
    Chromium, Firefox and WebKit check every browser.
  - November 21: the owner switched from the Preact plan to this rebuild. Pull request #17
    (Preact phase 2) was closed without a merge, and issues #5 to #10 were closed as not
    planned. Phases 0 and 1 of the Preact plan were published; Rebuild 1 replaced phase 1's
    Preact Cheat sheet with React. Svelte, Blazor WebAssembly and Elm were rejected earlier, and
    that still stands: Blazor on download size and start time on phones, Svelte because its
    reactivity already changed once (runes).
  - The stack: React 19, TypeScript and Vite; Tailwind CSS v4 and shadcn/ui (Radix) for styling
    and common controls; React Router for the routes; Zustand with `persist` for state kept in
    the browser; Vitest and Testing Library for unit tests; Playwright on Chromium, Firefox and
    WebKit for browser tests; Biome to lint and format. Hosting stays on Cloudflare.
  - Keep `src/data/` and `src/geometry.ts` as they are. They are checked against cactbot and
    BossMod.
  - The arena stays SVG, drawn by React components, not a canvas or a game library. The full
    fight's per-frame parts run in a requestAnimationFrame loop that updates elements through refs.
  - Rebuild 1 (#18): React draws the header and the Cheat sheet. Every other path shows an old
    screen: `LegacyScreen` calls `showLegacy` in `src/views/legacy.ts`, which draws into
    `<main id="view">` as before. The old screens change the card in the address bar with
    `history.replaceState` and keep React Router's history state, so Back still works.
  - Tailwind runs without its reset (preflight) while old screens remain, because they rely on the
    browser's default styles. `app.css` puts the old stylesheet in a "legacy" cascade layer under
    Tailwind's utilities, and a small reset for the React parts (`.rx`) takes the place of
    preflight. Rebuild 5 turns preflight on when `styles.css` goes.
  - The site's colours stay in `styles.css` (`:root`) while old screens use them. `app.css`
    maps them to Tailwind names (`bg-card`, `text-ink-2`, `border-heal`) and to the names
    shadcn/ui uses (`primary`, `accent`, `ring`).
  - Use exact pixel sizes, such as `text-[14px]`, where a screen must match the old one. Tailwind's
    named sizes (`text-sm`) also set a line height, and the old CSS let it inherit 1.5. A width
    rule from the old CSS, `max-width:640px`, is `max-[641px]:` in Tailwind, because Tailwind's
    `max-[640px]:` stops below 640.
  - The slot is in a Zustand store (`src/stores/slot.ts`), saved under "raid-drills-slot". The
    old screens read it through `state.slot`, which `legacy.ts` keeps in step. Scores and decks
    stay in the old code until the step that rebuilds their screens.
  - Biome checks only the rebuilt code (`files.includes` in `biome.json`). Each step adds its
    new files, so the old code is never reformatted on its way out.
  - The bundle grew from 61.5 kB to 174.6 kB (gzip). React DOM is 65 kB of that, the Radix and
    floating-ui code behind the tooltip and the toggles about 35 kB, React Router 13 kB and
    tailwind-merge 9 kB. The app's own code is about 60 kB, as before.
  - Keep the `TS note:` comments, and add notes for the React features too.
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
- Back, Next and one chip per mechanic (`MECH_GROUPS` in `src/data/questions.ts`). A test makes sure
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

- Player marks are always the top layer (see `LAYERS` in `src/arena.ts`).
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
