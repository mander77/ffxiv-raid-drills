// A check for mechanic text in short lines (Lines): a player reads it at a glance, so it must not
// grow back into a paragraph.
import { assert } from "vitest";
import type { Lines } from "../src/types";

/** The most words one line may have. Most lines are about 10 words; a few that join a step with its
    reason are longer. */
export const MAX_WORDS = 16;

/** At least one line, no empty line, no line repeated, and each line short. */
export function assertLines(lines: Lines, what: string): void {
  assert.isAbove(lines.length, 0, `${what}: no lines`);
  assert.equal(new Set(lines).size, lines.length, `${what}: a line is repeated`);
  for (const line of lines) {
    assert.ok(line.trim(), `${what}: an empty line`);
    const words = line.split(/\s+/).length;
    assert.isAtMost(words, MAX_WORDS, `${what}: "${line}" has ${words} words`);
  }
}
