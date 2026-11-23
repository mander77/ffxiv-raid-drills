# Site vocabulary

This is the reference for the words the site shows to players. Use it to:

1. Write new text for a mechanic, a card or a fight.
2. Check text that is already in the app.
3. Convert text from an outside source (a guide, a timeline, a video script) to the words of
   this site. A future import tool will do this step.

When this file and the code disagree, this file is correct. Fix the code. When this file has no
rule for a word, ask the owner, then add the rule here.

The owner made these choices in issue #58. `docs/decisions.md` has the reasons.

## Contents

- [How to use this file](#how-to-use-this-file)
- [Rules for every line](#rules-for-every-line)
- [Where text goes](#where-text-goes)
- [Capital letters](#capital-letters)
- [Mechanic kinds](#mechanic-kinds)
- [Positions](#positions)
- [Directions](#directions)
- [The party and the roles](#the-party-and-the-roles)
- [Objects on the arena](#objects-on-the-arena)
- [Actions](#actions)
- [Damage, mitigation and heals](#damage-mitigation-and-heals)
- [Repeats and order](#repeats-and-order)
- [Answers and results](#answers-and-results)
- [Words for the site itself](#words-for-the-site-itself)
- [Names from the game](#names-from-the-game)
- [Words that must stay apart](#words-that-must-stay-apart)
- [Conversion table](#conversion-table)
- [Checklist](#checklist)
- [Open questions](#open-questions)

## How to use this file

- **To write or check text:** read "Rules for every line" and "Capital letters". Then look up
  each idea in the topic sections. Each section has a "Use" column and a "Never use" column.
- **To convert outside text:** go through the [conversion table](#conversion-table) from top to
  bottom. Longer phrases come first, so the shorter phrases do not match part of them. Read the
  "Condition" column before you change a phrase. Many words have two meanings in guides.
- **To check positions and strats:** this file is only about words. A strat, a position or a
  fight time comes from the owner and the sources in `CLAUDE.md`, "Rules for the content". Do not
  change a strat to make the words fit.

## Rules for every line

| Rule | Example |
|------|---------|
| Mechanic text is a list of short lines, never a paragraph. | `["Look Ahead: find the first weapon before the puddles.", "Its flat side is square to the boss."]` |
| One step or one fact on each line. | "Cross under the boss to the opposite middle square." |
| 16 words at most on a line. A test checks this (`test/lines.ts`). | |
| A step that depends on a trigger starts with the trigger and a colon. | "After #2: cross back and stay." |
| Steps that happen in order: number them (`Scene.ordered`). Facts with no order: bullets. | |
| Active voice. Say who does it. | "Tanks and melee stack under the boss." |
| The boss is "the boss" the first time on a line, then "he" or "him". | "The boss jumps to the sword. Watch where he jumps from." |
| Times and counts are digits. Ordinals are words. | "5 HITS", "at 2:31", "second" (not "2nd") |
| Short simple words. No slang, no guide abbreviations. See the [conversion table](#conversion-table). | "Tank Buster", not "TB" |

## Where text goes

Each kind of text has a place in the code and a job.

| Text | Code | Job | Form |
|------|------|-----|------|
| Setup | `Scene.setup` (`src/data/drills.ts`) | What happens in the mechanic. | `Lines`. Numbered when `Scene.ordered` is true. |
| Rule | `Scene.rule`, `Question.rule`, shared lines in `src/data/rules.ts` | Why the correct spot is correct. | `Lines`. A rule that a drill and a card both show is written once in `rules.ts`. |
| Step question | `Step.q` | The question for one click. | One sentence. Ends with "?" or "Click it." |
| Step answer | `Step.a` | The correct move. | `Lines`. The first line is the move itself. The prompt bar and the HUD show only the first line. |
| Card prompt | `Question.prompt` | The question on a Learn or Timeline card. | One or two sentences. |
| Card answers | `Question.options[].t` | The answers to pick from. | Short. Incorrect answers use the same words as the correct one. |
| Card explanation | `Question.why` | Why the correct answer is correct. | `Lines`. |
| Timeline row | `TimelineEvent.n`, `TimelineEvent.job` (`src/data/timeline.ts`) | The mechanic's name and what you do. | `n` in Title Case. `job` is `Lines`. |
| Ability note | `N` in `src/data/abilities.ts` | What a boss ability does. | One or two sentences. |
| Picture caption | `Picture.note` (`src/data/pictures.ts`) | What the arena picture shows. | One or two sentences. |
| Picture tag | `tag(...)` and `say(...)` in `src/data/pictures.ts` | A label on the arena. | CAPITAL LETTERS, a few words. Must not cover a waymark (a test checks this). |
| Kind name | `KINDS` in `src/components/MechanicIcon.tsx` | The name on a mechanic's icon. | Title Case. |

## Capital letters

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Every mechanic name is in Title Case: on the icons, in titles and inside a sentence. | "a Party Stack on a healer" | "a party stack on a healer" |
| Mechanic titles are in Title Case, also the part after the colon and in parentheses. | "Raw Steel Trophy: Axe", "Void Stardust (Second Time)" | "Raw Steel Trophy: axe" |
| Small words stay in lower case inside a title: a, an, and, as, at, by, for, in, into, of, on, or, the, to. | "Void Stardust into the Second Weapons" | "Void Stardust Into The Second Weapons" |
| A verb stays in lower case, also when it looks like a kind name. | "the party stacks", "Your light party stacks on you." | "the Party Stacks" |
| A name from the game stays as the game writes it. | "Two-way Fireball" | "Two-Way Fireball" |
| "Look Ahead" at the start of a line, then a colon. | "Look Ahead: which weapon goes first?" | "Look ahead -", "Saved for later" |
| Light parties are not mechanic names: lower case inside a sentence. | "Light party 1 stacks on you.", "West (light party 1)" | "Light Party 1" inside a sentence |
| Picture tags are all capitals. | "STACK ON A HEALER" | |

## Mechanic kinds

The kind of a mechanic is what you do in it. Each kind has one name and one icon
(`KINDS` in `src/components/MechanicIcon.tsx`). Use the name as it is written here, in Title Case.

| Name | Meaning | Source words that mean the same |
|------|---------|---------------------------------|
| Spread | Spread out, away from the others. | spread, spread out, spread markers |
| Party Stack | The party stacks on one spot. | stack, full party stack, group stack, everyone stack, 8-man stack |
| Pair Stack | Stack in twos. | pairs, partner stack, 2-man stack, two-player stack, buddy stack |
| Light Party Stack | Stack with your light party of four. | light party stack, LP stack, group stack (4), 4-man stack |
| Role Stack | Stack by role: the roles decide who stacks. | role stack, support/DPS stack |
| Line Stack | Stand in the line from the boss to the marked player. | line stack, wild charge (only when nobody needs to stand in front), linear stack |
| Bait | You are the target: bring the hit to where it should go. | bait, drop, place |
| Puddle Drop Sequence | Drop several puddles in order, walking on as each one lands. | puddle drops, chasing AoEs, exaflares on you |
| Proteans (Clock Spots) | Take your clock spot around the boss, so your protean cone hits no one else. | proteans, clock spots, protean spread |
| Dodge Sequence | Dodge a set order of attacks. | dodge, sequence, follow the safe spots |
| Tower | Stand in a tower to soak it. | tower, soak |
| Knockback Tower | Soak a tower that knocks you back. | knockback tower, KB tower |
| Tank Tower | A tower only a tank soaks. | tank tower |
| Wild Charge | A Line Stack with a tank or a rock in front, to take the biggest hit. | wild charge, tank in front line stack |
| Look Ahead | Spot it early. Act on it later. | look ahead, saved for later, remember for later, delayed mechanic |
| Knockback | Stand where the knockback throws you to your spot. | knockback, KB, push |
| Stretch Tether | Move away from the other end of your tether until it is long enough. | stretch tether, tether stretch, take the tether far |
| Tank Buster | A heavy hit on one tank. | tank buster, TB, buster, tankbuster |
| Shared Tank Buster | A heavy hit that two tanks share. | shared buster, shared TB, tank share, tankbuster share |

Fixed choices for this fight:

- The sword's stack is a Light Party Stack.
- Four-way Fireball is a Pair Stack. The step asks "Which Pair Stack do you take?"
- Two-way Fireball is a Line Stack.

## Positions

The boss's hitbox has only two words.

| Use | Meaning | Never use |
|-----|---------|-----------|
| under the boss | Inside his hitbox. | inside the hitbox, inside the boss hitbox, on the hitbox ring (when the spot is inside the ring), on top of the boss |
| max melee | Out from his hitbox, within melee range. | hitbox, boss hitbox, hitbox ring, hitbox edge, against the hitbox, just outside the hitbox, melee range, in melee, max melee range, hug the boss |
| close in | Only for the scythe: inside the scythe's safe ring. | (do not use for any other mechanic) |
| directly behind the boss | His back. | his butt, behind him, his rear, the back of the boss |
| at his side, at his sides | Left or right of the boss. | flank |
| directly in front of the boss | His front. | |
| far out | Near the arena edge. | |
| outside | Out of the group in the middle (Ecliptic Stampede start). | |
| the middle | The middle of the arena. | the center, centre, mid |
| dead center | Only the middle of a tower. | |
| the platform, the other platform, the same platform | Arena Split. | the other side, the same side |
| pocket | A safe area that the hits leave, for example the sword's. | |
| clock spot | Your fixed spot around the boss for Proteans. | |
| spot | A place to stand. | position (on screen) |

Moves across the boss: "Cross under the boss to the opposite middle square." Never "cross the
hitbox".

## Directions

| Rule | Use | Never use |
|------|-----|-----------|
| A cardinal is a word, in lower case. | north, east, south, west | N, E, S, W, North (inside a sentence) |
| An intercardinal is short, in capitals. | NW, NE, SW, SE | northwest, north-west, Northwest |
| A direction between those is short too. | SSW, SSE, NNW | south-southwest |
| An intercardinal as a noun. | "the SW intercardinal" | "the southwest intercard" |
| Relative directions keep "relative". | relative SW, relative north | rel. SW |
| "New north" for the north the floor shows. | "The open side is new south." | |
| Clockwise and counterclockwise in full. | clockwise, counterclockwise | CW, CCW, anticlockwise |
| "slightly west" for a small offset. | "south, slightly west" | |
| Never "right" for correct. "Right" is only a direction. | "directly behind" | "right behind" |

A wall is named by its direction in capitals inside a setup line: "along the NORTH wall".

## The party and the roles

| Use | Meaning | Never use |
|-----|---------|-----------|
| the party | All eight players, as one group. | the group, everyone, the whole party, the raid, all players, the static |
| every player | Something each player gets on their own. | everyone, each person |
| the rest of the party | All players but the ones named. | everyone else, the others |
| light party 1, light party 2 | The two groups of four. Capital L only at the start of a line. | G1, G2, group 1, LP1, light party (G1) |
| your light party | The four players of your light party. | your group |
| Supports (tanks and healers) | Tanks and healers. Write the part in parentheses on its first use in each list. | supports (with no explanation) |
| DPS | Melee and ranged. | dps, damage dealers |
| tanks and melee | The pair in this order. | melee and tanks |
| healers and ranged | The pair in this order. | ranged and healers |
| MT, OT, H1, H2, M1, M2, R1, R2 | The eight slots. | Tank 1, D1 to D4 |
| your lead | The person who decides your raid's strat. | your static, your raid lead's group |

The header switch is "Light party", with the buttons 1 and 2.

## Objects on the arena

| Use | Meaning | Never use |
|-----|---------|-----------|
| waymark | A marker on the floor (A, B, C, D, 1, 2, 3, 4). | marker (for the floor), floor marker, number marker |
| number waymark | One of the waymarks 1 to 4. | number marker |
| marker | A marker on a player (spread, meteor, Fire Breath). | icon, head marker, debuff marker |
| meteor | A meteor while a player carries it. | rock (before it lands) |
| rock | A meteor after it lands on the floor. | meteor (after it lands), comet |
| row of rocks | Rocks in a line on the floor. | line of rocks, SW line |
| in a row with | Lined up with a rock. | in line with |
| lines | Line AoEs (Orbital Omen, Dance of Domination). | lasers, beams |
| Line Stack | A stack in a line from the boss. | |
| lineup | Where players line up after Flatliner. | line up (as a noun), the line |
| fire trail | What Great Wall of Fire leaves on the floor. | fire line, line AoE, the line it leaves |
| puddle | A ground AoE that a player drops. | void zone, baited circle |
| tower | A circle that players soak. | |
| tether | A line between a player and something else. | |
| cone | A hit shaped like a slice. Use as a noun. | (do not use "cones" as a verb in new text) |
| AoE | An area hit. Use with a name: "the axe AoE", "proximity AoE". | |
| portal | Orbital Omen's line sources, numbered #1 to #4. | |
| weapon | The boss's sword, axe or scythe. | |
| butt, point | Only the scythe's two ends: the butt is the handle end, the point is the blade tip. | (never "butt" for the boss) |
| flat side | The side of a weapon square to the boss. | |

## Actions

| Use | Meaning | Never use |
|-----|---------|-----------|
| soak | Stand in a tower. Towers are always soaked. | take a tower, stand in a tower, absorb |
| get knocked to | A knockback moves you. | knock to, be pushed, get KB'd |
| bait | Bring a hit to a place. | |
| drop | Leave a puddle or a meteor at a spot. | place |
| break | Destroy a rock with a Line Stack. | blow up, pop, explode (as the player's action) |
| explode | What two rocks do when they are too close. Not the player's action. | |
| stack | Go together for a stack (as a verb, lower case). | |
| spread | Move apart (as a verb, lower case). | |
| cross | Move to the other side: "cross under the boss". | |
| Look Ahead | Spot something now and act on it later. Starts the line. | find early, watch where, read early, saved for later |
| Sprint, Expedient | Game actions: keep their names. | |

## Damage, mitigation and heals

| Use | Never use |
|-----|-----------|
| raidwide, raidwide hits | raid damage (on screen), AoE (for a raidwide) |
| Shared Tank Buster | shared buster, tank share |
| Tank Buster | buster, TB |
| Mitigate it. | Stack mitigation on it., Use party mitigation., mit it |
| Heal the party. | Heal up., Heal everyone., Heal the whole party. |
| Heal the tanks. | |
| Damage Down, vulnerability | (game status names: keep them) |
| invuln | invulnerability (on screen, "invuln" is fine) |

## Repeats and order

| Use | Meaning | Never use |
|-----|---------|-----------|
| (Second Time) | In a name, the second time a mechanic comes. | again (in a name), the other weapon, (second time) |
| the opposite of the first | The second one is the reverse of the first. | the other way, the reverse, the other one |
| second set | Assault Evolved's second set of weapons. | set 2 (on screen) |
| first, second, third, fourth, last | Ordinals in words. | 1st, 2nd, 3rd, 4th |
| #1, #2, #3, #4 | Only Orbital Omen's lines, as the arena numbers them. | |
| Then | The next step. | Next (as a step word), After that |
| After X: | A step that comes after an event. | Once X, When X is done |
| First: | The first step. | |

## Answers and results

| Use | Where | Never use |
|-----|-------|-----------|
| Correct | Any correct answer. | Right, Good |
| incorrect | An answer that was not the one to give. | wrong |
| Not there | A missed spot on the arena (Practice, the run, a missed Look Ahead weapon). | Not that one |
| Not this one. | A missed card answer. | |
| Froze: the time ran out. | A quick-round card with no answer in time. | |
| Too slow | A step in the run with no click in time. | |
| Correct spot | The label on the green area. | |
| Go here | The label on Show me's blue area. | |
| Correct move: | The player's answer line in Watch the correct moves. | |
| Correct answer. | The start of a card's explanation. | |

"Froze" and "Too slow" mean the same thing on purpose: one is for cards, one is for the run
(`src/components/Tally.tsx`). Ask the owner before you merge them.

## Words for the site itself

These words name parts of the site. `CLAUDE.md`, "Words in the code", has the names in the code.

| Use | Meaning | Never use |
|-----|---------|-----------|
| mechanic | One thing the boss does that you answer. | mech (on screen), drill (on screen) |
| pattern | The random parts of a mechanic. | layout |
| card | One Learn or Timeline question. | |
| the run | The scored full fight. Only this. | |
| Watch the correct moves | The replay of the full fight. | |
| Show me | The button that shows the correct spot. | |
| step chips | One chip per step of a mechanic: badges during a try, buttons in review. | |
| Try from here | After a try: answer the step shown and the ones after it again. | Retry, Redo |
| phase | Phase 1 to 4 of the fight. Nothing else. | |
| tab | Home, Learn, Practice, Timeline, Pressure, Cheat sheet. | |

## Names from the game

Ability names come from the game, through the cactbot timeline. Keep them as they are written
there: do not change their case or their words. The names below are the ones this fight uses on
screen.

| Name | Notes |
|------|-------|
| Raw Steel Trophy | The boss holds an axe or a scythe. |
| Trophy Weapons, Assault Evolved | The three weapons on the floor and the jumps. |
| Void Stardust, Comet, Crushing Comet | The puddles, then a Spread (Comet) or a Party Stack (Crushing Comet). |
| Dance of Domination (Trophy) | Seven raidwide hits, then Pair Stacks. |
| Charybdistopia | Every player goes to 1 HP. |
| Ultimate Trophy Weapons | Six weapons in spawn order. |
| Powerful Gust | The tornadoes. |
| One and Only, Crown of Arcadia | Raidwides. |
| Great Wall of Fire | Two Shared Tank Busters and a fire trail. |
| Orbital Omen, Fire and Fury | The portal lines and the front and back cleave. |
| Meteorain, Triple Tyrannhilation | The meteors, then hide behind the row of rocks. |
| Flatliner, Majestic Meteor, Fire Breath, Massive Meteor, Arcadion Avalanche | The two-platform part. |
| Ecliptic Stampede, Two-way Fireball, Four-way Fireball | The last phase. |
| Heartbreak Kick, Heartbreaker | The towers and the enrage. |
| Hector's dodge | The Orbital Omen strat. A strat name from the guide: keep it. |
| Kindred No Buddies, Fixed (3CJ) | Strat names: keep them. |

Mechanic titles on screen are built from these names: "Name: Part" ("Meteorain: First Line
Stack") or "Name (Part)" ("Void Stardust (Second Time)"), in Title Case.

## Words that must stay apart

These pairs look alike but mean different things. Never merge them.

| Word | Word | Difference |
|------|------|------------|
| Spread | Proteans (Clock Spots) | A Spread is any open spot. Proteans are fixed clock spots. |
| under the boss | close in | Under the boss is inside his hitbox. Close in is only the scythe's safe ring. |
| max melee | outside | Max melee is next to the boss. Outside is out of the group (Ecliptic Stampede). |
| waymark | marker | A waymark is on the floor. A marker is on a player. |
| meteor | rock | A meteor is carried. A rock is on the floor. |
| butt (scythe) | directly behind the boss | The scythe's handle end, and the boss's back. |
| Line Stack | lines | A stack, and a line AoE. |
| lineup | Line Stack | Where you line up after Flatliner, and a stack. |
| the party | every player | The group as one, and each player on their own. |
| Tank Buster | Shared Tank Buster | One tank, and two tanks. |
| Party Stack | Light Party Stack | Eight players, and four players. |
| middle | dead center | The arena's middle, and a tower's middle. |
| Froze | Too slow | Cards, and the run. Same meaning, kept apart on purpose. |
| second time | second set | A repeat of a mechanic, and the second group of weapons. |

## Conversion table

Use this table to convert outside text. Go from top to bottom. Match whole words, and ignore
case unless the "Condition" column says otherwise. When the condition is not true, do not
convert the phrase: check the topic sections, or ask.

| Source phrase | Use | Condition |
|---------------|-----|-----------|
| saved for later, remember for later | Look Ahead: | At the start of the line. |
| find early, watch where, read early, look for | Look Ahead: | Only when the player spots it now and acts later. |
| full party stack, 8-man stack, everyone stack, group stack | Party Stack | All eight players. |
| light party stack, LP stack, 4-man stack | Light Party Stack | Four players. |
| partner stack, buddy stack, 2-man stack, two-player stack, pairs | Pair Stack | Two players. |
| linear stack, line stack | Line Stack | |
| role stack, support/DPS stack | Role Stack | |
| clock spots, protean spread, proteans | Proteans (Clock Spots) | As the kind name. Keep "clock spot" for the place. |
| shared tankbuster, shared TB, shared buster, tank share | Shared Tank Buster | |
| tankbuster, TB, buster | Tank Buster | One tank. |
| KB tower | Knockback Tower | |
| KB | knockback | As a noun. |
| get KB'd, knocked to | get knocked to | |
| take a tower, take the tower, stand in a tower | soak a tower, soak the tower | |
| blow up, pop (a rock) | break | |
| in line with | in a row with | About rocks. |
| line of rocks, rocks in a line | row of rocks | |
| fire line, line AoE (Great Wall of Fire) | fire trail | |
| line up (noun), lineup line | lineup | Flatliner. |
| number marker, floor marker | number waymark, waymark | |
| head marker, icon | marker | On a player. |
| inside the hitbox, inside the boss hitbox, on top of the boss | under the boss | |
| hitbox ring, on the hitbox, against the hitbox, hug the hitbox, just outside the hitbox, melee range, in melee, max melee range | max melee | Check the position: if the spot is inside the hitbox, use "under the boss". |
| cross the hitbox, through the boss | cross under the boss | |
| butt, rear, back of the boss | directly behind the boss | Not the scythe. |
| center, centre, mid (of the arena) | the middle | Not a tower. |
| center of the tower | dead center | |
| G1, LP1, group 1 | light party 1 | |
| G2, LP2, group 2 | light party 2 | |
| the group, everyone, the whole party, the raid, all players | the party | All eight players, as one group. |
| everyone (each gets their own) | every player | |
| everyone else | the rest of the party | |
| static, your static, raid lead | your lead | Never write "static". |
| supports | Supports (tanks and healers) | First use in each list. Then "Supports". |
| melee and tanks | tanks and melee | |
| ranged and healers | healers and ranged | |
| N, E, S, W | north, east, south, west | As a direction in a sentence. |
| northwest, north-west, northeast, southwest, southeast | NW, NE, SW, SE | |
| south-southwest, south-southeast | SSW, SSE | |
| CW, CCW, anticlockwise | clockwise, counterclockwise | |
| 1st, 2nd, 3rd, 4th | first, second, third, fourth | Not Orbital Omen's #1 to #4. |
| again (in a mechanic name), the other weapon | (Second Time) | In a name. |
| the other way, the reverse, the other one | the opposite of the first | |
| set 2 | second set | |
| mit, use party mitigation, stack mitigation | Mitigate it. | |
| heal up, heal everyone, heal the whole party | Heal the party. | |
| raid damage, raid-wide | raidwide | |
| right (meaning correct) | correct | |
| wrong | incorrect | |
| layout | pattern | |
| mech | mechanic | On screen. |

## Checklist

Check each line of new or converted text:

1. Is it one step or one fact, with 16 words or fewer?
2. Is every mechanic name in Title Case, and every verb in lower case?
3. Are directions in the right form: cardinals as words, intercardinals short?
4. Does it say "under the boss" or "max melee", and never "hitbox"?
5. Does it say "the party", "light party 1" or "light party 2", and never "group", "G1" or "static"?
6. Are towers soaked, rocks broken and floor markers called waymarks?
7. Does a line that spots something early start with "Look Ahead:"?
8. Are game names and strat names written as the source writes them?
9. Is every phrase from the [conversion table](#conversion-table) converted?
10. Did the strat, the position and the fight time stay as the owner set them?

Checks a tool can run on the text (`src/data/`, `src/lib/`, `src/components/`):

| Search for | Means |
|------------|-------|
| `hitbox`, `melee range` | A position word that is not allowed. |
| `\bG[12]\b`, `\bgroup\b`, `static`, `everyone`, `whole party` | A party word that is not allowed. |
| `\b(north\|south)(east\|west)\b` | An intercardinal written in full. |
| `\b\d(st\|nd\|rd\|th)\b` | An ordinal in digits. |
| `[Ss]aved for later`, `[Ll]ook ahead` | The old name, or "Look Ahead" not in Title Case. |
| `\b(party\|pair\|line\|role) stack\b` with a lower-case first letter, not after "the" | A kind name not in Title Case. |
| `take[sn]? (a\|the) tower` | A tower that is taken, not soaked. |
| `number marker`, `fire line\b`, `blow (it )?up` | An object word that is not allowed. "Portals fire lines" is a verb, so it is not a match. |

Search only the text in quotes, not code names: `HITBOX` and `G2` in the code are not
player words.

## Open questions

- Spread, Bait, Tower and Knockback are kind names, but they are also common words. Inside a
  sentence they stay in lower case today ("Comet = spread", "every player soaks a tower"). Ask the
  owner before you capitalize them in text.
