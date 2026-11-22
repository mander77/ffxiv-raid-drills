// @vitest-environment happy-dom
// The icon of each kind of mechanic, as Practice's list of mechanics shows it in a square.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { CastSquare } from "../../src/components/CastSquare";
import { KINDS } from "../../src/components/MechanicIcon";
import type { DrillKind } from "../../src/types";

afterEach(cleanup);

/** The square of a kind, found by its name, as a player pointing at it reads it. */
function squareOf(kind: DrillKind) {
  render(<CastSquare mark={{ cats: [], kind }} />);
  return screen.getByTitle(KINDS[kind].name);
}

test("every kind has a name and draws an icon in its square", () => {
  for (const kind of Object.keys(KINDS) as DrillKind[]) {
    assert.ok(squareOf(kind).querySelector("svg"), kind);
    cleanup();
  }
});

test("a pair stack and a shared tank buster show 2 in the middle; a tank buster alone shows none", () => {
  assert.equal(squareOf("pairStack").textContent, "2");
  cleanup();
  assert.equal(squareOf("sharedTankBuster").textContent, "2");
  cleanup();
  assert.equal(squareOf("tankBuster").textContent, "");
});

test("a tower shows how many players soak it, and nothing when the mechanic does not say", () => {
  render(<CastSquare mark={{ cats: [], kind: "towerKnockback", soak: 2 }} />);
  assert.equal(screen.getByTitle(KINDS.towerKnockback.name).textContent, "2");
  cleanup();
  assert.equal(squareOf("tower").textContent, "");
  cleanup();
  render(<CastSquare mark={{ cats: [], kind: "tankTower", soak: 1 }} />);
  assert.equal(screen.getByTitle(KINDS.tankTower.name).textContent, "1");
});
