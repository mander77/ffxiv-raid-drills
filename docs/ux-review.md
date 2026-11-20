# UX review

The owner asked a fresh agent for a UX review of the live site with the prompt below. Run it in an
agent or session that has a browser and does not know the code. Check each finding on the live
site before you act on it, and compare it with the rejected ideas in `docs/decisions.md`.

## The prompt

```text
You are a senior UX reviewer. Review the website https://ffxiv-raid-drills.app/ for usability
and clarity problems, and recommend changes that make it easier to understand and use.

CONTEXT
- The site is a free practice tool for one FFXIV raid fight: M11S (The Tyrant, Savage), for
  healers. It has these tabs: Home, Learn, Practice, Timeline, Pressure, Cheat sheet.
- Target user: a new or mid-level player who skims, has little patience, and does not know
  raid jargon. The owner's rule: "If a user has to read a lot to use it, it is too much, at
  least for the default settings."
- Goals a user must reach: learn what each mechanic does and where to stand; practice one
  mechanic; answer under time pressure (the quick round and the full-fight run); watch the
  right moves for the whole fight.

SCOPE AND RULES
- Use only the live site in the browser. Do not read source code, docs or the repository.
- Do not sign in, enter personal data, or leave the site.
- Check every tab at desktop width (about 1280x800) and at phone width (375x812).
- Try each goal at least once from a fresh start, as a new user would.
- Base each finding on something you saw. Quote the exact on-screen words or name the control.
  If you are unsure, say what you could not confirm.

WHAT TO LOOK FOR
1. First impression: can a user tell what the site is for, and what to click first, in about
   5 seconds?
2. Navigation: are tab names, buttons and next steps clear? Are there dead ends?
3. Reading load: blocks of text longer than 2 lines, jargon, and unexplained terms or
   abbreviations (for example H1/H2, strat names, "Saved for later").
4. Feedback: does the user always know what happened, what state the app is in (playing,
   paused, done), and what to do next?
5. Timed modes: is the time fair and the pacing clear? Is there dead time, or a question
   asked before the user can know the answer?
6. Layout: the map's size and visibility, controls off screen, phone layout, tap targets.
7. Consistency: the same words, colours and controls for the same meaning across tabs.
8. Accessibility: contrast, keyboard use, focus, and colour used as the only signal.

OUTPUT (under 600 words)
1. One sentence: the biggest problem a new user meets.
2. The top 10 findings, worst first. For each: tab and screen size, what you saw (quote it),
   why it hurts a new user, the change you recommend, and effort (small, medium or large).
3. Quick wins: up to 5 changes of small effort that you would make first.
4. What works well and must not change (up to 3 items).
Write in plain English, with short sentences and no filler.
```
