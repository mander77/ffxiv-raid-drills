// SVG drawing for the arena map.
import { esc } from "./util";
import { DEG, f1, vadd, unit, rotOverlay } from "./geometry";
import type { Boss, Fig, Overlay, Point, Scene, ZoneShape } from "./types";

interface Waymark { id: string; x: number; y: number; c: "red" | "yellow" | "blue" | "purple"; sq: boolean }
export const WAYMARKS: Waymark[] = [
  {id:"A", x:50, y:25, c:"red", sq:false}, {id:"B", x:75, y:50, c:"yellow", sq:false},
  {id:"C", x:50, y:75, c:"blue", sq:false}, {id:"D", x:25, y:50, c:"purple", sq:false},
  {id:"1", x:9, y:19, c:"red", sq:true}, {id:"2", x:91, y:19, c:"yellow", sq:true},
  {id:"3", x:91, y:81, c:"blue", sq:true}, {id:"4", x:9, y:81, c:"purple", sq:true}
];

const pt = (p: Point): string => f1(p[0]) + "," + f1(p[1]);

export function circlePath(cx: number, cy: number, r: number): string {
  return "M" + f1(cx - r) + "," + f1(cy) + " a" + r + "," + r + " 0 1,0 " + (2 * r) + ",0 a" + r + "," + r + " 0 1,0 " + (-2 * r) + ",0";
}

export function drawOverlay(o: Overlay): string {
  const x = "x" in o ? f1(o.x) : 0, y = "y" in o ? f1(o.y) : 0;
  switch(o.t){
    case "aoe": return '<circle class="aoe" cx="' + x + '" cy="' + y + '" r="' + o.r + '"/>';
    case "donut": return '<path class="aoe" fill-rule="evenodd" d="' + circlePath(o.x, o.y, o.r2) + " " + circlePath(o.x, o.y, o.r1) + '"/>';
    case "lineaoe": return '<line class="lineaoe" x1="' + x + '" y1="' + y + '" x2="' + f1(o.x2) + '" y2="' + f1(o.y2) + '" stroke-width="' + (o.w || 1.3) + '"/>';
    case "tornado": return '<g class="tornado" transform="translate(' + x + " " + y + ')"><circle r="5.5"/><path d="M-3.4,-2.6 h6.8 M-2.7,-0.9 h5.4 M-2,0.8 h4 M-1.3,2.5 h2.6"/></g>';
    case "rock": return '<path class="rock" transform="translate(' + x + " " + y + ')" d="M-3,1 L-2.2,-2 L0.8,-3 L3,-1.2 L2.6,2 L-0.6,3 Z"/>';
    case "tower": return '<g class="tower" transform="translate(' + x + " " + y + ')"><circle class="out" r="' + (o.r ?? 6) + '"/><circle class="in" r="1.1"/></g>';
    case "target": return '<circle class="target" cx="' + x + '" cy="' + y + '" r="4.2"/>';
    case "puddle": return '<circle class="puddle" cx="' + x + '" cy="' + y + '" r="' + o.r + '"/>';
    case "tag": { const w = o.s.length * 1.75 + 2.4; return '<g class="tag"><rect x="' + f1(o.x - w / 2) + '" y="' + f1(o.y - 1.9) + '" width="' + f1(w) + '" height="3.8" rx=".8"/><text x="' + x + '" y="' + y + '">' + esc(o.s) + "</text></g>"; }
    case "mark": return '<g class="mk ' + o.r + '"><rect x="' + f1(o.x - 2.4) + '" y="' + f1(o.y - 2.4) + '" width="4.8" height="4.8" rx=".9"/><text x="' + x + '" y="' + y + '">' + esc(o.l) + "</text></g>";
    case "scythe": {
      const P: Point = [o.x, o.y], u: Point = [o.ux, o.uy], d: Point = [o.dx, o.dy];
      const B = vadd(P, u, -10), K = vadd(P, u, 8), C = vadd(vadd(K, d, 6), u, 1.5), T = vadd(vadd(K, d, 10), u, -3);
      const path = "M" + pt(B) + " L" + pt(K) + " Q" + pt(C) + " " + pt(T);
      return '<g class="scy"><path class="halo" d="' + path + '"/><path class="ink" d="' + path + '"/><circle class="butt" cx="' + f1(B[0]) + '" cy="' + f1(B[1]) + '" r="1.5"/></g>';
    }
    case "axe": case "sword": {
      // u is the long side (handle end to tip), d is across it. Unless the drill turns the icon,
      // the sword stands upright, point down, and the axe lies across the line to the arena center.
      const P: Point = [o.x, o.y], r = unit([o.x - 50, o.y - 50]);
      const u: Point = o.ux != null && o.uy != null ? [o.ux, o.uy] : o.t === "sword" ? [0, 1] : [-r[1], r[0]];
      const d: Point = [u[1], -u[0]];
      const at = (a: number, b: number): string => pt(vadd(vadd(P, u, a), d, b));
      let path: string, knob: Point;
      if(o.t === "axe"){
        // Handle across, then a curved head near one end with its edge toward the center.
        path = "M" + at(-8, 0) + " L" + at(7.5, 0) + " M" + at(5, 0) + " L" + at(3.2, -5.6) + " Q" + at(6.6, -8.4) + " " + at(10, -5.6) + " L" + at(8.2, 0) + " Z";
        knob = vadd(P, u, -8);
      } else {
        // Pointed blade, crossguard, grip and pommel.
        path = "M" + at(-2.5, 0.9) + " L" + at(7.6, 0.9) + " L" + at(9.8, 0) + " L" + at(7.6, -0.9) + " L" + at(-2.5, -0.9) + " Z" +
          " M" + at(-2.5, 3.4) + " L" + at(-2.5, -3.4) + " M" + at(-2.5, 0) + " L" + at(-6.6, 0);
        knob = vadd(P, u, -7.4);
      }
      return '<g class="wpn"><path class="halo" d="' + path + '"/><path class="ink" d="' + path + '"/><circle class="knob" cx="' + f1(knob[0]) + '" cy="' + f1(knob[1]) + '" r="1.1"/></g>';
    }
    case "band": return '<line class="aoeband" x1="' + x + '" y1="' + y + '" x2="' + f1(o.x2) + '" y2="' + f1(o.y2) + '" stroke-width="' + o.w + '"/>';
    case "lane": return '<rect class="' + (o.soft ? "lanesoft" : "aoe") + '" x="' + o.rect[0] + '" y="' + o.rect[1] + '" width="' + (o.rect[2] - o.rect[0]) + '" height="' + (o.rect[3] - o.rect[1]) + '"/>';
    case "poly": return '<polygon class="aoe" points="' + o.pts.map(pt).join(" ") + '"/>';
    case "guide": return '<line class="guide" x1="' + x + '" y1="' + y + '" x2="' + f1(o.x2) + '" y2="' + f1(o.y2) + '"/>';
    case "portal": return '<g class="portal" transform="translate(' + x + " " + y + ')"><ellipse rx="' + (o.vert ? 6 : 2.2) + '" ry="' + (o.vert ? 2.2 : 6) + '"/><text>' + o.n + "</text></g>";
  }
}

