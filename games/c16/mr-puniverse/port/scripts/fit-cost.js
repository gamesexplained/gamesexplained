'use strict';
// The page's pacing, fitted on the game (kit/skills/core/70-minisite/play.md, "Pace it by the
// machine's clock"). The whole game runs in lockstep with the port (test/lockstep.js) and each
// stretch of the program between two checkpoints gives a row: the game's own cycles in it (its
// interrupts' taken out, a delay loop's declared cycles too), how often the port called each of
// its routines in it, and the port's counts of the work inside them (P.N: '#wall', '#cell').
// An interrupt's handler is cut into stretches at its checkpoints, from its entry ('in', the
// processor's 7 cycles and the KERNAL's 35 included) to its RTI ('out'). Each stretch's cycles are
// fitted as its own (seg, by the handler and the checkpoints it runs between) plus each routine's
// and each count's (call), none below zero: non-negative least squares, Lawson and Hanson's, on the
// normal equations. A stretch of the main program that polls holds a wait, which the page's clock
// runs for itself, and is left out. The KERNAL's keyboard scan is counted to the cycle by
// C16.scnkey ('#scan'), so its cost is 1 a cycle and comes off each stretch it is in before the fit.
// The fit is made on the sessions of the seeds given and checked on another's: the share of the
// stretches' cycles that the fitted costs miss.
// The same sessions give when each band of the interrupt writes the registers the picture is drawn
// from (writes): for each band, in order, the register and the game's cycles from the interrupt's
// start to the write, the median over the session (page/runtime.js puts the port's writes there).
// The band is the line the interrupt was set for, as the page's runtime takes it: 1 when $FF0B
// holds 250 as it begins, 0 when not.
//   node fit-cost.js out.json frames seed... [--test seed]
const fs = require('fs');
const lockstep = require('../test/lockstep.js');
// the registers the picture is drawn from (page/runtime.js, SHOWN)
const SHOWN = new Set([0x06, 0x07, 0x0C, 0x0D, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19]);

const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? +args.splice(ti, 2)[1] : null;
const measured = { '#scan': 1 };
const [out, frames, ...seeds] = args;
if (!out || !frames || !seeds.length) { console.log('usage: node fit-cost.js out.json frames seed... [--test seed]'); process.exit(2); }

const hex = a => a.toString(16);
// What costs nothing of its own: irqByte is a read of memory the main program makes inside its
// polling loops too, whose turns the page's clock runs for itself, a line at a time.
const FREE = new Set(['irqByte']);
// One session's stretches: rows by what they are (key and calls), and each frame's interrupt total.
const seen = {};                          // band: [[register, [cycles ...]] ...]
function session(seed) {
  const rows = new Map(), framesIrq = [];
  let polls = 0;
  // each handler's checkpoints, pushed as it returns: an interrupt that came in after its last
  // checkpoint returns after it, and is timed first
  const ended = [];
  const add = (key, calls, cycles) => {
    for (const k in calls) if (measured[k]) cycles -= measured[k] * calls[k];
    const names = Object.keys(calls).filter(k => calls[k] && !FREE.has(k) && !measured[k]).sort();
    const sig = key + '|' + names.map(k => k + ':' + calls[k]).join(',');
    let r = rows.get(sig);
    if (!r) rows.set(sig, r = { key, calls: Object.fromEntries(names.map(k => [k, calls[k]])), n: 0, sum: 0, sq: 0 });
    r.n++; r.sum += cycles; r.sq += cycles * cycles;
  };
  const r = lockstep.run({ frames: +frames, seed, onPort: (P, hold) => {
    // the counts of work go to the part the lockstep is counting. Each group keeps P.N as it was
    // made (const N = P.N), so the counts are watched on that object itself, an accessor for each:
    // a proxy put in P.N's place would see none of them
    const N = P.N;
    for (const k of Object.keys(N)) {
      let v = N[k];
      Object.defineProperty(N, k, { enumerable: true, get: () => v, set: w => {
        const d = w - v; v = w;
        const c = hold.ls && hold.ls.counter;
        if (d > 0 && c) c['#' + k] = (c['#' + k] || 0) + d;
      } });
    }
    // the checkpoints each handler yields, for its stretches; the polls in the main program
    for (const name of ['irq']) {
      const f = P[name];
      P[name] = function* () {
        const mine = [];
        const g = f.call(this);
        if (g && typeof g.next === 'function') {
          for (;;) { const y = g.next(); if (y.done) break; if (y.value && y.value.cp !== undefined) mine.push(y.value.cp); yield y.value; }
        }
        ended.push(mine);
      };
    }
    // the game's writes in each band of the interrupt, as the machine makes them
    // (the first write of each, its acknowledgement at $FF09, comes before irq sets the next line)
    hold.watch = m => {
      let band = -1, k = 0, start = -1;
      const ioWrite = m.ioWrite;
      m.ioWrite = function (a, v) {
        const r = a - 0xFF00;
        if (this.depth === 1 && this.irqStart !== start) { start = this.irqStart; band = this.ted[0x0B] === 0xFA ? 1 : 0; k = 0; }
        if (this.depth === 1 && r >= 0 && SHOWN.has(r)) {
          const w = seen[band] = seen[band] || [];
          if (!w[k]) w[k] = [r, []];
          if (w[k][0] === r) w[k][1].push(this.cpu.cycles - start);
          k++;
        }
        return ioWrite.call(this, a, v);
      };
    };
    const program = P.program;
    P.program = function* () {
      const g = program.call(this);
      for (;;) { const y = g.next(); if (y.done) return y.value; if (y.value && y.value.poll) polls++; yield y.value; }
    };
  }, timing: p => {
    if (p.kind === 'main') {
      const had = polls; polls = 0;
      if (!had) add((p.from < 0 ? 'start' : hex(p.from)) + '>' + hex(p.to), p.calls, p.cycles - p.declared);
      return;
    }
    const at = hex(p.at), cp = ended.pop() || [];
    if (p.stretches.length && cp.length !== p.stretches.length - 1) throw new Error('the handler at $' + at + ' yielded ' + cp.length + ' checkpoints in ' + p.stretches.length + ' stretches');
    framesIrq[p.pass] = (framesIrq[p.pass] || 0) + p.cycles;
    if (!p.stretches.length) { add(at + ':in>out', p.calls, p.cycles); return; }
    for (let i = 0; i < p.stretches.length; i++) {
      const from = i ? hex(cp[i - 1]) : 'in', to = i < cp.length ? hex(cp[i]) : 'out';
      const c = (i < p.marks.length ? p.marks[i] : p.cycles) - (i ? p.marks[i - 1] : 0);
      add(at + ':' + from + '>' + to, p.stretches[i], c);
    }
  } });
  if (!r.res.ok) throw new Error('seed ' + seed + ': the lockstep failed: ' + JSON.stringify(r.res.diverged || r.res.diffs[0]));
  console.log('seed ' + seed + ': ' + r.res.passes + ' passes in ' + r.res.frames + ' frames, ' + rows.size + ' kinds of stretch');
  return { rows: [...rows.values()], framesIrq };
}

