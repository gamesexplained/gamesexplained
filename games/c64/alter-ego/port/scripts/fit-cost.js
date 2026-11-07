'use strict';
// The page's pacing, fitted on the game: each stretch's cycles (rows from scripts/time-stretches.js)
// as the stretch's own (seg, by the checkpoints it runs between) plus, for every routine the port
// called in it, that routine's own cycles (call), none below zero (non-negative least squares,
// Lawson and Hanson's, on the normal equations, each row weighed by how many stretches it stands
// for), and for each turn of the game's delay loop (delay_scaled_iterations, $545B) TURN cycles.
// The turn is measured, not fitted: every delay the sessions make is 312 turns after a key, so the
// fit cannot tell a turn from the work around it; on the kit's C64, the p-code's instruction pointer
// ($08) stayed inside the loop ($5460-$5478) for 214,700 to 215,900 cycles in each of six delays of
// the new-random session, with 13 interrupts of about 97 cycles in each: 687 a turn. The time a stretch spends in a
// polling loop is the game's to wait, and the page waits as long for itself (for the raster to
// reach a line, for the arrow to arrive), so the fit leaves those stretches out: each one that
// polled, unless it polled only in one or two waits for the raster, each taken as half a frame.
// The interrupt's own cycles (irq) are the mean of the game's. Prints the error over each session
// and over the stretches longer than a frame, and with --test the same on rows it was not fitted on.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const FRAME = 63 * 312;
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const TURN = 687;
const waits = r => r.calls.pollRasterLow || 0;
const fits = r => !r.polls || (waits(r) <= 2 && (r.calls.sprite0_has_reached_target || 0) <= 1);
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(fits);
const rows = args.flatMap(read);
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
// a stretch's cycles less its waits for the raster; and less its delay, for the fit
const tot = r => r.cycles - waits(r) * FRAME / 2;
const own = r => tot(r) - (r.turns || 0) * TURN;
// the delay's own call is its turns
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].filter(k => k !== 'delay_scaled_iterations').sort();
const segs = [...new Set(rows.map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const n = fns.length + segs.length;
const vec = r => Object.entries(r.calls).filter(([k]) => idx.has(k)).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]);
// the normal equations
const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
for (const r of rows) {
  const v = vec(r), w = r.n || 1, y = own(r);
  for (const [i, a] of v) { h[i] += w * a * y; for (const [j, b] of v) G[i][j] += w * a * b; }
}
// the least squares on the columns in set S, by Gaussian elimination with partial pivoting
function solve(S) {
  const m = S.length, A = S.map(i => Float64Array.from(S.map(j => G[i][j]).concat([h[i]])));
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-9) continue;
    for (let r = 0; r < m; r++) if (r !== c) { const f = A[r][c] / A[c][c]; if (f) for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k]; }
  }
  return S.map((_, i) => Math.abs(A[i][i]) < 1e-9 ? 0 : A[i][m] / A[i][i]);
}
const x = new Float64Array(n), Pset = new Set();
const grad = () => h.map((v, i) => v - G[i].reduce((s, g, j) => s + g * x[j], 0));
for (let it = 0; it < 3 * n; it++) {
  const w = grad(), tol = 1e-6 * Math.max(1, ...w.map(Math.abs));
  let best = -1;
  for (let i = 0; i < n; i++) if (!Pset.has(i) && w[i] > tol && (best < 0 || w[i] > w[best])) best = i;
  if (best < 0) break;
  Pset.add(best);
  for (;;) {
    const S = [...Pset].sort((a, b) => a - b), z = solve(S);
    if (z.every(v => v > 0)) { S.forEach((i, k) => { x[i] = z[k]; }); break; }
    let alpha = 1;
    S.forEach((i, k) => { if (z[k] <= 0) alpha = Math.min(alpha, x[i] / (x[i] - z[k])); });
    S.forEach((i, k) => { x[i] += alpha * (z[k] - x[i]); if (x[i] <= 1e-9) { x[i] = 0; Pset.delete(i); } });
  }
}
const irqs = rows.reduce((s, r) => s + r.irqs * (r.n || 1), 0), irqCycles = rows.reduce((s, r) => s + r.irqCycles * (r.n || 1), 0);
const model = { seg: {}, call: {}, turn: TURN, irq: Math.round(irqCycles / Math.max(1, irqs)) };
// every stretch the sessions ran, at 0 too: one the page meets that is not here was never measured
segs.forEach(s => { model.seg[s] = Math.round(x[idx.get('@' + s)] * 10) / 10; });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
// each stretch as the model has it
const modelled = r => (model.seg[key(r)] || 0) + (r.turns || 0) * model.turn + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
function report(rs) {
  const by = new Map();
  for (const r of rs) { const s = by.get(r.session) || [0, 0]; s[0] += tot(r) * (r.n || 1); s[1] += modelled(r) * (r.n || 1); by.set(r.session, s); }
  const lines = [...by].map(([k, [g, p]]) => k + ' ' + ((p - g) / g * 100).toFixed(2) + '%');
  const e = [];
  for (const r of rs) if (tot(r) > FRAME) for (let i = 0; i < (r.n || 1); i++) e.push((modelled(r) - tot(r)) / tot(r));
  e.sort((a, b) => a - b);
  const q = f => e.length ? (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%' : '-';
  return 'over each session: ' + lines.join(', ') + '; ' + e.length + ' stretches longer than a frame: error median ' + q(0.5) +
    ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9);
}
console.log('fitted on ' + rows.reduce((s, r) => s + (r.n || 1), 0) + ' stretches (' + rows.length + ' rows): ' + report(rows));
if (test) console.log('not fitted on: ' + report(read(test)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches, a delay turn ' +
  model.turn + ' cycles, the interrupt ' + model.irq);
