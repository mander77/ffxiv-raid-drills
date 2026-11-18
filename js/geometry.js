// Arena geometry. The arena is 100 x 100 units, north is up, y grows south.

/* ---------- geometry ---------- */
export function rot(p, k){ let x = p[0], y = p[1]; for(let i = 0; i < k; i++){ const nx = 100 - y, ny = x; x = nx; y = ny; } return [x, y]; }
export function rotZone(z, k){
  if(z.fn || !k) return z;
  if(z.c) return {c:rot(z.c, k), r:z.r};
  const a = rot([z.rect[0], z.rect[1]], k), b = rot([z.rect[2], z.rect[3]], k);
  return {rect:[Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]};
}
export function rotOverlay(o, k){
  if(!k) return o;
  const n = Object.assign({}, o);
  if(o.x != null){ const p = rot([o.x, o.y], k); n.x = p[0]; n.y = p[1]; }
  if(o.x2 != null){ const p = rot([o.x2, o.y2], k); n.x2 = p[0]; n.y2 = p[1]; }
  if(o.f != null) n.f = (o.f + 90 * k) % 360;
  return n;
}
export function inZone(p, z){
  if(z.fn) return z.fn(p);
  if(z.c){ const dx = p[0] - z.c[0], dy = p[1] - z.c[1]; return Math.sqrt(dx * dx + dy * dy) <= z.r; }
  return p[0] >= z.rect[0] && p[0] <= z.rect[2] && p[1] >= z.rect[1] && p[1] <= z.rect[3];
}
export function zoneCenter(z){ return z.fn ? z.label : z.c ? z.c : [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2]; }
export const f1 = n => Math.round(n * 100) / 100;

/* vector helpers for drills built from the boss's path (degrees clockwise from north, y grows south) */
export const DEG = Math.PI / 180;
export const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
export const vadd = (a, b, k) => [a[0] + b[0] * (k == null ? 1 : k), a[1] + b[1] * (k == null ? 1 : k)];
export const leftOf = d => [d[1], -d[0]];
export const angOf = d => (Math.atan2(d[0], -d[1]) / DEG + 360) % 360;
export const inArena = p => p[0] >= 0 && p[0] <= 100 && p[1] >= 0 && p[1] <= 100;
export const COMPASS = ["north","northeast","east","southeast","south","southwest","west","northwest"];
