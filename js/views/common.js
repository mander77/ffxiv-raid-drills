import { esc } from "../util.js";
import { state, TABS, view, app } from "../core.js";
import { JOBS } from "../data/jobs.js";

export function tabHead(withOrder){
  const t = TABS.find(x => x.id === state.tab);
  let h = '<div class="tabhead"><p class="lede">' + esc(t.lede) + "</p>";
  if(state.tab === "job"){
    h += '<div class="ctrl"><span id="job-lbl">Job</span><div class="seg small" role="group" aria-labelledby="job-lbl">' +
      Object.keys(JOBS).map(j => '<button type="button" id="job-' + j + '" data-job="' + j + '" aria-pressed="' + (state.job === j) + '">' + JOBS[j] + "</button>").join("") + "</div></div>";
  }
  if(withOrder){
    h += '<div class="ctrl"><span id="order-lbl">Order</span><div class="seg small" role="group" aria-labelledby="order-lbl">' +
      '<button type="button" id="order-fight" data-order="fight" aria-pressed="' + (state.order === "fight") + '">Fight order</button>' +
      '<button type="button" id="order-weak" data-order="weak" aria-pressed="' + (state.order === "weak") + '">Weak spots first</button></div></div>';
  }
  return h + "</div>";
}

export function renderRoundDone(cat, d){
  const pct = d.done ? Math.round(100 * d.right / d.done) : 0;
  view.innerHTML = tabHead(true) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Round done</b></div><h2>' + d.right + " of " + d.done + " right (" + pct + "%)</h2>" +
    "<p>Missed items come back more often when you pick <strong>Weak spots first</strong>. Your progress stays in this browser.</p>" +
    '<div class="actions"><button type="button" class="btn" id="again">Go again</button></div></div></div>';
  document.getElementById("again").addEventListener("click", () => { delete state.decks[cat]; app.render(); });
}
