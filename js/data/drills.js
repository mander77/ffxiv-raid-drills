import { S, shuffle } from "../util.js";
import { P1, P2, P3, P4 } from "./timeline.js";
import { DEG, unit, vadd, leftOf, angOf, inArena, COMPASS } from "../geometry.js";

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const atAngle = a => [50 + 29 * Math.sin(a * DEG), 50 - 29 * Math.cos(a * DEG)];

/* A jump run: the boss starts in the middle and jumps to each weapon in order.
   He faces the way he jumped, so relative north at each weapon = his travel direction.
   W is the weapon list in jump order: {a: degrees clockwise from north, p: [x, y], type, where?, tornado?}. */
function buildRun(s, W){
  const states = [{x:50, y:50, f:W[0].a}];
  let prev = [50, 50];
  W.forEach(w => { const d = unit([w.p[0] - prev[0], w.p[1] - prev[1]]); states.push({x:w.p[0], y:w.p[1], f:angOf(d), d}); prev = w.p; });
  /* The scythe lies with its butt on his left and its blade end on his right as he lands,
     so H1 (butt) and H2 (point) can read their spot from the weapon itself. */
  const overlays = [];
  W.forEach((w, i) => {
    if(w.type === "scythe"){
      const d = states[i + 1].d;
      overlays.push({t:"scythe", spawn:i, x:w.p[0], y:w.p[1], ux:-d[1], uy:d[0], dx:d[0], dy:d[1]}, {t:"tag", spawn:i, x:w.p[0] - d[0] * 9, y:w.p[1] - d[1] * 9, s:"SCYTHE"});
    } else {
      const out = vadd(w.p, unit([w.p[0] - 50, w.p[1] - 50]), 7.5);
      overlays.push({t:"tag", spawn:i, x:out[0], y:out[1], s:w.type.toUpperCase()}, {t:"target", spawn:i, x:w.p[0], y:w.p[1]});
    }
  });
  const HW = 7, side = S(s, 1, -1), own = S(s, "left", "right");
  const steps = W.map((w, i) => {
    const st = states[i + 1], P = [st.x, st.y], d = st.d, L = leftOf(d), sv = [L[0] * side, L[1] * side];
    const where = w.where || COMPASS[Math.round(w.a / 45) % 8];
    let z, a, reveal;
    if(w.type === "axe"){
      z = {c:vadd(P, unit([50 - P[0], 50 - P[1]]), 28), r:7};
      a = "Axe, " + where + ": stack with the whole party in the middle, outside the axe AoE.";
      reveal = [{t:"aoe", x:P[0], y:P[1], r:20}];
    } else if(w.type === "scythe"){
      z = {c:vadd(P, sv, 9.5), r:5};
      a = "Scythe, " + where + ": close in at the " + S(s, "butt (the handle end)", "point (the blade end)") + " of the scythe.";
      reveal = [{t:"donut", x:P[0], y:P[1], r1:13, r2:75}];
    } else {
      const fn = p => { const v = [p[0] - P[0], p[1] - P[1]], f = v[0] * d[0] + v[1] * d[1], sd = v[0] * sv[0] + v[1] * sv[1]; return inArena(p) && f < -HW && sd > HW && Math.hypot(v[0], v[1]) <= 40; };
      const corner = vadd(vadd(P, d, -HW), sv, HW);
      const poly = [corner, vadd(corner, d, -32), vadd(vadd(corner, d, -32), sv, 32), vadd(corner, sv, 32)];
      z = {fn, show:[{poly}], label:vadd(P, unit(vadd([-d[0], -d[1]], sv)), 17)};
      a = "Sword, " + where + ": the pocket behind him on his " + own + ", on the side he jumped from. " + S(s, "G1", "G2") + " stacks on you.";
      reveal = [{t:"band", x:P[0] - d[0] * 150, y:P[1] - d[1] * 150, x2:P[0] + d[0] * 150, y2:P[1] + d[1] * 150, w:HW * 2},
                {t:"band", x:P[0] - L[0] * 150, y:P[1] - L[1] * 150, x2:P[0] + L[0] * 150, y2:P[1] + L[1] * 150, w:HW * 2}];
    }
    const leave = w.tornado ? {t:"tornado", x:P[0], y:P[1]} : null;
    return {q:ORDINALS[i] + " weapon: click where you go.", z, a, reveal, leave};
  });
  return {W, states, steps, overlays};
}

