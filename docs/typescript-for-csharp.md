# TypeScript for C# developers

This project uses TypeScript, Vite and Vitest. This guide maps each TypeScript feature in the code to the C# feature that is closest. Each item names a file where you can see the feature.

The code has short teaching comments next to these features. Search the code for `TS note:` to find them.

## How the code runs

Browsers run JavaScript only. TypeScript is JavaScript with type annotations. The compiler checks the types, then removes them, so the browser gets plain JavaScript.

Two tools share the work in this project:

1. `tsc`, the TypeScript compiler, checks the types. It writes no files. Run it with `npm run typecheck`.
2. Vite compiles the TypeScript and the JSX (with its React plugin), bundles the modules and serves the site. Run it with `npm run dev` or `npm run build`.

C# keeps type information at run time. TypeScript does not. When the code runs, a type such as `Slot` does not exist. The code cannot ask "is this value a Slot?", so it checks the value itself, for example `s === "H1"`.

## Feature map

- String unions, such as `type Slot = "H1" | "H2"`. The closest C# match is an enum, but the values stay plain strings. See `src/types.ts`.
- Tuples, such as `type Point = [number, number]`. The closest C# match is a value tuple, `(double X, double Y)`. See `src/types.ts`.
- Labeled tuples, such as `[t: number, name: string, cats: Category[], note: string, hit?: HitRule]`. The labels only name the positions for the reader. A `?` makes a position optional. See `Row` in `src/data/abilities.ts`.
- `as const`. It keeps a literal value as narrow as possible: an array becomes a fixed, read-only tuple, and text keeps its exact value. `new Map(list.map(m => [m.id, m.title] as const))` needs it, because without it each pair is a plain `string[]`. See `COMPASS` in `src/geometry.ts`.
- Interfaces, such as `interface CircleZone { c: Point; r: number }`. They describe the shape of an object, like a C# interface or record. TypeScript compares shapes, not names: any object with the right fields fits. See `src/types.ts`.
- Optional fields, such as `cls?: string`. The type is `string | undefined`, like `string? Cls` in C#. See `src/types.ts`.
- Null in the type, such as `f: number | null`. With `"strict": true` in `tsconfig.json`, null is not a valid number. This works like C# nullable reference types with warnings treated as errors. See `Boss` in `src/types.ts`.
- Function types, such as `(p: Point) => boolean`. The closest C# match is `Func<Point, bool>`. See `RuleZone` in `src/types.ts`.
- Arrow functions, such as `(v: Point): Point => ...`. They are lambdas. The part after the second colon is the return type. See `src/geometry.ts`.
- Generics, such as `bySlot<T>(s: Slot, v: Record<Slot, T>): T`. They work like C# generics, and the compiler usually infers `T` from the arguments. See `src/util.ts`.
- `Extract<U, X>`, the members of union `U` that fit `X`. `Slot = Extract<SlotName, "H1" | "H2">` is the healer part of all eight slot names. C# has no direct match. See `src/types.ts`.
- Generic constraints, such as `T extends HTMLElement`. The closest C# match is `where T : HTMLElement`. See `el()` in `src/util.ts`.
- `ReturnType<typeof f>`, the type a function returns. `typeof` reads the type of a value, here a function, and `ReturnType` takes its result. C# has no direct match; you would write the type out. See the Share timer in `src/share.ts`.
- `readonly T[]`. A list the code cannot change: no push, no new entries. The closest C# match is `IReadOnlyList<T>`. See `ROLES` in `src/party.ts` and `DRILLS` in `src/data/drills.ts`.
- `satisfies`. It checks that a value fits a type, but keeps the value's own, narrower type. With `as const` it checks a fixed list and keeps every exact value. C# has no direct match. See `NAMES` in `src/party.ts` and `CHOICE_ROWS` in `src/data/fight.ts`.
- Type guards, such as `(s: unknown): s is Slot`. Where the function returns true, the compiler treats `s` as a `Slot`, like `if (x is Slot s)` in C#. The check itself is plain code you write, so it must match the type. See `isSlot` in `src/party.ts`.
- `Record<K, V>`. An object used as a map, like `Dictionary<K, V>`. When `K` is a union, the compiler requires an entry for every member. See `DOT` in `src/components/CategoryDots.tsx`.
- `Partial<T>`. The same type with every property optional. `Partial<Record<Slot, V>>` is a map that may have an entry for each slot, like a `Dictionary<Slot, V>` that starts empty. See `Scores` in `src/stores/progress.ts`.
- `?.`, `??` and `??=`. They work as in C#. See `o.r ?? TOWER_R` in `src/components/arena/Shape.tsx` and `groups[o.spawn] ??= []` in `src/components/arena/LiveArena.tsx`.
- `unknown` and `any`. `unknown` is like `object`: you must check the value before you use it. `any` is like `dynamic`: it turns checking off. This project does not use `any`. See `src/util.ts`.
- Modules. Each file is a module. `export` makes a name public, and `import { name } from "./file"` brings it in. There are no namespaces. The closest C# match is a file-scoped namespace plus `using`.
- JSX, the HTML-like tags in `.tsx` files, such as `<li><b>{name}:</b> {text}</li>`. The compiler turns each tag into a call to React and checks every tag and attribute. `{...}` inside a tag runs TypeScript. A CSS class is `className`, not `class`. The closest C# match is a Razor component. See `src/pages/CheatSheetPage.tsx`.
- Components and props. A React component is a function that takes one props object and returns JSX. An interface named `<Name>Props` types the props, like a method's parameter list: `function Rule({ name, text, card }: RuleProps)`. See `Rule` in `src/pages/CheatSheetPage.tsx` and `CategoryDots` in `src/components/CategoryDots.tsx`.
- Hooks, such as `const [confirm, setConfirm] = useState(false)`. A hook keeps a value between draws of a component, and calling the setter draws it again. The type comes from the first value. The closest C# match is a field in a Blazor component plus `StateHasChanged()`. See `CheatSheetPage` in `src/pages/CheatSheetPage.tsx`.
- `useEffect` runs code after a draw, and again when a value in its list changes. The function it returns cleans up, like `Dispose`. `useRef` holds a value, often an element, without drawing again. See `TabNav` in `src/components/` and `useTimeout` in `src/hooks/`.
- `useEffectEvent`. It wraps code that a listener added in an effect calls, so the code always sees the latest state, and the listener is added once. See the keyboard keys in `src/components/quiz/QuestionCard.tsx`.
- A function passed to `useState`, such as `useState(() => shuffle(...))`. It runs only on the first draw, like a lazy field initializer. See `QuestionCard`.
- Custom hooks, such as `useTimeout()`. A function whose name starts with `use` and that calls other hooks. It shares behaviour between components, like a small helper class with its own state. See `src/hooks/`.
- A Zustand store, such as `useSlotStore`. It keeps state outside the components, like a singleton service in C# that raises a change event. A component reads it with `useSlotStore((s) => s.slot)` and draws again when that value changes. See `src/stores/slot.ts`.
- `import type`. It imports names that the compiler needs for checking only. C# has no equivalent, because C# types exist at run time. See the top of most files.

