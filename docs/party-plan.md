# The whole party on the arena (issue #217): plan and spot list

A plan for the owner to read before any code changes. It lists, for every drill step, where
each of the other seven players stands, and where that spot comes from. A spot with no source
is marked **owner to give**. Nothing here is guessed.

Sources, short:

- **W**: wtfdig's strat notes for the static's strat (`notes/m11s/strat.json`).
- **D**: already in the drill code, so already checked (the constant or function is named).
- **O**: an owner decision in `docs/decisions.md`.
- **you**: stands with you (a stack, a shared tower). Drawn packed around your spot.
- **other H**: the other healer. Their spot is the drill's own answer for their slot.
- **?**: owner to give.

## How the site draws players today

- Your own spot: in Practice your click (a dot); in Pressure the moving marker (`src/data/route.ts`,
  `correctRoute`, `runnerAt`), drawn on top in `FightArena.tsx`.
- Other players: one-off `{t:"mark"}` overlays, in a scene's `overlays` (always shown), a step's
  `cue` (shown from its question to the end of the drill), or a step's `reveal` (shown after its
  answer). A scene's `headMark` puts one player with a stack or spread marker.
- That is why #218 happens: Comet's tank and melee marks are a `cue`, so they stay until the
  drill ends, through the second weapons.

## The proposed shape

1. **`Step.party`**: where each other player stands once the step resolves, as
   `Partial<Record<SlotName, Point | "you">>`. A point is a fixed spot in the scene's own units
   (the arena turns it, like any zone). `"you"` stands with you, packed around your spot.
2. **`Scene.partyStart`**: where they stand before the first step. When a scene leaves it out,
   they use one **rest formation** for the whole fight (see the questions below).
3. **The rule for hiding** (one rule, no flag on most steps): while a step is asked, every other
   player stands where they were for the step before. They move to this step's spot once you
   answer it. So a mark never shows the answer before you give it.
   - A step can list `early: SlotName[]`: players who move before your answer because their spot
     gives nothing away (the tanks in front for Raw Steel Trophy, the Comet fixed spots).
4. **Practice**: LiveArena draws the party in the marks layer, under your dot and your marker.
5. **Pressure**: each other player gets a route like yours (`correctRoute` per slot, `runnerAt`).
   - Watch the Correct Moves: they move with the clock, as your marker does.
   - The run: a player goes to a step's spot only after you answered that step (or its time ran out).
   - Between mechanics, they go to the rest formation after a quiet stretch, as you go to HOME.
