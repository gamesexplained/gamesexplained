'use strict';
// The page's pacing, fitted on the game: play, the title's menus and the information screen
// (scripts/time-stretches.js play, start and menu), and the routines timed alone that run only
// where the program waits (scripts/time-routines.js). Each stretch's cycles as the stretch's own
// (seg, by the checkpoints it runs between) plus, for every routine the port called in it, that
// routine's own cycles, and for each of the port's counts of work (P.N: '#row', '#fill' ...) the
// cycles of one (call), none below zero (non-negative least squares, Lawson and Hanson's, on the
// normal equations). A stretch that polls holds a wait, which the page's clock runs for itself,
// and is left out. Prints the error of a whole pass, and with --test the same on rows it was not
// fitted on. A pass with nothing to draw, some 1,500 cycles, fits worst (within a fifth); the
// moments' totals are what the pace follows (test/t-page.js).
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !r.wait && !r.polls);
const rows = args.flatMap(read);
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].sort();
// a routine timed alone (scripts/time-routines.js) has no stretch of its own
const segs = [...new Set(rows.filter(r => !r.alone).map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const n = fns.length + segs.length;
// the normal equations
const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
for (const r of rows) {
  const v = Object.entries(r.calls).map(([k, c]) => [idx.get(k), c]).concat(r.alone ? [] : [[idx.get('@' + key(r)), 1]]);
  for (const [i, a] of v) { h[i] += a * r.cycles; for (const [j, b] of v) G[i][j] += a * b; }
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
const model = { seg: {}, call: {} };
segs.forEach(s => { const v = x[idx.get('@' + s)]; if (v > 0) model.seg[s] = Math.round(v * 10) / 10; });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
// each whole pass (from the main loop's head, $47F0, to the next) as the model has it
function passes(rs) {
  const e = [];
  let c = 0, p = 0;
  for (const r of rs) {
    if (r.alone) continue;
    if (r.from === 0x47F0 && c) { e.push((p - c) / c); c = p = 0; }
    c += r.cycles;
    p += (model.seg[key(r)] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
  }
  e.sort((a, b) => a - b);
  const q = f => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
  return e.length + ' passes, error median ' + q(0.5) + ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
}
console.log('fitted on ' + rows.length + ' stretches: ' + passes(rows));
if (test) console.log('not fitted on: ' + passes(read(test)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches');
