'use strict';
// The page's pacing, fitted on the game (scripts/time-stretches.js). Two fits, each by
// non-negative least squares (Lawson and Hanson's, on the normal equations):
// - the main program: each stretch's cycles, less those the video chip took in it (dma, which the
//   page's clock adds for itself), as the stretch's own (seg, by the checkpoints it runs between)
//   plus, for every routine the port called in it, that routine's own cycles, and for each of the
//   port's counts of work (P.N: '#fill', '#char' ...) the cycles of one (call). A stretch the port
//   polls in (a bare yield, the next line) is left out: the page's clock runs its turns for itself;
// - the interrupt: each stretch's interrupts' cycles (irqCycles) as each interrupt's own ('#irq')
//   plus the routines the port called in them (irq); the sound driver's cycles on its core
//   ('#sound') count one for one, in the main program too (the options panel starts its tune).
// Prints the error of a whole pass (from main_loop, $7CD3, to the next) and of an interrupt, and
// with --test the same on rows it was not fitted on.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const PASS = 0x7CD3;
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// the port's helpers are no routines of the game's: the interrupt flag's changes (P.sei, P.cli) are
// where the page's clock changes the flag, irqByte where it catches up, and the rest are the port's
// bookkeeping
const HELPERS = ['sei', 'cli', 'irqByte', 'count', 'jump', 'w', 'setw', 'callAt', 'nameAt', 'alias', 'main', 'resume', 'main_from'];
const all = args.flatMap(read);
for (const r of all) for (const c of [r.calls, r.icalls]) if (c) for (const k of HELPERS) delete c[k];
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
// the main program's own cycles, less the sound driver's (one for one)
const own = r => r.cycles - (r.dma || 0) - (r.calls['#sound'] || 0);

// non-negative least squares: rows of [[column, value]...], their targets and their weights
function nnls(rows, n) {
  const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
  for (const [v, y, w = 1] of rows) for (const [i, a] of v) { h[i] += w * a * y; for (const [j, b] of v) G[i][j] += w * a * b; }
  // each column scaled to a unit diagonal, which the solution does not change but for the scale,
  // so that a column of small values (a weighted row's) is not taken for zero
  const d = Array.from(G, (r, i) => Math.sqrt(r[i]) || 1);
  for (let i = 0; i < n; i++) { h[i] /= d[i]; for (let j = 0; j < n; j++) G[i][j] /= d[i] * d[j]; }
  // the least squares on the columns in set S, by Gaussian elimination with partial pivoting
  const solve = S => {
    const m = S.length, A = S.map(i => Float64Array.from(S.map(j => G[i][j]).concat([h[i]])));
    for (let c = 0; c < m; c++) {
      let p = c;
      for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      if (Math.abs(A[c][c]) < 1e-9) continue;
      for (let r = 0; r < m; r++) if (r !== c) { const f = A[r][c] / A[c][c]; if (f) for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k]; }
    }
    return S.map((_, i) => Math.abs(A[i][i]) < 1e-9 ? 0 : A[i][m] / A[i][i]);
  };
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
  return x.map((v, i) => v / d[i]);
}
const round = v => Math.round(v * 10) / 10;

// The main program
const model = { seg: {}, call: {}, irq: {} };
const work = all.filter(r => !r.polls);
const fns = [...new Set(work.flatMap(r => Object.keys(r.calls)))].filter(f => f !== '#sound').sort();
const segs = [...new Set(work.map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const x = nnls(work.map(r => [Object.entries(r.calls).filter(([k]) => k !== '#sound').map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]),
  own(r)]), fns.length + segs.length);
// every stretch timed has its cost, 0 where the fit gives none, and 0 for one met only with polls
// in it, whose time is its polling loop's turns
segs.forEach(s => { model.seg[s] = Math.max(0, round(x[idx.get('@' + s)])); });
for (const r of all) if (!(key(r) in model.seg)) model.seg[key(r)] = 0;
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = round(v); });
model.call['#sound'] = 1;

// the interrupt. Its own cost ('#irq') and the routines every interrupt calls once are one column:
// theirs go in '#irq'
const irqRows = all.filter(r => r.irqs > 0 && r.icalls && r.icalls['#irq'] === r.irqs);
const once = new Set([...new Set(irqRows.flatMap(r => Object.keys(r.icalls)))]
  .filter(f => f !== '#irq' && irqRows.every(r => r.icalls[f] === r.irqs)));
for (const r of irqRows) for (const f of once) delete r.icalls[f];
// The sound driver's cycles on its core ('#sound') are the game's own, one for one, and not fitted
const ifns = [...new Set(irqRows.flatMap(r => Object.keys(r.icalls)))].filter(f => f !== '#sound').sort();
const iidx = new Map(ifns.map((f, i) => [f, i]));
const xi = nnls(irqRows.map(r => [Object.entries(r.icalls).filter(([k]) => k !== '#sound').map(([k, c]) => [iidx.get(k), c]),
  r.irqCycles - (r.icalls['#sound'] || 0)]), ifns.length);
model.irq['#sound'] = 1;
ifns.forEach(f => { const v = xi[iidx.get(f)]; if (v > 0) model.irq[f] = round(v); });

const callCost = (m, calls) => Object.entries(calls).reduce((s, [k, v]) => s + (m[k] || 0) * v, 0);
const q = (e, f) => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
const summary = e => {
  if (!e.length) return 'none';
  e.sort((a, b) => a - b);
  return e.length + ', error median ' + q(e, 0.5) + ', 10th percentile ' + q(e, 0.1) + ', 90th ' + q(e, 0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
};
// each stretch of work (no polls, 500 cycles or more) and each session's work in all, and each
// stretch's interrupts, as the model has them
function errors(rows) {
  const e = [], ei = [], tot = new Map();
  for (const r of rows) {
    if (r.irqs && r.icalls && r.icalls['#irq'] === r.irqs) ei.push((callCost(model.irq, r.icalls) - r.irqCycles) / r.irqCycles);
    if (r.polls) continue;
    const c = r.cycles - (r.dma || 0), p = (model.seg[key(r)] || 0) + callCost(model.call, r.calls);
    if (c >= 500) e.push((p - c) / c);
    const t = tot.get(r.st) || [0, 0];
    t[0] += c; t[1] += p; tot.set(r.st, t);
  }
  const et = [...tot.values()].filter(t => t[0]).map(t => (t[1] - t[0]) / t[0]);
  return 'stretches ' + summary(e) + '; sessions ' + summary(et) + '; interrupts ' + summary(ei);
}
console.log('fitted on ' + work.length + ' stretches and ' + irqRows.length + ' with interrupts: ' + errors(all));
if (test) console.log('not fitted on: ' + errors(read(test)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches, ' + Object.keys(model.irq).length + ' for the interrupt');
