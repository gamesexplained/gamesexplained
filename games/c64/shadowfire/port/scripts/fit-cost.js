'use strict';
// The page's pacing, fitted on the game (scripts/time-stretches.js). Two fits, each by
// non-negative least squares (Lawson and Hanson's, on the normal equations):
// - the main program: each stretch's cycles, less those the video chip took in it (dma, which the
//   page's clock adds for itself), as the stretch's own (seg, by the checkpoints or the wait's exit
//   it runs between) plus, for every routine the port called in it, that routine's own cycles, and
//   for each of the port's counts of work (P.N: '#byte', '#glyph' ...) the cycles of one (call),
//   with the routines timed alone (scripts/time-routines.js) among the rows. A stretch that ends
//   at a raster wait's exit is its work and then the wait, which the page's clock runs for itself:
//   its row is its cycles to its first poll (toPoll), the work. A stretch the port polls in (a
//   bare yield, the next line) is left out;
// - the interrupt: each stretch's interrupts' cycles (irqCycles) as each interrupt's own ('#irq')
//   plus the routines the port called in them and their counts (irq); the music driver's cycles on
//   its core ('#music') count one for one.
// Prints the error of a whole pass (from icon_poll, $4B6C, to the next), of an interrupt and of a
// routine timed alone, and
// with --test the same on rows it was not fitted on.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const PASS = 0x4B6C;
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// the interrupt flag's changes (P.sei, P.cli) are where the page's clock changes the flag, not
// work of their own. The routines that draw for frames (SPREAD) have no cost of their own either:
// what each does is counted (P.N) or is the routines it calls, so that the page's clock pays for it
// as it is done, and the controls answer while it draws; their own cycles at the call would come
// all at once.
const SPREAD = ['clear_panels', 'iris_open', 'iris_close'];
const all = args.flatMap(read);
for (const r of all) { delete r.calls.sei; delete r.calls.cli; for (const k of SPREAD) delete r.calls[k]; }
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
const own = r => r.wait ? r.toPoll.cycles - r.toPoll.dma : r.cycles - (r.dma || 0);

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

// The main program: the stretches and the routines timed alone together
const model = { seg: {}, call: {}, irq: {} };
const work = all.filter(r => r.alone ? !r.irq : !r.polls && (!r.wait || r.toPoll));
const fns = [...new Set(work.flatMap(r => Object.keys(r.calls)))].sort();
const segs = [...new Set(work.filter(r => !r.alone).map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const x = nnls(work.map(r => [Object.entries(r.calls).map(([k, c]) => [idx.get(k), c]).concat(r.alone ? [] : [[idx.get('@' + key(r)), 1]]),
  own(r)]), fns.length + segs.length);
segs.forEach(s => { const v = x[idx.get('@' + s)]; if (v > 0) model.seg[s] = round(v); });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = round(v); });

// the interrupt. Its own cost ('#irq') and the routines every interrupt calls once are one column:
// theirs go in '#irq', and so do the input routines', whichever the control menu chose, so that one
// the sessions never play with (the light pen's, the paddles', the keyboard's) costs what the
// joystick's does
const irqRows = all.filter(r => r.irqs > 0 && r.icalls && r.icalls['#irq'] === r.irqs);
const once = new Set([...new Set(irqRows.flatMap(r => Object.keys(r.icalls)))]
  .filter(f => f !== '#irq' && (f.startsWith('input_') || irqRows.every(r => r.icalls[f] === r.irqs))));
for (const r of irqRows) for (const f of once) delete r.icalls[f];
// with the interrupt's routines timed alone (irq), as rows of their own
for (const r of all) if (r.alone && r.irq) {
  for (const f of once) delete r.calls[f];
  if (Object.keys(r.calls).length) irqRows.push({ icalls: r.calls, irqCycles: r.cycles, alone: r.alone });
}
// The music driver's cycles on its core ('#music') are the game's own, one for one, and not fitted
const ifns = [...new Set(irqRows.flatMap(r => Object.keys(r.icalls)))].filter(f => f !== '#music').sort();
const iidx = new Map(ifns.map((f, i) => [f, i]));
const xi = nnls(irqRows.map(r => [Object.entries(r.icalls).filter(([k]) => k !== '#music').map(([k, c]) => [iidx.get(k), c]),
  r.irqCycles - (r.icalls['#music'] || 0)]), ifns.length);
model.irq['#music'] = 1;
ifns.forEach(f => { const v = xi[iidx.get(f)]; if (v > 0) model.irq[f] = round(v); });

// each routine timed alone, as the model has it
function alone(rows) {
  const err = (m, irq) => rows.filter(r => r.alone && !r.irq === !irq && Object.keys(r.calls).length)
    .map(r => (callCost(m, r.calls) - r.cycles) / r.cycles);
  const e = err(model.call, false), ei = err(model.irq, true);
  return (e.length ? '; routines alone ' + summary(e) : '') + (ei.length ? '; the interrupt\'s alone ' + summary(ei) : '');
}
const callCost = (m, calls) => Object.entries(calls).reduce((s, [k, v]) => s + (m[k] || 0) * v, 0);
const q = (e, f) => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
const summary = e => {
  e.sort((a, b) => a - b);
  return e.length + ', error median ' + q(e, 0.5) + ', 10th percentile ' + q(e, 0.1) + ', 90th ' + q(e, 0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
};
// each whole pass with no wait in it (its own cycles), and each stretch's interrupts, as the model
// has them
function errors(rows) {
  const e = [], ei = [];
  let c = 0, p = 0, clean = true, st = null;
  for (const r of rows) {
    if (r.alone) continue;
    if (r.st !== st) { st = r.st; c = p = 0; clean = false; }
    if (r.from === PASS) { if (c && clean) e.push((p - c) / c); c = p = 0; clean = true; }
    if (r.wait || r.polls) clean = false;
    c += own(r);
    p += (model.seg[key(r)] || 0) + callCost(model.call, r.calls);
    if (r.irqs && r.icalls && r.icalls['#irq'] === r.irqs) ei.push((callCost(model.irq, r.icalls) - r.irqCycles) / r.irqCycles);
  }
  return 'passes ' + summary(e) + '; interrupts ' + summary(ei) + alone(rows);
}
console.log('fitted on ' + work.length + ' stretches and ' + irqRows.length + ' with interrupts: ' + errors(all));
if (test) console.log('not fitted on: ' + errors(read(test)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches, ' + Object.keys(model.irq).length + ' for the interrupt');
