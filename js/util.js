// Small helpers shared by every module.

/* ---------- storage (per-viewer conveniences only) ---------- */
export const LS = {
  get(k, d){ try{ const v = localStorage.getItem("m11s." + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("m11s." + k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem("m11s." + k); }catch(e){} }
};
export const S = (s, a, b) => s === "H1" ? a : b;
export function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function esc(t){ return String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
