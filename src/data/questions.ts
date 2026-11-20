// Quiz questions: the mechanics (Learn), and questions made from the timeline (Timeline).
import { S, shuffle } from "../util";
import { P1, P2, P3, P4, TL } from "./timeline";
import { tlAbilities } from "./abilities";
import type { Question, QuizItem, Slot, TimelineEvent } from "../types";

export const ANDREW = "Andrew's rule";

/* ---------- mechanic questions ---------- */
export function mq(id: string, order: number, phase: string, time: string, build: (s: Slot) => Question): QuizItem {
  return {id, order, phase, time, build};
}
export const MECH: QuizItem[] = [
  mq("k-raw-first", 1, P1, "0:18", s=>({prompt:"Raw Steel Trophy: the boss pulls out a scythe. What happens?",
    options:[{t:"Tanks spread, and the party stacks south behind the boss.", ok:true},{t:"Tanks stack, and the party spreads."},{t:"Everyone spreads on their clock spot."},{t:"The party stacks north, in front of the boss."}],
    why:"The scythe cleaves three times: one cone on each tank, and one cone that the rest of the party shares behind him. The axe is the reverse: a shared tank buster and six spread hits.",
    rule:"Raw Steel Trophy (he holds the weapon). Axe: tanks stack, party spreads. Scythe: tanks spread, party stacks."})),
  mq("k-raw-second", 9, P1, "2:36", s=>({prompt:"The first Raw Steel Trophy was an axe. What is the second one, at 2:36?",
    options:[{t:"A scythe. It is always the other weapon.", ok:true},{t:"An axe again."},{t:"It is random."},{t:"A sword."}],
    why:"The second Raw Steel Trophy always uses the weapon you did not see first.",
    rule:"The second Raw Steel Trophy is the opposite of the first."})),
  mq("k-first-weapon", 3, P1, "0:48", s=>({prompt:"Trophy Weapons: three weapons are on the floor. Which one does the boss do first?",
    options:[{t:"The one he turns to face. Then the other two, clockwise.", ok:true},{t:"Always the sword first."},{t:"The one closest to the tank, then counterclockwise."},{t:"A random one each time."}],
    why:"During the Assault Evolved cast he faces his first weapon. After it, he goes clockwise through the other two.",
    rule:"First = the weapon he faces. Then clockwise."})),
  mq("k-sword", 3.1, P1, "0:50 to 1:45", s=>({prompt:"The boss jumps to the SWORD. Where do you go?",
    options:[{t:S(s,"The pocket behind him on his left, on the side he jumped from. Your light party (G1) stacks on you.","The pocket behind him on his right, on the side he jumped from. Your light party (G2) stacks on you."), ok:true},
      {t:S(s,"The pocket behind him on his right. Your light party stacks on you.","The pocket behind him on his left. Your light party stacks on you.")},
      {t:"Spread on your clock spot around the boss."},{t:"Stack with the whole party in the middle."}],
    why:"The sword's cross lines up with the way he jumped. The two safe pockets on the side he came from belong to the light parties: G1 on his left, G2 on his right. Each pocket has a line stack on its healer, so your light party follows you.",
    rule:"Sword: look where he jumped from. G1 left pocket, G2 right pocket, a few steps in from the inner corner. You are the stack."})),
  mq("k-axe", 3.2, P1, "0:50 to 1:45", s=>({prompt:"The boss jumps to the AXE. Where do you go?",
    options:[{t:"Stack with the whole party in the middle, out of the axe AoE.", ok:true},{t:"Spread out on your clock spot."},{t:"Light party stacks, left and right."},{t:"Inside the axe AoE, next to the boss."}],
    why:"The axe is a point-blank AoE where it lands, and a party stack on a random healer. If the stack is on you, stay with the group.",
    rule:"He jumps to the axe: the whole party stacks in the middle, out of the AoE. This is not Raw Steel Trophy's axe, where the party spreads."})),
  mq("k-scythe", 3.3, P1, "0:50 to 1:45", s=>({prompt:"The boss jumps to the SCYTHE. Where do you go?",
    options:[{t:S(s,"Close in, at the butt (handle end) of the scythe.","Close in, at the point (blade end) of the scythe."), ok:true},
      {t:S(s,"Close in, at the point (blade end) of the scythe.","Close in, at the butt (handle end) of the scythe.")},
      {t:"Far out at the edge of the arena."},{t:"Stack with your light party."}],
    why:"The scythe puts a protean cone on every player, so everyone takes their own clock spot close around him. Read the scythe on the floor before he lands: H1 takes the butt end, H2 takes the point end. You do not need to work out his jump.",
    rule:"Scythe: H1 at the butt, H2 at the point, close in."})),
  mq("k-void", 4, P1, "1:20", s=>({prompt:"Void Stardust starts. What do you do?",
    options:[{t:"Bait 3 puddles: start north of the boss, then drop each one just outside the last, clockwise. Then spread or stack.", ok:true},{t:"Spread at max range and stand still."},{t:"Stack on the tank and do not move."},{t:"Bait 3 puddles far apart: north, then east, then south."}],
    why:"Three puddles drop under every player. Small steps, each just outside the last puddle, keep the puddles packed together and leave the rest of the arena free.",
    rule:"Start north. Each puddle just outside the last, clockwise."})),
  mq("k-void-target", 4.1, P1, "1:30", s=>({prompt:"Void Stardust ends with Crushing Comet, the stack. Who is the stack on?",
    options:[{t:"A healer.", ok:true},{t:"The main tank."},{t:"A random DPS."},{t:"Every player has one."}],
    why:"Comet puts a spread marker on every player. Crushing Comet puts one stack on a healer. If it is on you, do not run away from the group.",
    rule:"Comet = spread. Crushing Comet = stack on a healer."})),
  mq("k-void-spread", 4.2, P1, "1:30", s=>({prompt:"Void Stardust ends with Comet, the spread. Where do you go?",
    options:[{t:"Any open spot, away from the tanks and melee and out of the last puddle.", ok:true},{t:"The southwest intercardinal, next to the boss."},{t:"Stay stacked with the group."},{t:"Under the boss, inside the hitbox."}],
    why:"The spread is free for all, except for the tanks and melee. They have fixed spots: MT northwest, OT northeast, M1 southwest, M2 southeast. Healers and ranged find open ground, for example at a cardinal between those spots.",
    rule:"Comet spread: healers and ranged take any open spot. MT NW, OT NE, M1 SW, M2 SE."})),
  mq("k-void-run", 4.3, P1, "1:30", s=>({prompt:"Void Stardust ends with a spread, and the first weapon of the second set is a scythe on the far side of the arena. How does the party get there in time?",
    options:[{t:"Spread on the scythe's side, then run. Use Sprint or a movement ability if needed. A scholar can use Expedient for the whole party.", ok:true},{t:"Spread anywhere, then wait for the boss to face the scythe."},{t:"Stay at the third puddle until the boss lands."},{t:"Use a party mitigation and stay put."}],
    why:"The second set of weapons is out during Void Stardust, so find the first one early. A sword or scythe first means a run: stack or spread toward it, and use Expedient, Sprint or a movement ability when it is far.",
    rule:"Find the first weapon before the puddles. Sword or scythe first: stack or spread toward it."})),
  mq("k-assault-2", 5, P1, "1:33", s=>({prompt:"Void Stardust is over and the second set of three weapons hangs around the boss. Which weapon does he go to first?",
    options:[{t:"The one with its flat side square to the boss. Then clockwise.", ok:true},{t:"The one he faced for the first set. Then clockwise."},{t:"The north one. Then counterclockwise."},{t:"The one closest to you."}],
    why:"He does not face a weapon before the cast, so read the weapons themselves. The one whose flat side faces him squarely goes first, and the rest go clockwise, the same as the first set.",
    rule:"Second set: flat side square to the boss goes first, then clockwise."})),
  mq("k-void-2", 6, P1, "1:56", s=>({prompt:"The first Void Stardust ended with a STACK. How does the second one end?",
    options:[{t:"Spread.", ok:true},{t:"Stack again."},{t:"Pair stacks."},{t:"A tank buster only."}],
    why:"The second Void Stardust always ends the other way.",
    rule:"The second Void Stardust is always the opposite of the first."})),
  mq("k-dance", 8, P1, "2:15", s=>({prompt:"Dance of Domination Trophy: what does it do to the party?",
    options:[{t:"Seven raidwide hits, and the last one is the biggest. Then pair stacks.", ok:true},{t:"One big tank buster."},{t:"It sets every player to 1 HP."},{t:"Nothing. It only draws lines."}],
    why:"The hits land from 2:21 to 2:26. It is also a burst window for your DPS, so mitigation and heals matter here.",
    rule:"Mitigate Dance of Domination and heal through it."})),
  mq("k-dance-north", 8.05, P1, "2:31", s=>({prompt:"Dance of Domination: the lines are on the floor. How do you find new north?",
    options:[{t:"The open side, with no outer line, is new south. New north is across from it.", ok:true},{t:"New north is always true north."},{t:"New north is where the boss faces."},{t:"New north is the side with two outer lines."}],
    why:"The pattern turns every pull, so you read it from the floor. Your pair spot is fixed relative to new north.",
    rule:"Open side = new south."})),
  mq("k-dance-pair", 8.1, P1, "2:31", s=>({prompt:"Dance of Domination pairs. Where do you go?",
    options:[{t:S(s,"Relative southwest, the outer spot, with R1.","Relative southeast, the outer spot, with R2."), ok:true},
      {t:S(s,"Relative southeast, the outer spot, with R2.","Relative southwest, the outer spot, with R1.")},
      {t:"Relative east, in melee range, with a tank."},{t:"In the center, with the whole party."}],
    why:"Two safe spots are in melee range and two are outside. Healers and ranged take the outside spots.",
    rule:"H1 and R1 relative SW. H2 and R2 relative SE."})),
  mq("k-charyb", 10, P1, "2:59", s=>({prompt:"Charybdistopia goes off at 2:59. What does it do, and what is your job?",
    options:[{t:"Every player goes to 1 HP. Heal the whole party right away, yourself too.", ok:true},{t:"It kills the tank. Raise them."},{t:"It is a tank buster. Shield the tank."},{t:"Nothing. Keep doing damage."}],
    why:"The weapons start hitting at 3:14. Anyone still at 1 HP then dies. Save strong heals for this part.",
    rule:"After Charybdistopia, heal everyone before the first weapon."})),
  mq("k-ult-tornado", 12, P1, "3:46", s=>({prompt:"The tornadoes are up after the last weapon. Which one do you bait?",
    options:[{t:S(s,"The west tornado (D), on its north side.","The east tornado (B), on its south side."), ok:true},
      {t:S(s,"The east tornado (B), on its south side.","The west tornado (D), on its north side.")},
      {t:"The north tornado (A), on its west side."},{t:"None. Stay in the middle."}],
    why:"Each tornado cones its two closest players. Two players per tornado, so every player has one spot.",
    rule:"Supports left, DPS right, as you face in from your tornado."})),
  mq("k-ult-spawn", 11.1, P1, "3:05", s=>({prompt:"Ultimate Trophy Weapons: the first weapon spawns south, slightly west. Where do the next ones spawn?",
    options:[{t:"Northwest, then clockwise around the cardinals.", ok:true},{t:"Northeast, then counterclockwise around the cardinals."},{t:"In random spots."},{t:"All six spawn at once, and he faces the first."}],
    why:"The first spawn sets the direction. Slightly west means clockwise. Slightly east means northeast next, then counterclockwise. He resolves them in the order they spawn.",
    rule:"First spawn slightly west = clockwise. Slightly east = counterclockwise."})),
  mq("k-ult-touch", 12.1, P1, "3:46", s=>({prompt:"What happens if you walk into a tornado?",
    options:[{t:"Knockback and Damage Down.", ok:true},{t:"Nothing."},{t:"You die at once."},{t:"You get healed."}],
    why:"Bait at the edge of your tornado. Do not stand in it.",
    rule:"Never stand in a tornado."})),
  mq("k-gwof", 14, P2, "4:13", s=>({prompt:"Great Wall of Fire: what is it, and what is your job?",
    options:[{t:"Two shared tank busters. Shield and heal the tanks, and stay out of the fire line it leaves.", ok:true},{t:"A raidwide. Use party mitigation."},{t:"A stack on a healer."},{t:"Proteans on every player."}],
    why:"The tanks share two hits, or one tank uses an invuln. The line it leaves gives Damage Down to anyone who touches it.",
    rule:"Great Wall of Fire = tank busters. Heal the tanks."})),
  mq("k-orbital", 15, P2, "4:26", s=>({prompt:"Orbital Omen with Fire and Fury. Where are you safe from Fire and Fury?",
    options:[{t:"At the boss's sides. It hits his front and back.", ok:true},{t:"Right behind the boss."},{t:"Right in front of the boss."},{t:"Anywhere far away."}],
    why:"The main tank points the boss north. Fire and Fury cleaves front and back, so the sides are safe.",
    rule:"Fire and Fury: stand at the sides."})),
  mq("k-orbital-move", 15.1, P2, "4:35", s=>({prompt:"Orbital Omen lines: how does Hector's dodge work?",
    options:[{t:"Stay against the boss hitbox at his side. Before each set of lines, cross the hitbox to the middle square those lines miss.", ok:true},{t:"Run to the arena edge and wait it out."},{t:"Stand in front of the boss and do not move."},{t:"Stand behind the boss for the whole mechanic."}],
    why:"Start where the #2 lines cross. After the #1 lines and Fire and Fury, cross to the opposite middle square for #2. After #2, cross back: that column is done, and #3 and #4 miss it.",
    rule:"Hector's dodge: back and forth across the hitbox."})),
  mq("k-meteor-order", 16, P2, "4:52", s=>({prompt:"Meteorain: who baits each set of meteors?",
    options:[{t:"Melee, then healers, then ranged.", ok:true},{t:"Healers, then ranged, then melee."},{t:"Tanks only."},{t:"Ranged, then melee, then healers."}],
    why:"The two players closest to the boss get the meteor markers. Each role steps in for its own set. You bait the second set.",
    rule:"Meteor bait order: M > H > R."})),
  mq("k-meteor-drop", 16.1, P2, "5:03", s=>({prompt:"Meteorain, second set: you have a meteor marker. Where do you drop it?",
    options:[{t:S(s,"Drop it NW, inside the boss hitbox.","Drop it SW, in line with the first SW meteor, about halfway to the edge."), ok:true},
      {t:S(s,"Drop it SW, in line with the first SW meteor.","Drop it NW, inside the boss hitbox.")},
      {t:"Drop it NE, next to the first meteor."},{t:"Drop it on the party stack."}],
    why:"Two rocks too close together explode. The first SW rock is already inside the hitbox, so the SW drop goes farther out along the same line. Your group uses wtfdig, and Icy Veins swaps H1 and H2 here, so do not mix guides.",
    rule:"H1: NW inside the hitbox. H2: SW in line, farther out."})),
  mq("k-meteor-stack", 16.2, P2, "5:10", s=>({prompt:"Meteorain, second set (healers baiting). Where does the rest of the party stack?",
    options:[{t:"Behind the NE meteor, to blow it up.", ok:true},{t:"Behind the SW meteors."},{t:"Under the boss."},{t:"They spread."}],
    why:"The line stack breaks the first rock it hits. The party breaks the NE and NW rocks and keeps the SW line.",
    rule:"Break NE and NW rocks. Keep the SW line."})),
  mq("k-triple", 17, P2, "5:43", s=>({prompt:"Triple Tyrannhilation: where do you go?",
    options:[{t:"SW, behind the three rocks in a line.", ok:true},{t:"Under the boss."},{t:"NE, behind the last meteor."},{t:"Spread at max range."}],
    why:"Three hits you cannot dodge. Each hit breaks one rock, so you need three rocks in a line.",
    rule:"Hide SW behind the three rocks."})),
  mq("k-split-side", 18, P3, "6:02", s=>({prompt:"Flatliner splits the arena. Where do you go?",
    options:[{t:S(s,"West (G1), north end of the line.","East (G2), south end of the line."), ok:true},
      {t:S(s,"West (G1), south end of the line.","East (G2), north end of the line.")},
      {t:S(s,"East (G2), north end of the line.","West (G1), south end of the line.")},{t:"Stay in the middle with the boss."}],
    why:"Kindred No Buddies: G1 west, G2 east. Supports NW and SE, DPS SW and NE. Hector's video puts healers and melee south, so ask your lead which one you use.",
    rule:"G1 west, G2 east. Supports NW and SE."})),
  mq("k-split-kb", 19, P3, "6:29", s=>({prompt:"Arena Split towers: you have a tether. Where do you get knocked?",
    options:[{t:"To the other platform, so the tether stretches.", ok:true},{t:"To the same platform."},{t:"Do not take a tower."},{t:"Into the middle."}],
    why:"Tethers need distance. The knock from the tower is how you get it.",
    rule:"Tether = knock to the other side. No tether = knock to the same side."})),
  mq("k-split-fb", 19.1, P3, "6:35", s=>({prompt:"Fire Breath: you do NOT have a tether. What do you do?",
    options:[{t:"Go close to the boss to bait a Fire Breath.", ok:true},{t:"Stay at the far edge."},{t:"Stack with a tethered player."},{t:"Stand still."}],
    why:"Fire Breath marks the four closest players. The four players without tethers take it, so the tethered players do not get hit twice.",
    rule:"No tether = go in and bait Fire Breath."})),
  mq("k-split-corner", 19.2, P3, "6:44", s=>({prompt:"Lineup: you have a Fire Breath marker. Where do you stand?",
    options:[{t:"On the corner of your number marker. Ask your lead which corner: outer (Hector, original raidplan) or inner (newer raidplan).", ok:true},{t:"At the platform edge."},{t:"Next to a tethered player."},{t:"In the middle of the platform."}],
    why:"Tethers go to the edge. Markers go to a corner of the number marker. Both must also be on the safe half of the platform.",
    rule:"Tether = edge. Marker = corner of the number marker."})),
  mq("k-split-towers23", 19.3, P3, "7:01", s=>({prompt:"Arena Split towers 2 and 3: which tower do you take?",
    options:[{t:"The tower in the quadrant where you did your last tether or marker.", ok:true},{t:"Always your first tower."},{t:"The tower closest to the boss."},{t:"Any free tower."}],
    why:"You do the same mechanic again from where you ended. This keeps four players on each platform.",
    rule:"Towers 2 and 3: the quadrant you ended in."})),
  mq("k-massive", 20, P3, "7:25", s=>({prompt:"Massive Meteor: what is it?",
    options:[{t:"A five-hit stack on one player per platform. All four on the platform stack. Mitigate and heal.", ok:true},{t:"A tank buster."},{t:"Spread markers."},{t:"A knockback only."}],
    why:"A stack with fewer than four players kills. Heal between the hits.",
    rule:"Massive Meteor: all four stack, mitigate, heal."})),
  mq("k-slab", 21, P3, "7:39", s=>({prompt:"Arcadion Avalanche: the boss faces one platform. What do you do?",
    options:[{t:"Get knocked to the platform he is NOT facing. Then run to the side away from where he swings.", ok:true},{t:"Stay on the platform he faces."},{t:"Stand in the middle."},{t:"Get knocked to the platform he faces."}],
    why:"He grabs the platform he faces and kills everyone on it. Then he throws it. The safe spot is on the side opposite his swing.",
    rule:"He turns from the right? Go left. From the left? Go right."})),
  mq("k-ecl-start", 26, P4, "8:54", s=>({prompt:"Ecliptic Stampede starts. Where do you go?",
    options:[{t:S(s,"Southwest, outside, to bait the markers.","Southeast, outside, to bait the markers."), ok:true},
      {t:S(s,"Southeast, outside.","Southwest, outside.")},
      {t:"Under the boss with the melee."},{t:"North, with the ranged."}],
    why:"Ranged and healers stay out. Melee and tanks go in. Two of the four outside players get marked for puddles.",
    rule:"Healers south, ranged north. Melee and tanks under the boss."})),
  mq("k-ecl-adjust", 26.1, P4, "9:01", s=>({prompt:"Ecliptic Stampede: both healers get marked on the south side. Who moves?",
    options:[{t:"The one closer to the proximity AoE moves to the other side.", ok:true},{t:"H1 always moves."},{t:"Nobody moves."},{t:"Both move north."}],
    why:"Each wall needs one puddle dropper. The fixed adjust rule stops two people from moving at once.",
    rule:"Same side? The one closer to the proximity AoE adjusts."})),
  mq("k-ecl-prio", 26.2, P4, "9:17", s=>({prompt:"Ecliptic towers: what is the priority for the two-player towers?",
    options:[{t:"H1 > H2 > R1 > R2, clockwise from A.", ok:true},{t:"R1 > R2 > H1 > H2, counterclockwise from A."},{t:"Melee first."},{t:"Tanks take every tower."}],
    why:S(s,"As H1, if you are not marked you take the first two-player tower clockwise from A.","As H2, if you are not marked you take a tower in H1 > H2 > R1 > R2 order, clockwise from A."),
    rule:"H1 > H2 > R1 > R2, clockwise from A."})),
  mq("k-ecl-center", 26.3, P4, "9:17", s=>({prompt:"Ecliptic towers: where in the tower do you stand?",
    options:[{t:"Dead center. The melee stand on the edge.", ok:true},{t:"On the edge."},{t:"Just outside it."},{t:"Half in, half out."}],
    why:"Standing dead center makes the tether go to you and not to the melee.",
    rule:"Healers and ranged: dead center of the tower."})),
  mq("k-ecl-tether", 26.4, P4, "9:20", s=>({prompt:"Ecliptic Stampede: you get a tether in your tower. Where do you take it?",
    options:[{t:"To the opposite wall, then clockwise into the corner.", ok:true},{t:"Stay in the tower."},{t:"Into the middle."},{t:"Counterclockwise into the corner."}],
    why:"The four tethers form a # shape and leave the middle safe.",
    rule:"Tether: opposite wall, then clockwise into the corner."})),
  mq("k-ecl-two", 26.5, P4, "9:31", s=>({prompt:"Two-way Fireball. You dropped puddles along the NORTH wall. Where do you go?",
    options:[{t:"The west line stack.", ok:true},{t:"The east line stack."},{t:"NW, on the hitbox ring."},{t:"Under the boss."}],
    why:"With Fixed (3CJ) Ecliptic, your spot depends only on which wall you dropped puddles on.",
    rule:"Two-way: north puddles = west, south puddles = east."})),
  mq("k-ecl-four", 26.6, P4, "9:31", s=>({prompt:"Four-way Fireball. You dropped puddles along the SOUTH wall. Where do you go?",
    options:[{t:"NE, on the boss hitbox ring.", ok:true},{t:"NW, on the hitbox ring."},{t:"The east line stack."},{t:"The SW corner."}],
    why:"M1 is always SW and M2 always SE. The two puddle droppers take NW and NE.",
    rule:"Four-way: north puddles = NW, south puddles = NE."})),
  mq("k-hb", 28, P4, "9:53", s=>({prompt:"Heartbreak Kick: what is your job?",
    options:[{t:"Heal the tanks between hits. The tower hits 5, then 6, then 7 times.", ok:true},{t:"Soak the tower alone."},{t:"Raise everyone."},{t:"Nothing. It is the enrage."}],
    why:"Tanks use invulns and mitigation in the order your group agreed. Ask your lead for that order. The real enrage is at 11:00.",
    rule:"Heartbreak Kick: keep the tanks alive between hits."}))
];

