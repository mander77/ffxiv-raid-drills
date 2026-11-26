// The lookups into a fight's generated source file (its source.gen.ts, which `npm run
// import:sources` writes). Each fight binds them to its own file in its sources.ts, so a fight
// time or an attack size is never typed by hand.

/** One cactbot timeline line, as source.gen.ts lists it. */
interface Line {
  t: number;
  name: string;
  /** How long the line lasts, when cactbot gives it: for several hits, from the first to the last. */
  duration?: number;
}
/** One BossMod ability, as source.gen.ts lists it: its cast in seconds, and its shape. */
interface Cast {
  cast: number;
}

/** A time to one decimal, as cactbot writes its times, so a time worked out from two source
    times (a line minus a cast) is exact. */
export const tenth = (t: number): number => Math.round(t * 10) / 10;

// TS note: `const L` asks TypeScript to keep the exact type of the list passed in (each line's
// name as its own text), and `L[number]["name"]` is then the union of every line name. A
// misspelt name is a type error. `K extends keyof A` and the return type `A[K]` keep the exact
// type of the one ability asked for, so `bossmod("AssaultEvolvedSwordAOE").width` is known to
// exist, and asking a circle for its width is a type error.
/** The lookups into one fight's cactbot lines and BossMod abilities. */
export function sourceLookups<const L extends readonly Line[], A extends Record<string, Cast>>(lines: L, abilities: A) {
  type LineName = L[number]["name"];

  /** When the cactbot line `name` comes for the `n`th time (1 is the first), in seconds into the
      fight. The same line in two branches at the same time counts once. */
  function cactbot(name: LineName, n = 1): number {
    const times = lines.filter((l) => l.name === name).map((l) => l.t);
    const t = times[n - 1];
    if (t === undefined) throw new Error(`cactbot has ${times.length} lines "${name}", not ${n}`);
    return t;
  }

  /** BossMod's ability `name`: its cast in seconds and its shape, in yalms. */
  const bossmod = <K extends keyof A>(name: K): A[K] => abilities[name];

  /** When BossMod's cast `ability` starts, for the `n`th cactbot line `name`, where the cast ends. */
  const castStart = (ability: keyof A, name: LineName, n = 1): number => tenth(cactbot(name, n) - abilities[ability].cast);

  /** The numbered lines after the `n`th line `name`, up to the next one, as [time, name]: after the
      second "Heartbreak Kick", its hits "Heartbreak Kick 1" to "Heartbreak Kick 6". */
  function numberedAfter(name: LineName, n: number): Array<[number, string]> {
    const from = cactbot(name, n),
      to = lines.find((l) => l.name === name && l.t > from)?.t ?? Infinity;
    const numbered = (line: string): boolean => line.startsWith(`${name} `) && /^\d+$/.test(line.slice(name.length + 1));
    return lines.filter((l) => l.t > from && l.t < to && numbered(l.name)).map((l): [number, string] => [l.t, l.name]);
  }

  /** When the `n`th cactbot line `name` ends: its time plus its duration. For a line of several
      hits ("Massive Meteor x5"), the last hit. */
  function lineEnd(name: LineName, n = 1): number {
    const t = cactbot(name, n),
      duration = lines.find((l) => l.name === name && l.t === t)?.duration;
    if (duration === undefined) throw new Error(`cactbot gives "${name}" no duration`);
    return tenth(t + duration);
  }

  return { cactbot, bossmod, castStart, lineEnd, numberedAfter };
}
