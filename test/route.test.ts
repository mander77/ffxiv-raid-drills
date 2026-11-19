import { test, assert } from "vitest";
import { rightRoute, clickRoute, runnerAt, RUN_SPEED, REACT, LOOK, HOME as START, type Stop } from "../src/data/route";
import { buildFight, RANDOM } from "../src/data/fight";
import { newCode } from "../src/util";
import { inZone, rotZone } from "../src/geometry";
import type { Point, Slot, StepResult } from "../src/types";

const SLOTS: Slot[] = ["H1", "H2"];
const dist = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a: Point, b: Point): boolean => dist(a, b) < 1e-6;

test("the right route has one stop for every step of the fight, in time order", () => {
  for(const s of SLOTS) for(let i = 0; i < 20; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f);
    assert.equal(route.length, f.segs.reduce((n, g) => n + g.due.length, 0));
    route.forEach((st, k) => { if(k) assert.isAtLeast(st.hit, route[k - 1].hit); });
  }
});

test("every spot of the right route is a right answer, so the watched run scores all right", () => {
  for(const s of SLOTS) for(let i = 0; i < 20; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f);
    f.segs.forEach((g, si) => {
      const res: StepResult[] = [];
      route.filter(st => st.si === si).sort((a, b) => a.j - b.j).forEach(st => {
        const step = g.scene.steps[st.j], base = step.zf ? step.zf(res) : step.z;
        if(!base) throw new Error(g.title + " step " + (st.j + 1) + " has no zone");
        const z = rotZone(base, g.k);
        assert.isTrue(inZone(st.p, z), g.title + " step " + (st.j + 1) + ": " + st.p);
        res.push({p:st.p, ok:true, z, drop:step.drop ? st.p : null});
      });
    });
  }
});

test("the runner waits on a spot until its hit, then runs straight to the next spot", () => {
  const route: Stop[] = [{p:[50, 34], hit:10, show:5, si:0, j:0}, {p:[80, 34], hit:20, show:5, si:0, j:1}];
  // Before the mechanic shows: at the start, with nowhere to go yet.
  assert.deepEqual(runnerAt(route, 1), {at:START, to:null});
  // The mechanic is on the arena: still waiting, but the next spot shows.
  assert.deepEqual(runnerAt(route, 5.5), {at:START, to:[50, 34]});
  // It leaves LOOK seconds after the mechanic shows, and gets there at run speed.
  const leave = 5 + LOOK, arrive = leave + dist(START, [50, 34]) / RUN_SPEED;
  const mid = runnerAt(route, (leave + arrive) / 2);
  assert.isTrue(near(mid.at, [50, 49]), "halfway: " + mid.at);
  // On the first spot until the hit lands, already showing the next spot.
  const wait = runnerAt(route, 10 + REACT / 2);
  assert.isTrue(near(wait.at, [50, 34]));
  assert.deepEqual(wait.to, [80, 34]);
  // Right after the hit it runs to the next spot.
  const run = runnerAt(route, 10 + REACT + 1);
  assert.isTrue(near(run.at, [50 + RUN_SPEED, 34]), "one second after leaving: " + run.at);
  // At the end it stays on the last spot.
  assert.deepEqual(runnerAt(route, 99), {at:[80, 34], to:null});
});

test("at run speed the runner reaches almost every right spot before its hit", () => {
  let stops = 0, late = 0;
  for(const s of SLOTS) for(let i = 0; i < 30; i++){
    const route = rightRoute(buildFight(s, newCode(), RANDOM));
    for(const st of route){
      stops++;
      if(!near(runnerAt(route, st.hit).at, st.p)) late++;
    }
  }
  // The route takes the short way and goes home in quiet stretches, so nearly every spot is
  // reached in time. A spot that is not shows the run as it is: late.
  assert.isBelow(late / stops, 0.02, late + " of " + stops + " spots reached late");
});

test("a played-back run follows your clicks, each one at the hit of the step it answered", () => {
  const f = buildFight("H1", "K3PZ", RANDOM), g = f.segs[1];
  const route = clickRoute(f, [{si:1, j:1, p:[30, 30]}, {si:1, j:0, p:[60, 60]}, {si:99, j:0, p:[0, 0]}]);
  assert.deepEqual(route.map(st => st.hit), [g.due[0], g.due[1]], "in time order, and an unknown mechanic is left out");
  assert.deepEqual(route[0].p, [60, 60]);
});