const fit = seeds.map(s => session(+s));
const rows = fit.flatMap(s => s.rows);
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].sort();
const segs = [...new Set(rows.map(r => r.key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const n = fns.length + segs.length;
const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
for (const r of rows) {
  const v = Object.entries(r.calls).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + r.key), 1]]);
  for (const [i, a] of v) { h[i] += a * r.sum; for (const [j, b] of v) G[i][j] += a * b * r.n; }
}
// least squares on the columns in S, by Gaussian elimination with partial pivoting
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
const x = new Float64Array(n), set = new Set();
const grad = () => h.map((v, i) => v - G[i].reduce((s, g, j) => s + g * x[j], 0));
for (let it = 0; it < 3 * n; it++) {
  const w = grad(), tol = 1e-6 * Math.max(1, ...w.map(Math.abs));
  let best = -1;
  for (let i = 0; i < n; i++) if (!set.has(i) && w[i] > tol && (best < 0 || w[i] > w[best])) best = i;
  if (best < 0) break;
  set.add(best);
  for (;;) {
    const S = [...set].sort((a, b) => a - b), z = solve(S);
    if (z.every(v => v > 0)) { S.forEach((i, k) => { x[i] = z[k]; }); break; }
    let alpha = 1;
    S.forEach((i, k) => { if (z[k] <= 0) alpha = Math.min(alpha, x[i] / (x[i] - z[k])); });
    S.forEach((i, k) => { x[i] += alpha * (z[k] - x[i]); if (x[i] <= 1e-9) { x[i] = 0; set.delete(i); } });
  }
}
const model = { seg: {}, call: {} };
// every stretch seen, a free one too: the page charges one it has no cost for MIN_STRETCH
segs.forEach(s => { model.seg[s] = Math.round(x[idx.get('@' + s)] * 10) / 10; });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
Object.assign(model.call, measured);

const predict = r => (model.seg[r.key] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
function report(name, s) {
  let err = 0, tot = 0;
  for (const r of s.rows) { err += Math.abs(predict(r) * r.n - r.sum); tot += r.sum; }
  console.log(name + ': ' + s.rows.reduce((a, r) => a + r.n, 0) + ' stretches, ' + (err / tot * 100).toFixed(2) + '% of their cycles off');
}
fit.forEach((s, i) => report('fitted on seed ' + seeds[i], s));
if (test !== null) {
  const s = session(test);
  report('not fitted on, seed ' + test, s);
}
// each band's writes, in order, as far as every interrupt of the band made the same ones
model.writes = {};
for (const band of Object.keys(seen).sort()) {
  const w = [];
  for (const [r, c] of seen[band]) {
    if (c.length < seen[band][0][1].length * 0.9) break;
    c.sort((a, b) => a - b);
    w.push([r, c[c.length >> 1]]);
  }
  model.writes[band] = w;
}
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines and counts, ' + Object.keys(model.seg).length + ' stretches');
