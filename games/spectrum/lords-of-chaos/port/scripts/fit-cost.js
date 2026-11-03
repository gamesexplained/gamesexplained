'use strict';
// The page's pacing (cost.json), from the game's own T-states (scripts/time-stretches.js): each
// stretch between two checkpoints costs its own T-states (seg, by the checkpoints it runs between),
// and each routine the port called in it its own (call), and each count of the work inside them
// (P.N) its own; the interrupt its own each time (irq) and each routine called inside it its own.
//
// A routine's own T-states are measured on the game (time-stretches.js: the instructions run while
// its frame is the innermost, with those of the small routines the port does inside it), and its
// price is their sum over every session's calls, a call each; but for a generator (whose loop runs
// over many stretches, its waits the page's own) and a routine whose time the port counts itself (a
// delay, a sound, the controls' readers). Everything else is fitted on what is left of each
// stretch, none below zero (non-negative least squares, Lawson and Hanson's, on the normal
// equations): the generators, the counts and the stretches' own. A stretch that polls holds a wait
// for a key, which the page's clock runs for itself, and is left out. The interrupt is priced the
// same way on the interrupts of every stretch.
//
// Prints the error of the stretches between two human turns' reads of the controls, the time a
// player waits through (the computer players' turns, a spell, a battle, a creature's move), with
// the waits included, which the page runs as the game does; with --test, the same on rows it was
// not fitted on. --inlined writes the routines the port calls less often than the game enters
// them, for time-stretches.js, from rows made without it.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...]
//   node fit-cost.js --inlined list.json rows.jsonl...
const fs = require('fs');
const path = require('path');
const { loadPort } = require('../test/port.js');
const P = loadPort().makePort(new Uint8Array(65536), {});
// the routines whose time the port counts itself, on P.T (the delays, called; the sound) or in what
// it yields (the delays the waits make; the controls' readers inside read_controls)
const COUNTED = new Set(['delay_2', 'delay_20', 'delay_255', 'delay_8', 'delay_50', 'play_sound', 'read_keyboard', 'read_kempston', 'read_sinclair']);
// the generators that yield their own instructions' T-states: the controls read, the ROM's
// KEY-SCAN, and short_wait's loop of DJNZ
const OWN_YIELDS = new Set(['read_controls', 'key_scan', 'short_wait']);

const args = process.argv.slice(2);
const lines = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// --inlined: the routines the port calls less often than the game enters them, because it does
// their work inside their callers: time-stretches.js gives their T-states to the callers
if (args[0] === '--inlined') {
  const [, file, ...from] = args;
  const g = {}, p = {};
  for (const r of from.flatMap(lines)) {
    for (const [k, v] of Object.entries(r.game)) g[k] = (g[k] || 0) + v;
    for (const [k, v] of Object.entries(r.calls)) p[k] = (p[k] || 0) + v;
  }
  const list = Object.keys(g).filter(k => (p[k] || 0) < 0.99 * g[k] && !COUNTED.has(k) && !P.GEN.has(k)).sort();
  fs.writeFileSync(file, JSON.stringify(list) + '\n');
  console.log('wrote ' + path.basename(file) + ': ' + list.length + ' routines the port does inside their callers: ' + list.join(', '));
  process.exit(0);
}
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl,...]'); process.exit(2); }
const all = args.flatMap(lines);
const rows = all.filter(r => !r.polls);
const key = r => r.from.toString(16) + '>' + r.to.toString(16);

// the routines whose cost a call follows the work the port counts inside them (P.N): their own
// T-states against their calls and those counts, stretch by stretch, by least squares, none below
// zero. Every other count (the squares draw_block draws, the maps draw_map draws) is the routine's
// calls again, and has no price of its own.
const WORK = { random_below: ['#random'], see_square: ['#seen', '#seenUsed', '#seenRow', '#seenHit'], print_message: ['#entries', '#words', '#letters'],
  work_out_sight: ['#sightUsed', '#sightRow'] };
// The measured prices: each routine's own T-states over the sessions, a call each, and nothing for
// those that count their time themselves (COUNTED, OWN_YIELDS). A generator whose loop waits for
// the controls has its loop's T-states in its price as an average over the waits the sessions
// made: a few hundred T-states a turn, a small part of any stretch.
function measured(list, side) {
  const own = {}, calls = {};
  for (const r of list) {
    const o = side(r);
    if (!o) continue;
    for (const [k, v] of Object.entries(o.own)) own[k] = (own[k] || 0) + v;
    for (const [k, v] of Object.entries(o.calls)) calls[k] = (calls[k] || 0) + v;
  }
  const price = {};
  for (const k of Object.keys(calls)) {
    if (k[0] === '#' || COUNTED.has(k) || OWN_YIELDS.has(k) || !own[k] || k in WORK) continue;
    price[k] = Math.round(own[k] / calls[k] * 10) / 10;
  }
  for (const [k, counts] of Object.entries(WORK)) {
    const data = [];
    for (const r of list) {
      const o = side(r);
      if (!o || !o.calls[k]) continue;
      data.push({ y: o.own[k] || 0, v: [[0, o.calls[k]]].concat(counts.map((c, i) => [i + 1, o.calls[c] || 0])) });
    }
    if (!data.length) continue;
    const b = nnls(data, counts.length + 1);
    price[k] = Math.round(b[0] * 10) / 10;
    counts.forEach((c, i) => { price[c] = Math.round(b[i + 1] * 10) / 10; });
  }
  return { price };
}
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
  const x = new Float64Array(n), act = new Set();
  const grad = () => h.map((v, i) => v - G[i].reduce((s, g, j) => s + g * x[j], 0));
  for (let it = 0; it < 3 * n; it++) {
    const w = grad(), tol = 1e-6 * Math.max(1, ...w.map(Math.abs));
    let best = -1;
    for (let i = 0; i < n; i++) if (!act.has(i) && w[i] > tol && (best < 0 || w[i] > w[best])) best = i;
    if (best < 0) break;
    act.add(best);
    for (;;) {
      const S = [...act].sort((a, b) => a - b), z = solve(S);
      if (z.every(v => v > 0)) { S.forEach((i, k) => { x[i] = z[k]; }); break; }
      let alpha = 1;
      S.forEach((i, k) => { if (z[k] <= 0) alpha = Math.min(alpha, x[i] / (x[i] - z[k])); });
      S.forEach((i, k) => { x[i] += alpha * (z[k] - x[i]); if (x[i] <= 1e-9) { x[i] = 0; act.delete(i); } });
    }
  }
  return x;
}