## Unions and narrowing

A union type means "one of these shapes". Before you read a field that only one shape has, you must find out which shape you hold. TypeScript follows your checks and narrows the type. This is the TypeScript version of C# pattern matching.

From `src/geometry.ts`:

```ts
export function inZone(p: Point, z: Zone): boolean {
  if("fn" in z) return z.fn(p);           // here z is a RuleZone
  if("c" in z) return Math.hypot(p[0] - z.c[0], p[1] - z.c[1]) <= z.r;   // here z is a CircleZone
  return p[0] >= z.rect[0] && p[0] <= z.rect[2];                          // only RectZone is left
}
```

The `Overlay` type in `src/types.ts` is a discriminated union. Every member has a `t` field with a different value. In `Shape` in `src/components/arena/Shape.tsx`, each `case` of `switch (o.t)` knows its exact member. In C#, you get the same result with a sealed record hierarchy and a switch expression.

`Screen` in `src/pages/PressurePage.tsx` is one too: after `screen.kind === "run"`, TypeScript knows `screen.code`. `Extract<Screen, { kind: "run" }>` names that one member.

`instanceof` narrows a class type, like C#'s `is Element el`. In `isPageKey` in `src/lib/dom.ts`, an event's target is only an `EventTarget`; after `target instanceof Element`, TypeScript lets you read `target.tagName`.

## Common compiler errors

- "Object is possibly 'null'." The value can be null. Check for null first, use `?.`, or use a helper that throws, such as `el()`.
- "Parameter 'x' implicitly has an 'any' type." The compiler cannot work out the type. Add an annotation, such as `(x: number) =>`.
- "Type 'number[]' is not assignable to type 'Point'." An array literal became a general array. Annotate the variable or the return type as `Point`.
- "Property 'r' does not exist on type ...". The value is a union. Narrow it first with `in`, `===` on the tag field, or `typeof`.

## Daily commands

- `npm install` installs the tools into `node_modules/`. After you clone the repository, run it once.
- `npm run dev` starts a local server. When you save a file, the browser updates.
- `npm test` runs the tests with Vitest.
- `npm run typecheck` runs the type checker.
- `npm run build` checks the types and builds the site into `dist/`.
