// Every M11S ability in cast order: the ability list. The Timeline cards, the Cheat Sheet's
// timeline and the fight's timeline lines take their phases and colour marks from it.
// The rows, their grouping and the colour categories follow Exia's DT raid timeline sheet
// (Google Sheets 1oG1SwNQ_Ncz2-1pOZrE9Y_A-2yECKD2ULNGpwvKtKho, tab M11S, 01/08/2026).
// The times come from the cactbot timeline (r11s.txt), the same as the fight clock, because the
// sheet runs up to 3 seconds later in the later phases. Where a sheet row has no colour (a row
// with two abilities, for example), it takes the colours of the abilities it names.
// The notes are written for this app.
import { P1, P2, P3, P4, type Phase, TIMELINE } from "./timeline";
import { sec } from "../../../time";
import { cactbot } from "./sources";
import { CATEGORIES } from "../../categories";
import type { Ability, Category, HitRule } from "../../../types";

/** The enrage (Heartbreaker), in seconds into the fight: the last line of the cactbot timeline.
    Every screen that needs the end of the fight starts from this time. */
export const ENRAGE = cactbot("Heartbreaker (Enrage)");
/** The full fight's clock runs this long past the enrage, so the enrage hit shows before the
    end screen. This is the app's choice, not a fight time. */
const AFTER_ENRAGE = 2.4;
/** The end of the full fight's clock, in seconds. */
export const FIGHT_END = Math.round((ENRAGE + AFTER_ENRAGE) * 10) / 10;

const N = {
  crown: "Raid damage on the party.",
  rawTrophy: "The boss picks up an axe or a scythe. The hit that follows depends on which one.",
  rawSteel: "Axe: the tanks share a Tank Buster and the rest of the party spreads. Scythe: three cleaves, one cone on each tank and one cone the rest of the party shares behind him.",
  trophy: "Three weapons appear around the arena: a sword, an axe and a scythe.",
  assaultCast: "The boss turns to his first weapon when this cast starts. Then he jumps to each weapon in turn, clockwise.",
  assault: "The boss uses a weapon. Sword: a cross under him and a Light Party Stack on each healer. Axe: a circle under him and a Party Stack on a healer. Scythe: a cone on every player (proteans), so every player takes a clock spot close around him.",
  voidCast: "Void Stardust: three sets of puddles to bait, then a spread or a stack.",
  voidBaits: "Three sets of baited circles. Drop each one just outside the last, clockwise.",
  voidEnd: "Comet: every player spreads. Crushing Comet: a Party Stack. The second Void Stardust is the opposite of the first.",
  danceTrophy: "Dance of Domination starts: a raidwide that hits seven times.",
  danceHits: "Seven raidwide hits in a row. The last one is the biggest.",
  eye: "Lines go off along the cuts in the floor, and four players get a stack. Stand with your pair.",
  charyb: "Every player drops to 1 HP. Heal the party immediately.",
  ultimate: "Like Trophy Weapons, but with six weapons, and four tornadoes appear during it.",
  apex: "Assault Apex: the boss uses all six weapons in order.",
  gust: "Each tornado hits the two players closest to it with a cone.",
  oneOnly: "Heavy raid damage.",
  wall1: "A Shared Tank Buster in a line. The front tank takes more damage and a vulnerability. A fire trail follows where it hit.",
  wall2: "The second Shared Tank Buster, and the fire trail left by the first one.",
  lineDodge: "Dodge the fire trail left where the Tank Buster hit.",
  orbital: "Portals appear on the edges and fire lines across the arena, in the order they appeared.",
  fury: "Fire and Fury hits the front and back of the boss while the portal lines go off.",
  meteorain: "Three sets of markers on the two closest players. A meteor falls on each marked player and stays on the ground.",
  fireballKiss: "A Line Stack (Fearsome Fireball). Meteors land on the marked players (Cosmic Kiss).",
  fatality: "Tethers from the portals. A tether can be passed. Each tethered player takes a Tank Buster.",
  fireball: "The last Line Stack, with no meteors.",
  rockExplodes: "The rock the Line Stack broke explodes around itself. Walk out.",
  triple: "Three Shockwaves of very heavy raid damage. Hide behind the rocks to block them. Each one breaks the nearest rock.",
  flatliner: "A line splits the arena into two platforms and knocks the party away from it.",
  majestic: "Majestic Meteor starts the two-platform part: towers, meteor baits and tethers.",
  towers: "Towers to soak. A player in a tower gets knocked away from it.",
  meteorBaits: "Three meteors to bait.",
  wrath: "Majestic Meteowrath hits the players tethered to a portal with a line. Fire Breath puts a line on marked players, and the side portals fire lines.",
  massive: "A five-hit stack on one player per platform. All four on the platform stack.",
  avalanche: "The boss lifts one platform and slams it on the other. The line covers most of the platform.",
  ecliptic: "Ecliptic Stampede starts.",
  mammoth: "Two proximity AoEs. The farther you are, the less damage you take.",
  atomicStart: "Six AoEs on marked players, each leaving a puddle, while the meteor baits start.",
  atomicEnd: "The last Atomic Impact puddles drop, and the meteor baits end.",
  eclTowers: "Two Tank Towers, and two towers that need two players each.",
  wrath4: "Line AoEs on the players tethered to the portals.",
  wayFireball: "Two-way Fireball: Line Stacks on the two closest players. Four-way Fireball: Pair Stacks on the four closest players.",
  kick: "A tower that the party shares, hit many times. Each set has one more hit than the last: 5, 6, then 7.",
  enrage: "The enrage. The boss must be dead before this."
};