/* Assault Evolved: three weapons. The boss faces the first, then goes clockwise. */
export function buildAssault(s){
  const spots = [0,45,90,135,180,225,270,315];
  let pick = [0,135,225];
  for(let t = 0; t < 60; t++){
    const cand = shuffle(spots.slice()).slice(0, 3);
    if(cand.every((a, i) => cand.every((b, j) => i === j || Math.min((a - b + 360) % 360, (b - a + 360) % 360) >= 90))){ pick = cand; break; }
  }
  const a0 = pick[0];
  const order = [a0].concat(pick.slice(1).sort((x, y) => ((x - a0 + 360) % 360) - ((y - a0 + 360) % 360)));
  const types = shuffle(["axe","sword","scythe"]);
  return buildRun(s, order.map((a, i) => ({a, p:atAngle(a), type:types[i]})));
}

/* Ultimate Trophy Weapons: six weapons, resolved in spawn order.
   The first spawns south, slightly west (then clockwise) or slightly east (then counterclockwise).
   The second spawns northwest or northeast. The rest sit on cardinals, and the last is north.
   The first three are all different, and so are the last three. The last four leave tornadoes. */
export function buildUltimate(s){
  const cw = Math.random() < 0.5;
  const angles = cw ? [200, 315, 90, 180, 270, 0] : [160, 45, 270, 180, 90, 0];
  const names = cw ? ["south, slightly west", "northwest", "east", "south", "west", "north"]
                   : ["south, slightly east", "northeast", "west", "south", "east", "north"];
  const types = shuffle(["axe","sword","scythe"]).concat(shuffle(["axe","sword","scythe"]));
  const run = buildRun(s, angles.map((a, i) => ({a, p:atAngle(a), type:types[i], where:names[i], tornado:i >= 2})));
  run.states[0].f = null;
  return Object.assign(run, {cw});
}

/* Void Stardust: each puddle goes just outside the previous one, one small step clockwise.
   The next spot is judged from where the last puddle actually dropped. */
export const PUDDLE_R = 6.5;
export function nextPuddle(results){
  const q = results[results.length - 1].drop, rq = Math.max(8, Math.hypot(q[0] - 50, q[1] - 50));
  const step = 2 * Math.asin(Math.min(1, (PUDDLE_R + 2.5) / (2 * rq))) / DEG, ia = (angOf([q[0] - 50, q[1] - 50]) + step) * DEG;
  const ideal = [50 + rq * Math.sin(ia), 50 - rq * Math.cos(ia)];
  const fn = p => {
    const dq = Math.hypot(p[0] - q[0], p[1] - q[1]), r = Math.hypot(p[0] - 50, p[1] - 50);
    const cw = (angOf([p[0] - 50, p[1] - 50]) - angOf([q[0] - 50, q[1] - 50]) + 360) % 360;
    return inArena(p) && dq >= PUDDLE_R && dq <= PUDDLE_R + 6 && r >= 6 && r <= 32 && cw > 3 && cw < 110;
  };
  return {fn, label:ideal, show:[{c:ideal, r:4.5}]};
}

/* Orbital Omen, simplified to 4 lanes each way. Each set fires one north lane and one east lane.
   Set 2 always crosses in one of the four middle squares. */