6. **Remove** the one-off marks the party replaces: the Comet marks (#218), the Raw Steel tank
   marks, the axe spread marks, the Arena Split other-tether and other-marker marks, the
   Foregone Fatality tank marks, the first Line Stack tank marks, the Ecliptic baiter marks and
   wall marks. The tethers, markers and attacks stay; they draw on the party's spots.
7. **Tests**: every step of every drill, both slots, every variant, has a spot for all seven
   others; before an answer no player stands at that step's spot (unless `early`); after Comet, no
   tank or melee mark is at its spread spot (#218); `test/answers.test.ts` spots do not move.

Learn and the Cheat Sheet: their pictures already draw players for each answer (a wrong answer
draws the party in the wrong place). See question 4.

## Order of work, in small pull requests

1. The engine, the test, and Void Stardust (both) and Raw Steel Trophy. Fixes #218.
2. The rest of Phase 1: Assault Evolved, Dance of Domination, Ultimate Trophy Weapons, Tornadoes.
3. Phase 2: Orbital Omen, Meteorain.
4. Phase 3: the Arena Split (the hardest: who stands where depends on random tethers).
5. Phase 4: Ecliptic Stampede, Heartbreak Kick.
6. Learn and the Cheat Sheet, as question 4 decides.

## The spot list

Spots are for the step after it resolves. "Before" is the start of the drill.

### Raw Steel Trophy: Axe (`m-raw-axe`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| Before | AXE_TANKS - 3 (D) | AXE_TANKS + 3 (D) | ? | ? | ? | ? | ? |
| Spread | AXE_TANKS - 3 (D, W) | AXE_TANKS + 3 (D, W) | AXE_SPREAD_SPOTS (D, W) | SW max melee (D, W) | SE max melee (D, W) | west wall (D, W) | east wall (D, W) |

### Raw Steel Trophy: Scythe (`m-raw-scythe`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| Before | ? | ? | ? | ? | ? | ? | ? |
| Stack | NW (37, 36) (D, W) | NE (63, 36) (D, W) | you | you | you | you | you |

### Assault Evolved, and each weapon of the second set and of Ultimate Trophy Weapons

| Weapon | MT | OT | other H | M1 | M2 | R1 | R2 |
|--------|----|----|---------|----|----|----|----|
| Axe | you | you | you | you | you | you | you |
| Sword | your LP: you; other LP: the other pocket's stand spot (D, W: light party 1 left, 2 right) | | | | | | |
| Scythe | clock spot 0 (D CLOCK, W) | 180 | 90 or 270 (D) | 225 | 135 | 315 | 45 |

- Sword: light party 1 is MT, H1, M1, R1; light party 2 is OT, H2, M2, R2 (W).
- Scythe: the clock spots around him, from his front, at the same distance as the healers'
  spots (9.5 units, already the app's choice for H1 and H2). **Owner to check**: the same
  distance for everyone.
- Before the first weapon: the rest formation (question 1).

### Void Stardust into the Second Weapons (`m-void`) and Void Stardust (Second Time) (`m-void-2`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| Look Ahead (m-void) | rest formation | | | | | | |
| Puddles 1 to 3 | you | you | you | you | you | you | you |
| Comet (spread) | front left (D FIXED_SPREAD, O) | front right (D, O) | other gap (D cometSpread) | back left (D, O) | back right (D, O) | ? | ? |
| Crushing Comet (stack) | you | you | you | you | you | you | you |
| Weapons | as Assault Evolved | | | | | | |

- Puddles: the party drops its puddles together, so everyone stands with you (D: `cometMark`
  "the healer stands with you"). **Owner to check** that the whole party, not only the healer,
  drops on one spot.
- Comet, R1 and R2: the drill says "healers and ranged take any open spot". H1 takes the gap on
  his left and H2 on his right (D). The front and back gaps are left. **Owner to give**: which
  ranged takes which.
- Comet's tank and melee spots can move before your answer (`early`): today they show from the
  question.
- After Comet, the next step moves them on: this fixes #218.

### Dance of Domination: Pairs (`m-dance`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| Before | ? | ? | ? | ? | ? | ? | ? |
| Pairs | west pair (D DANCE_PAIRS, W) | east pair (D, W) | their pair spot (D) | with MT (W) | with OT (W) | with H1 (D, W) | with H2 (D, W) |

### Ultimate Trophy Weapons: Tornadoes (`m-tornado`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| Bait | ? | ? | H1 west, H2 east (D) | ? | ? | ? | ? |

- The drill gives only the healers' tornadoes. **Owner to give**: which tornado each tank takes
  (support side), and which tornado each DPS takes (DPS side).

### Orbital Omen (`m-orbital`)

| Step | MT | OT | other H | M1 | M2 | R1 | R2 |
|------|----|----|---------|----|----|----|----|
| All four | ? | ? | ? | ? | ? | ? | ? |

- **Owner to give**: does the whole party do Hector's dodge with you (one square), or do the
  tanks, melee or ranged stand somewhere else? The main tank points the boss north.

### Meteorain (`m-meteor-1` to `m-meteor-4`)

| Drill, step | MT | OT | other H | M1 | M2 | R1 | R2 |
|-------------|----|----|---------|----|----|----|----|
| 1: First Line Stack | in front, FIRST_STACK_TANKS (D, W) | in front (D, W) | you (W) | NE rock (D, W) | SW rock (D, W) | you (W) | you (W) |
| 2: markers | ? | ? | you (D, W: healers close) | ? | ? | ? | ? |
| 2: drop | NE tether, halfway (D fatality, W) | SW tether (D, W) | their meteor (D) | behind NE rock (W) | behind NE rock (W) | behind NE rock (W) | behind NE rock (W) |
| 3: Third Line Stack | NW tether (D, W) | SW tether (D, W) | you (W) | you (W) | you (W) | SW far rock (D, W) | NE rock (D, W) |
| 4: Last Line Stack | NE tether (D) | SW tether (D) | you (W) | you (W) | you (W) | you (W) | you (W) |
| 4: Shockwaves 1 to 3 | ? | ? | you (W: "run SW to hide") | you | you | you | you |

- Step 2 markers: wtfdig says the melee and ranged stand behind the NE rock for the drop. **Owner
  to give**: are they already there when the healers go in for the markers, and where are the
  tanks before they take the tethers?
- Shockwaves: **owner to give**: do the tanks hide with the party?

### Arena Split (`m-split-line`, `m-split-tower`, `m-split-fire`, `m-split-towers2`, `m-massive`, `m-avalanche`)

Light party 1 west, light party 2 east; tanks and ranged north, healers and melee south (O, W:
Hector No Buddies).

| Drill, step | MT | OT | other H | M1 | M2 | R1 | R2 |
|-------------|----|----|---------|----|----|----|----|
| Lineup: before Flatliner | close, west, a little north (D rule) | close, east, north | their spot (D) | close, west, south | close, east, south | close, west, north | close, east, north |
| Lineup | west, north end | east, north end | their spot (D) | west, south end | east, south end | west, north end | east, north end |
| First towers | NW tower | NE tower | their tower (D) | SW tower, with H1 (D) | SE tower, with H2 (D) | NW tower | NE tower |
| Fire Breath lineup | D: `othersAtLineup`, `markersAtLineup` | | | | | | |
| Second towers | the quadrant each ended in (D) | | | | | | |
| Massive Meteor | the four on each platform stack at its inner edge (D) | | | | | | |
| Arcadion Avalanche | the far outer corner of the back platform (D) | | | | | | |

- The lineup and the towers: where in the zone or tower each player stands is the app's choice
  (side by side, clear of each other), like the healers' spots. **Owner to check**.
- Which way each other player's tower knocks them depends on their own tether. The drills know
  only yours today. **Owner to give**: model each player's tether (random, as the full fight
  does), or show the others in their tower's middle until the knockback, then at their landing.
- Fire Breath's puddle steps: wtfdig says "everyone go center E/W to bait puddles, one pair go
  North, one pair go South". **Owner to give**: which pair goes with you.

### Ecliptic Stampede (`m-ecl-start`, `m-ecl-towers`, `m-ecl-two`, `m-ecl-four`)

| Drill, step | MT | OT | other H | M1 | M2 | R1 | R2 |
|-------------|----|----|---------|----|----|----|----|
| Start | under the boss (W) | under the boss (W) | SW or SE (D ECL_START, W) | under the boss (W) | under the boss (W) | NW (D, W) | NE (D, W) |
| Markers out | under the boss | under the boss | marked: their wall (D); else under the boss (D) | under | under | as H | as H |
| Towers | CW tank tower from A (O, W) | CCW tank tower (O, W) | dead center by priority (O, W) or wait spot (D) | edge of CW pair tower (O, W) | edge of CCW pair tower (O, W) | as H | as H |
| Tethers | a corner (D) | a corner (D) | a corner, or wait spot (D) | ? | ? | as H | as H |
| Two-way Fireball | ? | ? | by wall or corner (D, W) | west, on his hitbox (W) | east, on his hitbox (W) | as H | as H |
| Four-way Fireball | ? | ? | by wall or corner (D, W) | SW, on his hitbox (W) | SE, on his hitbox (W) | as H | as H |

- Tethers: the four tethered players (the tanks and the two in the tower middles) each end in
  one corner; which corner depends on their portal (random). **Owner to give**: the melee's spot
  after the towers.
- Two-way and Four-way: **owner to give**: which Line Stack each tank joins.

### Heartbreak Kick (`m-hb`)

| Variant | MT | OT | other H | M1 | M2 | R1 | R2 |
|---------|----|----|---------|----|----|----|----|
| Party soaks | you | you | you | you | you | you | you |
| Tanks invuln | in the tower | in the tower | out, ? | out, ? | out, ? | out, ? | out, ? |

- **Owner to give**: where the six stand out of the tower when the tanks soak it.

## The owner's answers (2026-11-27)

1. **The rest formation**: one formation for the whole fight. The app chooses the spots and the
   owner checks them in the preview: the tanks just in front of the boss's hitbox, the melee in
   max melee behind him, the healers and ranged about 12 yalms out behind him, light party 1 on
   his left (`REST` in `src/data/partyRoute.ts`).
2. **The hiding rule**: the others move to a step's spot only once you answer it, except players
   listed as `early`.
3. **The order of work**: as above.
4. **Learn and the Cheat Sheet**: the whole party on the answer picture only, in the last slice.
5. Comet: R1 takes the gap in front of the boss, R2 the gap behind him.
6. Void Stardust's puddles: the whole party drops them together, on one spot.

## Decided while building slice 1

- The players who stand with you stand on a small ring around your spot, 6 units out, each slot
  at its own angle, so every mark shows (`stackedAt`). The other light party's sword stack stands
  the same way around the other healer.
- A mechanic's start spot (`Scene.party.start`) is taken once the mechanic appears, not before:
  in Pressure the tanks went to the scythe spots before the boss showed the scythe.
- The party draws in its own layer, under the labels, so "Correct spot" stays readable over a
  stack.
- A mechanic that does not draw the party yet leaves them off the arena in Pressure, until its
  slice.
- Comet's tanks and melee go to their spots as soon as Comet is asked (`early`), as the old marks
  did. Every player has a spread marker then, and the markers go once you spread.
- In this slice Learn and the Cheat Sheet draw the same players as before.
