'use strict';
// The page's pacing, fitted on the game (scripts/time-stretches.js): from the hand-over through
// the security question and the control options into play, from the moments of play in
// work/states and through the scenarios that force each way out of play. Each stretch's T-states
// as the stretch's own (seg, by the checkpoints it runs between) plus, for every routine the port
// called in it, that routine's own T-states (call), and for each count of the work inside them
// (P.N) its own, none below zero (non-negative least squares, Lawson and Hanson's, on the normal
// equations), as Castle Master's port does it. A stretch that polls holds a wait for a key, which
// the page's clock runs for itself, and is left out. The interrupt is fitted the same way on the
// interrupts of every stretch: its own T-states each time (irq) and each count of its work (irqN,
// P.NI: the sensors it counts and the beams it draws), which a sensor in view makes long. Prints
// the error of a whole pass, and with --test the same on rows it was not fitted on. A price measured
// on the game (--fixed, scripts/price-routines.js) is taken as it is and the rest fitted around it: a count
// that moves with others, such as the bytes the span filler writes, which nearly every view fills
// alike, is otherwise priced at nothing and its cost put on what it moves with.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...] [--fixed '#count=T,...']
// cost.json was made, from the game folder, with W=work, the session s4 held back for the test:
//   node port/scripts/time-stretches.js $W/rows/boot.jsonl 60 boot
//   node port/scripts/time-stretches.js $W/rows/scenarios.jsonl 60 scenarios
//   for s in s1 s2 s3 s4 s5 s6 s7; do
//     node port/scripts/time-stretches.js $W/rows/$s.jsonl 60 $s-
//     node port/scripts/time-stretches.js $W/rows/plan-$s.jsonl 60 plan:$s-
//     node port/scripts/own-cycles.js $W/own/$s.json $s- 5
//   done
//   node port/scripts/price-routines.js $W/own/s1.json,$W/own/s2.json,...,$W/own/s7.json \
//     $W/own/fixed.txt $W/rows/plan-s*.jsonl
//   node port/scripts/fit-cost.js port/cost.json $W/rows/{boot,scenarios,s1,s2,s3,s5,s6,s7}.jsonl \
//     $W/rows/plan-s{1,2,3,5,6,7}.jsonl --test $W/rows/s4.jsonl,$W/rows/plan-s4.jsonl \
//     --fixed "$(cat $W/own/fixed.txt)"
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const fi = args.indexOf('--fixed');
const FIXED = Object.fromEntries((fi >= 0 ? args.splice(fi, 2)[1] : '').split(',').filter(Boolean).map(kv => kv.split('=')).map(([k, v]) => [k, +v]));
const out = args.shift();
if (!out || !args.length) { console.log("usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...] [--fixed '#count=T,...']"); process.exit(2); }
const lines = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const read = f => lines(f).filter(r => !r.summary && !r.polls);
const rows = args.flatMap(read);
const sums = args.flatMap(f => lines(f).filter(r => r.summary));
const median = a => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].filter(k => !(k in FIXED)).sort();
const fixedCost = r => Object.entries(FIXED).reduce((s, [k, v]) => s + v * (r.calls[k] || 0), 0);
const segs = [...new Set(rows.map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
// Non-negative least squares on rows of [[column, value]...] against y: the normal equations, then
// Lawson and Hanson's active set, each step's least squares by Gaussian elimination with partial
// pivoting.
function nnls(data, n) {
  const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
  for (const { v, y } of data) for (const [i, a] of v) { h[i] += a * y; for (const [j, b] of v) G[i][j] += a * b; }
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
  const x = new Float64Array(n), P = new Set();
  const grad = () => h.map((v, i) => v - G[i].reduce((s, g, j) => s + g * x[j], 0));
  for (let it = 0; it < 3 * n; it++) {
    const w = grad(), tol = 1e-6 * Math.max(1, ...w.map(Math.abs));
    let best = -1;
    for (let i = 0; i < n; i++) if (!P.has(i) && w[i] > tol && (best < 0 || w[i] > w[best])) best = i;
    if (best < 0) break;
    P.add(best);
    for (;;) {
      const S = [...P].sort((a, b) => a - b), z = solve(S);
      if (z.every(v => v > 0)) { S.forEach((i, k) => { x[i] = z[k]; }); break; }
      let alpha = 1;
      S.forEach((i, k) => { if (z[k] <= 0) alpha = Math.min(alpha, x[i] / (x[i] - z[k])); });
      S.forEach((i, k) => { x[i] += alpha * (z[k] - x[i]); if (x[i] <= 1e-9) { x[i] = 0; P.delete(i); } });
    }
  }
  return x;
}
const x = nnls(rows.map(r => ({ y: r.cycles - fixedCost(r),
  v: Object.entries(r.calls).filter(([k]) => !(k in FIXED)).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]) })), fns.length + segs.length);