export function buildOrbital(){
  const outer = shuffle([0,3]), inner = shuffle([1,2]);
  const V = [outer[0], inner[0]].concat(shuffle([outer[1], inner[1]]));
  const H = shuffle([1,2]).concat(shuffle([0,3]));
  const lane = (n, vert) => vert ? {rect:[n * 25, 0, n * 25 + 25, 100]} : {rect:[0, n * 25, 100, n * 25 + 25]};
  const inV = (p, n) => p[0] >= n * 25 && p[0] <= n * 25 + 25, inH = (p, n) => p[1] >= n * 25 && p[1] <= n * 25 + 25;
  /* Hector's dodge: stay in the four middle squares against the boss hitbox and cross it
     to whichever middle square the next lines miss. */
  const mid = p => p[0] >= 25 && p[0] <= 75 && p[1] >= 25 && p[1] <= 75;
  const side = p => Math.abs(p[0] - 50) > Math.abs(p[1] - 50);
  const misses = (p, sets) => sets.every(i => !inV(p, V[i]) && !inH(p, H[i]));
  const cellRect = (c, r) => ({rect:[c * 25, r * 25, c * 25 + 25, r * 25 + 25]});
  const spot = (c, r) => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  const c2 = V[1], r2 = H[1], cOpp = 3 - V[1], r1 = H[0];
  const overlays = [];
  V.forEach((n, i) => overlays.push({t:"guide", x:n * 25 + 12.5, y:0, x2:n * 25 + 12.5, y2:100}, {t:"portal", x:n * 25 + 12.5, y:2.6, vert:true, n:i + 1}));
  H.forEach((n, i) => overlays.push({t:"guide", x:0, y:n * 25 + 12.5, x2:100, y2:n * 25 + 12.5}, {t:"portal", x:97.4, y:n * 25 + 12.5, vert:false, n:i + 1}));
  const lanes = sets => sets.map(i => ({t:"lane", rect:lane(V[i], true).rect})).concat(sets.map(i => ({t:"lane", rect:lane(H[i], false).rect})));
  return {
    overlays,
    steps:[
      {q:"Before the #1 lines and Fire and Fury: where do you stand?",
        z:{fn:p => mid(p) && side(p) && misses(p, [0]), label:spot(c2, r2), show:[cellRect(1, r2), cellRect(2, r2)]},
        a:"Against the boss hitbox at his side, in a middle square the #1 lines miss. Best start: the square where the #2 lines cross.",
        reveal:[{t:"poly", pts:[[50,50],[0,0],[100,0]]}, {t:"poly", pts:[[50,50],[0,100],[100,100]]}].concat(lanes([0]))},
      {q:"The #1 lines and Fire and Fury went off. The #2 lines are next. Where do you go?",
        z:{fn:p => mid(p) && misses(p, [1]), label:spot(cOpp, r1), show:[cellRect(cOpp, r1)]},
        a:"Across the boss hitbox to the opposite middle square. The #2 lines miss it.",
        reveal:lanes([1])},
      {q:"The #2 lines went off. Where do you go now?",
        z:{fn:p => mid(p) && misses(p, [2, 3]), label:spot(c2, r2), show:[{rect:[c2 * 25, 25, c2 * 25 + 25, 75]}]},
        a:"Back across the hitbox, into the column the #2 line already hit. The #3 and #4 lines miss it, so you stay there.",
        reveal:lanes([2, 3]).map(o => Object.assign(o, {soft:true}))}
    ]
  };
}

