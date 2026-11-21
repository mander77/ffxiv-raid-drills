// Every M11S ability in cast order: the ability list. The Timeline cards, the Cheat sheet's
// timeline and the fight's timeline lines take their phases and colour marks from it.
// The rows, their grouping and the colour categories follow Exia's DT raid timeline sheet
// (Google Sheets 1oG1SwNQ_Ncz2-1pOZrE9Y_A-2yECKD2ULNGpwvKtKho, tab M11S, 01/08/2026).
// The times come from the cactbot timeline (r11s.txt), the same as the fight clock, because the
// sheet runs up to 3 seconds later in the later phases. Where a sheet row has no colour (a row
// with two abilities, for example), it takes the colours of the abilities it names.
// The notes are written for this app.
import { P1, P2, P3, P4, TL } from "./timeline";
import { sec } from "../time";

/** The enrage (Heartbreaker), in seconds into the fight: the last line of the cactbot timeline,
    at 1659.6 there (its fight starts at 1000). Every screen that needs the end of the fight
    starts from this time. */
export const ENRAGE = 659.6;
/** The full fight's clock runs this long past the enrage, so the enrage hit shows before the
    end screen. This is the app's choice, not a fight time. */
const AFTER_ENRAGE = 2.4;
/** The end of the full fight's clock, in seconds. */
export const FIGHT_END = Math.round((ENRAGE + AFTER_ENRAGE) * 10) / 10;

/** The sheet's colour codes. "spot" is the sheet's "Positioning Required". */
export type Cat = "raid" | "tank" | "spot" | "dodge" | "target" | "mech" | "enrage";
export const CATS: Record<Cat, string> = {
  raid:"Raid damage", tank:"Tank damage", spot:"Positioning", dodge:"Avoidable AoE",
  target:"Targeted AoE", mech:"Mechanic", enrage:"Enrage"
};

/** How the full fight shows an ability's hits, where its categories alone do not say it.
    `shared`: the party shares the hit (a stack or a tower), so it flashes softer.
    `times`: it hits `n` times, `gap` seconds apart, named `name` 1, `name` 2 and so on.
    `lines`: each timeline line named `lines` and a number, up to the next ability, is one hit. */
export interface HitRule { shared?: boolean; times?: { n: number; gap: number; name: string }; lines?: string }

/** One row of the ability list. `t` is when it hits, in seconds into the fight. */
export interface Ability { t: number; name: string; cats: Cat[]; note: string; hit?: HitRule }

const N = {
  crown: "Raid damage on the whole party.",
  rawTrophy: "The boss picks up an axe or a scythe. The hit that follows depends on which one.",
  rawSteel: "Axe: the tanks share a buster and everyone else spreads. Scythe: three cleaves, one cone on each tank and one cone that everyone else shares behind him.",
  trophy: "Three weapons appear around the arena: a sword, an axe and a scythe.",
  assaultCast: "The boss turns to his first weapon when this cast starts. Then he jumps to each weapon in turn, clockwise.",
  assault: "The boss uses a weapon. Sword: a cross under him and a line stack on each healer. Axe: a circle under him and a stack on one player. Scythe: a cone on every player (proteans), so everyone takes a clock spot close around him.",
  voidCast: "Void Stardust: three sets of puddles to bait, then a spread or a stack.",
  voidBaits: "Three sets of baited circles. Drop each one just outside the last, clockwise.",
  voidEnd: "Comet: everyone spreads. Crushing Comet: everyone stacks. The second Void Stardust does the other one.",
  danceTrophy: "Dance of Domination starts: a raidwide that hits seven times.",
  danceHits: "Seven raidwide hits in a row. The last one is the biggest.",
  eye: "Lines go off along the cuts in the floor, and four players get a stack. Stand with your pair.",
  charyb: "Every player drops to 1 HP. Heal the whole party right away.",
  ultimate: "Like Trophy Weapons, but with six weapons, and four tornadoes appear during it.",
  apex: "Assault Apex: the boss uses all six weapons in order.",
  gust: "Each tornado hits the two players closest to it with a cone.",
  oneOnly: "Heavy raid damage.",
  wall1: "A line buster that the tanks share. The front tank takes more damage and a vulnerability. A line AoE follows where it hit.",
  wall2: "The second buster, and the line AoE left by the first one.",
  lineDodge: "Dodge the line AoE left where the buster hit.",
  orbital: "Portals appear on the edges and fire lines across the arena, in the order they appeared.",
  fury: "Fire and Fury hits the front and back of the boss while the portal lines go off.",
  meteorain: "Three sets of markers on the two closest players. A meteor falls on each marked player and stays on the ground.",
  fireballKiss: "A line stack (Fearsome Fireball). Meteors land on the marked players (Cosmic Kiss).",
  fatality: "Tethers from the portals. A tether can be passed. Each tethered player takes a buster.",
  fireball: "The last line stack, with no meteors.",
  triple: "Three hits of very heavy raid damage. Hide behind the meteors to block them.",
  flatliner: "A line splits the arena into two platforms and knocks everyone away from it.",
  majestic: "Majestic Meteor starts the two-platform part: towers, meteor baits and tethers.",
  towers: "Towers to soak. A player in a tower gets knocked away from it.",
  meteorBaits: "Three meteors to bait.",
  wrath: "Majestic Meteowrath hits the players tethered to a portal with a line. Fire Breath puts a line on marked players, and the side portals fire lines.",
  massive: "Five hits of shared damage on each healer.",
  avalanche: "The boss lifts one platform and slams it on the other. The line covers most of the platform.",
  ecliptic: "Ecliptic Stampede starts.",
  mammoth: "Two proximity AoEs. The farther you are, the less damage you take.",
  atomicStart: "Six AoEs on marked players, each leaving a puddle, while the meteor baits start.",
  atomicEnd: "The last Atomic Impact puddles drop, and the meteor baits end.",
  eclTowers: "Two tank towers, and two towers that need two players each.",
  wrath4: "Line AoEs on the players tethered to the portals.",
  wayFireball: "Two-way Fireball: line stacks on the two closest players. Four-way Fireball: stacks on the four closest.",
  kick: "A tower that the party shares, hit many times. Each set has one more hit than the last: 5, 6, then 7.",
  enrage: "The enrage. The boss must be dead before this."
};