/* The boss and his target ring, drawn like the game's: a marker at his front, a short tick on
   each flank (his east and west), and an opening at his rear, between the two rear corners
   (135 to 225 degrees from his front). The whole ring turns with his facing.
   With no facing (f null), the ring is a plain circle, so it does not give away where he faces. */
const RING = 11, REAR = 45;   // the ring radius, and half of the rear opening in degrees
const onRing = (deg: number, r: number): string => f1(r * Math.sin(deg * DEG)) + " " + f1(-r * Math.cos(deg * DEG));
export function drawBoss(b: Boss): string {
  const at = "translate(" + f1(b.x) + " " + f1(b.y) + ")";
  if(b.f == null) return '<g transform="' + at + '"><circle class="ring" r="' + RING + '"/><circle class="bosscore" r="3.4"/></g>';
  return '<g transform="' + at + " rotate(" + b.f + ')">' +
    // From the left rear corner, clockwise past his front, to the right rear corner.
    '<path class="ring" d="M' + onRing(180 + REAR, RING) + " A" + RING + " " + RING + " 0 1 1 " + onRing(180 - REAR, RING) + '"/>' +
    '<path class="ringmark" d="M' + onRing(90, RING - 2) + " L" + onRing(90, RING + 2) + " M" + onRing(270, RING - 2) + " L" + onRing(270, RING + 2) + '"/>' +
    '<circle class="bosscore" r="3.4"/><path class="face" d="M0,-14.6 L-2.6,-10.4 L2.6,-10.4 Z"/></g>';
}

export function drawWaymarks(): string {
  return WAYMARKS.map(w => '<g class="wm wm-' + w.c + '">' +
    (w.sq ? '<rect x="' + (w.x - 3) + '" y="' + (w.y - 3) + '" width="6" height="6" rx=".6"/>' : '<circle cx="' + w.x + '" cy="' + w.y + '" r="3.2"/>') +
    '<text x="' + w.x + '" y="' + (w.y + 0.2) + '">' + w.id + "</text></g>").join("");
}