/* ---------- generated timeline questions ---------- */
/** A raidwide row: the mechanic the row is named for (its first fight-list ability) is raid damage. */
const isRaidwide = (i: number): boolean => tlAbilities(i)[0]?.cats.includes("raid") ?? false;
// Each raidwide name once. Crown of Arcadia happens six times, so the Set removes the repeats.
const RAIDWIDE_NAMES = [...new Set(TL.filter((_e, i) => isRaidwide(i)).map(e => e.n))];
export const NEXT_ITEMS: QuizItem[] = [];
TL.slice(0, -1).forEach((ev, i) => {
  NEXT_ITEMS.push({id:"n-" + i, order:i, phase:"Timeline", time:ev.t, build:s => {
    const right = TL[i + 1];
    const names = new Set([right.n, ev.n]);
    const picks: TimelineEvent[] = [];
    shuffle(TL.slice()).forEach(e => { if(picks.length < 3 && !names.has(e.n)){ names.add(e.n); picks.push(e); } });
    return {prompt:ev.n + " (" + ev.t + ") just happened. What comes next?",
      options:[{t:right.n, ok:true}, ...picks.map(p => ({t:p.n}))],
      why:"Next is " + right.n + " at " + right.t + ". " + right.job(s),
      rule:"Know the next thing, and you know how long you have."};
  }});
  /* The next raidwide, by name only. Knowing which one comes next and whether it is soon is
     enough to plan a mitigation. The exact time is not asked. */
  const j = TL.findIndex((_e, x) => x > i && isRaidwide(x));
  if(j > i){
    NEXT_ITEMS.push({id:"r-" + i, order:i + 0.5, phase:"Timeline", time:ev.t, build:s => {
      const right = TL[j], between = TL.slice(i + 1, j);
      const others = shuffle(RAIDWIDE_NAMES.filter(n => n !== right.n)).slice(0, 3);
      const when = between.length === 0 ? right.n + " is next, and it comes soon. Have a mitigation ready for it."
        : between.length <= 2 ? right.n + " is the next raidwide, but first comes " + between.map(e => e.n).join(", then ") + "."
        : right.n + " is the next raidwide, but " + between.length + " mechanics come first, starting with " + between[0].n + ".";
      // Crown of Arcadia often comes again. "again" says the same raidwide repeats, so the
      // answer does not read as the one that just happened.
      return {prompt:"It is just after " + ev.n + " (" + ev.t + "). Which raidwide comes next, so you can plan a mitigation for it?",
        options:[{t:right.n + (right.n === ev.n ? " again" : ""), ok:true}, ...others.map(n => ({t:n}))],
        why:when + " " + right.job(s),
        rule:"Know the next raidwide and whether it is soon, so your mitigation is ready."};
    }});
  }
});

