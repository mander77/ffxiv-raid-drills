// The site's vocabulary as data, so code can read it. docs/vocabulary.md is the reference for
// people; test/vocabulary.test.ts keeps this file and that one the same.

/** One row of the conversion table: outside words (`from`) and the site's words for them (`to`),
    when `when` is true. Go through the rows from the top: the longer phrases come first. */
export interface Conversion { from: readonly string[]; to: string; when?: string }

/** The conversion table of docs/vocabulary.md, in its order. */
export const CONVERSIONS: readonly Conversion[] = [
  {from:["saved for later","remember for later"], to:"Look Ahead:", when:"At the start of the line."},
  {from:["find early","watch where","read early","look for"], to:"Look Ahead:", when:"Only when the player spots it now and acts later."},
  {from:["full party stack","8-man stack","everyone stack","group stack"], to:"Party Stack", when:"All eight players."},
  {from:["light party stack","LP stack","4-man stack"], to:"Light Party Stack", when:"Four players."},
  {from:["partner stack","buddy stack","2-man stack","two-player stack","pairs"], to:"Pair Stack", when:"Two players."},
  {from:["linear stack","line stack"], to:"Line Stack"},
  {from:["role stack","support/DPS stack"], to:"Role Stack"},
  {from:["clock spots","protean spread","proteans"], to:"Proteans (Clock Spots)", when:"As the kind name. Keep \"clock spot\" for the place."},
  {from:["shared tankbuster","shared TB","shared buster","tank share"], to:"Shared Tank Buster"},
  {from:["tankbuster","TB","buster"], to:"Tank Buster", when:"One tank."},
  {from:["KB tower"], to:"Knockback Tower"},
  {from:["KB"], to:"knockback", when:"As a noun."},
  {from:["get KB'd","knocked to"], to:"get knocked to"},
  {from:["take a tower","take the tower","stand in a tower"], to:"soak a tower, soak the tower"},
  {from:["blow up","pop (a rock)"], to:"break"},
  {from:["in line with"], to:"in a row with", when:"About rocks."},
  {from:["line of rocks","rocks in a line"], to:"row of rocks"},
  {from:["fire line","line AoE (Great Wall of Fire)"], to:"fire trail"},
  {from:["line up (noun)","lineup line"], to:"lineup", when:"Flatliner."},
  {from:["number marker","floor marker"], to:"number waymark, waymark"},
  {from:["head marker","icon"], to:"marker", when:"On a player."},
  {from:["inside the hitbox","inside the boss hitbox","on top of the boss"], to:"under the boss"},
  {from:["hitbox ring","on the hitbox","against the hitbox","hug the hitbox","just outside the hitbox","melee range","in melee","max melee range"], to:"max melee", when:"Check the position: if the spot is inside the hitbox, use \"under the boss\"."},
  {from:["cross the hitbox","through the boss"], to:"cross under the boss"},
  {from:["butt","rear","back of the boss"], to:"directly behind the boss", when:"Not the scythe."},
  {from:["center","centre","mid (of the arena)"], to:"the middle", when:"Not a tower."},
  {from:["center of the tower"], to:"dead center"},
  {from:["G1","LP1","group 1"], to:"light party 1"},
  {from:["G2","LP2","group 2"], to:"light party 2"},
  {from:["the group","everyone","the whole party","the raid","all players"], to:"the party", when:"All eight players, as one group."},
  {from:["everyone (each gets their own)"], to:"every player"},
  {from:["everyone else"], to:"the rest of the party"},
  {from:["static","your static","raid lead"], to:"your lead", when:"Never write \"static\"."},
  {from:["supports"], to:"Supports (tanks and healers)", when:"First use in each list. Then \"Supports\"."},
  {from:["melee and tanks"], to:"tanks and melee"},
  {from:["ranged and healers"], to:"healers and ranged"},
  {from:["N","E","S","W"], to:"north, east, south, west", when:"As a direction in a sentence."},
  {from:["northwest","north-west","northeast","southwest","southeast"], to:"NW, NE, SW, SE"},
  {from:["south-southwest","south-southeast"], to:"SSW, SSE"},
  {from:["CW","CCW","anticlockwise"], to:"clockwise, counterclockwise"},
  {from:["1st","2nd","3rd","4th"], to:"first, second, third, fourth", when:"Not Orbital Omen's #1 to #4."},
  {from:["again (in a mechanic name)","the other weapon"], to:"(Second Time)", when:"In a name."},
  {from:["the other way","the reverse","the other one"], to:"the opposite of the first"},
  {from:["set 2"], to:"second set"},
  {from:["mit","use party mitigation","stack mitigation"], to:"Mitigate it."},
  {from:["heal up","heal everyone","heal the whole party"], to:"Heal the party."},
  {from:["raid damage","raid-wide"], to:"raidwide"},
  {from:["right (meaning correct)"], to:"correct"},
  {from:["wrong"], to:"incorrect"},
  {from:["layout"], to:"pattern"},
  {from:["mech"], to:"mechanic", when:"On screen."},
];

/** A row of the Checklist's searches in docs/vocabulary.md: the searches as the file writes
    them, and what a match means. A match is a word the site never shows. The searches are
    case-sensitive, as the file writes them. `notAfter`: a match right after this word is fine. */
export interface Check { searches: readonly RegExp[]; means: string; notAfter?: string }

/** The Checklist's searches, in its order. */
export const CHECKS: readonly Check[] = [
  {searches:[/hitbox/, /melee range/], means:"A position word that is not allowed."},
  {searches:[/\bG[12]\b/, /\bgroup\b/, /static/, /everyone/, /whole party/], means:"A party word that is not allowed."},
  {searches:[/\b(north|south)(east|west)\b/], means:"An intercardinal written in full."},
  {searches:[/\b\d(st|nd|rd|th)\b/], means:"An ordinal in digits."},
  {searches:[/[Ss]aved for later/, /[Ll]ook ahead/], means:"The old name, or \"Look Ahead\" not in Title Case."},
  {searches:[/\b(party|pair|line|role) stack\b/], means:"A kind name not in Title Case.", notAfter:"the"},
  {searches:[/take[sn]? (a|the) tower/], means:"A tower that is taken, not soaked."},
  {searches:[/number marker/, /fire line\b/, /blow (it )?up/], means:"An object word that is not allowed. \"Portals fire lines\" is a verb, so it is not a match."},
];