export function floorSVG(split = false): string {
  let h = '<defs><clipPath id="arenaClip"><rect x="0" y="0" width="100" height="100"/></clipPath>' +
    '<pattern id="tiles" width="12.5" height="12.5" patternUnits="userSpaceOnUse"><path class="tileline" d="M12.5 0H0V12.5"/></pattern></defs>' +
    '<rect class="floor" x="0" y="0" width="100" height="100"/><rect x="0" y="0" width="100" height="100" fill="url(#tiles)"/>';
  if(split) h += '<rect class="voidr" x="25.5" y="0" width="49" height="100"/>';
  h += '<rect class="edge" x="0" y="0" width="100" height="100"/>';
  return h;
}

/** The full arena for a scene, turned k quarter turns. Feedback layers stay empty until an answer. */
export function sceneSVG(sc: Scene, k: number): string {
  /* Weapons carry a spawn index. Each one gets its own group, so the map view can fade it
     after it resolves and, for spawnPlay scenes, show the weapons appearing one at a time. */
  const groups: Overlay[][] = [];
  sc.overlays.forEach(o => { if(o.spawn != null) (groups[o.spawn] ??= []).push(o); });
  const spawned = groups.map((g, i) => {
    const pos = g.find(o => o.t === "scythe" || o.t === "axe" || o.t === "sword");
    const delay = sc.spawnPlay ? ' style="animation-delay:' + (0.3 + i) + 's"' : "";
    const ord = sc.spawnPlay && pos && "x" in pos ? '<text class="ord" x="' + f1(pos.x + 4.5) + '" y="' + f1(pos.y + 4.5) + '">' + (i + 1) + "</text>" : "";
    // Weapons past spawnAhead start hidden. The map view shows them one at a time as hits resolve.
    const later = sc.spawnAhead != null && i >= sc.spawnAhead ? " later" : "";
    return '<g class="spawn' + later + '" data-spawn="' + i + '"' + delay + ">" + g.map(o => drawOverlay(rotOverlay(o, k))).join("") + ord + "</g>";
  }).join("");
  let h = '<svg id="arena-svg"' + (sc.spawnPlay ? ' class="play"' : "") + ' viewBox="-4 -6 108 110" role="img" aria-label="Arena map. Click to choose a spot.">';
  h += floorSVG(sc.split);
  h += '<text class="compass" x="50" y="-2.2">N</text>';
  h += '<g clip-path="url(#arenaClip)">' + sc.overlays.filter(o => o.spawn == null).map(o => drawOverlay(rotOverlay(o, k))).join("") + spawned + "</g>";
  h += '<g id="reveal-layer" clip-path="url(#arenaClip)"></g>';
  h += '<g id="drops"></g>';
  h += drawWaymarks();
  h += '<g id="boss-layer"></g>';
  h += '<g id="fb-layer"></g></svg>';
  return h;
}

/** A still arena picture for a quiz question. Until `answered`, it shows only the setup.
    Labels (tags and role marks) go on top, so an AoE or a green zone never hides them. */
export function figSVG(f: Fig, answered: boolean, label: string): string {
  const pieces = [...f.overlays, ...(answered ? f.after ?? [] : f.before ?? [])];
  const isLabel = (o: Overlay): boolean => o.t === "tag" || o.t === "mark";
  const draw = (os: Overlay[]): string => os.map(drawOverlay).join("");
  let h = '<svg class="qfig-svg" viewBox="-4 -6 108 110" role="img" aria-label="' + esc(label) + '">' + floorSVG(f.split) + '<text class="compass" x="50" y="-2.2">N</text>';
  h += '<g clip-path="url(#arenaClip)">' + draw(pieces.filter(o => !isLabel(o))) +
    (answered ? (f.answer ?? []).map(z => zoneSVG(z, "ok")).join("") : "") + draw(pieces.filter(isLabel)) + "</g>";
  return h + drawWaymarks() + (f.boss ? drawBoss(f.boss) : "") + "</svg>";
}

export function zoneSVG(z: ZoneShape, cls: string): string {
  if("fn" in z) return z.show.map(sh => zoneSVG(sh, sh.cls || cls)).join("");
  const c = "zone " + cls;
  if("poly" in z) return '<polygon class="' + c + '" points="' + z.poly.map(pt).join(" ") + '"/>';
  if("c" in z) return '<circle class="' + c + '" cx="' + f1(z.c[0]) + '" cy="' + f1(z.c[1]) + '" r="' + z.r + '"/>';
  return '<rect class="' + c + '" x="' + f1(z.rect[0]) + '" y="' + f1(z.rect[1]) + '" width="' + f1(z.rect[2] - z.rect[0]) + '" height="' + f1(z.rect[3] - z.rect[1]) + '"/>';
}