// TS note: Row is a tuple type: a fixed-length array where each position has its own type. The
// names (t:, name:, ...) only label the positions for the reader and the editor. The `?` makes the
// last position optional. Tuples keep the long list below short.
type Row = [t: number, name: string, cats: Cat[], note: string, hit?: HitRule];
const rows = (list: Row[]): Ability[] => list.map(([t, name, cats, note, hit]) => ({t, name, cats, note, ...(hit ? {hit} : {})}));

/** Dance of Domination: seven raidwide hits. cactbot has the first at 2:21.3 and the seventh at
    2:25.5, so they come 0.7 seconds apart. */
const DANCE: HitRule = {times:{n:7, gap:0.7, name:"Dance of Domination"}};
/** Heartbreak Kick: each hit on the shared tower is its own cactbot line. */
const KICK: HitRule = {shared:true, lines:"Heartbreak Kick"};

/** The ability list, one entry per phase. The phases use this app's names. */
export const PHASES: Array<{name: string; rows: Ability[]}> = [
  {name:P1, rows:rows([
    [10.6, "Crown of Arcadia", ["raid"], N.crown],
    [17.7, "Raw Steel Trophy", ["mech"], N.rawTrophy],
    [25.1, "Raw Steel", ["spot"], N.rawSteel],
    [38.4, "Trophy Weapons", ["mech"], N.trophy],
    [48.2, "Assault Evolved", ["mech"], N.assaultCast],
    [50.4, "Assault Evolved #1", ["mech"], N.assault],
    [55.5, "Assault Evolved #2", ["mech"], N.assault],
    [60.6, "Assault Evolved #3", ["mech"], N.assault],
    [72.7, "Trophy Weapons", ["mech"], N.trophy],
    [79.8, "Void Stardust", ["dodge"], N.voidCast],
    [83.9, "Void Stardust baits x3", ["dodge"], N.voidBaits],
    [89.9, "Void Stardust spread or stack", ["target"], N.voidEnd],
    [92.7, "Assault Evolved", ["mech"], N.assaultCast],
    [94.9, "Assault Evolved #1", ["mech"], N.assault],
    [100.0, "Assault Evolved #2", ["mech"], N.assault],
    [105.1, "Assault Evolved #3", ["mech"], N.assault],
    [110.2, "Void Stardust baits x3", ["dodge"], N.voidBaits],
    [116.2, "Void Stardust spread or stack", ["target"], N.voidEnd],
    [122.2, "Crown of Arcadia", ["raid"], N.crown],
    [134.6, "Dance of Domination Trophy", ["raid"], N.danceTrophy],
    [141.3, "Dance of Domination hits", ["raid"], N.danceHits, DANCE],
    [150.5, "Explosion + Eye of the Hurricane", ["dodge", "target"], N.eye],
    [156.4, "Raw Steel Trophy", ["mech"], N.rawTrophy],
    [163.8, "Raw Steel", ["spot"], N.rawSteel],
    [178.9, "Charybdistopia", ["raid"], N.charyb],
    [184.6, "Ultimate Trophy Weapons", ["mech"], N.ultimate],
    [192.4, "Assault Apex", ["mech"], N.apex],
    [194.6, "Assault Evolved #1", ["mech"], N.assault],
    [199.7, "Assault Evolved #2", ["mech"], N.assault],
    [204.8, "Assault Evolved #3", ["mech"], N.assault],
    [209.9, "Assault Evolved #4", ["mech"], N.assault],
    [215.0, "Assault Evolved #5", ["mech"], N.assault],
    [220.1, "Assault Evolved #6", ["mech"], N.assault],
    [226.3, "Powerful Gust", ["target"], N.gust],
    [240.4, "One and Only", ["raid"], N.oneOnly],
    [252.8, "Great Wall of Fire #1", ["tank"], N.wall1],
    [256.0, "Great Wall of Fire #2 + line dodge", ["tank", "dodge"], N.wall2],
    [259.8, "Line dodge", ["dodge"], N.lineDodge]
  ])},
  {name:P2, rows:rows([
    [266.1, "Orbital Omen", ["mech"], N.orbital],
    [275.8, "Fire and Fury", ["dodge"], N.fury],
    [292.1, "Meteorain", ["mech"], N.meteorain],
    [300.1, "Fearsome Fireball + Cosmic Kiss #1", ["target"], N.fireballKiss],
    [309.3, "Foregone Fatality #1", ["tank"], N.fatality],
    [310.2, "Fearsome Fireball + Cosmic Kiss #2", ["target"], N.fireballKiss],
    [319.3, "Foregone Fatality #2", ["tank"], N.fatality],
    [320.2, "Fearsome Fireball + Cosmic Kiss #3", ["target"], N.fireballKiss],
    [329.3, "Foregone Fatality #3", ["tank"], N.fatality],
    [330.2, "Fearsome Fireball", ["target"], N.fireball],
    [342.9, "Triple Tyrannhilation", ["raid", "spot"], N.triple]
  ])},
  {name:P3, rows:rows([
    [361.8, "Flatliner", ["raid", "spot"], N.flatliner],
    [375.9, "Majestic Meteor", ["mech"], N.majestic],
    [389.0, "Meteor towers", ["spot"], N.towers],
    [400.0, "Meteor baits x3", [], N.meteorBaits],
    [403.9, "Majestic Meteowrath + Fire Breath", ["target", "spot"], N.wrath],
    [421.1, "Meteor towers", ["spot"], N.towers],
    [432.1, "Meteor baits x3", [], N.meteorBaits],
    [436.0, "Majestic Meteowrath + Fire Breath", ["target", "spot"], N.wrath],
    [445.3, "Massive Meteor", ["target"], N.massive, {shared:true}],
    [458.8, "Meteor towers", ["spot"], N.towers],
    [468.7, "Arcadion Avalanche", ["dodge"], N.avalanche]
  ])},
  {name:P4, rows:rows([
    [479.4, "Crown of Arcadia", ["raid"], N.crown],
    [490.7, "Great Wall of Fire #1", ["tank"], N.wall1],
    [493.9, "Great Wall of Fire #2 + line dodge", ["tank", "dodge"], N.wall2],
    [497.7, "Line dodge", ["dodge"], N.lineDodge],
    [504.0, "Orbital Omen", ["mech"], N.orbital],
    [513.7, "Fire and Fury", ["dodge"], N.fury],
    [521.8, "Crown of Arcadia", ["raid"], N.crown],
    [534.1, "Ecliptic Stampede", ["mech"], N.ecliptic],
    [541.2, "Mammoth Meteor x2", ["raid"], N.mammoth],
    [541.2, "Atomic Impact + meteor baits start", ["target"], N.atomicStart],
    [556.2, "Atomic Impact + meteor baits end", ["target"], N.atomicEnd],
    [557.2, "Ecliptic towers", ["spot"], N.eclTowers],
    [566.8, "Majestic Meteowrath", ["target"], N.wrath4],
    [571.1, "Two-way / Four-way Fireball", ["target"], N.wayFireball],
    [579.4, "Crown of Arcadia", ["raid"], N.crown],
    [593.3, "Heartbreak Kick x5", ["spot"], N.kick, KICK],
    [612.4, "Heartbreak Kick x6", ["spot"], N.kick, KICK],
    [633.5, "Heartbreak Kick x7", ["spot"], N.kick, KICK],
    [ENRAGE, "Heartbreaker (enrage)", ["enrage"], N.enrage]
  ])}
];

/** Every row in one list, with its phase. The ability list numbers its rows by this order. */
export const ABILITIES: Array<Ability & {phase: string}> = PHASES.flatMap(p => p.rows.map(a => ({...a, phase:p.name})));

/** The categories of the abilities at t seconds, for a line of the fight timeline. */
export const catsAt = (t: number): Cat[] => [...new Set(ABILITIES.filter(a => Math.abs(a.t - t) < 0.05).flatMap(a => a.cats))];

/** The abilities that one row of the cheat-sheet timeline (TL) covers: from its time
    to the next row's time. TL times are rounded cast starts, so each bound is a second early. */
export function tlAbilities(i: number): Ability[] {
  const t0 = sec(TL[i].t) - 1, t1 = i + 1 < TL.length ? sec(TL[i + 1].t) - 1 : Infinity;
  return ABILITIES.filter(a => a.t >= t0 && a.t < t1);
}
/** A TL row's categories, in the order of the colour key, so it shows the same marks as the
    ability list. */
export function tlCats(i: number): Cat[] {
  const found = new Set(tlAbilities(i).flatMap(a => a.cats));
  return (Object.keys(CATS) as Cat[]).filter(c => found.has(c));
}
