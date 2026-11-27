import { assert, test } from "vitest";
import { DRILLS } from "../src/data/fights/m11s/drills";
import { partyNow, partyRoutes, partyStart, partyWent, restSpot, stackedAt } from "../src/data/partyRoute";
import { correctRoute, runnerAt } from "../src/data/route";
import { dist, rot, stepZone, zoneCenter } from "../src/geometry";
import { buildPattern } from "../src/lib/practice";
import { SLOT_NAMES } from "../src/party";
import type { Drill, Point, Scene, Slot, SlotName, StepResult } from "../src/types";
import { buildFight } from "./m11s";

const SLOTS: Slot[] = ["H1", "H2"];
/** Enough codes to see every variant and random part of a drill. */
const CODES = ["K7Q2", "AB12", "ZZ99", "HECT", "M11S", "PQ34", "X1Y2", "LMNO"];

/** The drills that draw the whole party so far. Each slice of issue #217 adds its mechanics. */
const WITH_PARTY = [
  "m-raw-axe",
  "m-raw-scythe",
  "m-assault",
  "m-void",
  "m-void-2",
  "m-ultimate",
  "m-dance",
  "m-tornado",
  "m-orbital",
  "m-meteor-1",
  "m-meteor-2",
  "m-meteor-3",
  "m-meteor-4",
];

/** Every scene a drill builds for these codes and both slots. */
function scenesOf(d: Drill): Array<{ sc: Scene; k: number; s: Slot; code: string }> {
  return SLOTS.flatMap((s) =>
    CODES.map((code) => {
      const { scene, k } = buildPattern(d, s, code);
      return { sc: scene, k, s, code };
    }),
  );
}

/** The correct answers of a scene, one step at a time. */
function correctResults(sc: Scene): StepResult[] {
  const results: StepResult[] = [];
  for (const st of sc.steps) {
    const z = stepZone(st, results);
    if (!z) throw new Error("a step has no zone");
    const p = zoneCenter(z);
    results.push({ p, ok: true, z, drop: st.drop ? p : null });
  }
  return results;
}

const near = (a: Point | undefined, b: Point): boolean => a != null && dist(a, b) < 0.01;

test("the drills that draw the party are the ones this slice built", () => {
  const drawn = DRILLS.filter((d) => buildPattern(d, "H1", "K7Q2").scene.party).map((d) => d.id);
  assert.sameMembers(drawn, WITH_PARTY);
});

test("every step of a drill with the party has a spot for every other player", () => {
  for (const d of DRILLS.filter((x) => WITH_PARTY.includes(x.id)))
    for (const { sc, s, code } of scenesOf(d)) {
      assert.equal(sc.party?.slot, s, `${d.id} ${code}: the scene knows whose it is`);
      const others = SLOT_NAMES.filter((x) => x !== s);
      assert.sameMembers([...partyStart(sc, 0).keys()], others, `${d.id} ${code}: everyone has a start`);
      sc.steps.forEach((st, j) => {
        // A look-ahead step moves nobody, so it lists nobody.
        if (st.lookAhead) {
          assert.isUndefined(st.party, `${d.id} step ${j}`);
          return;
        }
        assert.sameMembers(Object.keys(st.party ?? {}), others, `${d.id} ${code} ${s} step ${j}`);
      });
    }
});

test("no other player stands on a step's spot before you answer it, unless their spot gives nothing away", () => {
  for (const d of DRILLS.filter((x) => WITH_PARTY.includes(x.id)))
    for (const { sc, k, code } of scenesOf(d)) {
      const results = correctResults(sc);
      const start = partyStart(sc, k);
      /** Where the data puts a player after steps 0 to j - 1: their last spot, or their start. */
      const placedBefore = (who: SlotName, j: number): Point | undefined => {
        for (let i = j - 1; i >= 0; i--) {
          const spot = sc.steps[i].party?.[who];
          if (spot != null) return spot === "you" ? stackedAt(who, partyWent(results[i])) : rot(spot, k);
        }
        return start.get(who);
      };
      sc.steps.forEach((st, j) => {
        const before = partyNow(sc, k, results.slice(0, j)),
          after = partyNow(sc, k, results.slice(0, j + 1));
        for (const [l, spot] of Object.entries(st.party ?? {})) {
          const who = l as SlotName,
            at = spot === "you" ? stackedAt(who, partyWent(results[j])) : rot(spot, k);
          const where = `${d.id} ${code} step ${j}: ${who}`;
          // Once you answer, they go there, unless the next step already sends them on early.
          if (!sc.steps[j + 1]?.early?.includes(who)) assert.isTrue(near(after.get(who), at), `${where} goes once you answer`);
          if (st.early?.includes(who)) assert.isTrue(near(before.get(who), at), `${where} goes as soon as it is asked`);
          // A player who moves to a new spot only shows it after your answer.
          else if (!near(placedBefore(who, j), at)) assert.isFalse(near(before.get(who), at), `${where} waits for your answer`);
        }
      });
    }
});