// TS note: Row is a tuple type: a fixed-length array where each position has its own type. The
// names (t:, name:, ...) only label the positions for the reader and the editor. The `?` makes the
// last position optional. Tuples keep the long list below short.
type Row = [t: number, name: string, cats: Category[], note: string, hit?: HitRule];
const rows = (list: Row[]): Ability[] => list.map(([t, name, cats, note, hit]) => ({t, name, cats, note, ...(hit ? {hit} : {})}));

/** Dance of Domination: seven raidwide hits, each at its own cactbot line (the gaps are not even). */
const DANCE_HITS = ["Dance of Domination 1", "Dance of Domination 2", "Dance of Domination 3", "Dance of Domination 4",
  "Dance of Domination 5", "Dance of Domination 6", "Dance of Domination 7"] as const;
const DANCE: HitRule = {times:DANCE_HITS.map((name) => ({t:cactbot(name), name}))};
/** Triple Tyrannhilation: its three Shockwaves, each its own cactbot line. */
const TRIPLE: HitRule = {lines:"Shockwave"};
/** Heartbreak Kick: each hit on the shared tower is its own cactbot line. */
const KICK: HitRule = {shared:true, lines:"Heartbreak Kick"};

/** The ability list, one entry per phase. The phases use this app's names. */
export const PHASES: readonly {name: Phase; rows: Ability[]}[] = [
  {name:P1, rows:rows([
    [cactbot("Crown of Arcadia"), "Crown of Arcadia", ["raid"], N.crown],
    [cactbot("Raw Steel Trophy (Scythe/Axe)"), "Raw Steel Trophy", ["mech"], N.rawTrophy],
    [cactbot("Heavy Hitter (Scythe)/Impact x6 (Axe)"), "Raw Steel", ["spot"], N.rawSteel],
    [cactbot("Trophy Weapons"), "Trophy Weapons", ["mech"], N.trophy],
    [cactbot("Assault Evolved"), "Assault Evolved", ["mech"], N.assaultCast],
    [cactbot("Assault Evolved 1"), "Assault Evolved #1", ["mech"], N.assault],
    [cactbot("Assault Evolved 2"), "Assault Evolved #2", ["mech"], N.assault],
    [cactbot("Assault Evolved 3"), "Assault Evolved #3", ["mech"], N.assault],
    [cactbot("Trophy Weapons", 2), "Trophy Weapons", ["mech"], N.trophy],
    [cactbot("Void Stardust"), "Void Stardust", ["dodge"], N.voidCast],
    [cactbot("Cometite 1"), "Void Stardust baits x3", ["dodge"], N.voidBaits],
    [cactbot("Comet/Crushing Comet?"), "Void Stardust spread or stack", ["target"], N.voidEnd],
    [cactbot("Assault Evolved", 2), "Assault Evolved", ["mech"], N.assaultCast],
    [cactbot("Assault Evolved 1", 2), "Assault Evolved #1", ["mech"], N.assault],
    [cactbot("Assault Evolved 2", 2), "Assault Evolved #2", ["mech"], N.assault],
    [cactbot("Assault Evolved 3", 2), "Assault Evolved #3", ["mech"], N.assault],
    [cactbot("Cometite 1", 2), "Void Stardust baits x3", ["dodge"], N.voidBaits],
    [cactbot("Comet", 2), "Void Stardust spread or stack", ["target"], N.voidEnd],
    [cactbot("Crown of Arcadia", 2), "Crown of Arcadia", ["raid"], N.crown],
    [cactbot("Dance of Domination Trophy"), "Dance of Domination Trophy", ["mech"], N.danceTrophy],
    [cactbot("Dance of Domination 1"), "Dance of Domination hits", ["raid"], N.danceHits, DANCE],
    [cactbot("Eye of the Hurricane"), "Explosion + Eye of the Hurricane", ["dodge", "target"], N.eye],
    [cactbot("Raw Steel Trophy Axe", 2), "Raw Steel Trophy", ["mech"], N.rawTrophy],
    [cactbot("Heavy Hitter (Scythe)", 2), "Raw Steel", ["spot"], N.rawSteel],
    [cactbot("Charybdistopia"), "Charybdistopia", ["raid"], N.charyb],
    [cactbot("Ultimate Trophy Weapons"), "Ultimate Trophy Weapons", ["mech"], N.ultimate],
    [cactbot("Assault Apex"), "Assault Apex", ["mech"], N.apex],
    [cactbot("Assault Evolved 1", 3), "Assault Evolved #1", ["mech"], N.assault],
    [cactbot("Assault Evolved 2", 3), "Assault Evolved #2", ["mech"], N.assault],
    [cactbot("Assault Evolved 3", 3), "Assault Evolved #3", ["mech"], N.assault],
    [cactbot("Assault Evolved 4"), "Assault Evolved #4", ["mech"], N.assault],
    [cactbot("Assault Evolved 5"), "Assault Evolved #5", ["mech"], N.assault],
    [cactbot("Assault Evolved 6"), "Assault Evolved #6", ["mech"], N.assault],
    [cactbot("Powerful Gust"), "Powerful Gust", ["target"], N.gust],
    [cactbot("One and Only"), "One and Only", ["raid"], N.oneOnly],
    [cactbot("Great Wall of Fire 1"), "Great Wall of Fire #1", ["tank"], N.wall1],
    [cactbot("Great Wall of Fire 2"), "Great Wall of Fire #2 + line dodge", ["tank", "dodge"], N.wall2],
    [cactbot("Explosion 2"), "Line dodge", ["dodge"], N.lineDodge]
  ])},
  {name:P2, rows:rows([
    [cactbot("Orbital Omen (castbar)"), "Orbital Omen", ["mech"], N.orbital],
    [cactbot("Fire and Fury"), "Fire and Fury", ["dodge"], N.fury],
    [cactbot("Meteorain"), "Meteorain", ["mech"], N.meteorain],
    [cactbot("Fearsome Fireball"), "Fearsome Fireball + Cosmic Kiss #1", ["target"], N.fireballKiss],
    [cactbot("Foregone Fatality"), "Foregone Fatality #1", ["tank"], N.fatality],
    [cactbot("Fearsome Fireball", 2), "Fearsome Fireball + Cosmic Kiss #2", ["target"], N.fireballKiss],
    [cactbot("Explosion", 3), "Rock explodes", ["dodge"], N.rockExplodes],
    [cactbot("Foregone Fatality", 2), "Foregone Fatality #2", ["tank"], N.fatality],
    [cactbot("Fearsome Fireball", 3), "Fearsome Fireball + Cosmic Kiss #3", ["target"], N.fireballKiss],
    [cactbot("Explosion", 4), "Rock explodes", ["dodge"], N.rockExplodes],
    [cactbot("Foregone Fatality", 3), "Foregone Fatality #3", ["tank"], N.fatality],
    [cactbot("Fearsome Fireball", 4), "Fearsome Fireball", ["target"], N.fireball],
    [cactbot("Explosion", 5), "Rock explodes", ["dodge"], N.rockExplodes],
    [cactbot("Triple Tyrannhilation"), "Triple Tyrannhilation", ["raid", "spot"], N.triple, TRIPLE]
  ])},
  {name:P3, rows:rows([
    [cactbot("Flatliner (split)"), "Flatliner", ["raid", "spot"], N.flatliner],
    [cactbot("Majestic Meteor"), "Majestic Meteor", ["mech"], N.majestic],
    [cactbot("Explosion", 6), "Meteor towers", ["spot"], N.towers],
    [cactbot("Majestic Meteor 1"), "Meteor baits x3", [], N.meteorBaits],
    [cactbot("Majestic Meteowrath/Majestic Meteorain/Fire Breath"), "Majestic Meteowrath + Fire Breath", ["target", "spot"], N.wrath],
    [cactbot("Explosion", 7), "Meteor towers", ["spot"], N.towers],
    [cactbot("Majestic Meteor 1", 2), "Meteor baits x3", [], N.meteorBaits],
    [cactbot("Majestic Meteowrath/Majestic Meteorain/Fire Breath", 2), "Majestic Meteowrath + Fire Breath", ["target", "spot"], N.wrath],
    [cactbot("Massive Meteor x5"), "Massive Meteor x5", ["target"], N.massive, {shared:true}],
    [cactbot("Explosion", 8), "Meteor towers", ["spot"], N.towers],
    [cactbot("Arcadion Avalanche"), "Arcadion Avalanche", ["dodge"], N.avalanche]
  ])},
  {name:P4, rows:rows([
    [cactbot("Crown of Arcadia", 3), "Crown of Arcadia", ["raid"], N.crown],
    [cactbot("Great Wall of Fire 1", 2), "Great Wall of Fire #1", ["tank"], N.wall1],
    [cactbot("Great Wall of Fire 2", 2), "Great Wall of Fire #2 + line dodge", ["tank", "dodge"], N.wall2],
    [cactbot("Explosion 2", 2), "Line dodge", ["dodge"], N.lineDodge],
    [cactbot("Orbital Omen (castbar)", 2), "Orbital Omen", ["mech"], N.orbital],
    [cactbot("Fire and Fury", 2), "Fire and Fury", ["dodge"], N.fury],
    [cactbot("Crown of Arcadia", 4), "Crown of Arcadia", ["raid"], N.crown],
    [cactbot("Ecliptic Stampede"), "Ecliptic Stampede", ["mech"], N.ecliptic],
    [cactbot("Mammoth Meteor x2"), "Mammoth Meteor x2", ["raid"], N.mammoth],
    [cactbot("Atomic Impact 1"), "Atomic Impact + meteor baits start", ["target"], N.atomicStart],
    [cactbot("Atomic Impact 6"), "Atomic Impact + meteor baits end", ["target"], N.atomicEnd],
    [cactbot("Cosmic Kiss", 4), "Ecliptic towers", ["spot"], N.eclTowers],
    [cactbot("Majestic Meteowrath x4"), "Majestic Meteowrath", ["target"], N.wrath4],
    [cactbot("Two-way Fireball / Four-way Fireball"), "Two-way / Four-way Fireball", ["target"], N.wayFireball],
    [cactbot("Crown of Arcadia", 5), "Crown of Arcadia", ["raid"], N.crown],
    [cactbot("Heartbreak Kick"), "Heartbreak Kick x5", ["spot"], N.kick, KICK],
    [cactbot("Heartbreak Kick", 2), "Heartbreak Kick x6", ["spot"], N.kick, KICK],
    [cactbot("Heartbreak Kick", 3), "Heartbreak Kick x7", ["spot"], N.kick, KICK],
    [ENRAGE, "Heartbreaker (enrage)", ["enrage"], N.enrage]
  ])}
];

