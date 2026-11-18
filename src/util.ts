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

export function shuffle<T>(a: T[]): T[] {
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
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
