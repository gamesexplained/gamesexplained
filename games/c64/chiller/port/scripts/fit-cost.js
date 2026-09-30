'use strict';
// The pacing fit (kit/skills/core/70-minisite): each routine's own cycles, from the lockstep's
// timing rows, by non-negative least squares. The game's cycles for a stretch between two
// checkpoints (its interrupts taken out) against how often the port called each routine in it,
// plus a constant per stretch ('@yield'), and the interrupt's mean cost ('@irq'). Stretches that hold a wait are left out: the page's
// clock gives a wait its own time. Fitted on the even-numbered states, checked on the odd.
// node scripts/fit-cost.js [passes] > cost.json
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { run } = require(path.join(ROOT, 'test/lockstep.js'));
const passes = +(process.argv[2] || 3000);
const dir = path.join(ROOT, '../work/states');
// the moments saved at the main loop (not those at the game over's wait), every fourth
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
  .filter(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).cpu.pc === 0xCA00).filter((f, i) => i % 4 === 0);

let irqs = 0, irqCycles = 0;
function rows(file) {
  const out = [];
  run({ state: path.join(dir, file), passes, seed: 7, timing: t => {
    irqs += t.irqs; irqCycles += t.irqCycles;
    if (t.wait || t.polls) return;
    out.push({ y: t.cycles, calls: Object.assign({}, t.calls) });
  } });
  return out;
}
const fit = [], test = [];
files.forEach((f, i) => { (i % 2 ? test : fit).push(...rows(f)); });

const names = ['@yield', ...new Set(fit.flatMap(r => Object.keys(r.calls)))];
const idx = new Map(names.map((n, i) => [n, i]));
const n = names.length, G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
for (const r of fit) {
  const v = [[0, 1], ...Object.entries(r.calls).map(([k, c]) => [idx.get(k), c])];
  for (const [i, a] of v) { h[i] += a * r.y; for (const [j, b] of v) G[i][j] += a * b; }
}
// coordinate descent on the normal equations, each weight kept at zero or above
const w = new Float64Array(n);
for (let it = 0; it < 5000; it++) {
  let moved = 0;
  for (let i = 0; i < n; i++) {
    if (!G[i][i]) continue;
    let g = h[i];
    for (let j = 0; j < n; j++) if (j !== i) g -= G[i][j] * w[j];
    const nw = Math.max(0, g / G[i][i]);
    moved = Math.max(moved, Math.abs(nw - w[i])); w[i] = nw;
  }
  if (moved < 1e-4) break;
}
const cost = {};
names.forEach((k, i) => { if (w[i] > 0.05) cost[k] = Math.round(w[i] * 10) / 10; });
// the interrupt's own cycles (the music and the KERNAL's clock and keyboard scan), which the
// page's clock adds where one falls in the port's work
cost['@irq'] = Math.round(irqCycles / irqs);
function err(set) {
  let game = 0, est = 0, abs = 0;
  for (const r of set) {
    let e = cost['@yield'] || 0;
    for (const [k, c] of Object.entries(r.calls)) e += (cost[k] || 0) * c;
    game += r.y; est += e; abs += Math.abs(e - r.y);
  }
  return `${set.length} stretches, game ${game} cycles, fit ${Math.round(est)} (${(100 * (est - game) / game).toFixed(2)} %), mean error ${(abs / set.length).toFixed(0)} a stretch`;
}
console.error('fitted on: ' + err(fit));
console.error('checked on: ' + err(test));
console.log(JSON.stringify(cost, null, 1));
