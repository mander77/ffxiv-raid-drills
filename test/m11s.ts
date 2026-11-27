// M11S's full fight as the engine and the screens read it (M11S.clock.build), for the tests of
// shared code. The tests of M11S's own data use buildFight in src/data/fights/m11s/fight.ts.
import { M11S } from "../src/data/fights/m11s";
import type { Choices, Fight, Slot } from "../src/types";
import { newCode } from "../src/util";

/** The time limit, in milliseconds, of a test that builds hundreds of fights or patterns in one
    loop. Such a test takes 1 to 4 seconds on a fast computer, but on a busy CI runner it went over
    Vitest's default 5 seconds now and then, and failed with nothing wrong. Fewer repeats would
    check fewer patterns, so these tests get more room instead. */
export const MANY_FIGHTS_TIMEOUT = 20_000;

/** One M11S fight on the clock: a new code and Random picks unless you give them. */
export const buildFight = (s: Slot, code = newCode(), choices: Choices = M11S.clock.random): Fight => M11S.clock.build(s, code, choices);