// The interrupt: each one's own T-states (irq), and each count of its work (irqN: the sensors it
// counts, the beams it draws and their line steps), fitted on the stretches' interrupts (their
// sound effects taken out), the polling stretches' too
const irqRows = args.flatMap(f => lines(f).filter(r => !r.summary && r.irq && r.irq.n));
const ik = [...new Set(irqRows.flatMap(r => Object.keys(r.irq).filter(k => k[0] === '#')))].sort();
const xi = nnls(irqRows.map(r => ({ y: r.irq.t, v: [[0, r.irq.n]].concat(ik.map((k, i) => [i + 1, r.irq[k] || 0])) })), ik.length + 1);
const model = { seg: {}, call: {}, irq: irqRows.length ? Math.round(xi[0]) : median(sums.map(s => s.irq)), irqN: {} };
ik.forEach((k, i) => { if (xi[i + 1] > 0) model.irqN[k] = Math.round(xi[i + 1] * 10) / 10; });
// every stretch a session met is in the model, at 0 when the fit gives it nothing of its own and when
// it only ever polled, whose turns the page's clock runs for itself: the page's test (test/t-page.js)
// fails on a stretch the model does not name, which no session measured
segs.forEach(s => { const v = x[idx.get('@' + s)]; model.seg[s] = v > 0 ? Math.round(v * 10) / 10 : 0; });
for (const r of args.flatMap(f => lines(f).filter(r => !r.summary))) if (!(key(r) in model.seg)) model.seg[key(r)] = 0;
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
Object.assign(model.call, FIXED);
// each whole pass (from the main loop's head, $9807, to the next) as the model has it
function passes(rs) {
  const e = [];
  let c = 0, p = 0;
  for (const r of rs) {
    if (r.from === 0x9807 && c) { e.push((p - c) / c); c = p = 0; }
    c += r.cycles;
    p += (model.seg[key(r)] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
  }
  e.sort((a, b) => a - b);
  const q = f => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
  return e.length + ' passes, error median ' + q(0.5) + ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
}
console.log('fitted on ' + rows.length + ' stretches: ' + passes(rows));
const held = test ? test.split(',').flatMap(read) : null;
if (test) console.log('not fitted on: ' + passes(held));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
// the interrupts as the model has them, against the game's, over each stretch's
function irqError(rs) {
  let g = 0, p = 0;
  for (const r of rs) { if (!r.irq || !r.irq.n) continue; g += r.irq.t; p += model.irq * r.irq.n + ik.reduce((s, k) => s + (model.irqN[k] || 0) * (r.irq[k] || 0), 0); }
  return g ? ((p - g) / g * 100).toFixed(1) + '%' : 'none';
}
console.log('the interrupts: ' + irqError(rows) + (test ? ', not fitted on ' + irqError(held) : ''));
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches; the interrupt ' +
  model.irq + ' T-states, and ' + JSON.stringify(model.irqN));
