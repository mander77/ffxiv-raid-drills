import { test, assert } from "vitest";
import { parseRoute, routeLink, type Route } from "../src/router";
import { MAPS } from "../src/data/drills";
import { MECH, DEATH, NEXT_ITEMS } from "../src/data/questions";
import { JOB } from "../src/data/jobs";

test("every card in every tab has a path that reads back to the same card", () => {
  const routes: Route[] = [
    {tab:"home"}, {tab:"pressure"}, {tab:"sheet"}, {tab:"map"},
    ...MECH.map((q): Route => ({tab:"mech", card:q.id})),
    ...NEXT_ITEMS.map((q): Route => ({tab:"next", card:q.id})),
    ...DEATH.map((q): Route => ({tab:"death", card:q.id})),
    ...JOB.map((q): Route => ({tab:"job", card:q.id})),
    // The player: a fight, its picks and, while paused, the moment.
    {tab:"map", code:"K3PZ"}, {tab:"map", code:"K3PZ", picks:"raw=axe,set1=axe-sword-scythe"},
    {tab:"map", code:"K3PZ", picks:"void=spread", t:48.2}, {tab:"map", code:"K3PZ", t:600}
  ];
  for(const r of routes){
    const link = routeLink(r);
    assert.match(link, /^\/[a-z0-9/=,-]*(\?t=[0-9.]+)?$/i, "a plain path: " + link);
    assert.deepEqual(parseRoute(link), r, link);
  }
  assert.equal(routeLink({tab:"home"}), "/");
  assert.equal(routeLink({tab:"mech", card:"k-sword"}), "/mech/k-sword");
});

test("old # links still open the same screens", () => {
  assert.deepEqual(parseRoute("#map/k3pz/raw=axe,ult=cw"), {tab:"map", code:"K3PZ", picks:"raw=axe,ult=cw"});
  assert.deepEqual(parseRoute("#mech/k-sword"), parseRoute("/mech/k-sword"));
  assert.deepEqual(parseRoute("#mech"), {tab:"mech"});
  assert.deepEqual(parseRoute("#home"), {tab:"home"});
});

test("a path that names nothing known opens the landing screen or the plain tab", () => {
  assert.deepEqual(parseRoute(""), {tab:"home"});
  assert.deepEqual(parseRoute("/"), {tab:"home"});
  assert.deepEqual(parseRoute("/nonsense/abc"), {tab:"home"});
  assert.deepEqual(parseRoute("/mech/"), {tab:"mech"});
  assert.deepEqual(parseRoute("/map/not-a-code"), {tab:"map"});
  assert.deepEqual(parseRoute("/fight/K3PZ"), {tab:"home"});
});

test("a player link keeps its moment only with a fight code, and drops a moment it cannot read", () => {
  assert.deepEqual(parseRoute("/map?t=48"), {tab:"map"});
  assert.deepEqual(parseRoute("/map/K3PZ?t=oops"), {tab:"map", code:"K3PZ"});
  assert.deepEqual(parseRoute("/map/K3PZ?t=9999"), {tab:"map", code:"K3PZ"});
  assert.deepEqual(parseRoute("/map/K3PZ?t=0"), {tab:"map", code:"K3PZ"});
  assert.equal(routeLink({tab:"map", t:48}), "/map");
});

test("card ids are unique, so a path opens one card", () => {
  const ids = [...MECH, ...NEXT_ITEMS, ...DEATH, ...JOB].map(q => q.id).concat(MAPS.map(m => m.id));
  assert.equal(new Set(ids).size, ids.length);
});
