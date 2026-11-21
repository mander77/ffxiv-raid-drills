// Small helpers shared by every module.
import type { Slot } from "./types";

/** Pick the H1 or the H2 version of a value: bySlot(s, {H1:"left", H2:"right"}). */
// TS note: Record<Slot, T> needs an entry for every Slot. When a new slot joins Slot, each call
// that misses it is a type error, so no slot falls back to another slot's value by accident.
// The compiler infers T from the entries, so bySlot(s, {H1:1, H2:-1}) gives a number.
export const bySlot = <T>(s: Slot, v: Record<Slot, T>): T => v[s];

/* Random numbers for patterns. They come from Math.random, except inside withSeed(), which
   uses a seeded generator: the same seed always gives the same numbers, so a pattern code
   always rebuilds the same pattern. */
let rng: () => number = Math.random;
export const random = (): number => rng();

/** A small seeded generator (mulberry32). Each call returns a number from 0 up to 1. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run fn with random() seeded from a pattern code, and return what fn returns. */
// TS note: <T> lets withSeed return whatever fn returns, a Scene or a Fight, with its own type.
// try/finally works as in C#: the old generator comes back even if fn throws.
export function withSeed<T>(code: string, fn: () => T): T {
  const before = rng;
  rng = seeded(codeSeed(code));
  try { return fn(); } finally { rng = before; }
}

/* Pattern codes: 4 characters, without 0, O, 1 and I, which are easy to mix up. */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const newCode = (): string => Array.from({length:4}, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const isCode = (s: string): boolean => /^[2-9A-HJ-NP-Z]{4}$/.test(s.toUpperCase());
function codeSeed(code: string): number {
  let n = 0;
  for(const ch of code.toUpperCase()) n = n * CODE_CHARS.length + Math.max(0, CODE_CHARS.indexOf(ch));
  return n * 2654435761;   // spread nearby codes far apart
}

export function shuffle<T>(a: T[]): T[] {
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Time to read some text, in milliseconds: about 4 words a second, and at least 2 seconds. */
export function readingMs(texts: string[]): number {
  const words = texts.join(" ").trim().split(/\s+/).length;
  return Math.max(2000, Math.round(words / 4 * 1000));
}
