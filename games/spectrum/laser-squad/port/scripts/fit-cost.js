'use strict';
// The page's pacing, fitted on the game (scripts/time-stretches.js): two-player games and games
// against the computer at several of its levels in each scenario, from the engine's first
// instruction through the menus, the shop and the placing of the units into the turns. Each
// stretch's T-states as the stretch's own (seg, by the checkpoints it runs between) plus, for
// every routine the port called in it, that routine's own T-states (call), and for each count of
// the work inside them (P.N) its own, none below zero (non-negative least squares, Lawson and
// Hanson's, on the normal equations), as Driller's port does it. A stretch that polls (the wait
// for SPACE to be let go after the tape) is left out: the page's clock runs its turns for itself.
// The interrupts are off for the whole game, so there is no interrupt to fit. Prints the error of
// a whole pass (from one read of the controls at $B0C8 to the next), and with --test the same on
// rows it was not fitted on.
// Each stretch is weighted by W / (its T-states + W), W from LS_FIT_W (2000 by default), raised to
// LS_FIT_POW (1 by default; 0 weighs every stretch the same): the short stretches of the small
// loops (a menu's poll, a step of the cursor) are most of the passes, and unweighted the long ones
// of the computer's turn swamp them, which put half the passes of a two-player game more than 6 %
// off.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...]
// cost.json was made, from the game folder, with the jobs of work/rows/jobs.txt (each line: a
// name, then time-stretches.js's passes, scenario, seed, players and level; a name from c, the
// placing squares moved by the river, LS_CHARGE=1; t, held back to test on):
//   node port/scripts/fit-cost.js port/cost.json work/rows/s*.jsonl work/rows/c*.jsonl work/rows/k*.jsonl \
//     --test "$(ls work/rows/t*.jsonl | paste -sd,)"
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...]'); process.exit(2); }
const lines = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const all = args.flatMap(lines);
const rows = all.filter(r => !r.polls);
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].sort();
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
    for (let inner = 0; inner < 4 * n; inner++) {
      const S = [...P].sort((a, b) => a - b), z = solve(S);
      if (z.every(v => v > 0)) { S.forEach((i, k) => { x[i] = z[k]; }); break; }
      let alpha = 1;
      S.forEach((i, k) => { if (z[k] <= 0) alpha = Math.min(alpha, x[i] / (x[i] - z[k])); });
      S.forEach((i, k) => { x[i] += alpha * (z[k] - x[i]); if (x[i] <= 1e-9) { x[i] = 0; P.delete(i); } });
    }
  }
  return x;
}
// each row weighted by W / (its T-states + W) to the power LS_FIT_POW (default 1), so that the many
// short passes, the loops that read the controls while nothing is held, are fitted as closely as
// the long ones for their size (0: every T-state alike)
const W = +(process.env.LS_FIT_W || 2000), POW = process.env.LS_FIT_POW === undefined ? 1 : +process.env.LS_FIT_POW;
const x = nnls(rows.map(r => { const s = Math.pow(W / (Math.max(0, r.cycles) + W), POW); return { y: r.cycles * s,
  v: Object.entries(r.calls).map(([k, c]) => [idx.get(k), c * s]).concat([[idx.get('@' + key(r)), s]]) }; }), fns.length + segs.length);
const model = { seg: {}, call: {} };
// every stretch a session met is in the model, at 0 when the fit gives it nothing of its own and
// when it only ever polled: the page's test (../test_play.js) fails on a stretch the model does not
// name, which no session measured
segs.forEach(s => { const v = x[idx.get('@' + s)]; model.seg[s] = v > 0 ? Math.round(v * 10) / 10 : 0; });
for (const r of all) if (!(key(r) in model.seg)) model.seg[key(r)] = 0;
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
const predict = r => (model.seg[key(r)] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
// each whole pass (from one read of the controls, $B0C8, to the next) as the model has it, and the
// whole session's time
function passes(rs) {
  const e = [];
  let c = 0, p = 0, C = 0, Pp = 0;
  for (const r of rs) {
    if (r.from === 0xB0C8 && c) { e.push((p - c) / c); c = p = 0; }
    c += r.cycles; p += predict(r); C += r.cycles; Pp += predict(r);
  }
  e.sort((a, b) => a - b);
  const q = f => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
  return e.length + ' passes, error median ' + q(0.5) + ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%; the whole time ' + ((Pp - C) / C * 100).toFixed(2) + '%';
}
console.log('fitted on ' + rows.length + ' stretches: ' + passes(rows));
if (test) for (const f of test.split(',')) console.log('not fitted on, ' + f.replace(/.*\//, '') + ': ' + passes(lines(f).filter(r => !r.polls)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines and counts, ' + Object.keys(model.seg).length + ' stretches');
module.exports = { predict };
