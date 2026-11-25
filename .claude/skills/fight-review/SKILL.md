---
name: fight-review
description: Reviews one raid fight on the FFXIV Raid Drills site against its sources (cactbot, BossMod, the static's wtfdig strat), exhaustively. It finds every cast, ability, mechanic, marker, tether or attack that the site leaves out, every attack that the arena does not draw when it happens, every wrong time, size, spot or order, and every screen that teaches a move the wrong way. Read only; it reports findings for the owner. Use it when someone asks to review, audit, fact-check or verify a fight, a mechanic, its times, sizes, spots or strat, asks what is missing from the site, or asks "is the site correct about X", even when they do not say "skill" or "review".
argument-hint: "<fight id> [mechanic]"
---

# Fight review

Review the fight `$ARGUMENTS` (a fight id such as `m11s`, optionally followed by one mechanic
name). With no mechanic, review every mechanic in fight order.

With no fight id, read `FIGHTS` in `src/data/fights/index.ts`. If it holds one fight, review that
one and say so at the top of the report. If it holds more, ask which fight before you start: a
whole review is long, and the wrong fight wastes it.

## Why this review matters

The site teaches players the steps to solve each mechanic. A player trusts it and takes what it
shows into the raid. If the site shows a wrong spot, a wrong order or a wrong fact, the player
fails the mechanic in the real fight, and the whole static wipes with them. So accuracy comes
before every other goal of the site, and a confident wrong answer is worse than a missing one.

Your job is to find every place where the site is not correct, is incomplete, or is correct in
the data but teaches the move in a way that leads a player to the wrong move.

## Be exhaustive

The owner relies on this review to find all the problems, not a sample of them. A problem the
review misses reaches the raid. So:

- **Every means every.** Every cactbot line, every BossMod ability, state and component, every
  cactbot trigger, every mechanic, every time a mechanic comes back, every step, every slot the
  site supports (H1 and H2 today), both light parties, every value of every pattern pick, every
  drill variant, and every tab. Do not sample, and do not stop at the first problem in a
  mechanic.
- **Absence is a finding.** Most misses are things the site does not show: a cast with no row,
  an attack that resolves with nothing on the arena, a second time of a mechanic that only one
  tab teaches, a marker or tether the player must read that is not drawn. Look for what is not
  there as hard as for what is wrong.
- **Prove each "correct".** A mechanic goes under "Correct as checked" only after each check
  below was done for it, with the file and line you read. "Looks fine" is not a check.
- **Split the work, not the checklist.** A whole fight is too long for one pass. After the
  inventory below, give each phase of the fight to its own subagent (the Agent tool), with this
  whole skill, the inventory rows of its phase and the coverage leads of its phase. Each one
  runs every check on every row and returns findings in the report's shape. Then merge them,
  and do the final pass yourself.
- **Say what you did not check.** Anything you skipped, could not open or could not run goes
  under "Not checked", with the reason. A silent gap is worse than a stated one.

## This is a review only

Do not edit, commit, push or publish anything. The one exception is the review worktree below:
it is yours, and you copy the check scripts into it. Do not move a spot to make a test pass.
Do not change a strat, a position or a rule, even when a source seems to say so: the owner
decides, because the static's strat can differ from a guide on purpose. Report and wait.

Other sessions may work in this checkout. Do not switch branches, do not touch uncommitted
files, and do not run `npm install` or `npm run format`.

## Where to work

The review runs the tests and scripts, so it needs `node_modules`. Do not install them in the
shared checkout. Review from a detached worktree of the commit you review, outside the checkout:

```sh
git fetch origin
git worktree add --detach ../ffxiv-raid-drills-review origin/main
cd ../ffxiv-raid-drills-review && npm ci
```

If that folder is already taken, add a suffix (`../ffxiv-raid-drills-review-2`). Name the commit
at the top of the report. When you are done, remove the worktree
(`git worktree remove --force <folder>`): nothing in it is kept.

## Read first

1. `CLAUDE.md`: "Rules for the content", "Words in the code" and the code map.
2. `docs/decisions.md`: "Fight facts and strat corrections" and "Ideas the owner rejected or
   declined" (the file is long: find them with a search for `^## `). The owner already decided
   these. A fact there wins over a guide; do not report a decided fact as a finding unless a
   pinned source now contradicts it, and then as a Question. A decision to leave something out
   (for example "no puddles under the spread") is not a gap.
3. `docs/vocabulary.md`: the words the site may show.
4. The open issues (`gh issue list --repo mander77/ffxiv-raid-drills`): a problem already filed is
   still reported, with its issue number, so the report is complete.

The fight's data is in `src/data/fights/<id>/`. In M11S's shape:

| File | What it holds |
|------|---------------|
| `sources.json`, `source.gen.ts`, `sources.extra.gen.json`, `sources.ts` | the pinned sources and the lookups |
| `drills.ts`, `rules.ts`, `attacks.ts` | Practice drills: steps (`q`, `a`, `z`, `reveal`, `revealAt`, `cue`, `hits`, `lookAhead`, `drop`, `knock`), scenes, attack sizes |
| `pictures.ts`, `questions.ts` | Learn pictures and cards, Timeline cards |
| `fight.ts`, `timeline.ts`, `abilities.ts` | the full fight on the clock, the picks, the timeline rows, the ability list |
| `reference.ts` | the Cheat Sheet |

Shared code that also decides what a player sees: `src/data/route.ts` (the moving marker),
`src/lib/fight.ts`, `src/lib/practice.ts`, `src/lib/attacks.ts`, `src/geometry.ts`, and the
arena drawing in `src/components/arena/` (what each overlay looks like, and which layer is on
top).

## The sources, and what each one may decide

Each kind of fact has one source that decides it. Holding to this keeps the review checkable by
anyone, and stops a guess from looking like a fact.

1. **Fight times**: the cactbot timeline at the commit pinned in `sources.json`, as written to
   `source.gen.ts`. Nothing else decides a time.
2. **Attack sizes and shapes**: the BossMod module at its pinned commit (`source.gen.ts`,
   `sources.extra.gen.json`). Nothing else decides a size.
3. **What happens, in what order, and what a cast brings**: cactbot's timeline and triggers
   (`r11s.ts`: head markers, tethers, map effects, what each trigger calls out), and BossMod's
   module: its states file (`*States.cs`, in `sources.extra.gen.json` under `states`), its
   enums (every ability, status and icon) and every mechanic file in the module folder.
4. **Strats and positions**: the owner's static (`docs/decisions.md`), then the wtfdig strat
   the fight names (`notes/<id>/strat.json`), then the raidplans and videos it links.
5. **Guide videos** (`notes/<id>/videos/`): only to understand a mechanic, and to spot a thing
   the boss does that the site does not show. Never a time, a size or a final position. A
   position read from a video is "owner to check".

When two sources disagree, do not pick one: report a Question with both sides quoted.

`sources.extra.gen.json` lists only the mechanic files that `sources.json` names. Read every
`.cs` file in the module folder at the pinned commit, not only those: a component that only an
unlisted file holds is easy to miss. Look first in `.cache/sources/<owner>@<repo>@<commit>/`
(`npm run check:sources` downloads the pinned files there). Otherwise fetch the file at the pinned
commit, `https://raw.githubusercontent.com/<repo>/<commit>/<path>`, and list the folder with
`gh api repos/<repo>/contents/<folder>?ref=<commit>`. Never read the default branch: the site is
checked against the pinned commit.

A video's notes list its still frames (`.cache/video/<video id>/frames/...`) by chapter; read a
frame as an image when a caption alone does not show a position or what is on the floor. If a
raidplan or a video cannot be opened, say so under "Not checked" rather than guess what it shows.

## Start

1. Run `npm run check:sources`. If a generated file is out of date, stop and say so: the review
   would compare against the wrong data.
2. Run `npm test -- answers` (the check that no correct spot stands in an attack) and note any
   failure; it is already a finding. It checks only the center (or `stand` point) of each
   correct area, and only Practice drills.
3. Run the two check scripts. Each samples every drill variant and every value of every pick:

   ```sh
   cp .claude/skills/fight-review/scripts/zone-sweep.test.ts .claude/skills/fight-review/scripts/coverage.test.ts test/
   FIGHT=<id> npx vitest run test/zone-sweep.test.ts
   FIGHT=<id> npx vitest run test/coverage.test.ts
   rm test/zone-sweep.test.ts test/coverage.test.ts
   ```

   - **The whole-area check** (`zone-sweep`) fails with one line per step whose area lets a
     click that counts as correct stand in an attack. Each line gives the share of the area, the
     kind of attack (`poly` is a cone, `band` a line) and an example point. Read the step's zone
     in the code to see why, and report it under its mechanic. It leaves out puddles dropped at
     earlier steps, so check those yourself where puddles drop.
   - **The coverage check** (`coverage`) prints leads, in sections: cactbot lines with no
     ability row and no hit; cactbot lines Pressure never plays; BossMod abilities with an area
     that no file reads with `bossmod()`; BossMod states with no cactbot line, or that Pressure
     never plays; steps that draw nothing on the arena; gaps between the tabs. A lead is not yet
     a finding: decide each one, and list each in the report, as a finding or under "Correct as
     checked" with the reason it is fine (for example: "a raidwide, drawn as the whole floor by
     `raidwide()`, which needs no BossMod size").
4. Build the inventory (next section). It is the list of everything you review.

## The inventory

Before you judge any screen, list everything the boss does, from the sources, in time order.
Write it as one table, one row per event. Each time a mechanic comes back is its own row
("Void Stardust", "Void Stardust (Second Time)").

1. Every cactbot timeline line (`CACTBOT_LINES` in `source.gen.ts`), with its time.
2. Every BossMod state (`states` in `sources.extra.gen.json`), with its group, and the
   components it turns on: each component is something the player must handle.
3. Every BossMod ability in the enums (`BOSSMOD_ABILITIES`), with its shape. A cast with no
   cactbot line still happens.
4. Every cactbot trigger (`triggers` in `sources.extra.gen.json`, and `r11s.ts` at the pin): head
   markers, tethers, map effects and actors appearing. These are what the player reads on the
   screen: a marker over a head, a tether, a weapon or tower appearing, the boss turning.
5. The wtfdig strat notes for the fight (`notes/<id>/strat.json`), for each mechanic's steps.

Then give each row these columns, from the site: its ability row (Timeline tab), its Timeline
card, its Learn cards and picture, its Practice drill and step, its Pressure stretch and step,
and its Cheat Sheet entry. An empty cell is a lead. It is a finding unless a decision in
`docs/decisions.md`, or the nature of the event (a marker line, an auto attack), explains it;
write that reason in the report.

## What to check, for each mechanic

Run every check below for each row of the inventory, on every tab that has it.

### Facts

- Every time the site shows or uses matches a cactbot line (through `cactbot(...)`), and every
  size and shape matches BossMod (through `bossmod(...)`). A time or an attack size typed by
  hand is a finding. Zone tolerances (how far from a spot a click still counts) are the app's
  choice: report one only when it makes an unsafe spot count as correct, or the strat's spot
  count as incorrect.
- The mechanic's name, its casts and its place in the fight match the sources.
- Each pattern the drill can build (every pick and random part) exists in the real fight, and
  no real pattern is missing. Look for evidence in cactbot's timeline (line names, branches)
  and triggers, and in BossMod's mechanic files (the casts and states that pick the pattern).
  Where neither shows which patterns exist, report a Question, not a finding.
- Every role the attack picks (a stack on a healer, a tank buster on the tanks) has a source:
  a BossMod target filter, a cactbot trigger, or a decision in `docs/decisions.md`.

### Nothing is missing

- Every cast, hit and component of the mechanic, in the sources, has its step or its line on
  the site. Count them: three puddle sets in the source means three on the site; seven hits
  means seven.
- Every time the mechanic comes back is taught: on Learn, Practice, Timeline, Pressure and the
  Cheat Sheet, not only the first time. A later time that differs (another start spot, the
  opposite ending, the boss elsewhere) needs its own card, picture and drill, or a reason in
  `docs/decisions.md`.
- Every thing the player must read before they move (a weapon's facing, a marker over a head,
  a tether, a tower, the boss's turn, a portal) is drawn before the step that needs it, and is
  named in the question or the setup.
- Every thing the player must do is a step: move, bait, soak, stack, spread, drop, dodge,
  look ahead. A move the strat gives that the drill skips is a finding.

### What the arena shows, at each step

The data can hold the right attack and the screen can still leave it out (`reveal` empty,
`hits` set but nothing drawn, an attack only in the text). For each step of each drill and
each Pressure stretch, write down what is true in the game at that moment, then check that the
arena shows each item:

- **Before the answer** (`cue`, the scene's `overlays`, earlier reveals that stay): the tell
  the player reads, the puddles still on the floor, the towers, the weapons, the markers and
  tethers, the boss's spot and facing, and the other players where the strat puts them.
- **After the answer** (`reveal`, `revealAt`): every attack that resolves at this step, at its
  BossMod size and shape, on the right target, from the right source: the stack on the
  stacked player, the spread circle on each player, the cone from the boss, the line from the
  weapon. A stack, spread, bait or tank buster that the step asks about and does not draw is a
  finding (Missing).
- **Things that go away**: a puddle, a tower or a tether that the game removes is gone on the
  arena too, and nothing stays drawn after the game removes it.
- **Layers and colours**: the player marks are on top. Each look means what
  `docs/vocabulary.md` and the Styles page (`/styles`) say it means.

Do this for every step, not one per mechanic: the last step of a sequence is the one most often
left bare.

### The correct move

- For each slot the site supports, and each light party, the correct spot is the one the strat
  gives. Check it on the arena: in front or behind, max melee or under the boss, which waymark,
  which clock spot, which side.
- The correct spot is safe from every attack of its step, and from puddles still on the floor.
- The steps come in the order the player does them in the game. A thing the boss shows early
  and resolves later is a Look Ahead step.
- Each step's first answer line is the move itself, and is enough to do the step.
- The incorrect answers are clearly incorrect under the strat, and none of them is also safe.

### One answer everywhere

- Learn, Practice, Timeline, Pressure (the run and Watch the Correct Moves) and the Cheat Sheet
  give the same answer for the same step. A rule written in `rules.ts` is shared; a copy of a
  rule in two places that has drifted is a finding.
- The picture shows what the text says: the same spot, the same attack, the same side, the
  same time of the mechanic (a picture of the first time on a card about the second is a
  finding).
- The moving marker's route (`route.ts`) goes through the correct spots, at the correct times.
- The Cheat Sheet's links open the drill and the moment that train this time of the mechanic.

### Teaching

- Would a new player who reads only the first line, and looks at the picture, do the correct
  move in the raid? If not, say what they would do instead.
- An arrow, a colour, a label in the wrong place, or a word against `docs/vocabulary.md` that
  suggests a wrong move counts as a finding.
- Left and right without a point of view (the boss's, the player's, the screen's) is a finding.

## Look at the site, not only the data

The data can be correct and the screen still wrong. A browser is required for a whole review:
use the app's browser pane, Playwright, or Chrome. For each mechanic:

- **Practice**: play every step, once with correct answers and once with Show Me. Take a
  screenshot before and after each answer, and compare it with the step's list from "What the
  arena shows".
- **Pressure**: open Watch the Correct Moves at each stretch, paused before and after each
  step's due time (`/pressure/<code>/<picks>?t=<seconds>`, for example
  `/pressure/ABCD/void=stack?t=109`), for every value of the stretch's pick. Check that every
  hit on the cast list has something on the arena when it goes off.
- **Learn** and **Cheat Sheet**: each card's picture, and each link.

Check at 1280 px wide, and spot-check 375 px for a picture cut off or a label hidden. Where to
look:

- **Reviewing `main`:** use the live site, https://ffxiv-raid-drills.app. It is built from
  `main`, so first make sure that your worktree is at `origin/main`.
- **Reviewing a branch:** run the dev server from the review worktree on a free port
  (`npm run dev -- --port 5180 --strictPort`), and stop it at the end.

If you cannot run a browser, say so at the top of the report: the review is then incomplete.

## The final pass

When every mechanic is done, take one more pass for what the checklist could miss:

1. Walk the cactbot timeline from the first line to the enrage, beside the site's Timeline tab
   and Pressure's cast list. Every line is either on the site or explained in the report.
2. For each mechanic, ask: what does a player see in the game that the site does not show? A
   head marker, a tether, an add, a tower, a floor change, a debuff with a timer, a knockback,
   an arena edge that kills. Read the video frames for this.
3. Read the coverage leads again. Each one is in the report, as a finding or with its reason.
4. Re-read the open issues: each problem filed for this fight is in the report.

## Check before you report

Check every claim in the files before you report it. Quote the source line, and give the site's
file and line. If you cannot find a source for a fact the site shows, that is a finding in
itself (Missing source). Do not report something you only suspect as Wrong: make it a Question.

## The report

Write the report in plain, short sentences. Use this shape:

```markdown
# Fight review: <fight> (<date>, cactbot <short commit>, BossMod <short commit>)

Scope: <the whole fight, or the mechanic asked for>, at <commit>
Start checks: <check:sources, the answers test, the whole-area check and the coverage check: passed, or what failed>
Browser: <which browser, which tabs and widths, or "not run" and why>

## Summary
<counts per severity, and the three findings that most risk a wipe>

## Inventory
| Time | Event (source) | Ability row | Timeline card | Learn | Practice | Pressure | Cheat Sheet |
|------|----------------|-------------|---------------|-------|----------|----------|-------------|
| 1:49 | Crushing Comet, second time (cactbot `r11s.txt` L.., BossMod ...) | yes | <card id> | <card id> | <drill id> step 4 | "<stretch>" step 4 | <entry> |

## <Mechanic name>
| # | Severity | What the site shows | What the source says | What a player would do wrong | Suggested fix |
|---|----------|---------------------|----------------------|------------------------------|---------------|
| 1 | Wrong | `drills.ts:412`, /practice/...: H2 stands north | cactbot `r11s.txt` L88 at 96abb89: ... | goes north, gets hit by ... | owner to decide: ... |

## Coverage leads
<each lead the coverage check printed: the finding it became, or why it is fine>

## Correct as checked
<the mechanics, and the parts of mechanics, you checked and found correct, with what you read>

## Not checked
<anything you could not check, and why>
```

Severities, most serious first:

- **Wrong**: a fact or a spot is not correct.
- **Misleads**: the data is correct, but a player would do the wrong move.
- **Missing**: a cast, a step, an attack on the arena, a time of a mechanic, a pattern, a role
  or a source is not there.
- **Question**: the sources disagree, or say nothing.
- **Minor**: wording or a label, with no effect on the move.

Every suggested fix is for the owner to decide. Write "owner to decide" on any fix that changes
a strat, a position or a rule.
