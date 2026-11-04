'use strict';
// The page's pacing, fitted on the game (scripts/time-stretches.js). Two fits:
// - the main program, by non-negative least squares (Lawson and Hanson's, on the normal
//   equations): each stretch's cycles, less those the video chip took in it (dma, which the page's
//   clock adds for itself) and the busy loops' the port gives as { cycles } (estimate, which the
//   page's clock runs for itself), as the stretch's own (seg, by the checkpoints it runs between)
//   plus, for every routine the port called in it, that routine's own cycles, and for each of the
//   line drawer's counts (P.N: '#tests', '#pixels', '#skip') the cycles of one (call). A stretch
//   the port polls in (a bare yield: a key's wait) is left out, as the page's clock moves a line at
//   each poll;
// - the interrupts, by band (the key: $3DF8 and the raster compare line): their own cycles on
//   average, and how far into the band, on average, each of its writes to the chips comes (irq).
// Prints the error of a whole pass of the race (from RACE_LOOP's first checkpoint, $3D08, to the
// next) and of the interrupts, and with --test the same on rows it was not fitted on.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const PASS = 0x3D08;
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// the port's own plumbing, which is not work of the game's: the bytes the interrupt shares
const PARTS = ['irqByte', 'store'];
const all = args.flatMap(read);
for (const r of all) for (const k of PARTS) delete r.calls[k];
const key = r => r.from.toString(16) + '>' + r.to.toString(16);
const own = r => r.cycles - (r.dma || 0) - (r.estimate || 0);

// non-negative least squares: rows of [[column, value]...], their targets and their weights
function nnls(rows, n) {
  const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
  for (const [v, y, w = 1] of rows) for (const [i, a] of v) { h[i] += w * a * y; for (const [j, b] of v) G[i][j] += w * a * b; }
  // each column scaled to a unit diagonal, which the solution does not change but for the scale,
  // so that a column of small values is not taken for zero
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
const fns = [...new Set(work.flatMap(r => Object.keys(r.calls)))].sort();
const segs = [...new Set(work.map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const x = nnls(work.map(r => [Object.entries(r.calls).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]), own(r)]),
  fns.length + segs.length);
segs.forEach(s => { const v = x[idx.get('@' + s)]; if (v > 0) model.seg[s] = round(v); });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = round(v); });
// every stretch measured has a seg, though its own cycles fit to none: the page then knows it
for (const s of segs) if (!(s in model.seg)) model.seg[s] = 0;

// The interrupts, by band: their own cycles, and each write's place, on average
const bands = {};
for (const r of all) for (const [k, v] of Object.entries(r.irq || {})) {
  const b = bands[k] || (bands[k] = { n: 0, c: 0, w: [] });
  b.n += v.n; b.c += v.c;
  v.w.forEach(([n, c], i) => { const q = b.w[i] || (b.w[i] = [0, 0]); q[0] += n; q[1] += c; });
}
for (const [k, b] of Object.entries(bands)) model.irq[k] = { c: Math.round(b.c / b.n), w: b.w.map(([n, c]) => Math.round(c / n)) };

const callCost = (m, calls) => Object.entries(calls).reduce((s, [k, v]) => s + (m[k] || 0) * v, 0);
const q = (e, f) => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
const summary = e => {
  if (!e.length) return 'none';
  e.sort((a, b) => a - b);
  return e.length + ', error median ' + q(e, 0.5) + ', 10th percentile ' + q(e, 0.1) + ', 90th ' + q(e, 0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
};
// each whole pass of the race with no poll in it, and each stretch's interrupts, as the model has
// them
function errors(rows) {
  const e = [], ei = [];
  let c = 0, p = 0, clean = true, st = null;
  const missing = new Set();
  for (const r of rows) {
    if (r.st !== st) { st = r.st; c = p = 0; clean = false; }
    if (r.from === PASS) { if (c && clean) e.push((p - c) / c); c = p = 0; clean = true; }
    if (r.polls) { clean = false; continue; }
    if (!(key(r) in model.seg)) missing.add(key(r));
    c += own(r);
    p += (model.seg[key(r)] || 0) + callCost(model.call, r.calls);
    let want = 0, got = 0;
    for (const [k, v] of Object.entries(r.irq || {})) { want += v.c; got += (model.irq[k] ? model.irq[k].c : 0) * v.n; }
    if (want) ei.push((got - want) / want);
  }
  return 'passes ' + summary(e) + '; interrupts ' + summary(ei) + (missing.size ? '; stretches with no cost: ' + [...missing].join(' ') : '');
}
console.log('fitted on ' + work.length + ' stretches: ' + errors(all));
if (test) {
  const t = read(test);
  for (const r of t) for (const k of PARTS) delete r.calls[k];
  console.log('not fitted on: ' + errors(t));
}
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches, ' + Object.keys(model.irq).length + ' interrupt bands');
