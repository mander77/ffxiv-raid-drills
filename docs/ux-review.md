# UX review

The owner asked a fresh agent for a UX review of the live site with the prompt below. Run it in an
agent or session that has a browser and does not know the code. Check each finding on the live
site before you act on it, and compare it with `docs/decisions.md`: the ideas the owner rejected,
and what the reviews say must not change.

If the agent uses the Claude desktop app's browser pane, add these lines to the prompt:

- Use only the browser tools. Do not read files or run commands.
- For the phone check, set the window to the "mobile" size, and for dark mode to "dark". After
  the checks, set both back.

## The prompt

```text
You are a senior UX reviewer. Review the website https://ffxiv-raid-drills.app/ for usability
and clarity problems, and recommend changes that make it easier to understand and use.

CONTEXT
- The site is a free practice tool for one FFXIV raid fight: M11S (The Tyrant, Savage), for
  healers. It has these tabs: Home, Learn (quiz cards with arena pictures), Practice (click
  where you stand, one mechanic at a time), Timeline (which mechanic comes next), Pressure (a
  quick round of timed questions, or the full fight on the clock), Cheat sheet (every
  mechanic on one page).
- The header has a role switch (only Healer works today; the other roles say they are not
  yet available), a Group switch for your slot (H1 or H2), a light and dark mode switch, and
  a Share button that copies a link to the page as it is now.
- Target user: a new or mid-level player who skims, has little patience, and does not know
  raid jargon. The owner's rule: "If a user has to read a lot to use it, it is too much, at
  least for the default settings."
- Goals a user must reach: learn what each mechanic does and where to stand; practice one
  mechanic; answer under time pressure (the quick round and the full-fight run); watch the
  correct moves for the whole fight and jump to one mechanic in it; set your own slot; keep
  the Cheat sheet open on a second screen during the raid; share a link with the static.

SCOPE AND RULES
- Use only the live site in the browser. Do not read source code, docs or the repository.
- Do not sign in, enter personal data, or leave the site.
- Check every tab at desktop width (about 1280x800) and at phone width (375x812), and each
  tab once in dark mode.
- Try each goal at least once from a fresh start, as a new user would.
- Base each finding on something you saw. Quote the exact on-screen words or name the control.
  If you are unsure, say what you could not confirm.

WHAT TO LOOK FOR
1. First impression: can a user tell what the site is for, and what to click first, in about
   5 seconds?
2. Navigation: are tab names, buttons and next steps clear? Are there dead ends?
3. Reading load: blocks of text longer than 2 lines, jargon, and unexplained terms or
   abbreviations (for example H1/H2, strat names, "Look ahead").
4. Feedback: does the user always know what happened, what state the app is in (playing,
   paused, done), and what to do next? Does the answer change when they switch H1 and H2,
   and can they tell?
5. Timed modes: is the time fair and the pacing clear? Is there dead time, or a question
   asked before the user can know the answer?
6. Layout: the map's size and visibility, controls off screen, phone layout, tap targets.
7. Consistency: the same words, colours and controls for the same meaning across tabs, and
   across light and dark mode.
8. Links: does a shared link, the browser's Back button or a reload bring back the same
   screen? Do parts that are not ready yet (the other roles) read as a dead end?
9. Accessibility: contrast in both modes, keyboard use, focus, buttons with only an icon,
   and colour used as the only signal.

OUTPUT (under 600 words)
1. One sentence: the biggest problem a new user meets.
2. The top 10 findings, worst first. For each: tab and screen size, what you saw (quote it),
   why it hurts a new user, the change you recommend, and effort (small, medium or large).
3. Quick wins: up to 5 changes of small effort that you would make first.
4. What works well and must not change (up to 3 items).
Write in plain English, with short sentences and no filler.
```
