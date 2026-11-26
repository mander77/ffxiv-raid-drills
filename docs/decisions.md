# Decisions, rejected ideas and fight facts

This file holds what the owner decided while the site was built. A new person or a new Claude
session reads it first, so nobody asks again or undoes a decision. Dates are in 2026. When the owner changes a decision, update
this file in the same commit.

## Direction

- November 20: the aim is narrow. Learn the fight mechanics, learn the role positions, and answer
  the same questions under time pressure. A screen must work with very little reading.
- The tabs are Home, Learn, Practice, Timeline, Pressure and Cheat Sheet. The tabs "My job" and
  "Someone died" were deleted. Git history keeps their code.
- The site has one fight and one role today, and can hold more fights (see "More than one
  fight"). The long-term plan is many raid fights and every
  role (tanks, healers, melee, ranged and casters), each with its own slots (MT/OT, H1/H2, M1/M2,
  R1/R2). A new fight comes from data files, with little or no change to the engine code.
- The site does not replace wtfdig. The owner likes the site's own diagrams, so the plan has a
  reference view of every mechanic in fight order, for a second screen (issue #2), at the top of
  the Cheat Sheet.

## More than one fight (issue #93)

November 24: the site can hold more than one fight. This is step 0 of issue #99 (a job that
drafts a new fight). M11S is still the only fight, so nothing changed for the player.

- Each fight has a folder, `src/data/fights/<id>/`. Its `index.ts` exports one `FightData`
  (`src/data/fights/types.ts`): its names and strats, sources, drills, cards, pictures, timeline,
  abilities, reference, arena sizes and full fight. `FIGHTS` in `src/data/fights/index.ts` lists
  the fights. The shared code reads a fight only through `FightData`, never from a fight's files,
  so a new fight needs no change to the shared code. A made-up test fight in
  `test/fixtures/testFight/` proves it: it opens every tab.
- The M11S files kept their names and shapes; `m11s/index.ts` only joins them up. The moves came
  in a commit of their own, so branches that change the M11S files rebase over them.
- Parts that every fight uses moved out of the M11S files: the category names
  (`src/data/categories.ts`), the fight types (`src/types.ts`), the boss's moves in a scene
  (`src/lib/scene.ts`), the source lookups (`src/data/sourceLookups.ts`), the Cheat Sheet lookups
  (`src/lib/reference.ts`) and the moving marker (`src/data/route.ts`, which stayed where it was).
  No data value changed: every pattern, picture, card and fight builds the same as before.
- Addresses (owner's choice): a fight's pages start with its id, `/<fight>/<tab>`, such as
  `/m11s/learn/k-sword`. The id comes first because it is the widest part. Rejected:
  `/<tab>/<fight>/...` (harder to tell from mechanic ids and codes) and `?fight=<id>` (easy to
  drop when a link is copied by hand).
- With one fight, an address needs no id (`/learn/k-sword`), and the header shows no picker.
  The routes, the chooser and the picker are already built and tested; they show once `FIGHTS`
  has a second fight (owner's choice: build now, hidden).
- With two or more fights, an address with no id asks the player to pick a fight, then opens
  the same page in it (owner's choice). This holds for old shared links too: the owner chose
  "every bare address asks" over "old deep links open M11S". The header's fight picker opens the
  same tab in the other fight.
- Saved data: progress (`raid-drills-progress`, version 2) and the Pressure picks
  (`raid-drills-pressure`, version 2) are kept for each fight. The seconds to decide, the stops,
  the speed and the slot stay shared. The owner said old links and saved data need not keep
  working while the app has no real users, so saved progress of version 1 is dropped. The
  pattern codes still build the same patterns: every `random()` call stays in its order.
- Not done yet: the full fight's engine still knows the Arena Split (`Fight.split`, and `ArenaSizes.split` with its
  platforms, portals and tether stretch distance) and the boss
  weapons (`ArenaSizes.scytheSafe`); a fight without them gives `[0, 0]` and leaves `split` out.

## Standard attacks (issue #110)

November 24: every fight draws its attacks with one set of functions, `src/lib/attacks.ts`.

- Two pull requests (owner's choice). The first adds the library, `fromBossmod`, the "size
  unknown" mark and the attacks on the styles page. M11S does not change. The second moves
  M11S's drills and pictures onto the library, and checks that each one builds the same as before.
- `proteans(from, angle, range, count = 8)` was added after the first ten (owner's request):
  the clock spots, eight cones evenly around one source. The source is not always the boss, so
  the styles page draws no boss (owner's correction). It lists proteans with the other attacks.
- All ten attacks of the issue are built now, also those M11S does not use (owner's choice):
  raidwide, circle, donut, cone, line, cross, half arena, knockback, puddle and tower. A new
  fight, such as M10S, then draws with no new code.
- Each function takes its size in yalms. `standardAttacks(arenaHalf)` gets the scale from the
  fight's arena (`BOSSMOD_ARENA_HALF`), so a fight with a bigger arena draws to scale. M11S and
  M10S both have a 40-yalm arena: 2.5 units a yalm.
- An ability with no known size (`shape: "unknown"`) draws a dashed grey ring with a "?"
  (owner's choice), never the orange of a real attack. Its size (`UNKNOWN_R`) is the app's
  choice. The import keeps such an ability, with its text; it does not stop.
- A cone keeps three points on its round edge up to 90 degrees, as M11S's `cleave` draws it. A
  wider cone gets one more point for each 45 degrees.
- A knockback has its own overlay (`{t:"knockback"}`): wide, hollow arrows out from its source,
  like the push in the knockback icons (icons.tsx, rule 5; owner's request). Thin white guides
  were too faint to see.
- A tower can show its soak count (`soak`): one dot per player, spaced evenly around its ring,
  turned 30 degrees from the top (`SOAK_TURN`), in the players' highlight colour (icons.tsx, rule 2: a dot is a player).
  Owner's choice, after trying the tower icon with a number (in the middle a waymark covered it;
  on the ring the number was too small, or the badge took too much room or did not match the
  app) and the dots in a pill. A puddle can
  carry its life in seconds (`life`).
- On the styles page, "Knockback Arrows" and "Tower to Soak" have these names because the
  mechanic kinds "Knockback" and "Tower" already have cards there. "Knocked Back" shows the
  knockback on one player: its arrow from the player to where they land.
- Rejected: an attack's picture beside each mechanic kind's icon on the styles page. A kind does
  not always map to one attack. Every attack is in the Standard Attacks section instead (owner's
  choice).
- The Cone sample is a wedge from near the middle of the arena out to its edge (60 degrees, 20
  yalms), so it reads as a cone and not as half the arena (owner's request).
- M11S on the library (the second pull request): `m11s/attacks.ts` makes `ATTACK =
  standardAttacks(BOSSMOD_ARENA_HALF)` and names M11S's attacks on it (`spreadHit`, `towerHit`,
  `lineStack`, `proteanCone`, `scytheProteans`, `fireAndFury`, `gust`...), each at its BossMod size
  in yalms. The old helpers in arena units (`aoe`, `donut`, `cleave`, `lineTo`) are gone. Sizes
  that answer zones and geometry also use stay in arena units (`SPREAD_R`, `TOWER_R`, `PUDDLE_R`,
  `SCYTHE_SAFE`, `SWORD_HALF`, `RAW_STACK_HALF`). The made-up attacks of the Learn pictures
  (`FAKE`) are now in yalms too.
- Checked as the move in #93 was: every Learn picture (both slots), every drill with 40 pattern
  codes (both slots, played through with correct clicks), 15 full fights per slot and both
  busters were written to JSON before and after, and compared. Only the far ends of lines and
  cones changed: cones and lines now end at BossMod's range (60 yalms), where some ended at a
  length the app had picked (80 or 150 units), and the sword's arms at its range (40 yalms) in
  place of 150 units. A check that cuts each changed line to the arena found all 2,572 the same
  inside it, and every cone keeps its edges. No size, zone, answer or step changed.
- The Arena Split towers (the split and Arcadion Avalanche) show their soak count, 2 dots, from
  the drills' own `soak` (owner's choice).
- Ecliptic Stampede towers (November 24, from BossMod's `ImpactKiss` component and Hector's
  "Fixed Stampede - M11S Mini-Guide", https://www.youtube.com/watch?v=p8cL88OKEWE, 0:24 to
  1:20): four towers, two tank towers (Cosmic Kiss, 1 soaker) and two two-player towers
  (Weighty Impact, 2 soakers). Which spots are which changes from pull to pull.
  - Tanks: MT the first tank tower clockwise from A, OT the first counterclockwise.
  - Two-player towers: M1 clockwise, M2 counterclockwise, each with one healer or ranged. The
    two players with puddles soak no tower; of the others, the first in H1 > H2 > R1 > R2 goes
    clockwise. The melee stands on the edge nearest the boss, the healer or ranged dead center.
  - A tank tower shows a tank's "T" mark on its ring in place of a dot (owner's choice,
    `tank` on the tower overlay); a two-player tower shows 2 dots.
  - The Learn card `k-ecl-prio` was wrong (it put H1, H2, R1 and R2 in four towers clockwise)
    and now follows the video (owner's OK): its example has tank towers NE and SE, two-player
    towers NW and SW, and R1 and R2 with puddles.
- Heartbreak Kick: BossMod lets up to 8 soak its tower, and cactbot says "Get Tower" to
  everyone. Statics do it either way: the tanks soak it with invulns, or the party soaks it
  (owner). The tower shows 8 dots, and `k-hb` and the timeline name both ways (owner's choice).
- Ecliptic Stampede in Practice and Pressure (November 24, owner's choices): the drill
  `m-ecl-start` ("Ecliptic Stampede: Puddles") now plays the marked path. You pick your start
  spot, drop six puddles (one click each), then wait close to the boss while the others soak
  the towers and take the tethers. The fireball segment that follows is unchanged.
  - The puddle path follows Hector's M11S guide video (https://youtu.be/w1uuwzhyf5A, 19:06 to
    20:15; the owner pointed to it). North wall: start in line with B, drop four puddles walking
    west along the wall, then step in and drop two more in the gaps, walking back east. The
    south wall is the mirror: start in line with D, walk east, then two back west.
  - The two inner puddles are not fixed spots (owner's choice): any spot just inside the wall
    puddles is correct when it is clear of the corners (25 units each side of the middle), clear
    of the middle of each tower, clear of every puddle you dropped, and at most 30 units from
    your wall (`innerPuddle`). The six puddles end up as a triangle against the wall.
  - The middle of a tower (`ECL_SOAK_R`, 4 units from its center, where the healer or ranged
    soaks a two-player tower) stays out of the fire, so a puddle's center stays 16.5 units from
    a tower's center (November 25, owner's choice). A puddle may still cover a tower's edge: a
    puddle (5 yalms, BossMod's `AtomicImpactPuddle`) and a tower (4 yalms) need 22.5 units
    between their centers, and with the four wall puddles there is room for only one inner
    puddle that far from the example towers.
  - The puddle spots (`WALL_SPOTS`: the wall puddles read from the video's frames, 15 units
    apart; the inner row 13 units in, at [43.5, 18] and [56.5, 18] on the north wall, mirrored on
    the south, where the moving marker goes), the wait spots (`ECL_WAIT`) and the tower spots
    (`ECL_TOWERS`) are the app's choices, not fight data.
  - Four-way Fireball: the spot by the boss leaves out the two Line Stacks beside yours, which
    overlap near him, and the tethered player's spot leaves out the fire puddles.
  - Your puddles stay on the floor to the end of the drill (`ATOMIC_PUDDLE`, BossMod's
    `AtomicImpact` range, with no end). The drops layer is clipped to the arena, so a puddle at
    the wall does not spill past it.
  - The wait step is due at Majestic Meteowrath x4, the cactbot line where the fireball segment
    starts. The puddle steps are due at Atomic Impact 1 to 6.
- Ecliptic Stampede with no puddles (November 24, the owner asked for it to follow Hector's Fixed
  Stampede mini-guide, https://www.youtube.com/watch?v=p8cL88OKEWE, read in a browser, 1:20 to
  2:45): the Settings pick "Your Ecliptic puddles" has a third value, "No puddles", and the drills
  `m-ecl-start`, `m-ecl-two` and `m-ecl-four` a third variant, `none`. In a random fight you have
  puddles half the time (two of the four healers and ranged are marked).
  - The steps: your start spot; under the boss (due at Atomic Impact 1); dead center of your
    two-player tower (due at Cosmic Kiss 4); your tether's corner (due at Majestic Meteowrath x4).
  - The towers stand on the intercards (as in the frames). Which two are tank towers, and which
    other healer or ranged is in the middle with you, are random. H1 takes the first two-player
    tower clockwise from A; H2 too when H1 is marked, else the first counterclockwise.
  - The portals are at the middle of each wall. Your tether ends in the corner opposite your
    portal, then clockwise: a north portal sends you SW, east NW, south NE, west SE. Which portal
    is yours is random.
  - Two-way Fireball: a tether in a west corner joins the west Line Stack, an east corner the
    east one. Four-way: stay on your corner's intercard, behind the player at max melee.
  - Two-way Fireball, how far out (owner, November 25, after a fight review): the melee bait each
    Line Stack under the boss. A marked player stands just outside his hitbox, 13.5 to 20 units out
    (best 16), and a tethered player behind them, 18 to 34 (best 20), so nobody else baits the line
    (`TWO_WAY_MARKED`, `TWO_WAY_TETHERED`). The mini-guide at 2:44 shows about 11.5, 16 and 20; the
    raidplan says "Baits ON the hitbox, non-baits OUTSIDE the hitbox". Before this, any spot from 10
    to 34 counted, inside the hitbox too.
  - The marked players show at their walls: a ranged north and a healer south (Hector's guide);
    two ranged, R2 north and R1 south (the mini-guide's example).
  - The app's choices, not fight data: the portal spots, the corner boxes (15 units), the tower
    spot (4 units from its center) and the Four-way spot (24 units out). Owner to check.
  - Not in the drill: the small puddles the middle group dodges while the marked players drop
    theirs.
- Arcadion Avalanche: the boss's turn is a bright blue arrow on a dark outline (`turn` overlay),
  not white dashes, so it shows on the dark floor between the platforms and on the sand (owner).
- Heartbreak Kick in Practice and Pressure: the drill `m-hb` has two variants, from a new
  Settings pick, "Heartbreak Kick": "Party soaks" (stand in the tower) or "Tanks invuln" (stand
  anywhere out of it). Each of the three hits is one step, due at its cactbot line.
- M11S's knockbacks are standard knockback arrows, not guides (owner's choice, November 24). A
  guide is a move you make; a knockback throws you, so it gets the wide, hollow arrow of the
  knockback icons. The guides stayed at first because the standard knockback (arrows out from a
  source) did not show where each player lands. Now `knockback(from, distance, on)` does: with a
  player's spot `on`, it is one arrow from that spot, straight away from the source, to where the
  player lands. `thrown(from, to)` is the same arrow for a throw whose distance no source gives.
  - Arena Split towers (`k-split-kb`): `knockback` from the tower, `TOWER_KNOCKBACK` (BossMod).
    It lands on the same spot the guide ended on before.
  - Flatliner lineup (`k-split-side`): BossMod gives no knockback distance, so `thrown` ends at
    the lineup spot (the app's choice, as the guide did).
  - The made-up wrong answers (`k-split-kb` "same platform", `k-massive` "a knockback only",
    `k-slab` "knocked to the platform he faces") use `thrown` to the spots they used before.
  - The arrows are drawn in their own layer, `pushes`, over the waymarks, the boss and the
    weapons and under the labels and the players (owner's request: a waymark must never hide
    the push). That layer is not clipped to the floor.
  - Practice and Pressure already throw your mark at a knockback (`Step.knock`); they draw no
    arrow, and this did not change.
  - The guides that are moves you make (routes, walks, the Ecliptic tethers' paths) stay guides.
- A raidwide has its own overlay (`{t:"raidwide"}`, owner's choice, November 24): the whole floor
  in the attack's tint, with a wider orange glow inside the floor's edge, so it reads as "the
  whole arena is hit" and not as a big circle or a half arena. It has no size: before, it was a
  circle of radius 72 (`RAIDWIDE_R`, now gone) that the arena's clip cut to the floor. The tint
  covers any floor the arena clips to; the glow follows the square arena's edge (no raidwide
  picture is on the split arena today).

## Planned work

The plans are GitHub issues in `mander77/ffxiv-raid-drills`. Read them with `gh issue list` and
`gh issue view <number>`. The issues were written on November 20, before some later changes, so
make sure that each one still matches the code before you start it.

- Issue #2, the reference view (November 22): it lives at the top of the Cheat Sheet, in place of
  "Positions to remember", not in a new tab, so the phone keeps its short list of tabs. It is one
  scrolling page, not one mechanic at a time. Each mechanic gets
  one key picture, not one per Learn card: 26 mechanics in fight order (`REFERENCE` in
  `src/data/fights/m11s/reference.ts`), each with the answer picture of one Learn card for your slot, the
  one-line rules of its Learn cards (1 to 3), its time and a Learn link. Together they hold every
  Learn card once. The text is the cards' own rules, so the sheet adds no strat text of its own.
  The hand-written lines and the sword example picture went away (owner's choice).
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
    WebKit for browser tests; Biome to lint and format; lucide-react for icons, all of them
    through one file, src/components/icons.tsx, named by their meaning (owner's choice).
    Hosting stays on Cloudflare.
  - Keep `src/data/` and `src/geometry.ts` as they are. They are checked against cactbot and
    BossMod.
  - The arena stays SVG, drawn by React components, not a canvas or a game library. The full
    fight's per-frame parts run in a requestAnimationFrame loop that updates elements through refs.
  - Rebuild 1 (#18): the header and the Cheat Sheet, in the default look. Any other address opens
    the Cheat Sheet until its tab is back. The Cheat Sheet lost its "Learn →" links and "Your
    progress" box for now: Learn and the scores come back in later steps.
  - The slot is in a Zustand store (`src/stores/slot.ts`), saved under "raid-drills-slot".
  - The React code follows the usual React layout, so a React developer finds things at once:
    `pages/` (one per route), `components/` (shared parts), `components/ui/` (shadcn/ui, as its
    CLI writes them), `hooks/`, `stores/` and `lib/`. Click logic lives in handlers, not in
    effects (React's "You might not need an effect").
  - Biome checks every file in `src/`, `test/`, `e2e/` and `scripts/` (globs in `files.includes`
    in `biome.json`), but not `src/data/` (except `fightInfo.ts` and `reference.ts`). The owner
    chose to format the other files kept from the old site too (`party.ts`, `util.ts`,
    `geometry.ts`, `types.ts`).
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
    tab's round count (correct of done) is kept until you reload, and an answer for another slot
    starts a new round. Home's "Start Here" cards link only to tabs that exist. On a phone the
    Lock In bar is fixed to the bottom of the screen once you pick an answer: a sticky bar would
    stay inside the answers' column, under the picture, off screen.
  - Rebuild 4 (#21): Practice is back. The address always names the pattern
    (`/practice/<mechanic>/<code>`): a mechanic with no code, or a broken one, gets a new code, and
    Next mechanic and New Pattern make a new one. The rules (build a pattern from its code, answer
    a step, the phase after it, where the boss stands) are plain functions in
    `src/lib/practice.ts`, with tests. The pictures and the boss's turns match the live site for
    the same code. A try with Show Me does not count in your score, as before. Choosing a spot on
    the arena takes a pointer; the buttons around it all work from the keyboard.
  - November 21: a naming clean-up, so one idea has one name (CLAUDE.md, "Words in the code").
    The addresses and round names are the tabs' names (`/learn`, `/practice`, `/timeline`); a
    Practice mechanic is a drill (`Drill`, `DRILLS`, `DrillRun`); Learn and Timeline cards are
    `LEARN_CARDS` and `TIMELINE_CARDS`; "phase" means only a fight phase, so a step's state is its
    status; `look` is a colour, so a look-ahead step is `Step.lookAhead`; the ability categories
    are spelled out (`Category`, `CategoryIcons`); `f1` (which rounds to 2 decimals) is `round2`.
    Only names changed, never a value, in `src/data/` too, with the owner's OK.
  - Rebuild 5 (#22): Pressure is back: the quick round, the run and Watch the Correct Moves, with
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
    rounds, and a weapon run in `src/data/fights/m11s/drills.ts` is a jump set (`JumpSet`, `buildJumpSet`).
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
  - Issue #29: four hand-built parts are now shadcn/ui components. The More/Less setup text is a
    Collapsible (removed again in issue #58: the setup now always shows in full), Share confirms a copied link with a Sonner toast (the Toaster is in `App.tsx`,
    light theme), the quick round's timer is a Progress, and the end of the run lists the
    mechanics to practice as Items. shadcn's Progress keeps `value` for the bar's width only, so
    `TimerBar` passes `aria-valuenow` too. Biome's `useSemanticElements` rule is off for
    `src/components/ui/` only (`overrides` in `biome.json`), so the CLI's files stay as it writes
    them: its Item puts `role="list"` on a div.
    The CLI also added `next-themes`, which shadcn's toast file uses to follow a dark theme. The
    site has none, so it does nothing here; the owner chose to keep it, so the file stays standard.
  - `.gitattributes` keeps LF line endings in every text file, on every computer. Before it, a
    Windows checkout turned files into CRLF after a branch switch, and the lint failed.
  - The theme (after many palettes with the owner): quiet, so the arena stays the focus. Ink
    text and buttons, a slate header band (`536E8B`, a little darker than the palette's `5E7A97`
    so white text reads at 4.9:1), and celery (`DAEAAE`) for where you are: the active tab and the
    line under the header. The palette came from the Figma color palette generator (DAEAAE,
    836996, 5E7A97, 4E7E5A); its mauve and green were left out, because purple means "saved for
    later" and green means correct. The owner rejected an accent that follows the role (DPS red
    looks like "wrong"), and brighter accents (teal, magenta, yellow, coral) as too bright. The
    selected Role and Group are celery, like the tab you are on; the Role does not take its game
    colour, so the header never changes colour. The chrome has no other colour. Fonts: Saira Condensed
    for names, tabs, headings and big numbers, Source Sans 3 for text, both bundled. The page does
    not jump when they load: the build preloads their Latin files (`preloadFonts` in
    `vite.config.ts`), and each has a fallback face in `src/app.css`, Arial resized to the web
    font's metrics (values from fontaine, checked by `test/fonts.test.ts`). Fontaine's Vite plugin
    was tried and dropped: it wrote a fallback for every subset file, with the wrong sizes for the
    non-Latin ones.
  - Light and dark mode with a Light / Dark / System menu, as in shadcn/ui's dark mode guide for
    Vite: our own ThemeProvider sets the class on <html> (next-themes renders a script tag that
    React 19 warns about), and a script in index.html sets it before the page draws. The arena
    stays sand in dark mode, so it is the brightest thing on the page.
  - The theme has no chart colours (`--chart-1` to `--chart-5`) and no sidebar colours
    (`--sidebar`, `--sidebar-foreground` and so on), though shadcn/ui's theming guide lists them.
    The owner chose to add them only when a Chart or Sidebar component comes in, since nothing
    uses them today. Then the sidebar colours take the site's own colours (card, foreground,
    primary, accent, border, ring), not shadcn's neutral ones, whose blue active item in dark mode
    does not fit the quiet chrome. The charts may start from shadcn's neutral grays. The CLI does
    not add them cleanly: the `chart` item brings no colours, the `sidebar` item brings old v3
    names (`--sidebar-background`, in HSL), and `init` would overwrite the theme. Copy the names
    from the theming guide (https://ui.shadcn.com/docs/theming) and the `cssVarsV4` values from
    https://ui.shadcn.com/r/colors/neutral.json.
  - Arena size: one rule on Learn, Practice and Pressure (`ArenaFrame`). The arena is as large
    as its column, but never taller than the room down to the bottom of the screen, so all of it
    is in view; at most 720 px, and at least 360 px, so it fills a phone's width. The header
    takes two rows on a wide screen (the strats beside the name, Role and Group beside the tabs),
    so the arena gets more room.
  - The header stays at the top of the screen only on a wide screen (lg and up), where it is two
    rows. On a narrower screen it is three rows (159 px at 390 x 844) and covered the top of the
    arena, so there it scrolls away with the page. NN/g, Smashing Magazine
    and Adobe all advise against a tall sticky header on a phone. A header that hides on scroll
    down and comes back on scroll up is the next step, if players miss the tabs on a phone.
  - Pressure on a wide screen (lg and up): the arena has the left column to itself, from the top;
    the cast bar, the prompt and the controls sit beside it. The countdown ring stays on the
    arena, around the boss. At 1280 x 800 the arena went from 494 to about 600 px. Three columns
    were turned down: the height limits the arena, so a third column would only narrow it.
  - The player's controls (owner's choice): a thin bar like a video player's, the slider across the top and the buttons in one row under it, past a thin line. Under the slider, a tick marks where each mechanic starts: point at it for its name (a shadcn Tooltip), click it to go there. The ticks are our own, not a datalist, which browsers draw without names, or not at all:
    play, the slider, the time, a speed menu, and icon buttons with tooltips for Start over, New
    fight and Settings; the keys are in the play button's tooltip. Beside the arena: the cast
    bar with the casts coming up under it, the prompt, then the mechanic, which scrolls in its
    own box when long. The page does not scroll at 1280 x 800.
  - On an extra-wide screen (xl, 1280 px and up) the player has three columns: the mechanic on the
    left, high up where you read it; the arena and its play bar in the middle; the cast bar, the
    casts coming up and the prompt on the right. The page container widens there (max-w-7xl), on
    every page, so the header lines up and the arena keeps its size.
  - In the player the cast bar always sits directly over the mechanic, on every screen (owner's
    choice): what the boss casts, then what it means. Extra-wide: cast bar and mechanic on the
    left, the prompt and the casts coming up on the right. Wide: the prompt, the cast bar over
    the mechanic, then the casts coming up. Phone: the prompt over the arena, the play bar under
    it, then the cast bar over the mechanic. The run keeps the cast bar over the prompt.
  - The casts coming up (CastList) look like WoW Midnight's boss ability timeline, by the owner's
    choice, but rise to a now mark at the top instead of falling to the bottom: a line, each cast a
    square in its category's colour with its seconds inside and its name beside it, after its
    category icons, ticks at 5, 10
    and 20 seconds, and a bigger square in the last 5 seconds. Before that it was a list moving
    toward a now line: the gaps show the time between casts, close casts are pushed apart so names never
    overlap, the last 6 seconds are bold, and a cast fades above the line for 2 seconds. shadcn/ui
    has no timeline, and its ScrollArea is for content you scroll yourself, so the list is our
    own; ScrollArea holds the mechanic where it can run long. Narrow screens: the cast bar and the
    mechanic first, then the prompt, the arena and its play bar, then the list; a phone leaves
    the list out.
  - The player has no prompt of its own (owner's choice): the mechanic's step box shows the
    question and, under it, "Correct move:" with the answer, where the prompt used to repeat the
    answer in a box of its own. The run keeps its prompt, the live question.
  - The play bar sits directly on top of the casts coming up, on every screen (owner's choice): the
    clock and the list that runs on it belong together. The arena stands alone in its column, so
    it gets the room the bar took. The list lost its "Coming up" line (the play bar shows the time
    and the speed), and its now mark sits lower, 56 px from the top, with the line running on 40 px above it.
  - The player's side column touches the arena (owner's choice): on a wide screen the play bar
    and the casts coming up (and, below xl, the mechanic too) sit directly against the floor's right
    edge, from its top to its bottom, so they read as part of the arena. `ArenaFrame` places this
    `beside` column by the floor's edges in the picture (`ARENA_VIEW`), as shares of the frame, so
    it fits at any size; the frame keeps room on its right for it. The cast line runs on a little
    above the now mark, and a cast that went off fades out as it rises past the mark.
  - On an extra-wide screen the mechanic's column touches the arena too (owner's choice): it sits
    against the floor's left edge (`ArenaFrame`'s `before` column), from the floor's top to its
    bottom, so the arena and its two columns read as one piece in the middle of the page.
  - On a screen taller than the arena, the side columns of Practice, Pressure and Learn start at
    the floor's top and run on down to the bottom of the screen, so a list or an answer is not cut
    off at the floor (owner's choice, November 23; `tallSides` on `ArenaFrame`). They are never
    shorter than the floor.
  - The player has two layouts, never a mix (owner's choice: the columns sit either both beside the
    arena or above and below it). Wide (lg, 1024 px and up): the mechanic against the floor on the
    left, the play bar over the casts coming up on the right. Narrower: one column, the cast bar
    and the mechanic over the arena, then the play bar and the casts coming up, sideways
    (`CastStrip`), under it. The sideways line is CastList lying down: the casts slide left to a
    now mark, their names wrapped under their squares, so a phone keeps the casts coming up.
    `ArenaFrame`'s `over` and `under` line the column up with the floor's sides. In one column the
    arena keeps its full size (`fill`: up to 720 px, or the screen's width) and the page scrolls, as
    on a phone (owner's choice): it does not shrink to make room for the mechanic and the bars. The owner turned down the mix (the
    mechanic on the left, the bars under the arena) as looking wrong. The three columns start at
    1024 px, not 1280: there the arena is larger beside its columns (528 px at 1209 x 732, a screen
    at 150% zoom).
  - The run looks like the player (owner's choice): the same layouts, with the run's pieces in the
    player's places. Wide: the cast bar over the prompt against the floor on the left, the run's
    bar (progress, Pause, Quit) in the play bar's look over the casts coming up on the right.
    Narrower: the cast bar and the prompt over the arena, the run's bar and the sideways casts
    under it. The run shows the casts coming up too: their names only, like cactbot's timeline in
    the game, never where to stand.
  - The casts coming up show two kinds of line apart (owner's choice, over showing the hits only).
    Every line is a cactbot time; some are the boss's own cast (its cast bar ends and a mechanic
    starts, such as "Assault Evolved"), the rest are hits (damage goes off, such as "Assault
    Evolved 1"). A cast is a dashed, outlined square with its name in plain text; a hit is a filled
    square with its name in bold; a small key says Cast and Hit. Which lines are casts comes from
    BossMod: the abilities it lists as "Boss->self, N s cast, single-target", matched by the
    ability id on each cactbot line (`BOSS_CAST` in `src/data/fights/m11s/fight.ts`). A Cometite puddle's
    "drops" line is the start of its cast, so it counts as a cast too.
  - When a hit crosses the now mark in a playing fight, the mark flashes in the hit's category
    colour (it glows and grows for 0.6 s) and the hit's square pops (owner's idea: show that it went
    off). A boss's cast stays quiet, and a seek or a jump shows nothing (`hitsGoneOff`). With
    reduced motion the mark only glows. The Web Animations API runs it from the frame loop.
  - `useFitToScreen` measures again when the web fonts have loaded: they can push the arena down a
    pixel or two after the first measure, and the page then scrolled.
  - November 21: the owner asked that every change be checked against the official best
    practices of its framework or language (React, Tailwind CSS, shadcn/ui, TypeScript and the
    test tools), so a developer who knows them finds their way at once. CLAUDE.md lists what
    each check looks at. The first check moved the page width into a `PageContainer` component
    (Tailwind advises a component over a string of classes), put the arena styles in the
    "components" cascade layer, and turned a function that returned JSX into a component.
- Issue #11 (done, November 22): one step from a clone to a working set-up, for the owner and
  for other contributors, on Windows, macOS and Linux. The owner chose:
  - git and Node.js 24 are the only tools to install first. Then `npm run setup` (plain Node.js,
    `scripts/setup.mjs`) checks the Node.js version, runs `npm ci`, installs the Playwright
    browsers and runs the type check and the tests. `devEngines` in `package.json` makes npm
    refuse another Node.js major version. Cloudflare and CI read `.node-version` (24).
  - No dev container: it needs Docker (WSL2 on Windows), and the AI tools and worktrees the owner
    uses run on the computer itself. It can come later, only for Codespaces.
  - No mise: the owner removed `mise.toml`. It only unset a work account's token and git
    identity variables on one computer. The publish script clears the tokens itself, and
    `git var GIT_AUTHOR_IDENT` shows when an environment variable wins over the git config.
  - The setup shows the commit identity but never sets it, because a contributor has their own.
  - The GitHub CLI is optional: the setup gives a hint when it is missing or signed out. Only
    publishing needs it, and a pull request needs only git.
  - The publish and wait-deploy scripts moved from `sh` to Node.js (`npm run publish`,
    `npm run wait-deploy`), so they run in PowerShell with no Git Bash step.
  - `npm run publish -- main` puts the branch on `main` from its own worktree. The owner chose
    this after a publish from the main checkout clashed with another session working there.
- Party slots (#13, done). A slot has two parts, the light party (1 or 2) and the role (Tank,
  Healer, Melee, Ranged). Casters count as Ranged. The header shows both parts. The light party control is "Group", with 1 and 2, as on wtfdig. Since November 23 each switch sits in its own box, a fieldset with "Role" or "Group" set into its top border in 12 px text (owner's choices, over smaller labels above the switch, which were hard to read). The buttons are 24 px, with a small gap so each keeps its rounded corners, and the box is a little taller than the tabs (41 px against 36 px). So the switch fits beside the tab button on a phone; it sits on the right. The owner chose
  to show every role now: a role with no drills yet is greyed out, and pointing at it, focusing
  it or tapping it shows "not yet available". Saved settings and links keep the short names
  (H1, H2). `ROLES` in `src/party.ts` marks which roles are ready.

## What the reviews say must not change

- The Home "Start Here" cards, in learning order.
- The Learn picture with the answer drawn on it. A player who skips the text still gets the
  answer from the picture.
- Practice's Show Me with the blue "Go here" area. It teaches before it tests.
- "Watch the Correct Moves". The new-player tests liked it best.

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
- A slot name (H1, H2) on the green answer area. The tag says "Correct spot", because the moving
  marker already shows your slot.
- An order control for weak spots. The static always uses fight order.
- Sound cues. Offered, not built.
- Old links. The site was new, so old link formats do not have to keep working.
- Go as the language. The site is TypeScript with Vite.

## Screens

- Mechanic text is short lines in a list, not a paragraph (owner's choice, issue #58): the setup,
  the rule, a step's answer, a Learn card's explanation and the timeline's "what you do". Each line holds one step
  or fact, 16 words at most (a test checks it). A setup whose steps happen in order is numbered
  (`Scene.ordered`); everything else is bulleted.
- The setup always shows in full. It does not fold after the first answer, and it has no More or
  Less (owner's choice: the player must see every step at a glance, with no click). This replaces
  the Collapsible from issue #29.
- A rule that a drill and a Learn card both show is written once, in `src/data/fights/m11s/rules.ts`.
- Mechanic names are in Title Case everywhere, on the icons and in the text (owner's choice, issue #110
  #58). The rule is in `docs/vocabulary.md`.
- One idea has one phrase on screen (owner's choices, issue #58). The list is in `docs/vocabulary.md`. The owner chose "under the boss" and "max melee" as the only hitbox words, "light party
  1/2" over G1/G2 and "static", "soaked" for towers, "Supports (tanks and healers)" explained on
  first use, "light party stack" for the sword and "pair stack" for Four-way Fireball. The header
  switch is now "Light Party", not "Group".
- The Correct and Not there card after a step shows the correct move as a list. It does not repeat
  the step's question: the prompt bar has just asked it.

### Learn

- On a wide screen a card with an arena picture has Practice's layout (owner's choice): the
  question and the answers in a 20rem column against the arena's floor, lined up with its top, so
  the arena takes the height the question took above it. The column scrolls when a long rule does
  not fit. A phone, and a Timeline card, keep the question above and the picture beside or above.
- Pick an answer (click or a number key) to preview it in blue on the picture, then Lock In (or
  Enter). The preview also draws the attack that the answer assumes, because the quiz tests what
  the boss does, not only where you stand.
- After an answer, the correct answer holds its explanation, and an incorrect pick gets a "Your pick" tag.
- Cards whose answer is your own spot show your role marker on the answer picture.
- Back, Next and one chip per mechanic (`LEARN_GROUPS` in `src/data/fights/m11s/questions.ts`). A test makes sure
  that each card is in exactly one chip.
- One prompt bar on every tab that asks something (owner's choice, November 23, "Option A"): Learn,
  Timeline, Pressure's quick round and Practice share `PromptBar`. It holds the question (with
  Practice's step count), Lock In, and after the answer Next. The owner wanted navigation the same
  on every tab, and the eye drawn to what changed, at every width.
  - On a wide screen it sits at the top of the column beside the arena, where Practice had its bar.
    On a narrow screen it sits over the picture and sticks to the top of the screen while you
    scroll (`StickyBar`; the header scrolls away there). The run's prompt sticks the same way.
  - After the answer the bar turns green or red with a check or a cross and says how it went
    ("Correct.", "Not this one.", "Froze: the time ran out."), where the eye already is. The bar,
    the rule and the correct answer glow once in celery (`animate-attention`; not with reduced
    motion).
  - The rule comes right under the bar on a wide screen and just over the answers on a narrow
    one, and scrolls into view; on a wide screen the correct answer, with its explanation, scrolls
    into view in the column. Before, the rule came after the answers and was often off the
    screen, so players did not know it was there (owner's report).
  - This replaced the bar fixed to the bottom of a phone screen (Lock In and Next), which moved
    the button from the top on a wide screen to the bottom on a phone. Lock In is now "Lock In".

### Timeline

- The picture is a cactbot-style list. The coming names show "? ? ?" until you answer, with the
  line "Coming up: the names show after you answer." A strip shows P1 to P4 and where you are.
- When the next raidwide is the same one again (Crown of Arcadia comes five times), the answer says
  "Crown of Arcadia again".
- The incorrect answers are random rows of the timeline. A row whose name points back to an
  earlier row ("the other weapon", "second set", "second time") is not offered before that
  earlier row has happened, because the name gives it away (`POINTS_BACK` in
  `src/data/fights/m11s/questions.ts`).
- The phase on a card is the phase of the ability nearest the card's time. The timeline's times
  are rounded, so Orbital Omen (4:26) was shown in Phase 1 before.

### Practice

- The map is the main thing on the screen. It grows until the whole arena fits in the window
  height, but it is never smaller than 420 px.
- The mechanics are in a list beside the arena (owner's choice, over a line with a now mark that
  you drag to pick a mechanic): each at its first time, under its phase, with a square on a line,
  in the look of Pressure's casts coming up. A click opens the mechanic; the one on screen is
  marked in celery. The list does not move when you click a mechanic you can see, so it stays
  under your pointer; a mechanic out of view (a new page, Next mechanic) is scrolled into view,
  inside the list, never the page. You scroll it, or drag it with the mouse.
- The list and Pressure's casts coming up are two components (owner's choice): they look alike,
  but one follows the fight clock and the other picks a mechanic. One component with a switch
  between the two had props that worked in only one mode. They share the square (`CastSquare`)
  and the drag (`useLineDrag`). A filter by ability category was dropped with the one component,
  because neither needs it.
- Each Practice mechanic has a kind (`Drill.kind`): what you do in it. Its square in the list
  shows the kind's icon, and the mechanic's panel names it. The owner chose the kinds and the icons
  with Claude:
  - The icons follow rules (the owner's): a ring is a spot, a tower a column standing in its
    ring, a filled dot a player (in the highlight colour, like the number of players: owner's choice), chevrons a hit from the boss, arrows a move you make, a burst and a
    wide hollow arrow a knockback, a row of dots players lined up (a line stack; a wild charge puts
    the tank's shield first), a shield a tank, a clock timing. The full
    list, with how to draw a new icon, is at the top of src/components/icons.tsx.
  - The owner chose several icons from a generated sheet of extra mechanic icons, redrawn in
    lucide's line style: a bait is a player in a crosshair (you are the target), and a puddle drop
    sequence is three puddles with the curved arrow of the player walking on. A knockback got a
    rule of its own (owner's choice), since neither an arrow (your own move) nor chevrons (a hit)
    said it: a burst at the top left, a wide arrow down to the player at the bottom right. A tower
    is a wide column in its ring, with room for the number of players who soak it (each mechanic
    gives it, Drill.soak). A knockback tower is a wide, hollow arrow, its head curved and its barbs
    swept back, bursting up out of the ring, with the number inside (the owner turned down a splash
    of lines, chevrons out of the ring, and burst lines beside the tower). A mechanic's icon fills
    24 of its square's 28 pixels, so it reads larger. A
    tank buster is a player behind a shield; a shared tank buster puts the stack's number 2 in the
    shield, a little smaller, since the shield's middle is narrower. The owner turned down the
    sheet's tether (no drill needs it), its hide behind cover (the fight has no hide kind), and its safe
    side. A tank tower came later (owner's choice): a tower shaped like the tank buster's shield,
    its tip in the ring, with the soak number inside.
  - Assault Evolved and Ultimate Trophy Weapons show every way a weapon can end, as three kinds side
    by side (owner's choice): the axe is a party stack, the scythe proteans (clock spots), the sword
    a light party stack, fanned like a hand of cards in the list (owner's choice). Orbital Omen is a dodge sequence, and Dodge is no longer a kind (owner's
    choice: it is not a mechanic of its own). The party stack, with no number, has lucide's Shrink,
    the inverse of spread, since it needs no room in the middle (owner's choice).
  - Void Stardust and Ecliptic Stampede: start are puddle drop sequences (owner's choice). Saved for
    later keeps its icon and its kind, though no drill uses it now.
  - Chains (Break Your Chains), tank buster, shared tank buster and tank tower are kinds with no drill yet, like Tower: the
    owner wants them ready for later roles. Arena Split's tethers stretch, but its first towers stay
    knockback towers, because you click a tower there.
  - Pair tether is a kind with no drill yet too (owner's choice): two tethered players stay close
    while they move. Its icon is the inverse of the Chains icon (owner's choice): the same two
    players on a tether, with the line above them as two arrows pointing in.
  - Stacks share one icon, four arrows from the corners coming together, with the number of
    players in the middle, in Source Sans 3 bold (Saira Condensed's R looked like an A) and its own
    colour, so it stands out from the arrows: bright amber on the dark square in light mode, deep
    orange on the pale square in dark mode (owner's choice): 2 for a pair stack (Dance of Domination,
    Four-way Fireball), 4 for a light party stack, R for a role stack, where the roles decide who
    stacks (Raw Steel: scythe). A party stack, the whole party, has no number.
  - A line stack (Two-way Fireball) is its own kind. A wild charge is a line stack where the
    first in line takes far more damage, so a tank or a rock stands in front (owner's words);
    every Meteorain stack is one. The fight has no hide kind.
  - Assault Evolved and the six Ultimate Trophy Weapons are a dodge sequence (owner's name): the
    boss goes through the weapons in order. Look ahead is only for a mechanic with a
    look-ahead step, as the site uses the words.
  - Arena Split: line up is a knockback to your platform. Arena Split's first towers are knockback
    towers: you soak them, and they knock you back. Tower stays for a plain tower, a common
    mechanic in other fights.
- Practice has the layout of Pressure's player (owner's choice), so the two tabs look and feel the
  same. A wide screen: the prompt over the mechanic on the left of the arena, and a bar (which
  mechanic, New Pattern) over the list of mechanics on its right. Both sides are 20rem wide, so
  the prompt and its buttons fit, on Practice and Pressure alike (owner's choice). A narrow screen: the same in one
  column, the prompt and the mechanic over the arena, the bar and the list, sideways, under it. It
  has no timer (owner's choice, after a timer for each mechanic was discussed): Practice is where
  you learn a mechanic with no time pressure, and Pressure is the timed tab.
- Show Me draws the correct spot in blue with the tag "Go here", shows the answer text in the bar and
  the rule in the panel. A try with Show Me does not count in the score.
- Reset (start the same pattern again) is always in the prompt bar on the left, as an icon button
  with a tooltip (owner's choice); after a mechanic, Next mechanic sits beside it, as an icon too.
  The bar over the list of mechanics has no Again: one restart button, in one place.
- The step chips (owner's rule for the whole app): while the site tests you, you go forward only;
  in review, a chip takes you to a step. A chip that is a button looks like Learn's chips (round);
  a chip that only shows progress is a badge.
  - During a try the chips are badges: a check, a cross, the step you are on. Nothing jumps. Show
    me covers the step you are on, and Watch the Correct Moves covers the whole mechanic.
  - After the try they are buttons. A click, or the arrow keys, shows that step: the arena as it
    was (the boss, the puddles down, your click, the green area), its answer under the chips, and
    "Step 2/4, Not there" in the bar. The step shown has a ring, apart from its check or cross.
  - Try From Here, in the bar, answers the step shown and the ones after it again; the answers
    before it stay. It does not count in the score, as with Show Me (the app's choice: the first
    try already counted). A mechanic with one step has no chips, so no Try From Here.
  - Reset keeps one meaning: start the whole mechanic again.
  - The answer card sits under the chips, over the rule, so the step you review and its answer
    are together.

### Pressure: the quick round

- 12 timed questions from Learn and Timeline. One click per answer, no preview.
- Quit, beside "Card 1 of 12", goes back to the start. The answers so far stay in your scores.
- When the time runs out, you froze: the card says "Froze: the time ran out.", as the setup and
  the counts say. The run keeps "Too slow" for a hit you did not answer in time.
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

### Pressure: Watch the Correct Moves (the player)

- A replay. A marker with your role runs the correct spots. You do not click answers.
- The HUD gives the correct move (the step's answer text), and nothing turns red.
- You do not click in the player, so its step box drops "Click" from the question: "Click where
  the party stacks." shows as "Where the party stacks." (`watchQuestion` in `src/lib/fight.ts`).
- Each mechanic's tick under the slider is a 12 x 16 px target. The ticks can be 4 px apart, so a
  wider target would cover the next one.
- Click the map, or press Space, to pause or play. A "Paused" badge shows above the map.
- The play bar (play, slider, speeds, Settings) sticks to the bottom of the screen while the arena
  is in view. Settings holds only the fight pattern picks.
- The casts coming up move the fight clock too (owner's choices), next to the slider, which stays:
  - Click a cast (or Tab to it and press Enter) to go 3 seconds before it, paused, so you see it
    come and go off (`CAST_GO_LEAD`, the app's choice).
  - Drag the line to move the clock, like scrubbing a video: up (or left on the sideways strip)
    moves it on, the way the casts go. The clock waits while you hold it and plays on after if it
    was playing. A press counts as a drag after 4 pixels; less is a click.
  - While you drag, the casts that went off stay in view as far back as the line goes above (or
    before) the now mark, so you can drag back to them. Let go, and they fade as before.
  - The mouse wheel over the line moves the clock too (owner's choice): down moves it on, about
    3 seconds a step (`WHEEL_SPEED`), and the page does not scroll under it.
  - On a phone only a sideways drag on the strip moves the clock; an up and down swipe still
    scrolls the page (`touch-pan-y`).
  - The run has none of this: it is scored, so it stays on the clock.
- The green answer area has no "Correct spot" tag here.
- The step chips are always buttons here, since the player tests nothing. A click goes to that
  step, paused, 3 seconds before its correct move (`CAST_GO_LEAD`, as for a cast), but not before
  the step is asked, so you land on that step (`stepGoAt`). The step asked has a ring.
- The first weapon of Void Stardust is answered 4 seconds early and shows as "Look ahead"
  until its due time, so you have time to see it.

### Home and Cheat Sheet

- Home: "Start Here" cards in learning order. The top picture is the answer picture of the Learn
  card `k-raw-first` (on a phone, a 110 px strip from the boss to the party stack). The owner's
  character picture is in About Me with a wide crop of the face, the card and both arms.
- Home's purpose lines (owner, 2026-11-25, issue #140): the site is for practicing fights you
  already studied in guides and videos, without being in the game. It does not introduce a fight,
  and the purpose names no fight, since the site covers more than one. Under the heading: the
  purpose, "read the guide and watch a video first", and that spots follow the wtfdig strat named
  at the top, with the roles that have drills ("Healers only for now", from the role switch). The
  footer on every page repeats the purpose, since a shared link often opens a tab, and says "A fan
  site. Not affiliated with Square Enix."
- Cheat Sheet: first every mechanic in fight order, by phase, as cards: its time, a Learn answer
  picture for your slot, its Learn cards' rules and a link to Learn. One card per row (owner's
  choice, after four, three and two per row): from tablet width the text sits beside a big
  picture (576 px at 1280 px), on a phone under it. Under the rules, "As H1:" gives each Learn
  answer that differs between H1 and H2 (owner's choice: short rules plus your own answer). Then
  links to train it: Learn, each Practice drill, and the Timeline card whose answer is this
  mechanic. No Pressure link: the player needs a fight code, and its times move with the pattern.
  The page is long, so once you scroll to Phase 1, buttons sit in the bottom right corner: "↑"
  the section before the one you are in, "↓" the next one, and "↑ Top" (owner's ask). The
  sections are Phase 1 to 4, Panic Reset and Timeline. Sources and Your progress are not stops:
  they are short and end the page, so their headings never scroll up to the top. At the top of
  the page, one button per section jumps to it: the phases, Panic Reset, Timeline, Sources and
  Your progress (owner's ask). The buttons at the top jump at once; the corner buttons scroll
  smoothly (owner's ask), or jump when the system asks for reduced motion. Then the panic reset,
  your timeline, the sources and
  your progress.

### Everywhere

- Each ability category has its own icon (`CategoryIcons`, rule 14 in `icons.tsx`), so no place
  tells the categories apart by colour alone: Raid Damage two chevrons over three players, Tank
  Damage the tank buster's shield, Positioning a map pin, Avoidable AoE a ring with an arrow out,
  Targeted AoE a crosshair, Mechanic a puzzle piece, Enrage a skull. The icon keeps its category's
  colour as a second cue (owner's choice). A row with two categories shows both icons. In the
  casts coming up the square keeps its colour and its seconds, and the icons go before the name
  (owner's pick over an icon in the square with the seconds after the name). The hit flash on the
  now mark keeps the category colour. The name of a hit over the arena draws its icon in the
  label's text colour, where some category colours would not show; dark mode lifts Enrage's dark
  red, which was lost on the dark background.
- Player marks are always the top layer (see `LAYERS` in `src/components/arena/Arena.tsx`).
- Each boss weapon is a small upright icon on a round badge filled with sand (the badge covers the
  middle of its line), sitting on a line drawn at the true
  angle the weapon rests at (`src/components/arena/Weapon.tsx`, one drawing for every screen). The
  owner chose this after trying detailed standing weapons, silhouettes and a cut in the floor: the
  line shows the angle, the icon says which weapon, and nothing stretches as it turns. Every icon
  sits in the middle of its line. The sword's and the axe's (a double-headed half-moon axe) line
  is straight. The scythe's line tapers from the thick butt (H1's end) to the sharp point (H2's
  end), and is as long as the green safe ring drawn when he lands on it is wide (owner's rule).
  The scythe icon is a reaper's scythe: a long, gently bent handle and a long curved blade
  that sweeps from its top and hooks down past the middle, so it does not read as a 7 (owner's
  pick over an L-shaped scythe, a blade at the bottom and a shorter blade). Each icon is drawn a little inside its badge, so a handle never runs into the line. Weapons have their own layer, over the
  waymarks they often land next to and over the boss, under the labels and the player marks. When
  he stands on a weapon, the dark icon sits on its sand badge, with a red band of his dot around
  it: his dot is wider than the badge (owner's choice, over a clear badge that left a dark icon on
  his dark dot, a light icon only on the boss, and a brighter dot). A thin sand outline round the
  icon keeps it readable over an attack. The held weapon in
  Raw Steel Trophy is its icon alone, the same size as on the floor (one scythe icon across the app), on top of his dot, with its name tag under the dot (owner's choice). A weapon's name goes out to
  the side of its line, away from the arena center; in Practice, its order number goes in toward
  the center. The axe's heads are wide, a little wider than tall, and the sword is bold: a wide
  blade, a gently bent crossguard and a round pommel (owner's choices).
- When the boss jumps onto a weapon (Practice and Pressure), the picture stays clear (owner's
  choice): the weapon he stands on loses its name tag (his ring on its icon says which one), the
  weapons he has left fade, and the "Correct spot", "Go here" and "Look ahead" labels move
  straight out from him past his ring, so they never cover him or the weapon. A weapon on a
  waymark still covers the waymark: the owner chose to keep that.
- The boss turns smoothly to face his next target. He does not flip.
- "Look ahead" (purple) marks a mechanic shown early and resolved later, for example the
  first weapon during Void Stardust. It is never a spot to stand on. Every line that tells you to
  spot something early starts with "Look ahead:" (owner's choice, issue #58). It replaced "Saved
  for later", which new players did not understand.
- Below lg (1024 px) the tabs are one button with the tab you are on, in celery like a tab
  ("☰ Learn"). It opens a sheet from the left with the six tabs (`TabMenu`, shadcn's Sheet). The
  owner chose it over two rows of three, which took a quarter of a phone's screen, and over a tab
  bar at the bottom (six tabs are too many, and it would cover Learn's Lock In bar). The Role and
  Group switch sits on the button's row when it fits (a 375 px phone and up) and moves above it
  when not.
- Keyboard hints do not show on touch screens.
- Start over and New fight are buttons, not text links.
- An answer is "correct" or "incorrect", on screen and in the code, never "right" or "wrong"
  (owner's choice). "Right" means only the direction: "directly behind", not "right behind";
  "immediately", not "right away". A correct answer is green and an
  incorrect pick red, in light and dark mode alike: the answer buttons use the Button variants
  `correct` and `incorrect`, which the site added to `src/components/ui/button.tsx` the way
  shadcn/ui's customization guide shows. The outline variant's own dark-mode colours hid them.
- Scores are kept per slot (owner's choice): the correct answers differ by slot, so H1 and H2
  answers never mix. The quick round picks its weak cards from your slot's scores, and the
  Cheat Sheet counts your slot's answers. Reset erases every slot.
- Every saved store (slot, progress, Pressure settings) has a `version` in its persist options.
  When the saved shape changes, raise the version and say in `migrate` what happens to old data.
  While the site is in development, old data may simply be dropped.

## Fight facts and strat corrections

These come from the owner, the owner's static and the sources below. When a guide disagrees, the
static wins.

### Raw Steel Trophy (he holds the weapon)

- Scythe: three cleaves. One cone on each tank, and one cone behind him that the rest of the party
  shares. Tanks spread, and the party stacks south behind him.
- Axe: the reverse. A shared tank buster, and six spread hits. Tanks stack, and the party spreads.
- The held weapon is drawn on top of the boss's dot, with its name under the dot.

### Assault Evolved (he jumps to the weapons)

- First set (0:48): the three weapons spawn at once. The tell is his facing. At the start of the
  6-second cast, he turns to the first weapon. Then he goes clockwise.
- Second set (1:33, during the first Void Stardust): the first weapon is the one with its flat side
  square to him. Then clockwise.
- Both sets: each weapon faces where he jumps from (cactbot's "R11S Trophy Weapons" trigger reads
  the order this way, and it runs for both sets). The first set's weapons used to lie across the
  line to the middle, so all three looked square to him (issue #127; the owner chose to turn them).
  He never jumps straight across the middle: a weapon reached that way would face the middle too,
  as square as the first. Where the spots would give that jump, its weapon moves 45° back (owner's
  choice, for both sets), so a later weapon is always at least 22.5° off square. In the first set
  this moved a weapon in about a third of the pattern codes; the random draws stay the same.
- Sword: stand in the pocket behind him, on the side he jumped from. H1 takes his left, H2 his
  right, and the light party stacks on the healer. Stand a few steps in from the inner corner,
  about 2 yalms clear of each arm. The whole pocket inside the arena counts as correct.
- Scythe: proteans, so everyone takes a clock spot close around him. He always lands on the flat
  side, so you can pre-position on the weapon. H1 takes the butt (handle end), H2 the point (blade
  end). The correct area (issue #124) is near your spot, but only inside the donut's 5-yalm safe
  ring and less than 30 degrees off your clock spot, where the next player's cone starts. Before,
  a circle around the spot reached past both, so a click in the donut counted as correct.
- Axe: the whole party stacks in the middle, out of the axe hit.
- The axe's Party Stack is always on a healer (owner, 2026-11-25, issue #128). BossMod's
  `WeaponsBait` lets it land on any player, and no other source names a role, so the owner is
  the source for "a random healer".

### Void Stardust

- Puddles: start north of the boss. Drop each one just outside the last, a small step clockwise,
  in max melee.
- A puddle (Cometite in BossMod) has a 3.0-second cast and goes off once. The drops are 2 seconds
  apart. The map fades each puddle 3 seconds after it drops.
- The third puddle goes off 2 seconds before the stack or spread (1:27.9 and 1:29.9 in the first
  Void Stardust, 1:54.2 and 1:56.2 in the second), so no puddle is on the floor then. The Comet
  spread does not keep you out of a puddle (owner, 2026-11-24, issue #102). Practice fades every
  puddle when it asks the Comet step (`puddlesOff`), and the Learn pictures of the spread draw no
  puddles. The stack step and its pictures still show the puddles, as a guide to the stack spot.
- Crushing Comet stack: one more step clockwise, just past the third puddle, where a fourth
  puddle would go. The same for both Void Stardusts. It is clear of the third puddle by its place.
- After the stack step is answered, Practice and Pressure draw Crushing Comet (BossMod's
  CrushingCometStack, "range 6 circle") where the party stacked: your click when it was correct,
  else the correct spot (`Step.revealAt`). The spot follows your own puddles, so a fixed `reveal`
  cannot draw it.
- Crushing Comet's Party Stack is always on a healer (owner, 2026-11-25, issue #128). cactbot
  (`stackMarkerOn`), BossMod (`CastStackSpread`) and wtfdig name no role, so the owner is the
  source. The Learn card `k-void-target` keeps "A random DPS" as an incorrect answer.
- Every puddle and the stack stay in the boss's max melee range (owner, 2026-11-23).
- Comet spread: healers and ranged take any open spot. Tanks and melee each take a fixed spot:
  MT NW, OT NE, M1 SW, M2 SE. The map shows the open ground as four slices, one for each side
  of the boss between the fixed spots, out to the arena edge.
- The stack and the spread do not move toward the first weapon of the second set (owner,
  2026-11-23: an earlier rule did). For a long run, use Sprint, a movement ability or a
  scholar's Expedient.
- The second Void Stardust: the boss stays on the third weapon. The group starts at his butt,
  directly behind him, and goes clockwise around him.
- The second Comet spread turns the fixed spots with the boss (owner, 2026-11-25, issue #125):
  his front is relative north, so MT is front left, OT front right, M1 back left, M2 back
  right. In the first one he counts as facing north. A turned spot that reaches past the wall
  (a fraction of a unit) stays on the edge.
- Every tab teaches the second Void Stardust's start spot (issue #125): the Timeline row, the
  Learn card `k-void-2-start`, the Practice drill `m-void-2` (owner's choice over a link to
  Pressure) and the Cheat Sheet. The drill builds a random second weapon set and starts where
  it leaves the boss. The Learn pictures put him on the NE weapon, facing east (he jumped from
  NW), where the puddles' numbers stay clear of the waymarks.

### Later mechanics

- Dance of Domination: seven hits. The lines on the floor show just after the 7th hit.
- Ultimate Trophy Weapons: the first spawn is south. Slightly west means clockwise, slightly east
  means counterclockwise. The second is NW or NE, then the cardinals. He resolves them in spawn
  order. The last one is always north (Hector's video; the owner confirmed it, November 25), so
  the Learn card and the drill's rule say so.
- Ultimate Trophy Weapons, the tornadoes (issue #79, the owner's answer, November 24): every
  tornado has two baits. Facing in from the tornado, the support stands on its left and the DPS
  on its right, at its edge, 45 degrees off the line to the middle (`TORNADO_BAITS`). After the
  answer, Practice, Pressure and Learn show all eight Powerful Gust cones. A 90-degree cone that
  points 45 degrees off a cardinal runs along the grid, so the arena clips it to a box. An arrow
  from each tornado toward its bait (`aim`, the app's choice) shows which way each cone goes.
  Each tornado is drawn at its BossMod voidzone, 4 yalms (`Maelstrom`, `TORNADO_R`; issue
  #159). BossMod gives no bait spot, so the spot stays at its edge, and a click inside the
  tornado counts as incorrect (the owner's answer, November 25).
- Orbital Omen (Hector's dodge): stay against the boss hitbox, at his side, where the #2 lines
  cross. After #1, cross through him to the other side. After #2, cross back.
- Orbital Omen in the full fight (owner, November 25, after a fight review): the last step
  ("stay there") is checked when the #4 lines go off, not #3, so the run checks that you stay
  through #4. The first step stays due at the #1 lines, not at Fire and Fury 0.6 seconds later.
  Fire and Fury is two 90-degree cones, front and back. The cross from your side spot to the
  opposite middle square is a straight line through the boss's middle, 63 degrees off his facing,
  so it stays out of both cones. Waiting for Fire and Fury leaves 1 second for the cross: too
  little. Hector's video says Fire and Fury comes "at the same time" as #1; cactbot decides.
- Meteorain, your meteor: H1 drops it NW, in max melee. H2 drops it SW, in line with the first SW
  rock, farther out. Icy Veins swaps H1 and H2 here. The site follows wtfdig.
- Meteorain rocks (owner, November 25, after a fight review): the rocks near the boss land in his
  max melee, not under him. Before this the app had them inside his hitbox, about 4 yalms out,
  and the stacks "behind" them only about 8 yalms out, level with the real rocks. The spots
  (`METEOR_ROCKS`) are the app's choice, on the intercard lines, at the distances measured in
  Hector's guide video (9:02 to 12:04; the arena is 666 px for 40 yalms): M1's NE rock 20 units
  (video 20.2), M2's SW rock 15.5 (15.4), H1's NW drop anywhere NW in max melee, best at 20
  (22.6; wtfdig's picture 19.5), R2's NE rock 18 (18.2). H2's and R1's rocks stay (34 and 57).
  The party stacks 30 units out behind a rock (`BEHIND_ROCK`; video 28 to 32).
- Meteorain, the healers' markers (owner, November 25, after a fight review): "Meteorain: Your
  Meteor" first asks the healers to go under the boss, so they are the two closest when the
  second set of markers comes (cactbot's "--Meteor Markers 2--", 5:03, a "Meteor markers" line in
  the full fight). Hector's guide video (9:43 to 9:59) and wtfdig ("Bait meteor close") both say
  so. Anywhere inside his hitbox is correct. Then the drop, as before.
- The tank tethers in Meteorain are tank busters at 5:09, 5:19 and 5:29.
- Crown of Arcadia, a raidwide, comes five times.
- Arena Split follows Hector No Buddies (wtfdig `#hector:hector:fixed`), the owner's choice in
  November 2026; before that the app followed Kindred No Buddies. The two differ in the conga:
  Hector puts tanks and ranged north and healers and melee south, so H1 lines up SW and soaks the
  SW tower with M1, and H2 the SE tower with M2. Kindred had supports NW and SE.
- The number waymarks are the "Kindred Outside" preset (naurffxiv's M11S page: 1 to 4 at x 84 and
  116, z 89 and 111; A to D 10 yalms from the middle), the set Hector's video uses so a Fire
  Breath marker can stand on the outer corner. Measured from the video, it matches to 0.1 yalm.
  The app had the Toxic Friends preset (z 87.5 and 112.5), which is made for the inside corner.
- Arena Split after the first towers (owner's answers, checked against wtfdig and Hector's video,
  November 2026):
  - You have a tether in one of the two rounds, not both: the tethers swap in the second round.
    Pressure's Settings pick says which round ("Your Arena Split tether").
  - Each tower knocks the players in it 23 yalms straight away from its middle (BossMod's
    `ExplosionKnockback`, `TOWER_KNOCKBACK`), so where you stand in it decides where you land
    (owner's answers, November 2026, from Hector's video at 13:08). The correct area is the part
    of your tower from which that knockback lands you on the right platform (`towerHalf`, with
    `knockedFrom` and `landsWell`): to cross from the SW tower, about due east or a little
    north-east. The owner pointed out that a whole half was wrong: from its SE edge the knockback
    throws you off the arena.
    - A tether ends on the platform across from its portal. With its portal on your side, stand
      on the side facing the other platform: you land across. With its portal already across,
      you stay (Hector 13:16, wtfdig "KB to other side if you need to stretch tether").
    - Without a tether you stay: stand on the side facing the platform's middle, and you land at
      its other end. Healers start in the south towers, so round 1 without a tether ends north.
    - So the platform you end on depends on your portals: it is no longer fixed after round 2.
      Your portal's side is random each round in the drills and the full fight.
    - Before November 2026 the app counted the whole tower as correct, always put your portal on
      your side, and kept a no-tether player at the tower's end.
  - The split arena is drawn to scale from BossMod's Flatliner file (`BOSSMOD_SPLIT`, issue #89):
    each platform is 20 yalms wide and 40 long, 16 yalms from the boss to its middle, with a
    12-yalm gap. Together the platforms are wider than the square arena, so the arena draws the
    split smaller about its center to fit the same box (`SPLIT_SCALE` in `Arena.tsx`). Before
    #89 the platforms were drawn half as wide, and the third puddle covered every lineup spot.
  - The side portal lines (Majestic Meteorain, BossMod lines at x -21, -11, 11 and 21, 10 yalms
    wide) cover one half of each platform's width, its whole length: the inner half of one
    platform and the outer half of the other, random each round. Sources: Hector's guide video
    (https://youtu.be/w1uuwzhyf5A, 12:31 and 14:44) and wtfdig's Kindred No Buddies pictures,
    checked by the owner in November 2026. Before #89 the app had them over a north or south end.
  - Each round: everyone goes in close, to the middle of the platform's inner edge, to bait the
    puddles; without a tether you bait Fire Breath there first. Then each player goes to their
    end of the platform (owner's answers, November 2026):
    - Your end is where the tower threw you, and you bait the puddles toward it (the owner,
      November 2026): across, you land at your tower's end; staying, at the other end. In the
      full fight your portal is then in the other half.
    - With a tether, your end is the one away from your portal. The four tether portals are just
      outside the outer walls, two on each side, at the ends or near the middle (Hector's video,
      12:34). Your portal is on the other platform's side. The tether goes to the north or south
      wall at your end, just outside the portal lines.
    - Without a tether, your end is the one you were knocked to: the other end from your tower
      (round 1: north for both healers; round 2: the other end from where round 1 ended). A Fire Breath marker goes to
      the number waymark at that end, on its corner nearest the wall, on the side of the waymark
      the portal lines leave safe (the owner's choice, from Hector's video). The number waymarks
      sit on the line between the two halves, as in Hector's video.
  - Tethers go to random roles: two tethered players on each platform, in any mix of roles (the
    owner, November 2026). In the second round the tethers swap: the four untethered players of
    round 1 get them.
  - The tethers on the arena (issue #85, owner's answers, November 2026):
    - The other end of each tether is a portal. The four portals stand 5 yalms outside the outer
      walls (`PORTAL_OUT`), two on each side: one side's pair near the ends (5 and 35 yalms from
      the north wall), the other's near the middle (15 and 25), random each round. BossMod has no
      portal spots, so they come from cactbot's "Tether Collect" trigger: x 69 and 131, 31 yalms
      from the middle (the owner, issue #167; before, 3 yalms, from Hector's video, 13:36). The
      owner first asked for the wall line, then chose these spots, because on the wall line a
      correct tether spot measured under 48 yalms and stayed red.
    - Red when short, blue when stretched. Stretched means at least 48 yalms from the portal
      (BossMod's `StretchDistance`, `TETHER_STRETCH`), which BossMod calls an estimate. The correct
      tether spot must be stretched too, so the part of the wall next to the gap can be incorrect.
    - Every tether shows: yours follows you from the first step (your last click in Practice, the
      moving marker in Pressure). The other three or four show, stretched, when the lineup step
      is answered, on random players at the wall (the owner chose the lineup over the start).
    - At the towers your tether runs from its portal to you, from the start of the towers
      (cactbot's "--tethers--" in the full fight), so you see before the knockback which way to
      go (the owner, November 2026). First Towers and Second Towers both have a tether and a no
      tether pattern in Practice.
    - A tether is a solid cord on a light outline; a guide stays thin white dashes. `/styles` shows
      both. To fit the portals, the split arena is drawn smaller (`SPLIT_SCALE`).
  - Majestic Meteor (owner's answers, November 2026): three puddles, one click each. The first
    goes in close at the middle of the inner edge. Each next one goes just outside the last, tight
    against the inner edge (`INNER_STRIP`, the app's choice), toward your end. A puddle drops when
    its cast starts ("--meteor 1--" to "--meteor 3--") and goes off 3 seconds later (BossMod
    `MajesticMeteorAOE`, range 6).
  - The third puddle goes off 0.2 seconds after Fire Breath, so it is still on the floor at the
    lineup. A tether and a marker both stay out of it.
  - When the tethers go off (Majestic Meteowrath, "range 60 width 10 rect"), a line runs from each
    portal through its player. The lineup step shows all four lines after you answer. The other
    players' lines must miss you (`Step.hits`). Hector's video says they "just barely" miss the
    markers; with the app's approximate spots a line can still clip the waymark's corner by up to
    0.6 yalms, so the marker's and the tether's correct areas leave those lines out (the owner's
    choice): the best spot shifts a little off the corner when it has to.
  - With a tether, the correct area at the wall also leaves out (issue #167): each marker's Fire
    Breath (BossMod `FireBreathRect`, a line 6 yalms wide from the boss through the marker), and
    the spots from which your own line, from your portal through you, would hit another player.
    The other players stand at their best spots. Hector's video: the lines "just barely avoid"
    the markers. The best spot does not move.
  - The second and third towers: the tower in the quadrant where your last tether or marker was.
  - Massive Meteor: the four on a platform stack at the middle of its inner edge, next to the boss,
    so the melee can hit him. Learn's Massive Meteor picture shows it there too.
  - Arcadion Avalanche: he faces one platform and grabs it. The towers knock you to the other one.
    Then go to its far end, by the number waymark, away from the side he turns from. The drill
    shows his turn as a dashed arrow around him (the app's choice).
  - The drills draw no Fire Breath cone or slam size: neither is in `attacks.ts` yet. The portal
    lines show as a soft area over the half they cover (`PORTAL_LINE_X`), with the lineup
    question (the app's choice: in the game they show from the start of the round).

### The moving marker (data/route.ts)

- A knockback throws it (`Step.knock`, `THROW_TIME`): at an Arena Split tower's hit it flies
  straight away from the tower's middle, 23 yalms (BossMod), over 0.6 seconds (the app's choice),
  in Watch the Correct Moves and in the run. Then it moves on from where it landed (the owner,
  November 2026).

- It runs to the middle of each spot, never to the edge, because an edge can clip the next player.
  The sword is the exception: it stands at its best spot near the inner corner.
- It leaves a spot 0.2 seconds after the hit, starts for a new mechanic 0.5 seconds after it shows,
  and runs at 15 arena units a second.
- After 8 quiet seconds it goes to the next mechanic's pre-position. The default is up close to the
  boss (50, 56). Both Void Stardusts pre-position at the first puddle.
- A weapon step shows only from the boss's turn (`showOf`). Before he turns, nobody can know the
  spot.

### Scale and sizes

- The arena is 40 by 40 yalms. One arena unit is 0.4 yalm. No guide states the size. It follows
  from the M11S waymark presets (A to D 10 yalms from the center).
- Sizes come from BossMod (`BossMod.Modules/Dawntrail/Savage/RM11STheTyrant`, read on GitHub). The
  boss hitbox is 5 yalms. The shared sizes and shapes live in `src/data/fights/m11s/attacks.ts`.
- Times come from cactbot (`ui/raidboss/data/07-dt/raid/r11s.txt`). Branch labels in that file add
  offsets, so subtract them.
- Issue #96 (November 24): `npm run import:video -- <fight> <YouTube address>...` reads a fight's
  guide videos with yt-dlp and ffmpeg (both from npm). For each video it writes `notes/<fight>/videos/<id>.json`:
  each chapter's name and span, its caption lines with their times, and a still frame every 3
  seconds. With no address it imports again every video the fight has notes for.
  - A fight can have more than one guide video (owner's choice): M11S has Hector's guide
    (`w1uuwzhyf5A`) and his Fixed Stampede mini-guide (`p8cL88OKEWE`, now also on the Cheat
    Sheet's sources). The script takes any YouTube address, and nothing else.
  - Frames for every chapter (owner's choice over only named chapters): the whole video is
    downloaded once, at 720p, video only. The video and the frames stay in `.cache/video/`; the
    chapter text is committed (owner's choice, as for the strat notes).
  - The captions are YouTube's auto-captions, which repeat each line as they roll; the script
    keeps only each caption's new words. They are not exact.
  - The rule stays: a video is only for understanding. Never take a fight time or an attack size
    from it, and mark every position read from it "owner to check". Each notes file says so.
  - yt-dlp and ffmpeg come from npm (November 24), so the script works after `npm ci` on Windows,
    macOS and Linux with nothing else to install (owner's choice). They are optional
    dependencies: when a download fails (GitHub down, a CI runner), `npm ci` leaves the package
    out and goes on, and the script then looks for the tool on the PATH.
    - ffmpeg: `ffmpeg-static` (over 4 million downloads a week, kept up). Its install script
      downloads a static ffmpeg for the platform from the package's own GitHub releases, pinned
      to the package version. The binary is GPL; the site does not ship it, only this script
      runs it.
    - yt-dlp: `ytdlp-nodejs` (MIT). Its install script downloads the official standalone
      yt-dlp of the platform (`yt-dlp.exe`, `yt-dlp_macos`, `yt-dlp_linux`...) from yt-dlp's
      latest GitHub release. Not `youtube-dl-exec`, the better known one: on macOS and Linux it
      downloads the Python zipapp, which needs Python 3.10 or newer (macOS has 3.9 at most). It
      has one maintainer, so the version is exact in `package.json`. The latest yt-dlp at each
      install is on purpose: YouTube breaks old ones.
    - YouTube now needs a JavaScript runtime for yt-dlp; the script gives it the Node.js that
      runs it (`--js-runtimes node:<path>`).
    - Install scripts: npm 11 blocks a dependency's install script unless `package.json`
      lists it in `allowScripts`. The list has the four the site needs: esbuild and workerd
      (the build), ffmpeg-static and ytdlp-nodejs (these downloads). The entries are names, not
      versions (`npm install-scripts approve --no-allow-scripts-pin`): Dependabot updates the
      versions each week but not this list, so a pinned entry would block the next version.
      A new package with an install script needs an entry; `npm install-scripts ls` lists them.
  - naurffxiv's guide (https://naurffxiv.com/savage/m11s) is already a link on the Cheat Sheet's
    sources, for people. The draft job does not read it (owner's choice): the site's robots.txt
    blocks AI crawlers by name, Anthropic's among them, and allows no AI input
    (`Content-Signal: search=yes,ai-train=no,use=reference`). Do not propose an import of it
    unless naurffxiv allows it.
- Issue #95 (November 24): `npm run import:strat -- "<wtfdig address>"` writes wtfdig's strat
  notes for one fight into `notes/<fight>/strat.json`. The address is the one wtfdig shows, with
  the strat and each toggle's option after "#" (owner's choice over a fight id and choices); an
  empty part is the strat's default, so the static's `#hector::fixed` is Hector, its Arena Split
  (Hector No Buddies) and the Fixed (3CJ) Ecliptic.
  - The notes are committed, outside `src/data/` (owner's choice over the cache only, which a
    fresh clone would lack). The images stay in `.cache/wtfdig/`.
  - wtfdig draws its pages in the browser. The script fetches the page, its route file and the
    chunks it imports until one holds the fight's config (`fightKey`), and reads that chunk with
    Vite's JavaScript parser (`parseAst`): it never runs wtfdig's code. (TypeScript 7, the
    project's compiler, has no JavaScript API to parse with.)
  - Every download is cached, the page too, so a second run sends no requests; `--refresh` reads
    the page again. Requests wait 400 ms apart.
  - For each mechanic the notes keep its text as lines, its image, its source, and for each
    role and light party the text, the image and the spot wtfdig rings on it (in percent of
    the image). A phase with no mechanics keeps its own text, image and source.
- Issue #94 (November 24): the import takes any fight. Each fight lists its sources in
  `src/data/fights/<id>/sources.json`, next to its data (owner's choice over one list in
  `scripts/`). `npm run import:sources -- <id>` imports one fight; with no id it imports every
  fight with a list, and `--check` checks them all.
  - `npm run find:sources -- <id>` finds a new fight's files at the newest commits through
    GitHub's file lists (`m10s` is cactbot's `r10s.txt` and `r10s.ts`, and BossMod's folder
    `RM10S*`), and writes the list with `"checked": false`. The import refuses an unchecked
    list, and `test/importSources.test.ts` fails on one, so a person checks every list.
  - The import also reads cactbot's triggers and BossMod's mechanic files, into a short,
    committed summary (`sources.extra.gen.json`): each trigger's id, ability ids, English
    callouts and comments, and each mechanic class's abilities, shapes and positions. Owner's
    choice over raw copies (other projects' code, which needs their licence notices) and over
    the cache only (a fresh clone would lack them). The site does not read it; the draft does.
  - A BossMod ability whose enums comment gives no full shape ("???", "range 60 ?-degree cone")
    takes its shape from the mechanic files when the classes that name it make exactly one shape
    that fits the comment (`sizeFrom` names the file and class). BossMod's code gives a cone's
    angle and a rectangle's or a cross's width as half values; the import doubles them, to the
    full values the enums comments use. Any other one stays `shape: "unknown"` with its text, and
    the site will draw it with a "size unknown" mark (owner's choice). M11S has none. M10S has 3
    left: `ReverseAlleyOopFirst` and `ReverseAlleyOopRepeat` (their classes make two cone sizes)
    and `DeepVarialBoss` (no class names it).
  - The owner asked for one set of standard attacks that every fight draws with: issue #110,
    after #94. M11S moves onto it too.
  - M11S's Arena Split is an "extra" in its list (`"arenaSplit": "Flatliner.cs"`), read by the
    import's own parser. M11S's generated data stayed the same; only its header comment changed.
  - M10S is imported (owner's choice, November 24) at the newest commits, for the draft. It has
    only its list and generated files, and is not one of the site's fights.
  - M12S waits (owner's choice). It will need more than the import has today: its timeline has
    a second part that starts when the first boss is defeated, so jumps reach that label from
    different times; it has two BossMod module folders (`RM12S1TheLindwurm`,
    `RM12S2TheLindwurm`); and their arenas are a rectangle and a circle, not a square.
- Issue #99, the state list (November 25): the import also reads BossMod's `<module>States.cs`
  into `sources.extra.gen.json` (`states`), for the draft. It is C# code, read as plain text in
  Node.js: each phase in the constructor, each state call of `StateMachineBuilder` with its id,
  ability or component, delay, cast time, name and time into the phase, and what its chained
  calls turn on and off. A method of the class is a phase block, kept as a group. The import
  stops on any call it does not know (a fork, an `if`, `.OnEnter`), so a person sees each new
  kind. A Roslyn tool waits until the plain text gets fragile, and only with the owner's yes.
  - cactbot stays the source of every time. `test/importSources.test.ts` checks that each named
    state has a cactbot line within 1 second, counted from the line of the named state before it
    (BossMod's own delays drift: its summed delays reach the enrage 3.0 s after cactbot in M11S
    and 2.1 s in M10S). It prefers a line of one of the state's abilities, else any line at that
    time. The states with no line are in `STATE_MISMATCHES`, questions for the owner.
- Issue #14 (November 23): `npm run import:sources` imports both sources at pinned commits into
  `src/data/fights/m11s/source.gen.ts`, and the data files read every time and size from it. The owner chose
  a generated file over a check alone. The downloads stay in `.cache/sources/`, never committed.
  The import keeps game names as cactbot writes them, so it converts no text. A value that
  matches no source stays typed by hand, on a list in `test/sources.test.ts`, as a question for
  the owner. `npm test` runs that test; `npm run check:sources` also compares the generated file
  with the pinned sources, which needs the network, so CI does not run that part yet (the
  owner's choice).
- The owner's answers to the import's questions (November 24):
  - A scene appears at the first cactbot line after the last hit of the mechanic before it, so
    that result stays on the arena for a moment. Void Stardust (Second Time) keeps 1:46: no line
    comes between the last weapon (1:45.1) and its first puddle (1:47.2).
  - Times in the text follow cactbot, rounded to the second (0:55.5 shows as 0:56).
  - The tornado cones and Fire Breath are drawn at BossMod's sizes: a 90-degree cone, 60 yalms
    long, and a line 6 yalms wide. The proximity AoE stays a small circle where it lands, the
    app's choice: the real one covers the whole arena.
- Issue #100 (November 24): `test/answers.test.ts` answers every drill with its correct spot,
  for both slots and 30 pattern codes. It fails when the spot is in an attack of that step, or
  in a dropped puddle that is still on the floor. The puddle times come from the full fight
  (`due`, and `drop.life` from BossMod).
  - `reveal` was not enough: it also shows the attacks that the player takes on purpose (a
    stack, a bait, their own protean cone). So a step can list `hits`, the attacks that must
    miss the correct spot. Five places set it: the scythe weapon (the donut and the other seven
    cones), Raw Steel Trophy's scythe (the two tank cones), the tornadoes (the other seven
    cones), and Two-way and Four-way Fireball (the other Line Stacks). Nothing draws `hits`.
  - A scene's `overlays` count only for their puddles, at every step: the other attacks there
    can go off much later.
  - The first run found no correct spot in an attack.

## Hosting

- Cloudflare Workers Builds, project `ffxiv-raid-drills`, on the owner's personal account. Build
  `npm run build`, deploy `npx wrangler deploy`, preview `npx wrangler preview`.
- `wrangler.jsonc` needs `"previews": {}`, or the preview build fails. It also sets
  `not_found_handling` to `single-page-application`, so deep links load.
- `vite.config.ts` uses base `/`. The base `./` breaks deep paths.
- Custom domains: `ffxiv-raid-drills.app` (live) and `<branch>.ffxiv-raid-drills.app`
  (previews).
- The Cloudflare check run on GitHub has no log text. Read the state with
  `gh api repos/mander77/ffxiv-raid-drills/commits/<sha>/check-runs`. The owner can paste logs from
  the dashboard.
- The repository merges by pull request with "Rebase and merge", not by fast-forward push.
  GitHub deletes the merged branch on GitHub.
- Build watch paths (Cloudflare dashboard: the Worker, Production chosen at the top, then
  Settings > Build > Build watch paths) cover `main` only: a push to `main` that changes only
  files outside the app makes no live deploy. Branch builds ignore them (tested with two
  docs-only pushes to a test branch; others report the same), so Cloudflare's preview builds are
  off, and GitHub Actions makes the previews.
- Cloudflare's preview builds are off through its API, not the dashboard. Unticking "Enable
  Preview Builds" (Settings > Build > Branch control) did not stop them: each new branch got
  its own preview build anyway (cloudflare/developer-platform#75, open). The fix is an
  undocumented field, set by the owner with a user API token that has Workers CI edit:
  `PATCH https://api.cloudflare.com/client/v4/accounts/<account>/builds/workers/<worker tag>`
  with `{"previews_enabled": false}`. A new docs-only branch then got no Cloudflare build;
  `main` still builds. To undo it, send `true`. Cloudflare may change or drop the field: if
  branch pushes get a "Workers Builds" check again, look here first. The fallback is to
  disconnect the repository in Cloudflare and deploy `main` from GitHub Actions too.
- Build watch paths, how they match: Cloudflare drops the changed files that match an exclude path first, then builds if any file
  left matches an include path. Its wildcard `*` may stand only alone or at the start or end of
  a path. Include: `*`. Exclude: `docs/*`, `*.md`, `.github/*`, `.claude/*`, `skills-lock.json`,
  `test/*`, `e2e/*`, `scripts/*`, `playwright.config.ts`, `biome.json`,
  `components.json`, `.gitignore`, `.gitattributes`, `.nojekyll`. Everything else counts as the
  app (`src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`,
  `tsconfig.json`, `wrangler.jsonc`, `.node-version`), and so does any new file, so a forgotten
  path costs a build, never a missed deploy. Cloudflare builds anyway for a push with 20 or more
  commits or 3000 or more changed files. When a new file outside the app comes in at the top
  level, add it to the exclude list in the dashboard, here and in `paths-ignore` in `.github/workflows/preview.yml`.

## CI and the main ruleset

- GitHub Actions, `.github/workflows/ci.yml`, on pull requests to `main` and on pushes to
  `main`, not on a branch push alone: the owner chose this on November 23 to save Actions
  minutes, so a branch runs CI only once it is ready for a pull request. Two jobs: "Lint, types,
  tests, build" and "Browser tests" (Chromium, Firefox and WebKit; the Playwright report is kept
  for 14 days when a test fails). A small job, "Playwright
  version", reads `@playwright/test` from `package-lock.json`, and "Browser tests" runs in
  Playwright's image of that version (`mcr.microsoft.com/playwright:v<version>-noble`), so it
  downloads no browser and runs no `apt-get`, and a Dependabot update moves the image with the
  package. `npx playwright install --with-deps` once hung for 10 minutes on a slow Ubuntu mirror
  and blocked `main`. A browser cache was not chosen: the Playwright docs say it saves little,
  and it does not cover the system libraries, which were the slow part. On CI the browser tests
  run fully parallel on 4 workers (the runner's CPUs), against the built site (`vite build`,
  then `vite preview`), not the dev server, whose first visit to each page is slow. On your
  computer they use the dev server. Actions are pinned to a commit, the token can only read, and a newer push cancels an older run of the same pull
  request (not on `main`, where each commit keeps its run). CI does not skip any path, because a
  pull request needs both checks.
- Pull requests, not fast-forward pushes (owner's choice, November 23). With several sessions
  at work, each publish moved `main`, so every other branch had to rebase, and each rebase was a
  new commit with a new CI run and a new preview approval. The ruleset's required checks are not
  strict (a branch need not be up to date with `main`), so GitHub merges a pull request whose
  last commit passed CI even when `main` moved, and "Rebase and merge" puts its commits on top.
  The cost: two branches that passed on their own are not tested together before the merge. CI
  on `main` runs after it. GitHub's merge queue would close that gap, but it needs a repository
  owned by an organization.
- A repository ruleset, "main", on the default branch, with no bypass (the owner too): the two CI
  jobs must have passed (on a pull request's last commit, or on the commit a direct push ends
  on), no force push, no deletion, linear history (no merge commits). CI no longer runs on branch
  pushes, so a direct push to `main` always fails this rule: every change goes through a pull
  request. In an emergency, turn the ruleset off in Settings > Rules > Rulesets, and back on after.
- A second ruleset, "main: pull requests": only the owner may push to `main` directly. Everyone
  else needs a pull request, merged by rebase or squash. It needs no approval: the owner chose
  this so their own pull requests merge without a bypass. GitHub cannot tell rules apart by who
  wrote a pull request, but only people with write access can merge one, and today that is only
  the owner. Give someone else write access, and set the approvals back to 1 first. The
  repository admin role (only the owner) bypasses this ruleset only. It is a ruleset of its own,
  because a bypass covers a whole ruleset, and the CI rule must bind the owner too.
- `npm run publish` pushes the branch and opens its pull request. It pushes with
  `--force-with-lease --force-if-includes`, so a rebased branch goes up with no manual force
  push, but a commit that another session pushed to the branch, and this checkout has not seen,
  stops the push instead of being lost. `npm run publish -- main`
  waits for the two checks on the branch's last commit, then runs
  `gh pr merge --rebase --match-head-commit <sha>`, so it merges only the commit CI checked.
- Branch previews come from GitHub Actions, not from Cloudflare's builds:
  `.github/workflows/preview.yml`, on branch pushes, with GitHub's `paths-ignore` filter (the
  same list as the watch paths), so a docs-only push makes no preview and the last one stays.
  GitHub has no path filter for a single job, only for a whole workflow, and a skipped workflow
  leaves its checks pending, so the preview is a workflow of its own and CI has no filter. The
  job waits for the owner's approval, then runs `npx wrangler preview --name <branch>` (with "/"
  as "-"), at `<branch>.ffxiv-raid-drills.app`. It does not wait for CI, so look at CI
  before you approve. Pushes to `main`, pull requests and Dependabot get no preview. A pull
  request from a fork never gets the token.
- The GitHub environment "preview" holds the token and asks for the owner's approval on each
  run (required reviewer: the owner; admins cannot skip it). Secret `CLOUDFLARE_API_TOKEN`: a
  Cloudflare account API token (Manage Account > API Tokens), only for this account, with
  Workers Scripts edit and Account Settings read, and an end date; renew it before then.
  Variable `CLOUDFLARE_ACCOUNT_ID`. Cloudflare has no keyless sign-in (OIDC) for GitHub
  Actions yet; check again when the token is renewed.
- wrangler is a dev dependency, because previews need wrangler 4.135 or later.
- Dependabot (`.github/dependabot.yml`) opens a pull request each week for npm (minor and patch
  together, a major alone) and for the GitHub Actions, a week after a release. Merge one with
  "Rebase and merge" (linear history), or pull its branch and publish it as usual.

## Fight review (issue #120)

- `/fight-review <fight id> [mechanic]` (`.claude/skills/fight-review/`) reviews a fight for
  accuracy. Accuracy comes first: a player takes what the site shows into the raid.
- Each kind of fact has one source: times from cactbot, sizes and shapes from BossMod, both at
  the pinned commits; strats and positions from the static, then wtfdig. Videos never decide a
  time, a size or a position.
- It checks the facts, the correct spot for each slot, the order of steps, that every tab gives
  the same answer, and what a new player would do from the first line and the picture.
- It only reads. It never moves a spot or changes a strat. When sources disagree it asks the
  owner. Its findings become issues after the owner checks them.
- It runs in a fresh session, so it reads the sources and not what a session remembers.
- It works in a detached worktree with its own `npm ci`, never in the shared checkout
  (issue #130). With no fight id it reviews the only fight, or asks which one.
- Its whole-area check (`scripts/zone-sweep.test.ts` in the skill) samples every point of each
  correct area, in Practice and in the full fight, because `test/answers.test.ts` checks only
  each area's center. It is not one of the site's tests: the first review found steps it fails
  on (issues #124 and #126), so it would fail CI today. It may join the tests once they are fixed.
- To check screens on `main`, it uses the live site, which is built from `main`.

## Tips

- Vitest hides `console.log` in a passing test. To see a value in a probe test, throw it.
- A preview answers a deep link such as `/learn` with 404 to a bare `curl`, and with the page to
  a browser. To test one with curl, send a browser's headers:
  `curl -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document' <url>`.
- An arena picture's view box is `-4 -6 108 110`. The row above the floor (y -6 to 0) holds only the
  "N", which is where the player's "Paused" badge sits.