/* ---------- map drills ---------- */
export const BOSS = {x:50, y:50, f:0};
export const NPUD = [22,34,46,58,70,82].map(x => ({t:"puddle", x, y:5, r:6}));
export const SPUD = [18,30,42,54,66,78].map(x => ({t:"puddle", x, y:95, r:6}));
export const MAPS = [
  {id:"m-raw-axe", order:2, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: axe",
    build:s=>({setup:"The boss pulls out an axe. The two tanks stack for a shared buster. The other six players each get an AoE, so everyone else spreads.",
      boss:BOSS, overlays:[{t:"tag",x:50,y:56,s:"AXE"},{t:"mark",x:47,y:31,l:"MT",r:"T"},{t:"mark",x:53,y:31,l:"OT",r:"T"}],
      steps:[{q:"Click your spread spot.", z:S(s,{c:[34,85],r:10},{c:[66,85],r:10}), a:S(s,"South-southwest, far out.","South-southeast, far out.")}],
      rule:"Axe: tanks stack, party spreads. Scythe: tanks spread, party stacks."})},
  {id:"m-raw-scythe", order:2.1, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: scythe",
    build:s=>({setup:"The boss pulls out a scythe. Each tank takes a cone, so the tanks spread. Everyone else shares one stack.",
      boss:BOSS, overlays:[{t:"tag",x:50,y:56,s:"SCYTHE"},{t:"mark",x:37,y:36,l:"MT",r:"T"},{t:"mark",x:63,y:36,l:"OT",r:"T"}],
      steps:[{q:"Click where the party stacks.", z:{c:[50,69],r:9}, a:"South, right behind the boss."}],
      rule:"Scythe: tanks spread to the front, the party stacks behind."})},
  {id:"m-assault", order:3, phase:P1, time:"0:48 and 1:33", title:"Assault Evolved: three weapons",
    build:s=>{ const A = buildAssault(s); return {
      setup:"Three weapons are on the floor. The boss is in the middle, and the red arrow points at the weapon he faces. He jumps to that one first, then goes clockwise. For the sword, watch where he jumps from. For the scythe, read the weapon: the butt has the round knob, the point is the blade end.",
      overlays:A.overlays,
      bossAt:n => A.states[Math.min(n, A.states.length - 1)],
      steps:A.steps,
      rule:"First = the weapon he faces, then clockwise. Sword: the pocket on the side he jumped from, " + S(s, "G1 on his left", "G2 on his right") + ". Scythe: " + S(s, "H1 at the butt", "H2 at the point") + ", close in. Axe: stack in the middle."}; }},
  {id:"m-void", order:4, phase:P1, time:"1:20", title:"Void Stardust",
    build:s=>({setup:"Void Stardust. Three puddles drop under every player, one after another. After the third one, this time it is a stack on a healer (Crushing Comet).",
      boss:BOSS, overlays:[],
      steps:[
        {q:"Where do you drop the first puddle?", z:{c:[50,33],r:9}, a:"North of the boss, just outside the hitbox.", drop:true},
        {q:"Second puddle?", zf:nextPuddle, a:"Just outside your first puddle, one small step clockwise.", drop:true},
        {q:"Third puddle?", zf:nextPuddle, a:"Just outside the second puddle, clockwise again.", drop:true},
        {q:"Puddles done. Where does the group stack?", zf:nextPuddle, a:"Just outside the third puddle, one more small step clockwise."}],
      rule:"Start north. Drop each puddle just outside the last one, clockwise, so the group uses as little of the arena as possible."})},
  {id:"m-dance", order:8.1, rotate:true, phase:P1, time:"2:31", title:"Dance of Domination: pairs",
    build:s=>({setup:"The seven hits are over and the lines are on the floor. Find the side with no outer line. That open side is new south.",
      boss:{x:50, y:50, f:null}, overlays:[
        {t:"lineaoe",x:0,y:12,x2:100,y2:12},{t:"lineaoe",x:12,y:0,x2:12,y2:100},{t:"lineaoe",x:88,y:0,x2:88,y2:100},
        {t:"lineaoe",x:0,y:0,x2:100,y2:100},{t:"lineaoe",x:100,y:0,x2:0,y2:100},{t:"lineaoe",x:50,y:0,x2:50,y2:100}],
      steps:[{q:"Click your pair spot.", z:S(s,{c:[33,91],r:8},{c:[67,91],r:8}), a:S(s,"Relative southwest, the outer spot, with R1.","Relative southeast, the outer spot, with R2.")}],
      rule:"Open side = new south. H1 and R1 relative SW, H2 and R2 relative SE."})},
  {id:"m-ultimate", order:11.5, phase:P1, time:"3:05 to 3:41", title:"Ultimate Trophy Weapons: six weapons",
    build:s=>{ const U = buildUltimate(s); return {
      setup:"Everyone is at 1 HP after Charybdistopia. Six weapons spawn one after another, and the boss resolves them in spawn order. Watch where the first one spawns: south and slightly west means clockwise, south and slightly east means counterclockwise. The last one is always north.",
      spawnPlay:true, overlays:U.overlays, bossAt:n => U.states[Math.min(n, U.states.length - 1)], steps:U.steps,
      rule:"First weapon south: slightly west = clockwise, slightly east = counterclockwise. The second is NW or NE, then the cardinals, ending north. Use the normal rule for each weapon."}; }},
  {id:"m-tornado", order:12, phase:P1, time:"3:46", title:"Ultimate Trophy Weapons: tornadoes",
    build:s=>({setup:"The sixth weapon resolved (it is always north). Four tornadoes sit on the cardinals. Each one cones its two closest players.",
      boss:BOSS, overlays:[{t:"tornado",x:50,y:16},{t:"tornado",x:20,y:50},{t:"tornado",x:80,y:50},{t:"tornado",x:50,y:84}],
      steps:[{q:"Click your tornado bait spot.", z:S(s,{c:[12,42],r:6.5},{c:[88,58],r:6.5}), a:S(s,"West tornado, on its north side.","East tornado, on its south side.")}],
      rule:"Supports stand on the left, DPS on the right, as you face in from your tornado."})},
  {id:"m-orbital", order:15, phase:P2, time:"4:26 and 8:24", title:"Orbital Omen",
    build:s=>{ const O = buildOrbital(); return {
      setup:"Orbital Omen. The main tank points the boss north. Portals on the north and east edges fire lines across the arena in the order shown (1 to 4). Fire and Fury cleaves his front and back right after the #1 lines. Use Hector's dodge: stay against his hitbox and cross it to the middle square the next lines miss.",
      boss:BOSS, overlays:O.overlays, steps:O.steps,
      rule:"Hector's dodge: stay against the boss hitbox. Start where the #2 lines cross, at his side. After #1 and Fire and Fury, cross the hitbox to the opposite middle square. After #2, cross back and stay."}; }},
  {id:"m-meteor-1", order:16, phase:P2, time:"5:00", title:"Meteorain: first stack",
    build:s=>({setup:"Meteorain. The melee bait the first two meteors and drop them inside the boss hitbox, NE and SW. The first line stack goes off next.",
      boss:BOSS, overlays:[{t:"target",x:57,y:43},{t:"target",x:43,y:57},{t:"mark",x:57,y:43,l:"M1",r:"D"},{t:"mark",x:43,y:57,l:"M2",r:"D"}],
      steps:[{q:"Where do you stand for the first line stack?", z:{c:[36,37],r:8}, a:"NW, in the line stack. The tanks stand in front for this first one."}],
      rule:"Meteor bait order: melee, then healers, then ranged."})},
  {id:"m-meteor-2", order:16.1, phase:P2, time:"5:03", title:"Meteorain: your meteor",
    build:s=>({setup:"Healers bait the second set, and you have a meteor marker. Two rocks are already down inside the boss hitbox: one NE and one SW.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57}],
      steps:[{q:"Where do you drop your meteor?",
        z:S(s, {fn:p => { const r = Math.hypot(p[0] - 50, p[1] - 50), a = angOf([p[0] - 50, p[1] - 50]); return r >= 3 && r <= 11.5 && a >= 285 && a <= 345; },
                label:[43,43], show:[{poly:[[50,50]].concat([285,300,315,330,345].map(a => [50 + 11 * Math.sin(a * DEG), 50 - 11 * Math.cos(a * DEG)]))}]},
               {c:[26,74], r:8}),
        a:S(s, "Inside the boss hitbox, on his NW side.", "SW, in line with the first SW rock, about halfway to the edge.")}],
      rule:S(s, "H1 drops NW, inside the boss hitbox.", "H2 drops SW in line with the first rock. That rock already sits inside the hitbox, and two rocks too close together explode, so yours goes farther out.") + " Icy Veins swaps H1 and H2 here, so do not mix guides."})},
  {id:"m-meteor-3", order:16.2, phase:P2, time:"5:20", title:"Meteorain: third stack",
    build:s=>({setup:"The ranged bait the third set. The rocks are NW (from H1, inside the hitbox) and two SW in a line. Each stack breaks the rock in front of it.",
      boss:BOSS, overlays:[{t:"rock",x:43,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74}],
      steps:[{q:"Where do you stand for this line stack?", z:{c:[35,35],r:7}, a:"NW, behind the NW rock (farther from the boss than the rock)."}],
      rule:"Stack behind a rock to break it. Keep the SW line whole."})},
  {id:"m-meteor-4", order:16.3, phase:P2, time:"5:30 to 5:43", title:"Meteorain: last stack, then hide",
    build:s=>({setup:"The last stack has no meteor baits. The rocks are NE (from R2) and three SW in a line.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74},{t:"rock",x:10,y:90}],
      steps:[
        {q:"Where do you stand for the fourth line stack?", z:{c:[65,35],r:7}, a:"Behind the NE rock, to blow it up."},
        {q:"Triple Tyrannhilation is next. Where do you hide?", z:{c:[5,96],r:6.5}, a:"SW, behind the line of three rocks."}],
      rule:"After the 4th stack, run SW and hide behind the three rocks."})},
  {id:"m-split-line", order:18, phase:P3, time:"6:02", title:"Arena Split: line up",
    build:s=>({setup:"Flatliner knocks everyone back and splits the arena into two platforms.",
      split:true, boss:BOSS, overlays:[],
      steps:[{q:"Click where you line up.", z:S(s,{rect:[0,8,26,48]},{rect:[74,52,100,92]}), a:S(s,"West platform (G1), north end. Supports go NW.","East platform (G2), south end. Supports go SE.")}],
      rule:"G1 west, G2 east. Supports NW and SE, DPS SW and NE. Hector's video puts tanks and ranged north, healers and melee south, so ask your lead which one you use."})},
  {id:"m-split-tower", order:19, phase:P3, time:"6:29", title:"Arena Split: first towers",
    build:s=>({setup:"Four towers appear, two on each platform. Every player takes a tower.",
      split:true, boss:BOSS, overlays:[{t:"tower",x:11,y:23},{t:"tower",x:89,y:23},{t:"tower",x:11,y:77},{t:"tower",x:89,y:77}],
      steps:[{q:"Which tower do you take?", z:S(s,{c:[11,23],r:7.5},{c:[89,77],r:7.5}), a:S(s,"The NW tower, with the MT.","The SE tower, with the OT.")}],
      rule:"Tethered: get knocked to the other platform. Not tethered: get knocked to the same platform."})},
  {id:"m-ecl-start", order:26, phase:P4, time:"8:54", title:"Ecliptic Stampede: start",
    build:s=>({setup:"Ecliptic Stampede. The melee and tanks stack under the boss. The ranged and healers stay out to bait the markers.",
      boss:BOSS, overlays:[{t:"mark",x:25,y:25,l:"R1",r:"D"},{t:"mark",x:75,y:25,l:"R2",r:"D"}],
      steps:[{q:"Where do you stand?", z:S(s,{c:[25,74],r:9},{c:[75,74],r:9}), a:S(s,"Southwest, outside.","Southeast, outside.")}],
      rule:"Marked? Go to the safe corner on your wall. Two marked on one side? The one closer to the proximity AoE moves."})},
  {id:"m-ecl-two", order:26.5, variants:["north","south"], phase:P4, time:"9:31", title:"Ecliptic Stampede: Two-way Fireball",
    build:(s,v)=>({setup:"You were marked and dropped your puddles along the " + v.toUpperCase() + " wall. Now the boss casts Two-way Fireball: two line stacks, east and west.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Which line stack do you join? Click it.", z: v === "north" ? {rect:[16,43,40,57]} : {rect:[60,43,84,57]}, a: v === "north" ? "The west line stack." : "The east line stack."}],
      rule:"Two-way: north puddles = west, south puddles = east."})},
  {id:"m-ecl-four", order:26.6, variants:["north","south"], phase:P4, time:"9:31", title:"Ecliptic Stampede: Four-way Fireball",
    build:(s,v)=>({setup:"You were marked and dropped your puddles along the " + v.toUpperCase() + " wall. Now the boss casts Four-way Fireball: two-player stacks on the four closest.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Where do you bait?", z: v === "north" ? {c:[43,43],r:5.5} : {c:[57,43],r:5.5}, a: v === "north" ? "NW, on the boss hitbox ring." : "NE, on the boss hitbox ring."}],
      rule:"Four-way: north puddles = NW, south puddles = NE. M1 is always SW, M2 always SE."})}
];
