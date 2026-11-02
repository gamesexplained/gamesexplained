'use strict';
// The prices of the routines, set from their own T-states as scripts/own-cycles.js measured them
// on the game rather than fitted all together: for a routine whose cost a call varies with its
// work, each moment's own T-states against the port's counts of that work over the same passes
// (the plan's rows of scripts/time-stretches.js), by least squares; for any other, its own
// T-states a call over every moment. A routine that waits on the interrupt (a generator in the
// port: its waits are the page's clock's own) and a sound effect (timed by its edges) are left to
// scripts/fit-cost.js, with what the main loop spends outside the routines. A fit of the whole pass
// puts the cost of work that moves with other work (the bytes the span filler writes, which
// nearly every view fills alike) on whatever it moves with, and a scene where the two part runs at
// the wrong pace. Prints each routine's prices and its error on each moment, and writes them for
// scripts/fit-cost.js --fixed.
//   node price-routines.js own.json[,own.json...] out.txt plan-rows.jsonl...
const fs = require('fs');
const lib = require('../test/lib.js');
const { loadPort } = require('../test/port.js');
const P = loadPort().makePort(new Uint8Array(65536), {});
const LEFT = name => P.GEN.has(name) || /^(sound_\d+|tone|sweep|play_sound|interrupt)$/.test(name) || name[0] === '(';

const [ownFiles, out, ...rowFiles] = process.argv.slice(2);
if (!out || !rowFiles.length) { console.log('usage: node price-routines.js own.json[,own.json...] out.txt plan-rows.jsonl...'); process.exit(2); }
// each routine and the counts its cost is set by: a count with no price of its own here is left
// out, and the call itself is priced
const ROUTINES = {
  fill_face: ['#fillRows', '#fillBits', '#fillBytes'],
  prepare_polygon: ['prepare_polygon', '#corners', '#edgeRowsV', '#edgeRows', '#edgeRowsH', '#edgeSteps'],
  rotate_vertices: ['rotate_vertices', '#mulOps'],
  sort_faces: ['sort_faces', '#sortSteps', '#sortSwaps'],
  prepare_line: ['prepare_line', '#lineSteps'],
};
// the plan's rows of a session, one run to a moment, in the order of its moments
const runs = {};
for (const f of rowFiles) {
  const session = /plan-(s\d+)\.jsonl$/.exec(f)[1];
  const names = lib.states(session + '-').filter(s => lib.readState(s).cpu.pc === lib.PASS_AT);
  const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !r.summary);
  const list = [[]];
  let last = -1;
  for (const r of rows) { if (r.pass < last) list.push([]); last = r.pass; list[list.length - 1].push(r); }
  names.forEach((n, i) => { runs[n] = list[i]; });
}
const data = [];
for (const m of ownFiles.split(',').flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')))) {
  const rs = runs[m.state];
  if (!rs) continue;
  const sum = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.calls)) sum[k] = (sum[k] || 0) + v;
  data.push({ state: m.state, own: m.own, calls: m.calls, sum });
}
// least squares by the normal equations, with Gaussian elimination
function lsq(X, y) {
  const n = X[0].length, A = Array.from({ length: n }, () => new Float64Array(n + 1));
  X.forEach((x, r) => { for (let i = 0; i < n; i++) { A[i][n] += x[i] * y[r]; for (let j = 0; j < n; j++) A[i][j] += x[i] * x[j]; } });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-9) continue;
    for (let r = 0; r < n; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j <= n; j++) A[r][j] -= k * A[c][j]; }
  }
  return A.map((r, i) => Math.abs(r[i]) < 1e-9 ? 0 : r[n] / r[i]);
}
// Every routine must be entered as often on the game as the port's rows list its calls, on each
// moment: one entered more often (a loop back to its first instruction, or a call from the
// interrupt, whose calls the rows do not list) is left to the fit.
const own = {}, calls = {}, differ = new Set();
for (const d of data) for (const [k, v] of Object.entries(d.calls)) {
  own[k] = (own[k] || 0) + d.own[k]; calls[k] = (calls[k] || 0) + v;
  if (v !== (d.sum[k] || 0)) differ.add(k);
}
const fixed = {};
for (let [name, keys] of Object.entries(ROUTINES)) {
  if (differ.has(name)) { console.log(name + ': called more often on the game than by the port, left to the fit'); continue; }
  const D = data.filter(d => d.own[name]), y = D.map(d => d.own[name]);
  // no price below zero, which would take time off the page's clock: the most negative count is
  // left out and the rest priced again
  let X, b;
  for (;;) {
    X = D.map(d => keys.map(k => d.sum[k] || 0));
    b = lsq(X, y);
    const worst = b.reduce((w, v, i) => (v < 0 && (w < 0 || v < b[w]) ? i : w), -1);
    if (worst < 0) break;
    console.log(name + ': ' + keys[worst] + ' left out, priced at ' + b[worst].toFixed(1));
    keys = keys.filter((k, i) => i !== worst);
  }
  keys.forEach((k, i) => { fixed[k] = Math.round(b[i] * 10) / 10; });
  const err = D.map((d, i) => (X[i].reduce((s, x, j) => s + x * b[j], 0) - y[i]) / y[i] * 100);
  const big = D.map((d, i) => [d.state, err[i], y[i]]).sort((p, q) => q[2] - p[2]);
  console.log(name + ': ' + keys.map((k, i) => k + ' ' + b[i].toFixed(1)).join(', ') + ' on ' + D.length + ' moments; the error on the ten costliest ' +
    big.slice(0, 10).map(e => e[1].toFixed(1) + ' %').join(', '));
}
// every other routine whose cost a call is steady: its own T-states a call over every moment, when
// on each moment that calls it at least five times that cost is within 10 % of it. A routine with
// a loop of its own (the faces it draws, the steps it takes) varies more, and is left to the fit:
// its mean over these moments is no price for a scene with more or less of that work. copy_view
// and dissolve each count one copy a call, which their price holds
const STEADY = 0.10, spread = {};
for (const k of Object.keys(calls)) {
  const mean = own[k] / calls[k], per = data.filter(d => d.calls[k] >= 5).map(d => d.own[k] / d.calls[k]);
  spread[k] = per.length < 3 ? Infinity : Math.max(...per.map(v => Math.abs(v - mean) / mean));
}
const each = Object.keys(calls).filter(k => !(k in ROUTINES) && !LEFT(k) && !differ.has(k) && spread[k] <= STEADY).sort();
console.log('called more often on the game than by the port, left to the fit: ' + [...differ].filter(k => !LEFT(k)).sort().join(', '));
console.log('a cost a call that varies, left to the fit: ' + Object.keys(calls).filter(k => !(k in ROUTINES) && !LEFT(k) && !differ.has(k) && spread[k] > STEADY).sort().join(', '));
for (const k of each) fixed[k] = Math.round(own[k] / calls[k] * 10) / 10;
fixed['#copied'] = 0;
console.log('a call each: ' + each.map(k => k + ' ' + fixed[k] + ' (within ' + Math.round(spread[k] * 100) + ' %)').join(', '));
fs.writeFileSync(out, Object.entries(fixed).map(([k, v]) => k + '=' + v).join(',') + '\n');
console.log('wrote ' + out);
