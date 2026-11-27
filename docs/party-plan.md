# The whole party on the arena (issue #217)

Every player now shows where they belong at every step of the fight, in Practice and in Pressure
(the run and Watch the Correct Moves). This file lists where each spot comes from, and what the
owner should check in the preview.

Sources, short:

- **W**: wtfdig's strat notes for the static's strat (`notes/m11s/strat.json`).
- **V**: Hector's guide video (`notes/m11s/videos/w1uuwzhyf5A.json`, captions and frames). A
  spot read from a video is **owner to check** (CLAUDE.md).
- **D**: already in the drill code. **O**: an owner decision (`docs/decisions.md`, or below).
- **App**: the app's choice: where in a spot each player stands, so every mark shows.
- **you**: stands with you, on a small ring around your spot (`stackedAt`).

## The rules (owner, 2026-11-27)

- While a step is asked, the others stand where they were for the step before. They go to the
  step's spot once you answer it (`Step.party`), so a mark never gives the answer away. A step's
  `early` players go as soon as it is asked (Comet's tanks and melee).
- A mechanic's start spots (`Scene.party.start`) are taken once it appears, not before.
- Before a mechanic with no start, and in Pressure's quiet stretches, everyone stands in one rest
  formation (App, owner to check): the tanks just in front of the boss's hitbox, the melee in max
  melee behind him, the healers and ranged about 12 yalms out behind him, light party 1 on his left.
- The party draws in its own layer, under the labels; your own mark stays on top.
- A knockback throws the others too, each from their own tower (`Step.partyKnock`).
- Learn and the Cheat Sheet: the whole party on the answer picture only, in a later slice. Today
  they draw the same players as before.

## Where each player goes

### Phase 1

- **Raw Steel Trophy, axe**: the tanks together in front from the start (D, W); the other six on
  their spread spots after the answer (D, W).
- **Raw Steel Trophy, scythe**: the tanks on their cones from the start (D, W); the others stack
  with you (W).
- **Every weapon** (Assault Evolved, the second set, Ultimate Trophy Weapons): axe, everyone with
  you; sword, your light party with you and the other one around the other healer in the other
  pocket; scythe, each player on their clock spot around the boss, 9.5 units out (D CLOCK, W; the
  distance is App, owner to check).
- **Void Stardust**: the whole party drops the puddles and stacks with you (O). Comet: the tanks
  and melee on their fixed spots (D, O), the other healer in their gap, R1 in front, R2 behind (O).
- **Dance of Domination**: the four pairs, MT with M1, OT with M2, H1 with R1, H2 with R2 (W, D).
- **Tornadoes**: north MT and R1, east H2 and R2, south OT and M2, west H1 and M1; the support on
  the left facing in, the DPS on the right (V 6:25, owner to check).

### Phase 2

- **Orbital Omen**: the whole party does the dodge with you (V 8:00: "everyone's going to go into
  the same quadrant").
- **Meteorain, first set**: the tanks in front under the boss (W; the spot is App), M1 NE and M2 SW
  on their meteors (D, W), the others with you.
- **Second set**: both healers under the boss for the markers (V 9:43); the melee and ranged behind
  the NE rock (W, V 10:41); then MT on the tether to the northern rock, OT the southern (V 10:12).
  A tank stands 0.7 of the way from the portal to the rock (App).
- **Third set**: the ranged in close, then R1 far SW and R2 NE (V 11:15, W); the tanks on their
  tethers; the others with you.
- **Last set and Triple Tyrannhilation**: the tanks on their tethers, the rest with you behind the
  NE rock; then everybody hides behind the SW row (V 11:35 to 12:02: "everybody needs to be behind
  all three meteors").

### Phase 3: the Arena Split

One plan for all eight players through both rounds (`splitPlans` in `drills.ts`), around your own
path as the fight already builds it (V 12:04 to 16:58, W):

- Flatliner and the lineup: light party 1 west, light party 2 east; tanks and ranged north,
  healers and melee south, in pairs (V, W). Your melee stands with you.
- First towers: each pair's tower. Four players have a tether, two in each light party, so each
  platform keeps two without one (V's example: R1 and M1, OT and R2).
- A player with no tether is never knocked across. A tethered player lands on the platform across
  from their portal, and as many cross from each side, so each platform ends with two tethered
  players and two markers, one of each at each end (V: "you should end up with a 4-4 split").
- Each round: the tethered a step back and the markers in close for Fire Breath; everyone in close
  for the first puddle; then the pairs of each quadrant bait toward their end (V: "we're going to
  break off into pairs"); then each tethered player at the wall and each marker at the waymark
  corner (D).
- Second towers: the quadrant each player ended in (V). The tethers swap.
- Massive Meteor: the four on each platform stack at its inner edge (V). Arcadion Avalanche: each
  player's quadrant tower, then everyone to the safe corner of the back platform (V).
- Where in a tower or a spot each player stands is App.

### Phase 4

- **Ecliptic Stampede**: the tanks and melee under the boss, the healers and ranged out on their
  intercards (W, V). The marked players drop along their walls (D); everyone else waits under the
  boss. Towers (O, from the mini-guide and wtfdig): MT the first tank tower clockwise from A, OT
  the first counterclockwise, M1 and M2 on the edge of the two-player towers (the edge 6 units in
  is App), the two healers or ranged in the middle dead center by H1 > H2 > R1 > R2. Then the four
  tethered players stretch to the corners (which one is random, from their portals), and the other
  four wait in a square inside the hitbox: the north wall's player NW, the south wall's NE, M1 SW,
  M2 SE (V 20:40, owner to check).
- **Four-way Fireball**: the four inner players on the edge of the hitbox on their intercards, the
  tethered ones farther out on their corner's intercard (V 21:10).
- **Two-way Fireball**: M1 west and M2 east on the hitbox (W), the north wall's player behind M1
  and the south wall's behind M2 (W), the tethered ones farther out on their corner's side (W).
  Where in a Line Stack each stands is App.
- **Heartbreak Kick**: the party soaks with you, or the tanks stand in the tower and the others
  wait on their rest spots (App: no source shows where, owner to check).

## Owner to check in the preview

1. The rest formation.
2. The tornado pairs (read from the video frame).
3. The square inside the hitbox for the Ecliptic tethers, and the melee's spots there.
4. Where the others wait in Heartbreak Kick when the tanks soak it.
5. The Arena Split tethers: two in each light party in the first round.