/** Every row in one list, with its phase. The ability list numbers its rows by this order. */
export const ABILITIES: Array<Ability & {phase: Phase}> = PHASES.flatMap(p => p.rows.map(a => ({...a, phase:p.name})));

/** The categories of the abilities at t seconds, for a line of the fight timeline. */
export const categoriesAt = (t: number): Category[] => [...new Set(ABILITIES.filter(a => Math.abs(a.t - t) < 0.05).flatMap(a => a.cats))];

/** The abilities that one row of the cheat-sheet timeline (TIMELINE) covers: from its time
    to the next row's time. TIMELINE times are rounded cast starts, so each bound is a second early. */
export function tlAbilities(i: number): Ability[] {
  const t0 = sec(TIMELINE[i].t) - 1, t1 = i + 1 < TIMELINE.length ? sec(TIMELINE[i + 1].t) - 1 : Infinity;
  return ABILITIES.filter(a => a.t >= t0 && a.t < t1);
}
/** A TIMELINE row's categories, in the order of the colour key, so it shows the same marks as the
    ability list. */
export function timelineCategories(i: number): Category[] {
  const found = new Set(tlAbilities(i).flatMap(a => a.cats));
  return (Object.keys(CATEGORIES) as Category[]).filter(c => found.has(c));
}
