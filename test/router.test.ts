import { test, assert } from "vitest";
import { parseRoute, routeLink, type Route } from "../src/router";
import { MAPS } from "../src/data/drills";
import { MECH, DEATH, NEXT_ITEMS } from "../src/data/questions";
import { JOB } from "../src/data/jobs";
import { ABILITIES } from "../src/data/abilities";

test("every card in every tab has a path that reads back to the same card", () => {
  const routes: Route[] = [
    {tab:"home"}, {tab:"pressure"}, {tab:"sheet"}, {tab:"map"}, {tab:"fight"},
    ...MECH.map((q): Route => ({tab:"mech", card:q.id})),
    ...NEXT_ITEMS.map((q): Route => ({tab:"next", card:q.id})),
    ...DEATH.map((q): Route => ({tab:"death", card:q.id})),
    ...JOB.map((q): Route => ({tab:"job", card:q.id})),
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id})),
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id, code:"K3PZ"})),
    ...ABILITIES.map((_a, i): Route => ({tab:"map", ability:i + 1})),
    {tab:"fight", code:"K3PZ"}, {tab:"fight", code:"K3PZ", picks:"raw=axe,set1=axe-sword-scythe"},
    // A drill as it was when the link was made: the picks it follows and the clicks so far.
    {tab:"map", drill:"m-void", code:"K3PZ", picks:"void=spread,set2=axe-sword-scythe", at:[[50, 33], [58.84, 35.4], [-2, 104.5]]},
    {tab:"map", drill:"m-sword", code:"K3PZ", at:[[21.5, 50]]}
  ];
  for(const r of routes){
    const link = routeLink(r);
    assert.match(link, /^\/[a-z0-9/=,-]*(\?at=[0-9.,;-]+)?$/i, "a plain path: " + link);
    assert.deepEqual(parseRoute(link), r, link);
  }
  assert.equal(routeLink({tab:"home"}), "/");
  assert.equal(routeLink({tab:"mech", card:"k-sword"}), "/mech/k-sword");
});

test("old # links still open the same screens", () => {
  assert.deepEqual(parseRoute("#map/m-assault/k3pz"), {tab:"map", drill:"m-assault", code:"K3PZ"});
  assert.deepEqual(parseRoute("#fight/K3PZ/raw=axe,ult=cw"), {tab:"fight", code:"K3PZ", picks:"raw=axe,ult=cw"});
  assert.deepEqual(parseRoute("#mech/k-sword"), parseRoute("/mech/k-sword"));
  assert.deepEqual(parseRoute("#mech"), {tab:"mech"});
  assert.deepEqual(parseRoute("#home"), {tab:"home"});
});

test("a path that names nothing known opens the landing screen or the plain tab", () => {
  assert.deepEqual(parseRoute(""), {tab:"home"});
  assert.deepEqual(parseRoute("/"), {tab:"home"});
  assert.deepEqual(parseRoute("/nonsense/abc"), {tab:"home"});
  assert.deepEqual(parseRoute("/mech/"), {tab:"mech"});
  assert.deepEqual(parseRoute("/fight/not-a-code"), {tab:"fight"});
  assert.deepEqual(parseRoute("/map/ability/0"), {tab:"map"});
  assert.deepEqual(parseRoute("/map/ability/x"), {tab:"map"});
});

test("a drill link keeps its clicks only with a pattern code, and drops clicks it cannot read", () => {
  assert.deepEqual(parseRoute("/map/m-void?at=50,33"), {tab:"map", drill:"m-void"});
  assert.deepEqual(parseRoute("/map/m-void/K3PZ?at=50,33;oops"), {tab:"map", drill:"m-void", code:"K3PZ"});
  assert.deepEqual(parseRoute("/map/m-void/K3PZ?at=50,999"), {tab:"map", drill:"m-void", code:"K3PZ"});
  assert.equal(routeLink({tab:"map", drill:"m-void", code:"K3PZ", at:[[50.126, 33]]}), "/map/m-void/K3PZ?at=50.13,33");
});

test("card ids are unique, so a path opens one card", () => {
  const ids = [...MECH, ...NEXT_ITEMS, ...DEATH, ...JOB].map(q => q.id).concat(MAPS.map(m => m.id));
  assert.equal(new Set(ids).size, ids.length);
});
