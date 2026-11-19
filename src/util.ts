// Small helpers shared by every module.
import type { Slot } from "./types";

/* Per-viewer conveniences only. Reads and writes survive blocked or missing storage. */
export const LS = {
  // TS note: <T> is a generic type parameter, like a C# generic method.
  // LS.get("psecs", 6) infers T = number from the default value, so the result is a number.
  // `as T` tells the compiler to trust that the parsed JSON has that type. It does no check at run time.
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem("m11s." + k); return v == null ? d : JSON.parse(v) as T; } catch { return d; }
  },
  // TS note: `unknown` accepts any value, but you must check it before you use it.
  // It is the safe form of `any`, which turns type checking off.
  set(k: string, v: unknown): void {
    // TS note: `catch { }` with no variable is allowed when you do not need the error.
    try { localStorage.setItem("m11s." + k, JSON.stringify(v)); } catch { /* storage blocked */ }
  },
  del(k: string): void {
    try { localStorage.removeItem("m11s." + k); } catch { /* storage blocked */ }
  }
};

/** Pick the H1 or the H2 version of a value. */
// TS note: an arrow function with a generic parameter. S(s, 1, -1) gives a number,
// and S(s, "left", "right") gives a string. Both arguments must have the same type T.
export const S = <T>(s: Slot, h1: T, h2: T): T => s === "H1" ? h1 : h2;

/* Random numbers for layouts. They come from Math.random, except inside withSeed(), which
   uses a seeded generator: the same seed always gives the same numbers, so a layout code
   always rebuilds the same layout. */
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

/** Run fn with random() seeded from a layout code, and return what fn returns. */
// TS note: <T> lets withSeed return whatever fn returns, a Scene or a Fight, with its own type.
// try/finally works as in C#: the old generator comes back even if fn throws.
export function withSeed<T>(code: string, fn: () => T): T {
  const before = rng;
  rng = seeded(codeSeed(code));
  try { return fn(); } finally { rng = before; }
}

/* Layout codes: 4 characters, without 0, O, 1 and I, which are easy to mix up. */
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

// TS note: Record<string, string> is an object used as a map, like Dictionary<string, string>.
const ESCAPES: Record<string, string> = {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"};
export function esc(t: unknown): string { return String(t).replace(/[&<>"]/g, c => ESCAPES[c]); }

/** getElementById for elements the page always has. */
// TS note: `T extends HTMLElement = HTMLElement` is a constraint with a default,
// like `where T : HTMLElement` in C#. el<HTMLButtonElement>("p-start") returns a button type.
// Throwing here means callers get a plain HTMLElement, never `HTMLElement | null`.
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if(!e) throw new Error("Missing element #" + id);
  return e as T;
}
