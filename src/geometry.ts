// Arena geometry. The arena is 100 x 100 units, north is up, y grows south.
import type { Point, Zone } from "./types";

/** Turn a point a quarter turn clockwise about the arena center, k times. */
export function rot(p: Point, k: number): Point {
  let x = p[0], y = p[1];
  for(let i = 0; i < k; i++){ const nx = 100 - y, ny = x; x = nx; y = ny; }
  return [x, y];
}

export function rotZone(z: Zone, k: number): Zone {
  // TS note: `"fn" in z` checks for a field at run time. TypeScript also uses it to narrow
  // the type: after this line, z is a CircleZone or a RectZone, never a RuleZone.
  // It plays the same role as `if (z is RuleZone r)` pattern matching in C#.
  if("fn" in z || !k) return z;
  if("c" in z) return {c: rot(z.c, k), r: z.r};
  const a = rot([z.rect[0], z.rect[1]], k), b = rot([z.rect[2], z.rect[3]], k);
  return {rect: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]};
}

/** Turn anything with x/y (and x2/y2, or a facing f) a quarter turn k times. */
// TS note: `as Record<string, unknown>` is a type assertion. It changes what the compiler
// believes about a value, and it changes nothing at run time. A C# cast can throw;
// a TypeScript assertion never checks. Use assertions only where the code checks the value itself,
// as the typeof tests below do.
export function rotOverlay<T extends object>(o: T, k: number): T {
  if(!k) return o;
  const src = o as Record<string, unknown>, n: Record<string, unknown> = {...src};
  if(typeof src.x === "number" && typeof src.y === "number"){ const p = rot([src.x, src.y], k); n.x = p[0]; n.y = p[1]; }
  if(typeof src.x2 === "number" && typeof src.y2 === "number"){ const p = rot([src.x2, src.y2], k); n.x2 = p[0]; n.y2 = p[1]; }
  if(typeof src.f === "number") n.f = (src.f + 90 * k) % 360;
  return n as T;
}

export function inZone(p: Point, z: Zone): boolean {
  if("fn" in z) return z.fn(p);
  if("c" in z) return Math.hypot(p[0] - z.c[0], p[1] - z.c[1]) <= z.r;
  return p[0] >= z.rect[0] && p[0] <= z.rect[2] && p[1] >= z.rect[1] && p[1] <= z.rect[3];
}

export function zoneCenter(z: Zone): Point {
  if("fn" in z) return z.label;
  if("c" in z) return z.c;
  return [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2];
}

/** Round to 2 decimals for SVG attributes. */
export const f1 = (n: number): number => Math.round(n * 100) / 100;

/* Vector helpers for drills built from the path of the boss.
   Angles are degrees clockwise from north, and y grows south. */
export const DEG = Math.PI / 180;
// TS note: `(v: Point): Point => ...` is an arrow function with typed parameters and a typed result,
// like a C# lambda stored in a Func<Point, Point>. The return type makes the compiler check
// that the body really returns a two-number tuple.
export const unit = (v: Point): Point => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
// TS note: `k = 1` is a default parameter value, as in C#. Its type (number) comes from the default.
export const vadd = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k];
export const leftOf = (d: Point): Point => [d[1], -d[0]];
export const angOf = (d: Point): number => (Math.atan2(d[0], -d[1]) / DEG + 360) % 360;
export const inArena = (p: Point): boolean => p[0] >= 0 && p[0] <= 100 && p[1] >= 0 && p[1] <= 100;
// TS note: `as const` makes the array read-only and keeps each entry as its exact text type.
export const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"] as const;