/* ---------- the chips over a Learn card ---------- */
/** The Learn cards by mechanic, for the chips over a card: a chip jumps to the first card of its
    mechanic. The tests check that every Learn card is in exactly one. */
export const MECH_GROUPS: Array<{name: string; ids: string[]}> = [
  {name:"Raw Steel", ids:["k-raw-first", "k-raw-second"]},
  {name:"Weapons", ids:["k-first-weapon", "k-sword", "k-axe", "k-scythe", "k-assault-2"]},
  {name:"Void Stardust", ids:["k-void", "k-void-target", "k-void-spread", "k-void-run", "k-void-2"]},
  {name:"Dance", ids:["k-dance", "k-dance-north", "k-dance-pair"]},
  {name:"Charybdistopia", ids:["k-charyb"]},
  {name:"Ultimate", ids:["k-ult-spawn", "k-ult-tornado", "k-ult-touch"]},
  {name:"Wall of Fire", ids:["k-gwof"]},
  {name:"Orbital Omen", ids:["k-orbital", "k-orbital-move"]},
  {name:"Meteorain", ids:["k-meteor-order", "k-meteor-drop", "k-meteor-stack", "k-triple"]},
  {name:"Arena Split", ids:["k-split-side", "k-split-kb", "k-split-fb", "k-split-corner", "k-split-towers23", "k-massive", "k-slab"]},
  {name:"Ecliptic", ids:["k-ecl-start", "k-ecl-adjust", "k-ecl-prio", "k-ecl-center", "k-ecl-tether", "k-ecl-two", "k-ecl-four"]},
  {name:"Heartbreak", ids:["k-hb"]}
];
