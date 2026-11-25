// The reference on the Cheat Sheet: every mechanic in fight order, each with one Learn picture, the
// rule lines of its Learn cards, and the Practice drills and Timeline card that train it. The time
// and the phase come from the picture's card.

import type { ReferenceEntry } from "../../../types";

/** Every mechanic in fight order. The tests check that each Learn card is in exactly one entry,
    and each drill in at least one. */
export const REFERENCE: readonly ReferenceEntry[] = [
  { name: "Raw Steel Trophy", picture: "k-raw-first", cards: ["k-raw-first"], drills: ["m-raw-axe", "m-raw-scythe"], timeline: "n-0" },
  { name: "Trophy Weapons", picture: "k-first-weapon", cards: ["k-first-weapon"], drills: ["m-assault"], timeline: "n-1" },
  { name: "Sword", picture: "k-sword", cards: ["k-sword"], drills: ["m-assault"] },
  { name: "Axe", picture: "k-axe", cards: ["k-axe"], drills: ["m-assault"] },
  { name: "Scythe", picture: "k-scythe", cards: ["k-scythe"], drills: ["m-assault"] },
  { name: "Void Stardust", picture: "k-void", cards: ["k-void", "k-void-target", "k-void-spread"], drills: ["m-void"], timeline: "n-2" },
  { name: "Second Weapon Set", picture: "k-assault-2", cards: ["k-void-sprint", "k-assault-2"], drills: ["m-void"], timeline: "n-3" },
  {
    name: "Void Stardust (Second Time)",
    picture: "k-void-2-start",
    cards: ["k-void-2-start", "k-void-2"],
    drills: ["m-void-2"],
    timeline: "n-4",
  },
  {
    name: "Dance of Domination",
    picture: "k-dance-pair",
    cards: ["k-dance", "k-dance-north", "k-dance-pair"],
    drills: ["m-dance"],
    timeline: "n-6",
  },
  {
    name: "Raw Steel Trophy (Second Time)",
    picture: "k-raw-second",
    cards: ["k-raw-second"],
    drills: ["m-raw-axe", "m-raw-scythe"],
    timeline: "n-7",
  },
  { name: "Charybdistopia", picture: "k-charyb", cards: ["k-charyb"], drills: [], timeline: "n-8" },
  { name: "Ultimate Trophy Weapons", picture: "k-ult-spawn", cards: ["k-ult-spawn"], drills: ["m-ultimate"], timeline: "n-9" },
  { name: "Tornadoes", picture: "k-ult-tornado", cards: ["k-ult-tornado", "k-ult-touch"], drills: ["m-tornado"], timeline: "n-10" },
  { name: "Great Wall of Fire", picture: "k-gwof", cards: ["k-gwof"], drills: [], timeline: "n-12" },
  { name: "Orbital Omen", picture: "k-orbital-move", cards: ["k-orbital", "k-orbital-move"], drills: ["m-orbital"], timeline: "n-13" },
  {
    name: "Meteorain",
    picture: "k-meteor-drop",
    cards: ["k-meteor-order", "k-meteor-drop", "k-meteor-stack"],
    drills: ["m-meteor-1", "m-meteor-2", "m-meteor-3", "m-meteor-4"],
    timeline: "n-14",
  },
  { name: "Triple Tyrannhilation", picture: "k-triple", cards: ["k-triple"], drills: ["m-meteor-4"], timeline: "n-15" },
  { name: "Arena Split", picture: "k-split-side", cards: ["k-split-side"], drills: ["m-split-line"], timeline: "n-16" },
  {
    name: "Knockback Tower",
    picture: "k-split-kb",
    cards: ["k-split-kb", "k-split-fb"],
    drills: ["m-split-tower", "m-split-fire"],
    timeline: "n-17",
  },
  {
    name: "Markers and Tethers",
    picture: "k-split-corner",
    cards: ["k-split-corner", "k-split-towers23"],
    drills: ["m-split-fire", "m-split-towers2"],
  },
  { name: "Massive Meteor", picture: "k-massive", cards: ["k-massive"], drills: ["m-massive"], timeline: "n-18" },
  { name: "Arcadion Avalanche", picture: "k-slab", cards: ["k-slab"], drills: ["m-avalanche"], timeline: "n-19" },
  { name: "Ecliptic Stampede", picture: "k-ecl-start", cards: ["k-ecl-start", "k-ecl-adjust"], drills: ["m-ecl-start"], timeline: "n-24" },
  { name: "Ecliptic Towers", picture: "k-ecl-center", cards: ["k-ecl-prio", "k-ecl-center", "k-ecl-tether"], drills: [] },
  { name: "Ecliptic Puddles", picture: "k-ecl-two", cards: ["k-ecl-two", "k-ecl-four"], drills: ["m-ecl-two", "m-ecl-four"] },
  { name: "Heartbreak Kick", picture: "k-hb", cards: ["k-hb"], drills: ["m-hb"], timeline: "n-26" },
];
