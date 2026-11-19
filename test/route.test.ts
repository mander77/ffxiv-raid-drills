import { test, assert } from "vitest";
import { rightRoute, clickRoute, runnerAt, RUN_SPEED, REACT, LOOK, REST_GAP, HOME as START, type Stop } from "../src/data/route";
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
  // Before the mechanic shows: at the start, with no target yet.
  assert.deepEqual(runnerAt(route, 1), {at:START, target:null});
  // The mechanic is on the arena: still waiting, and the target is the spot for the first hit.
  assert.deepEqual(runnerAt(route, 5.5), {at:START, target:route[0]});
  // It leaves LOOK seconds after the mechanic shows, and gets there at run speed.
  const leave = 5 + LOOK, arrive = leave + dist(START, [50, 34]) / RUN_SPEED;
  const mid = runnerAt(route, (leave + arrive) / 2);
  assert.isTrue(near(mid.at, [(START[0] + 50) / 2, (START[1] + 34) / 2]), "halfway: " + mid.at);
  // On the first spot, the target stays that spot until its hit lands.
  const wait = runnerAt(route, 9.9);
  assert.isTrue(near(wait.at, [50, 34]));
  assert.equal(wait.target, route[0]);
  // The hit lands: the target moves on to the next spot, and it runs there.
  assert.equal(runnerAt(route, 10 + REACT / 2).target, route[1]);
  const run = runnerAt(route, 10 + REACT + 1);
  assert.isTrue(near(run.at, [50 + RUN_SPEED, 34]), "one second after leaving: " + run.at);
  // At the end it stays on the last spot, with no target.
  assert.deepEqual(runnerAt(route, 99), {at:[80, 34], target:null});
});

test("at run speed the runner is never more than half a second late to a right spot", () => {
  const late: string[] = [];
  for(const s of SLOTS) for(let i = 0; i < 30; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f);
    // A look-ahead stop is never reached on purpose, so it does not count.
    for(const st of route.filter(x => !x.look)){
      const g = f.segs[st.si];
      // How far short the runner is at the hit, in seconds of running. A Void Stardust puddle
      // counts when it drops, 3 seconds before it goes off, so the runner leaves it then.
      const short = dist(runnerAt(route, st.hit).at, st.p) / RUN_SPEED;
      if(short > 0.5) late.push(g.title + " step " + (st.j + 1) + ": " + short.toFixed(2) + " s");
    }
  }
  // The route runs to the middle of each spot, so a few tight spots are reached a little after
  // the hit, as in the fight (the Orbital Omen lines come 1.6 seconds apart). None is far off.
  assert.deepEqual(late, []);
});

test("the spread after the puddles goes to the middle of the nearest open gap", () => {
  for(const s of SLOTS) for(let i = 0; i < 20; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f);
    f.segs.forEach((g, si) => {
      const steps = g.scene.steps, j = steps.findIndex(st => st.q.startsWith("Puddles done. Comet"));
      if(j < 0) return;
      const spread = route.find(st => st.si === si && st.j === j), last = route.find(st => st.si === si && st.j === j - 1);
      if(!spread || !last) throw new Error("missing stops");
      // The spread spot is at most as far from the last puddle as the farthest gap (no long detour).
      assert.isBelow(dist(spread.p, last.p), 50, g.title + ": the spread spot is far from the last puddle");
    });
  }
});

test("on a sword the route goes to the pocket's best spot, next to the boss", () => {
  let swords = 0;
  for(const s of SLOTS) for(let i = 0; i < 10; i++){
    const f = buildFight(s, newCode(), RANDOM);
    for(const st of rightRoute(f)){
      const stand = f.segs[st.si].scene.steps[st.j].stand;
      if(!stand) continue;
      swords++;
      assert.isTrue(near(st.p, stand), f.segs[st.si].title + " step " + (st.j + 1));
    }
  }
  assert.isAbove(swords, 0, "the fights have swords");
});

