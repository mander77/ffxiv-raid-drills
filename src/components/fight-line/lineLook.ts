// The sizes and classes the two fight lines share (MovingLine and StillLine), so they look the same.

/** Where the now mark sits from the start of the box, how far the line goes on before it, the
    room after the line at the end, and how far apart two rows stay at least, in pixels, down the
    box ("y") and across it ("x"). On the line that stands still, a second of the fight is
    `perSecond` pixels, and a long gap is cut to `most` pixels, so the mechanics stay close
    enough to drag between. The app's choice. */
export const SIZES = {
  y: { now: 56, before: 40, end: 12, gap: 36, perSecond: 2, most: 108 },
  x: { now: 56, before: 40, end: 12, gap: 76, perSecond: 2, most: 152 },
} as const;
/** The classes of each part, down the box and across it. Complete class names, so Tailwind finds
    them. In the player a drag along the line moves the clock; a swipe the other way stays the
    browser's. */
export const LOOK = {
  y: {
    section: "flex min-h-0 flex-col",
    box: "min-h-0 flex-1",
    drag: "touch-pan-x",
    line: "left-7 w-0.5",
    now: "left-3.5 h-1 w-8",
    tick: "left-0 flex w-9 -translate-y-1/2 items-center justify-end gap-0.5",
    list: "inset-x-0 top-0",
    item: "top-0 right-2 left-3.5",
    button: "flex w-full items-center gap-2.5 text-sm",
    name: "min-w-0 truncate px-1",
    key: "right-2 bottom-1.5",
  },
  x: {
    section: "",
    box: "h-24",
    drag: "touch-pan-y",
    line: "top-5.5 h-0.5",
    now: "top-2 h-8 w-1 -translate-x-1/2",
    tick: "bottom-0.5 -translate-x-1/2",
    list: "inset-y-0 left-0",
    item: "top-1.5 left-0 w-18",
    button: "flex w-full flex-col items-center gap-1 text-xs",
    name: "line-clamp-2 px-0.5 text-center leading-tight",
    key: "right-2 bottom-0.5",
  },
} as const;
