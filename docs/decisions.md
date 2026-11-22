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
    tab's round count (correct of done) is kept until you reload, and an answer for another slot
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
  - Rebuild 5 (#22): Pressure is back: the quick round, the run and Watch the correct moves, with
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
  - Issue #29: four hand-built parts are now shadcn/ui components. The More/Less setup text is a
    Collapsible, Share confirms a copied link with a Sonner toast (the Toaster is in `App.tsx`,
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
    for names, tabs, headings and big numbers, Source Sans 3 for text, both bundled.
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
    rows. On a narrower screen it is four rows (199 px at 375 x 812, a quarter of a phone) and
    covered the top of the arena, so there it scrolls away with the page. NN/g, Smashing Magazine
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
    square in its category's colour with its seconds inside and its name beside it, ticks at 5, 10
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
    ability id on each cactbot line (`BOSS_CAST` in `src/data/fight.ts`). A Cometite puddle's
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
- "Watch the correct moves". The new-player tests liked it best.

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

### Learn

- Pick an answer (click or a number key) to preview it in blue on the picture, then Lock in (or
  Enter). The preview also draws the attack that the answer assumes, because the quiz tests what
  the boss does, not only where you stand.
- After an answer, the correct answer holds its explanation, and an incorrect pick gets a "Your pick" tag.
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
- Show me draws the correct spot in blue with the tag "Go here", shows the answer text in the bar and
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

### Pressure: Watch the correct moves (the player)

- A replay. A marker with your role runs the correct spots. You do not click answers.
- The HUD gives the correct move (the step's answer text), and nothing turns red.
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
  - On a phone only a sideways drag on the strip moves the clock; an up and down swipe still
    scrolls the page (`touch-pan-y`).
  - The run has none of this: it is scored, so it stays on the clock.
- The green answer area has no "Correct spot" tag here.
- The first weapon of Void Stardust is answered 4 seconds early and shows as "Saved for later"
  until its due time, so you have time to see it.

### Home and Cheat sheet

- Home: "Start here" cards in learning order. The top picture is the answer picture of the Learn
  card `k-raw-first` (on a phone, a 110 px strip from the boss to the party stack). The owner's
  character picture is in About me with a wide crop of the face, the card and both arms.
- Cheat sheet: one line per mechanic, written for your role, with a link to its Learn card.

### Everywhere

- Player marks are always the top layer (see `LAYERS` in `src/components/arena/Arena.tsx`).
- Each boss weapon is a small upright icon on a clear round badge (only its rim shows, so attacks
  and the floor stay visible under it; the line stops at the rim), sitting on a line drawn at the true
  angle the weapon rests at (`src/components/arena/Weapon.tsx`, one drawing for every screen). The
  owner chose this after trying detailed standing weapons, silhouettes and a cut in the floor: the
  line shows the angle, the icon says which weapon, and nothing stretches as it turns. Every icon
  sits in the middle of its line. The sword's and the axe's (a double-headed half-moon axe) line
  is straight. The scythe's line tapers from the thick butt (H1's end) to the sharp point (H2's
  end), and is as long as the green safe ring drawn when he lands on it is wide (owner's rule).
  The scythe icon has its blade at the bottom, as it rests in the floor, and a small nub at the
  butt. Each icon is drawn a little inside its badge, so a handle never runs into the line. Weapons have their own layer, over the
  waymarks they often land next to and under the boss and the player marks. The held weapon in
  Raw Steel Trophy is its icon alone, a little smaller, east of him. A weapon's name goes out to
  the side of its line, away from the arena center; in Practice, its order number goes in toward
  the center.
- The boss turns smoothly to face his next target. He does not flip.
- "Saved for later" (purple) marks a mechanic shown early and resolved later, for example the
  first weapon during Void Stardust. It is never a spot to stand on.
- On a phone the six tabs show as two rows of three, and keyboard hints do not show on touch
  screens.
- Start over and New fight are buttons, not text links.
- An answer is "correct" or "incorrect", on screen and in the code, never "right" or "wrong"
  (owner's choice). "Right" means only the direction: "directly behind", not "right behind";
  "immediately", not "right away". A correct answer is green and an
  incorrect pick red, in light and dark mode alike: the answer buttons use the Button variants
  `correct` and `incorrect`, which the site added to `src/components/ui/button.tsx` the way
  shadcn/ui's customization guide shows. The outline variant's own dark-mode colours hid them.

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
  about 2 yalms clear of each arm. The whole pocket inside the arena counts as correct.
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
  directly behind him, and goes clockwise around him.

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
- After 8 quiet seconds it goes to the next mechanic's pre-position. The default is up close to the
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
- Custom domains: `ffxiv-raid-drills.app` (live) and `<branch>.ffxiv-raid-drills.app`
  (previews).
- The Cloudflare check run on GitHub has no log text. Read the state with
  `gh api repos/mander77/ffxiv-raid-drills/commits/<sha>/check-runs`. The owner can paste logs from
  the dashboard.
- The repository merges by fast-forward push, not by pull requests. The publish script deletes
  merged branches on GitHub.
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
  `test/*`, `e2e/*`, `scripts/*`, `playwright.config.ts`, `biome.json`, `mise.toml`,
  `components.json`, `.gitignore`, `.gitattributes`, `.nojekyll`. Everything else counts as the
  app (`src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`,
  `tsconfig.json`, `wrangler.jsonc`, `.node-version`), and so does any new file, so a forgotten
  path costs a build, never a missed deploy. Cloudflare builds anyway for a push with 20 or more
  commits or 3000 or more changed files. When a new file outside the app comes in at the top
  level, add it to the exclude list in the dashboard, here and in `paths-ignore` in `.github/workflows/preview.yml`.

## CI and the main ruleset

- GitHub Actions, `.github/workflows/ci.yml`, on every branch push and on pull requests to
  `main`. Two jobs: "Lint, types, tests, build" and "Browser tests" (Chromium, Firefox and WebKit;
  the Playwright report is kept for 14 days when a test fails). Actions are pinned to a commit,
  the token can only read, and a newer push cancels an older run of the same branch. CI does not
  skip any path, because `main` needs its result on every commit.
- A repository ruleset, "main", on the default branch, with no bypass (the owner too): the two CI
  jobs must have passed on the commit, no force push, no deletion, linear history (no merge
  commits). The owner chose this over pull requests for themselves, so the fast-forward publish
  stays. In an emergency, turn the ruleset off in Settings > Rules > Rulesets, and back on after.
- A second ruleset, "main: pull requests": only the owner may push to `main` directly. Everyone
  else needs a pull request, merged by rebase or squash. It needs no approval: the owner chose
  this so their own pull requests merge without a bypass. GitHub cannot tell rules apart by who
  wrote a pull request, but only people with write access can merge one, and today that is only
  the owner. Give someone else write access, and set the approvals back to 1 first. The
  repository admin role (only the owner) bypasses this ruleset only. It is a ruleset of its own,
  because a bypass covers a whole ruleset, and the CI rule must bind the owner too.
- GitHub checks the commit a push to `main` ends on, by the CI run on that same commit when its
  branch was pushed. So push the branch, wait for CI, then push `main`. `scripts/publish.sh` waits
  for the two checks.
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

## Tips

- Vitest hides `console.log` in a passing test. To see a value in a probe test, throw it.
- A preview answers a deep link such as `/learn` with 404 to a bare `curl`, and with the page to
  a browser. To test one with curl, send a browser's headers:
  `curl -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document' <url>`.
- An arena picture's view box is `-4 -6 108 110`. The row above the floor (y -6 to 0) holds only the
  "N", which is where the player's "Paused" badge sits.