const main = measured(rows, r => r);
const icalls = r => Object.assign({}, r.irq.calls, Object.fromEntries(Object.entries(r.irq).filter(([k]) => k[0] === '#')));
const inIrq = measured(all, r => (r.irq && r.irq.n ? Object.assign({}, r.irq, { calls: icalls(r) }) : null));

// the main program: what the measured prices leave of each stretch is the stretch's own, by the
// checkpoints it runs between (the generators' loops, and the instructions outside any routine)
const fixedCost = (r, price) => Object.entries(r.calls).reduce((s, [k, v]) => s + (price[k] || 0) * v, 0);
const segs = [...new Set(all.map(key))].sort();
const idx = new Map(segs.map((s, i) => ['@' + s, i]));
const x = nnls(rows.map(r => ({ y: r.cycles - fixedCost(r, main.price), v: [[idx.get('@' + key(r)), 1]] })), segs.length);
const model = { seg: {}, call: Object.assign({}, main.price), irq: 0, irqCall: {} };
// every stretch a session met is in the model, at 0 when the fit gives it nothing of its own and
// when it only ever polled: the page's test (test/t-page.js) fails on a stretch the model does not
// name, which no session measured
segs.forEach(s => { const v = x[idx.get('@' + s)]; model.seg[s] = v > 0 ? Math.round(v * 10) / 10 : 0; });

// the interrupt: the same, on each stretch's interrupts; what the routines leave is its own each time
const irqRows = all.filter(r => r.irq && r.irq.n);
const xi = nnls(irqRows.map(r => ({ y: r.irq.t - fixedCost({ calls: icalls(r) }, inIrq.price), v: [[0, r.irq.n]] })), 1);
model.irq = Math.round(xi[0] * 10) / 10;
Object.assign(model.irqCall, inIrq.price);

// The model's T-states for a stretch, and the game's, the waits and the interrupts included
const modelled = r => (model.seg[key(r)] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
const irqModelled = r => (r.irq && r.irq.n ? model.irq * r.irq.n + Object.entries(icalls(r)).reduce((s, [k, v]) => s + (model.irqCall[k] || 0) * v, 0) : 0);
// the waits between two human turns' reads of the controls with a stretch of its own work between
// (more than a frame's): the game's time and the model's, both with the waits and the interrupts
function waits(rs) {
  const e = [];
  let g = 0, p = 0;
  const close = () => { if (g > 69888) e.push((p - g) / g); g = p = 0; };
  for (const r of rs) {
    if (r.polls) { close(); continue; }
    const extra = r.waited + r.counted + r.halted;
    g += r.cycles + extra + (r.irq ? r.irq.t : 0);
    p += modelled(r) + extra + irqModelled(r);
    if (r.to === 0x622B) close();
  }
  e.sort((a, b) => a - b);
  if (!e.length) return 'no waits';
  const q = f => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
  return e.length + ' waits, error median ' + q(0.5) + ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9) +
    ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
}
// the whole of the rows' time, the game's and the model's
function whole(rs) {
  let g = 0, p = 0;
  for (const r of rs) {
    const extra = r.waited + r.counted + r.halted;
    g += r.cycles + extra + (r.irq ? r.irq.t : 0);
    p += (r.polls ? r.cycles : modelled(r)) + extra + irqModelled(r);
  }
  return ((p - g) / g * 100).toFixed(2) + '% over ' + (g / 69888 / 50 / 60).toFixed(1) + ' minutes';
}
console.log('fitted on ' + rows.length + ' stretches: ' + waits(all) + '; the whole ' + whole(all));
if (test) {
  const held = test.split(',').flatMap(lines);
  console.log('not fitted on: ' + waits(held) + '; the whole ' + whole(held));
  const seen = new Set(rows.flatMap(r => Object.keys(r.calls))), unseen = new Set();
  for (const r of held) for (const k of Object.keys(r.calls)) if (!seen.has(k) && !P.GEN.has(k) && !COUNTED.has(k)) unseen.add(k);
  if (unseen.size) console.log('called there and in none of the stretches fitted on: ' + [...unseen].sort().join(', '));
}
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + path.basename(out) + ': ' + Object.keys(main.price).length + ' routines measured, ' + (Object.keys(model.call).length - Object.keys(main.price).length) +
  ' fitted, ' + Object.keys(model.seg).length + ' stretches; the interrupt ' + model.irq + ' T-states and ' + Object.keys(model.irqCall).length + ' routines in it');