test("Pressure: on the player each other player runs to their spots; in the run they wait for your answer", () => {
  const f = buildFight("H1", "K7Q2");
  const correct = correctRoute(f);
  const youAt = (si: number, j: number): Point | null => correct.find((x) => x.si === si && x.j === j)?.p ?? null;
  const watch = partyRoutes(f, youAt);
  const withParty = f.segs.filter((g) => g.scene.party).length;
  assert.isAbove(withParty, 0);
  for (const who of SLOT_NAMES.filter((x) => x !== "H1")) assert.isNotEmpty(watch.get(who), `${who} has a route`);
  assert.isEmpty(watch.get("H1") ?? [], "you run your own route");
  // A stop of the main tank's that moves them: on the player they are there at its hit.
  const mt = watch.get("MT") ?? [];
  const first = mt.find((x, i) => i > 0 && dist(x.p, mt[i - 1].p) > 5 && !x.pre);
  if (!first) throw new Error("the main tank never moves");
  assert.isTrue(near(runnerAt(mt, first.hit, restSpot("MT")).at, first.p), "on the player, there at the hit");
  // In the run with no answers yet, they never leave for it.
  const run = partyRoutes(f, youAt, () => undefined).get("MT") ?? [];
  const waiting = runnerAt(run, first.hit + 5, restSpot("MT")).at;
  assert.isFalse(near(waiting, first.p), "in the run, they wait for your answer");
});

/** How close two marks may stand: closer, one hides the other. A mark is 4.8 units across. */
const APART = 4;

test("no two players stand on one spot, so every mark shows", () => {
  for (const d of DRILLS.filter((x) => WITH_PARTY.includes(x.id)))
    for (const { sc, k, code } of scenesOf(d)) {
      const results = correctResults(sc);
      for (let j = 0; j <= sc.steps.length; j++) {
        // A player who goes early can pass the stack they just left: that is where they are.
        const early = sc.steps[j]?.early ?? [];
        const spots = [...partyNow(sc, k, results.slice(0, j)).entries()];
        for (let a = 0; a < spots.length; a++)
          for (let b = a + 1; b < spots.length; b++)
            if (early.includes(spots[a][0]) === early.includes(spots[b][0]))
              assert.isAtLeast(dist(spots[a][1], spots[b][1]), APART, `${d.id} ${code} after ${j}: ${spots[a][0]} and ${spots[b][0]}`);
      }
    }
});

test("Pressure: nobody takes a mechanic's start spot before the mechanic appears", () => {
  for (const code of CODES) {
    const f = buildFight("H1", code);
    const correct = correctRoute(f);
    const routes = partyRoutes(f, (si, j) => correct.find((x) => x.si === si && x.j === j)?.p ?? null);
    f.segs.forEach((g) => {
      for (const [l, p] of Object.entries(g.scene.party?.start ?? {})) {
        const who = l as SlotName;
        const route = routes.get(who) ?? [];
        // A player who is there already from the mechanic before gives nothing away.
        const before = route.filter((x) => x.hit < g.from).at(-1);
        if (before && near(before.p, p)) continue;
        const at = runnerAt(route, g.from - 0.01, restSpot(who)).at;
        assert.isFalse(near(at, p), `${code} ${g.title}: ${who} waits for the mechanic`);
      }
    });
  }
});