test("in a quiet stretch the runner pre-positions for the next mechanic", () => {
  for(const s of SLOTS) for(let i = 0; i < 10; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f), moves = route.filter(st => !st.look);
    let quiet = 0;
    moves.forEach((st, k) => {
      if(k && st.show - moves[k - 1].hit < REST_GAP) return;
      quiet++;
      // When the mechanic shows, the runner already stands on its pre-position. The runner does
      // not take a step of half a unit or less, so it can stand that close instead.
      const at = runnerAt(route, st.show).at;
      const pre = st.pre ?? START;
      assert.isAtMost(dist(at, pre), 0.5, f.segs[st.si].title + ": at " + at + ", not " + pre);
    });
    assert.isAbove(quiet, 2, "the fight has quiet stretches");
    // The first Void Stardust starts with the first puddle north of the boss, and the second at
    // his butt, so the player pre-positions on that first puddle. Other mechanics have no
    // pre-position of their own.
    for(const st of moves){
      const title = f.segs[st.si].title, first = moves.find(m => m.si === st.si);
      if(title.startsWith("Void Stardust")) assert.deepEqual(st.pre, first?.p, title);
      else assert.isUndefined(st.pre, title);
    }
  }
});

test("a look-ahead step has an answer, but the runner does not go there", () => {
  for(const s of SLOTS) for(let i = 0; i < 10; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f), si = f.segs.findIndex(g => g.drills.includes("m-void"));
    const pick = route.find(st => st.si === si && st.j === 0), puddle = route.find(st => st.si === si && st.j === 1);
    if(!pick || !puddle) throw new Error("missing Void Stardust stops");
    assert.isTrue(pick.look, "the weapon pick is a look-ahead");
    // From the moment the mechanic shows until the first puddle drops, the runner never goes to
    // the weapon, and its target is the first puddle spot (north, by A), never the weapon.
    for(let t = pick.show; t < puddle.hit; t += 0.25){
      const r = runnerAt(route, t);
      assert.isAbove(dist(r.at, pick.p), 8, "at " + t.toFixed(2) + " s the runner is on the weapon");
      assert.equal(r.target, puddle, "at " + t.toFixed(2) + " s the target is not the first puddle");
    }
    assert.isTrue(near(runnerAt(route, puddle.hit).at, puddle.p), "on the first puddle spot when it drops");
  }
});

test("a played-back run follows your clicks, each one at the hit of the step it answered", () => {
  const f = buildFight("H1", "K3PZ", RANDOM), g = f.segs[1];
  const route = clickRoute(f, [{si:1, j:1, p:[30, 30]}, {si:1, j:0, p:[60, 60]}, {si:99, j:0, p:[0, 0]}]);
  assert.deepEqual(route.map(st => st.hit), [g.due[0], g.due[1]], "in time order, and an unknown mechanic is left out");
  assert.deepEqual(route[0].p, [60, 60]);
});

test("the watched run shows no weapon spot before the boss turns to the first weapon", () => {
  for(const s of SLOTS) for(let i = 0; i < 20; i++){
    const f = buildFight(s, newCode(), RANDOM), route = rightRoute(f);
    f.segs.forEach((g, si) => {
      if(!g.turn) return;
      const first = g.scene.steps.length - g.turn.weapons;
      for(const st of route.filter(x => x.si === si && x.j >= first)) assert.isAtLeast(st.show, g.turn.at, g.title);
      // Just before he turns, the target (and its blue area) is not a weapon spot yet.
      const before = runnerAt(route, g.turn.at - 0.05).target;
      assert.isFalse(before?.si === si && before.j >= first, g.title + ": a weapon spot shows before he turns");
    });
  }
});

test("your own click: the marker runs to the spot when you click it, not before", () => {
  const f = buildFight("H1", "K3PZ", RANDOM), g = f.segs[1];   // the first Assault Evolved set
  const tClick = g.due[0] - 4, p: Point = [30, 30];
  const route = clickRoute(f, [{si:1, j:0, p, t:tClick}]);
  assert.equal(route[0].click, tClick);
  assert.isUndefined(route[0].pre, "your own route takes no pre-position");
  assert.isTrue(near(runnerAt(route, tClick - 0.1).at, START), "before the click it stands still");
  // Half a second after the click it is half a second of running on its way.
  assert.closeTo(dist(runnerAt(route, tClick + 0.5).at, START), RUN_SPEED * 0.5, 1e-6);
  assert.isTrue(near(runnerAt(route, g.due[0]).at, p), "on the spot when the weapon hits");
});
