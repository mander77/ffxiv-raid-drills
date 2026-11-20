import { test, assert } from "vitest";
import { parseRoute, routeLink, type Route } from "../src/router";
import { MAPS } from "../src/data/drills";
import { MECH, NEXT_ITEMS } from "../src/data/questions";

test("every card in every tab has a path that reads back to the same card", () => {
  const routes: Route[] = [
    {tab:"home"}, {tab:"sheet"}, {tab:"map"},
    ...MECH.map((q): Route => ({tab:"mech", card:q.id})),
    ...NEXT_ITEMS.map((q): Route => ({tab:"next", card:q.id})),
    // Practice: a mechanic, with or without its pattern code.
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id})),
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id, code:"K3PZ"})),
    // The full fight under Pressure: a fight, its picks and, while paused, the moment.
    {tab:"pressure"}, {tab:"pressure", code:"K3PZ"}, {tab:"pressure", code:"K3PZ", picks:"raw=axe,set1=axe-sword-scythe"},
    {tab:"pressure", code:"K3PZ", picks:"void=spread", t:48.2}, {tab:"pressure", code:"K3PZ", t:600}
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
  assert.deepEqual(parseRoute("#pressure/k3pz/raw=axe,ult=cw"), {tab:"pressure", code:"K3PZ", picks:"raw=axe,ult=cw"});
  assert.deepEqual(parseRoute("#map/m-void/k3pz"), {tab:"map", drill:"m-void", code:"K3PZ"});
  assert.deepEqual(parseRoute("#mech/k-sword"), parseRoute("/mech/k-sword"));
  assert.deepEqual(parseRoute("#mech"), {tab:"mech"});
  assert.deepEqual(parseRoute("#home"), {tab:"home"});
});

test("a path that names nothing known opens the landing screen or the plain tab", () => {
  assert.deepEqual(parseRoute(""), {tab:"home"});
  assert.deepEqual(parseRoute("/"), {tab:"home"});
  assert.deepEqual(parseRoute("/nonsense/abc"), {tab:"home"});
  assert.deepEqual(parseRoute("/mech/"), {tab:"mech"});
  assert.deepEqual(parseRoute("/map/K3PZ"), {tab:"map"}, "a pattern code with no mechanic");
  assert.deepEqual(parseRoute("/map/m-void/not-a-code"), {tab:"map", drill:"m-void"});
  assert.deepEqual(parseRoute("/pressure/not-a-code"), {tab:"pressure"});
  assert.deepEqual(parseRoute("/fight/K3PZ"), {tab:"home"});
});

test("a full-fight link keeps its moment only with a fight code, and drops a moment it cannot read", () => {
  assert.deepEqual(parseRoute("/pressure?t=48"), {tab:"pressure"});
  assert.deepEqual(parseRoute("/pressure/K3PZ?t=oops"), {tab:"pressure", code:"K3PZ"});
  assert.deepEqual(parseRoute("/pressure/K3PZ?t=9999"), {tab:"pressure", code:"K3PZ"});
  assert.deepEqual(parseRoute("/pressure/K3PZ?t=0"), {tab:"pressure", code:"K3PZ"});
  assert.equal(routeLink({tab:"pressure", t:48}), "/pressure");
});

test("card ids are unique, so a path opens one card", () => {
  const ids = [...MECH, ...NEXT_ITEMS].map(q => q.id).concat(MAPS.map(m => m.id));
  assert.equal(new Set(ids).size, ids.length);
});
