// Small pieces of markup that several screens share: the rule box, the last answer, the step chips,
// the setup text that folds, the round's tally, the chip row that scrolls sideways, and the prompt
// row above the Practice arena.
// The screens that still build HTML as text keep their own copies for now. Each screen uses these
// components when it moves to Preact, and its text copy goes then.
import type { ComponentChildren } from "preact";
import { useState, useRef, useLayoutEffect } from "preact/hooks";

/** The rule of a mechanic: why the right spot is right. */
export function RuleBox({text}: {text: string}) {
  // TS note: text in JSX is escaped for you, so a "<" in the rule shows as a "<". The text screens
  // call esc() for this by hand.
  return <div class="rule"><span>Rule</span><strong>{text}</strong></div>;
}

/** The answer to the step before: right or not, its question, and the right answer. */
export function LastAnswer({ok, q, a}: {ok: boolean; q: string; a: string}) {
  return <div class={"lastans " + (ok ? "ok" : "bad")}><span class="tag">{ok ? "Right" : "Not there"}</span><b>{q}</b> {a}</div>;
}

/** One chip per step of a mechanic. A step you answered shows a tick or a cross; the step you are
    on now has a dark edge. `results` holds the answered steps, in order. */
export function StepChips({count, results}: {count: number; results: readonly {ok: boolean}[]}) {
  const now = results.length;
  // TS note: Array.from({length: n}, fn) makes an array of n items from fn(_, index), like
  // Enumerable.Range(0, n).Select(...) in C#.
  return <ol class="chips" aria-label="Steps">{Array.from({length:count}, (_x, i) => {
    const r = results[i];
    const cls = r ? "chip " + (r.ok ? "ok" : "bad") : "chip" + (i === now ? " now" : "");
    return <li key={i}><span class={cls}>{i + 1}{r ? (r.ok ? " ✓" : " ✗") : ""}</span></li>;
  })}</ol>;
}

/** The setup text of a mechanic. Before the first answer it shows in full. After that it folds to
    two lines, with More and Less to open and close it. Give it a `key` per mechanic, so the next
    mechanic starts folded again. */
export function SetupText({text, folded}: {text: string; folded: boolean}) {
  const [open, setOpen] = useState(false);
  if(!folded) return <p class="setup">{text}</p>;
  return <>
    <p class={"setup" + (open ? "" : " folded")}>{text}</p>
    <button type="button" class="linkbtn" onClick={() => setOpen(!open)}>{open ? "Less" : "More"}</button>
  </>;
}

/** The count at the end of a round: right, wrong, and the ones you missed. `missed` names the third
    box: "Froze" in the quick round, "Too slow" in the run. */
export function Tally({right, wrong, missed, missedLabel}: {right: number; wrong: number; missed: number; missedLabel: string}) {
  return <div class="tally">
    <div class="ok"><span>Right</span><div class="big">{right}</div></div>
    <div class="bad"><span>Wrong</span><div class="big">{wrong}</div></div>
    <div class="slow"><span>{missedLabel}</span><div class="big">{missed}</div></div>
  </div>;
}

/** A row of chips. On a phone it is one row that scrolls sideways: the chip marked
    aria-current="true" scrolls to the middle, and each edge with more past it fades. */
export function ChipRow({label, children}: {label: string; children: ComponentChildren}) {
  // TS note: useRef keeps a value between draws without drawing again. Here it holds the <div>
  // element once Preact has made it. `<HTMLDivElement>` says what it will hold.
  const row = useRef<HTMLDivElement>(null);
  // TS note: useLayoutEffect runs after Preact has put the elements on the page, before the
  // browser paints them. Code that measures or scrolls elements goes here. The function it
  // returns runs before the next effect, and when the row leaves the page.
  useLayoutEffect(() => {
    const el = row.current;
    if(!el) return;
    const on = el.querySelector<HTMLElement>('[aria-current="true"]');
    if(on && el.scrollWidth > el.clientWidth) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
    // Mark each edge that has more past it ("fl" left, "fr" right), so the CSS can fade it.
    const mark = (): void => {
      el.classList.toggle("fl", el.scrollLeft > 2);
      el.classList.toggle("fr", el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    mark();
    el.addEventListener("scroll", mark, {passive:true});
    return () => el.removeEventListener("scroll", mark);
  });
  return <div class="qchips" role="group" aria-label={label} ref={row}>{children}</div>;
}

/** The prompt row of the HUD above the Practice arena: the step count on the left, the text to
    read, and an optional button on the right (the children). */
export function HudPrompt({count, text, children}: {count: string; text: string; children?: ComponentChildren}) {
  return <div class="hud"><div class="hq"><b class="hcount">{count}</b><span>{text}</span>{children}</div></div>;
}
