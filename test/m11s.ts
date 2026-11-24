// M11S's full fight as the engine and the screens read it (M11S.clock.build), for the tests of
// shared code. The tests of M11S's own data use buildFight in src/data/fights/m11s/fight.ts.
import { M11S } from "../src/data/fights/m11s";
import type { Choices, Fight, Slot } from "../src/types";
import { newCode } from "../src/util";

/** One M11S fight on the clock: a new code and Random picks unless you give them. */
export const buildFight = (s: Slot, code = newCode(), choices: Choices = M11S.clock.random): Fight => M11S.clock.build(s, code, choices);
