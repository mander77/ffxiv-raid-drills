import { test, assert } from "vitest";
import { parseRoute, routeLink, type Route } from "../src/router";
import { MAPS } from "../src/data/drills";
import { MECH, DEATH, NEXT_ITEMS } from "../src/data/questions";
import { JOB } from "../src/data/jobs";
import { ABILITIES } from "../src/data/abilities";

test("every card in every tab has a link that reads back to the same card", () => {
  const routes: Route[] = [
    {tab:"home"}, {tab:"pressure"}, {tab:"sheet"}, {tab:"map"}, {tab:"fight"},
    ...MECH.map((q): Route => ({tab:"mech", card:q.id})),
    ...NEXT_ITEMS.map((q): Route => ({tab:"next", card:q.id})),
    ...DEATH.map((q): Route => ({tab:"death", card:q.id})),
    ...JOB.map((q): Route => ({tab:"job", card:q.id})),
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id})),
    ...MAPS.map((m): Route => ({tab:"map", drill:m.id, code:"K3PZ"})),
    ...ABILITIES.map((_a, i): Route => ({tab:"map", ability:i + 1})),
    {tab:"fight", code:"K3PZ"}, {tab:"fight", code:"K3PZ", picks:"raw=axe,set1=axe-sword-scythe"}
  ];
  for(const r of routes) assert.deepEqual(parseRoute(routeLink(r)), r, routeLink(r));
});

test("old links still open the same screens", () => {
  assert.deepEqual(parseRoute("#map/m-assault/k3pz"), {tab:"map", drill:"m-assault", code:"K3PZ"});
  assert.deepEqual(parseRoute("#fight/K3PZ/raw=axe,ult=cw"), {tab:"fight", code:"K3PZ", picks:"raw=axe,ult=cw"});
  assert.deepEqual(parseRoute("#mech"), {tab:"mech"});
});

test("a link that names nothing known opens the landing screen or the plain tab", () => {
  assert.deepEqual(parseRoute(""), {tab:"home"});
  assert.deepEqual(parseRoute("#nonsense/abc"), {tab:"home"});
  assert.deepEqual(parseRoute("#fight/not-a-code"), {tab:"fight"});
  assert.deepEqual(parseRoute("#map/ability/0"), {tab:"map"});
  assert.deepEqual(parseRoute("#map/ability/x"), {tab:"map"});
});

test("card ids are unique, so a link opens one card", () => {
  const ids = [...MECH, ...NEXT_ITEMS, ...DEATH, ...JOB].map(q => q.id).concat(MAPS.map(m => m.id));
  assert.equal(new Set(ids).size, ids.length);
});
