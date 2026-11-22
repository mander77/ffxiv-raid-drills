// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from "vitest";
import { isPageKey, prefersLessMotion } from "../../src/lib/dom";

/** Press a key on an element, put in the page inside `root`, and return whether isPageKey took it. */
function pressOn(el: Element, init: KeyboardEventInit = {}, root: Element = el): boolean {
  let page = false;
  const listener = (e: KeyboardEvent): void => {
    page = isPageKey(e);
  };
  window.addEventListener("keydown", listener);
  document.body.append(root);
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, ...init }));
  root.remove();
  window.removeEventListener("keydown", listener);
  return page;
}

describe("isPageKey", () => {
  test("a key on the page belongs to the page", () => {
    expect(pressOn(document.createElement("div"))).toBe(true);
  });

  test("a key with Alt, Ctrl or Meta does not", () => {
    const div = (): Element => document.createElement("div");
    expect(pressOn(div(), { altKey: true })).toBe(false);
    expect(pressOn(div(), { ctrlKey: true })).toBe(false);
    expect(pressOn(div(), { metaKey: true })).toBe(false);
  });

  test("a key on a button or an input belongs to it", () => {
    expect(pressOn(document.createElement("button"))).toBe(false);
    expect(pressOn(document.createElement("input"))).toBe(false);
  });

  test("a key inside a dialog belongs to the dialog", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const inside = document.createElement("span");
    dialog.append(inside);
    expect(pressOn(inside, { key: " " }, dialog)).toBe(false);
  });
});

describe("prefersLessMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("follows the system setting", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    expect(prefersLessMotion()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersLessMotion()).toBe(false);
  });

  test("is false in a browser without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersLessMotion()).toBe(false);
  });
});
