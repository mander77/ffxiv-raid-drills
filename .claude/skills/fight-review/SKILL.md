---
name: fight-review
description: Reviews one raid fight on the FFXIV Raid Drills site against its sources (cactbot, BossMod, the static's wtfdig strat) for accuracy, and checks that every screen teaches the correct move in the correct order. Read only; it reports findings for the owner. Use it when someone asks to review, audit, fact-check or verify a fight, a mechanic, its times, sizes, spots or strat, or asks "is the site correct about X", even when they do not say "skill" or "review".
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

Your job is to find every place where the site is not correct, or where it is correct in the
data but teaches the move in a way that leads a player to the wrong move.

## This is a review only

Do not edit, commit, push or publish anything. The one exception is the review worktree below:
it is yours, and you copy the whole-area check into it. Do not move a spot to make a test pass.
Do not change a strat, a position or a rule, even when a source seems to say so: the owner
decides, because the static's strat can differ from a guide on purpose. Report and wait.

Other sessions may work in this checkout. Do not switch branches, do not touch uncommitted
files, and do not run `npm install` or `npm run format`.

## Where to work

The review runs the tests and a script, so it needs `node_modules`. Do not install them in the
shared checkout. Review from a detached worktree of the commit you review, outside the checkout:

```sh
git fetch origin
git worktree add --detach ../ffxiv-raid-drills-review origin/main
cd ../ffxiv-raid-drills-review && npm ci
```

Name the commit at the top of the report. When you are done, remove the worktree
(`git worktree remove --force ../ffxiv-raid-drills-review`): nothing in it is kept.

## Read first

1. `CLAUDE.md`: "Rules for the content", "Words in the code" and the code map.
2. `docs/decisions.md`: "Fight facts and strat corrections" and "Ideas the owner rejected or
   declined" (the file is long: find them with a search for `^## `). The owner already decided
   these. A fact there wins over a guide; do not report a decided fact as a finding unless a
   pinned source now contradicts it, and then as a Question.
3. `docs/vocabulary.md`: the words the site may show.

The fight's data is in `src/data/fights/<id>/`. In M11S's shape:

| File | What it holds |
|------|---------------|
| `sources.json`, `source.gen.ts`, `sources.extra.gen.json`, `sources.ts` | the pinned sources and the lookups |
| `drills.ts`, `rules.ts`, `attacks.ts` | Practice drills: steps (`q`, `a`, `z`, `reveal`, `hits`, `lookAhead`, `drop`), scenes, attack sizes |
| `pictures.ts`, `questions.ts` | Learn pictures and cards, Timeline cards |
| `fight.ts`, `timeline.ts`, `abilities.ts` | the full fight on the clock, the picks, the timeline rows |
| `reference.ts` | the Cheat Sheet |

Shared code that also decides what a player sees: `src/data/route.ts` (the moving marker),
`src/lib/fight.ts`, `src/lib/practice.ts`, `src/lib/attacks.ts`, `src/geometry.ts`.

## The sources, and what each one may decide

Each kind of fact has one source that decides it. Holding to this keeps the review checkable by
anyone, and stops a guess from looking like a fact.

1. **Fight times**: the cactbot timeline at the commit pinned in `sources.json`, as written to
   `source.gen.ts`. Nothing else decides a time.
2. **Attack sizes and shapes**: the BossMod module at its pinned commit (`source.gen.ts`,
   `sources.extra.gen.json`). Nothing else decides a size.
3. **Mechanic order, and what a cast brings**: cactbot's timeline and triggers, and BossMod's
   mechanic files.
4. **Strats and positions**: the owner's static (`docs/decisions.md`), then the wtfdig strat
   the fight names (`notes/<id>/strat.json`), then the raidplans and videos it links.
5. **Guide videos** (`notes/<id>/videos/`): only to understand a mechanic. Never a time, a size
   or a final position. A position read from a video is "owner to check".

When two sources disagree, do not pick one: report a Question with both sides quoted.

To read a source file beyond the generated summaries, look first in
`.cache/sources/<owner>@<repo>@<commit>/`: `npm run check:sources` downloads the pinned files
there. Otherwise fetch it at the pinned commit,
`https://raw.githubusercontent.com/<repo>/<commit>/<path>`. Never read the default branch: the
site is checked against the pinned commit.

A video's notes list its still frames (`.cache/video/<video id>/frames/...`) by chapter; read a
frame as an image when a caption alone does not show a position. If a raidplan or a video
cannot be opened, say so under "Not checked" rather than guess what it shows.

## Start

1. Run `npm run check:sources`. If a generated file is out of date, stop and say so: the review
   would compare against the wrong data.
2. Run `npm test -- answers` (the check that no correct spot stands in an attack) and note any
   failure; it is already a finding. It checks only the center (or `stand` point) of each
   correct area, and only Practice drills.
3. Run the whole-area check, which samples every point of each correct area, in Practice and in
   the full fight (Pressure):

   ```sh
   cp .claude/skills/fight-review/scripts/zone-sweep.test.ts test/
   FIGHT=<id> npx vitest run test/zone-sweep.test.ts
   rm test/zone-sweep.test.ts
   ```

   It fails with one line per step whose area lets a click that counts as correct stand in an
   attack. Each line gives the share of the area, the kind of attack (`poly` is a cone, `band` a
   line) and an example point.
   Read the step's zone in the code to see why, and report it under its mechanic. It leaves
   out puddles dropped at earlier steps, so check those yourself where puddles drop.
4. List the mechanics in fight order from the segments in `fight.ts`; `reference.ts` groups
   them for the Cheat Sheet and mixes in parts of mechanics. Then work one mechanic at a time.
5. For each mechanic, search its name (and its drill id) across `src/data/fights/<id>/`,
   `notes/<id>/` and `docs/`. A mechanic is often in several files, and a second or third time
   in the fight can live only in Pressure.

## What to check, for each mechanic

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

### The correct move

- For each slot the site supports, and each light party, the correct spot is the one the strat
  gives. Check it on the arena: in front or behind, max melee or under the boss, which waymark,
  which clock spot, which side.
- The correct spot is safe from every attack of its step, and from puddles still on the floor.
- The steps come in the order the player does them in the game. Nothing the player must do is
  missing. A thing the boss shows early and resolves later is a Look Ahead step.
- Each step's first answer line is the move itself, and is enough to do the step.
- The incorrect answers are clearly incorrect under the strat, and none of them is also safe.

### One answer everywhere

- Learn, Practice, Timeline, Pressure (the run and Watch the Correct Moves) and the Cheat Sheet
  give the same answer for the same step. A rule written in `rules.ts` is shared; a copy of a
  rule in two places that has drifted is a finding.
- The picture shows what the text says: the same spot, the same attack, the same side.
- The moving marker's route (`route.ts`) goes through the correct spots, at the correct times.

### Teaching

- Would a new player who reads only the first line, and looks at the picture, do the correct
  move in the raid? If not, say what they would do instead.
- An arrow, a colour, a label in the wrong place, or a word against `docs/vocabulary.md` that
  suggests a wrong move counts as a finding.

## Look at the site, not only the data

The data can be correct and the screen still wrong. When a browser tool works in this session
(the app's browser pane, Playwright, or Chrome), open each mechanic on Learn, Practice (with
Show Me) and Watch the Correct Moves at 1280 px wide, and check what the player sees.

- **Reviewing `main`:** use the live site, https://ffxiv-raid-drills.app. It is built from
  `main`, so first make sure that your worktree is at `origin/main`. Pressure's player opens at
  a moment with `/pressure/<code>/<picks>?t=<seconds>` (for example
  `/pressure/ABCD/void=stack?t=109`).
- **Reviewing a branch:** run the dev server from the review worktree on a free port
  (`npm run dev -- --port 5180 --strictPort`), and stop it at the end.

If you cannot run a browser, say so in the report.

## Check before you report

Check every claim in the files before you report it. Quote the source line, and give the site's
file and line. If you cannot find a source for a fact the site shows, that is a finding in
itself (Missing source). Do not report something you only suspect as Wrong: make it a Question.

## The report

Write the report in plain, short sentences. Use this shape:

```markdown
# Fight review: <fight> (<date>, cactbot <short commit>, BossMod <short commit>)

Scope: <the whole fight, or the mechanic asked for>, at <commit>
Start checks: <check:sources, the answers test and the whole-area check: passed, or what failed>

## Summary
<counts per severity, and the three findings that most risk a wipe>

## <Mechanic name>
| # | Severity | What the site shows | What the source says | What a player would do wrong | Suggested fix |
|---|----------|---------------------|----------------------|------------------------------|---------------|
| 1 | Wrong | `drills.ts:412`, /practice/...: H2 stands north | cactbot `r11s.txt` L88 at 96abb89: ... | goes north, gets hit by ... | owner to decide: ... |

## Correct as checked
<the mechanics, and the parts of mechanics, you checked and found correct>

## Not checked
<anything you could not check, and why>
```

Severities, most serious first:

- **Wrong**: a fact or a spot is not correct.
- **Misleads**: the data is correct, but a player would do the wrong move.
- **Missing**: a step, a pattern, a role or a source is not there.
- **Question**: the sources disagree, or say nothing.
- **Minor**: wording or a label, with no effect on the move.

Every suggested fix is for the owner to decide. Write "owner to decide" on any fix that changes
a strat, a position or a rule.
