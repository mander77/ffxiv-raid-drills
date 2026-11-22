import { type HTMLAttributes, type PointerEvent, useRef } from "react";

/** The pointer handlers that let you drag a fight line, for its box. */
export type DragHandlers = Pick<HTMLAttributes<HTMLElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

/** What a drag of a fight line does: it starts, it moves `moved` pixels along the line from where
    it started (down or right is positive), and it ends. */
export interface LineDrag {
  start: () => void;
  move: (moved: number) => void;
  end: () => void;
}

/** How far a pointer moves, in pixels, before a press on the line counts as a drag and not a
    click. The app's choice. */
const DRAG_FROM = 4;

/** A press on the line: which pointer, where it started, and whether it is a drag yet. */
interface Press {
  id: number;
  from: number;
  dragging: boolean;
}

/** Drag a fight line along its axis, like scrubbing a video. A press becomes a drag once it moves a
    few pixels; then the box holds the pointer, so the drag goes on outside it and the press does
    not click the row it started on. With no `drag`, the line takes no drags. With `mouseOnly`, a
    finger or a pen does not drag, so the browser scrolls the box the usual way. */
export function useLineDrag(axis: "x" | "y", drag?: LineDrag, mouseOnly = false): DragHandlers {
  const press = useRef<Press | null>(null);
  const along = (e: PointerEvent<HTMLElement>): number => (axis === "y" ? e.clientY : e.clientX);
  function letGo(id: number): void {
    const p = press.current;
    if (!p || p.id !== id) return;
    press.current = null;
    if (p.dragging) drag?.end();
  }
  if (!drag) return {};
  return {
    onPointerDown: (e) => {
      if (e.button !== 0 || (mouseOnly && e.pointerType !== "mouse")) return;
      press.current = { id: e.pointerId, from: along(e), dragging: false };
    },
    onPointerMove: (e) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      const moved = along(e) - p.from;
      if (!p.dragging) {
        if (Math.abs(moved) < DRAG_FROM) return;
        p.dragging = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.start();
      }
      drag.move(moved);
    },
    onPointerUp: (e) => letGo(e.pointerId),
    onPointerCancel: (e) => letGo(e.pointerId),
  };
}
