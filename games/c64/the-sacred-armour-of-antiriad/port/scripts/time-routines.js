'use strict';
// The page's pacing, measured on the game: the Maps page's route played from the game's first
// instruction on the kit's C64 (test/lib.js, with the video chip's stolen cycles and interrupts
// taken inside a handler), each instruction's cycles put down to the routine of the port it belongs
// to. The port has a routine for each label the game enters (src/core.js), so a routine's own
// cycles are those from its label to its RTS, the routines it calls left out: a JSR to a label
// begins one, a jump or a branch to another label at the same depth of the stack moves on to that
// one (a tail call, or a loop the port calls a routine for each turn of), one back to the routine's
// own label is a turn of the call under way, and the stack climbing above where one began ends it.
// An interrupt begins the handler's routine, its seven cycles of entry with it, and the main
// program's routines stand still until its RTI. The cycles the video chip takes from the processor
// are left out: the page's clock adds them as the beam passes (page/runtime.js).
// Writes cost.json: each routine's mean cycles a time it is entered (call), and the main program's
// own between two checkpoints (seg), its JSRs; the sound driver's are counted on its 6502 core as
// it runs on the page, so its routines cost nothing here. A routine whose cost follows the work it
// is given, as the port counts it (P.N, or P.NI in an interrupt: the character runs and the
// characters of a room's set, the bytes of a tile's frame, the times a weight is added, the looks
// in the panel's list of colours, and the frame's tasks that get past their first tests), is fitted
// by least squares as its own cycles and each count's ('#runs'), the game's counted where its loops
// begin (COUNTS). A loop inside a routine that waits, which takes what time the game gives it and
// so has no cost to fit, has each turn timed instead (TURNS). A routine costed by its mean whose
// longest call is more than 1,000 cycles over it is named: on the page that call runs short, and
// its work wants counting.
//   node time-routines.js [out.json]     (default: print the table)
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');
const standin = require('../test/standin.js');
const { loadPort } = require('../test/port.js');

const AP = loadPort();
const P = AP.makePort(new Uint8Array(65536), {});
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
// the routines the port has, at their labels; the waits' (generators) take what time the game
// gives them, the sound driver's are counted on its core
const SOUND = new Set(['music_tick', 'sound_tick', 'silence_sid']);
const names = standin.labels(), at = new Map();
for (const [name, a] of names) if (typeof P[name] === 'function') at.set(a, name);
const main = new Set(['main_loop', 'cold_start']);
// the work counted, at the instruction each turn of its loop begins with
const COUNTS = { load_room_chars: { runs: 0x8605, chars: 0x866E }, copy_tile_frame: { bytes: 0x8CCC }, add_weight: { weights: 0xAC1F },
  colour_panel: { tries: 0x89EF },
  // the frame's tasks past their first tests: the panel switched on, Tal on the ground, a slot in use
  roll_score: { scores: 0xAB41 }, panel_sprites: { panelled: 0xAC5A }, next_message: { queued: 0xADC8 },
  panel_power_up: { powered: 0xAD32 }, tal_terrain: { grounds: 0x9A73 }, move_sprites: { moves: 0x98B2 },
  animate_sprites: { animated: 0x9E18 } };
const countAt = new Map();
for (const [name, c] of Object.entries(COUNTS)) for (const [k, a] of Object.entries(c)) countAt.set(a, [name, k]);
// a loop inside a wait, whose routine takes what time the game gives it and so cannot be fitted:
// each turn timed from its first instruction to the next turn's, until the instruction after the loop
const TURNS = { victory_sequence: { dissolved: [0x8AFE, 0x8B18] } };   // the screen's set ANDed with a mask
const turnAt = new Map(), turnEnd = new Map(), turned = new Map();
for (const [name, c] of Object.entries(TURNS)) for (const [k, [a, e]] of Object.entries(c)) { turnAt.set(a, [name, k]); turnEnd.set(e, [name, k]); }
const samples = new Map();
const CP = new Set(P.CHECKPOINTS);

const m = lib.boot();
const joy = lib.joystick();
const own = new Map(), times = new Map(), seg = new Map();
const add = (map, k, v) => map.set(k, (map.get(k) || 0) + v);
const per = new Map();        // each routine's own cycles a time, for the spread
// the frames of routines under way, innermost last: { name, sp, c }
const stack = [];
let last = m.cpu.cycles, stolen = 0, seen = 0, entry = 0, top = null, lastCp = null, segOwn = 0;
const catchUp = m.dmaCatchUp;
m.dmaCatchUp = function () { const c = this.cpu.cycles; catchUp.call(this); stolen += this.cpu.cycles - c; };
const take = m.take;
m.take = function (v) { const c = this.cpu.cycles; take.call(this, v); entry += this.cpu.cycles - c; };
const longest = new Map();
function close(f) {
  add(own, f.name, f.c);
  if (!(longest.get(f.name) >= f.c)) longest.set(f.name, f.c);
  if (COUNTS[f.name]) { if (!samples.has(f.name)) samples.set(f.name, []); samples.get(f.name).push([f.c, f.n || {}]); }
  if (!per.has(f.name)) per.set(f.name, []);
  if (per.get(f.name).length < 4000) per.get(f.name).push(f.c);
}
const executed = new Proxy({}, { set(t, k) {
  const a = +k, cpu = m.cpu, sp = cpu.sp;
  // the cycles since the last instruction, the video chip's left out, the interrupt's entry its own
  let dt = cpu.cycles - last - (stolen - seen) - entry;
  last = cpu.cycles; seen = stolen;
  if (top) { top.c += dt; if (main.has(top.name) && !inIrq()) segOwn += dt; }
  // the routines the stack has climbed out of
  while (stack.length && stack[stack.length - 1].sp < sp) close(stack.pop());
  top = stack[stack.length - 1] || null;
  const name = at.get(a);
  const counted = countAt.get(a);
  if (counted && top && top.name === counted[0]) { top.n = top.n || {}; top.n[counted[1]] = (top.n[counted[1]] || 0) + 1; }
  const turn = turnAt.get(a) || turnEnd.get(a);
  if (turn && top && top.name === turn[0]) {
    const t = top.turn = top.turn || {};
    if (t[turn[1]] !== undefined) { const r = turned.get(turn[1]) || [0, 0]; r[0] += top.c - t[turn[1]]; r[1]++; turned.set(turn[1], r); }
    t[turn[1]] = turnAt.has(a) ? top.c : undefined;
  }
  if (entry) {
    // an interrupt: the handler's routine begins, its entry with it
    const f = { name: name || 'irq', sp, c: entry, irq: true };
    stack.push(f); top = f; add(times, f.name, 1);
    entry = 0;
    return true;
  }
  // a branch back to a routine's own label is a turn of its loop, which the port's routine turns
  // itself
  if (name !== undefined && !(top && top.sp === sp && top.name === name)) {
    const irq = top ? top.irq : false;
    if (top && top.sp === sp) close(stack.pop());
    const f = { name, sp, c: 0, irq };
    stack.push(f); top = f; add(times, name, 1);
  }
  if (CP.has(a) && !inIrq()) {
    if (lastCp !== null) add(seg, lastCp.toString(16) + '>' + a.toString(16), segOwn), add(seg, '#' + lastCp.toString(16) + '>' + a.toString(16), 1);
    lastCp = a; segOwn = 0;
  }
  return true;
} });
function inIrq() { return stack.some(f => f.irq); }
const run = m.cpu.run;
m.cpu.run = function (o) { return run.call(this, Object.assign({}, o, { executed })); };
const t0 = Date.now();
for (let f = 0; f < joy.length; f++) { m.joy = 0x1F & ~joy[f]; m.runFrames(1); }
while (stack.length) close(stack.pop());

const model = { call: {}, seg: {} };
const rows = [];
for (const [name, c] of own) {
  if (name === 'irq') continue;
  const n = times.get(name) || 1, f = P[name];
  const gen = f instanceof GENERATOR;
  const v = per.get(name) || [];
  const mean = c / n, sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, v.length));
  rows.push({ name, n, mean, sd, total: c, gen });
  if (!gen && !SOUND.has(name) && mean > 0) model.call[name] = Math.round(mean * 10) / 10;
}
// the routines that follow their work: own cycles and each count's, by least squares
function fit(rows, keys) {
  const n = keys.length + 1, G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
  for (const [c, cnt] of rows) {
    const v = [1].concat(keys.map(k => cnt[k] || 0));
    for (let i = 0; i < n; i++) { h[i] += v[i] * c; for (let j = 0; j < n; j++) G[i][j] += v[i] * v[j]; }
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(G[r][c]) > Math.abs(G[p][c])) p = r;
    [G[c], G[p]] = [G[p], G[c]]; [h[c], h[p]] = [h[p], h[c]];
    for (let r = 0; r < n; r++) if (r !== c && G[c][c]) { const f = G[r][c] / G[c][c]; for (let k = c; k < n; k++) G[r][k] -= f * G[c][k]; h[r] -= f * h[c]; }
  }
  return Array.from(h, (v, i) => v / G[i][i]);
}
for (const [name, rows] of samples) {
  const keys = Object.keys(COUNTS[name]), x = fit(rows, keys);
  model.call[name] = Math.round(Math.max(0, x[0]) * 10) / 10;
  keys.forEach((k, i) => { model.call['#' + k] = Math.round(Math.max(0, x[i + 1]) * 100) / 100; });
  const err = rows.map(([c, cnt]) => Math.abs(model.call[name] + keys.reduce((s, k) => s + model.call['#' + k] * (cnt[k] || 0), 0) - c) / c);
  err.sort((a, b) => a - b);
  console.log(name + ': ' + model.call[name] + ' cycles and ' + keys.map(k => model.call['#' + k] + ' a ' + k).join(', ') + '; over ' + rows.length +
    ' calls the error is at most ' + (err[err.length - 1] * 100).toFixed(2) + '%, ' + (err[Math.floor(err.length / 2)] * 100).toFixed(2) + '% in the middle');
}
for (const r of rows) {
  if (r.gen || SOUND.has(r.name) || COUNTS[r.name] || longest.get(r.name) - r.mean <= 1000) continue;
  console.log('NOTE: ' + r.name + ' is costed by its mean, ' + r.mean.toFixed(1) + ' cycles, and its longest call took ' + longest.get(r.name) + ': count its work (COUNTS)');
}
for (const [k, [c, n]] of turned) {
  model.call['#' + k] = Math.round(c / n * 100) / 100;
  console.log(k + ': ' + model.call['#' + k] + ' cycles a turn, over ' + n + ' turns');
}
model.call['#sound'] = 1;
for (const [k, c] of seg) if (k[0] !== '#') { const v = c / seg.get('#' + k); if (v > 0) model.seg[k] = Math.round(v * 10) / 10; }
rows.sort((a, b) => b.total - a.total);
console.log('the route, ' + joy.length + ' frames, in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s; the video chip took ' + stolen + ' cycles');
for (const r of rows.slice(0, 60)) console.log(r.name.padEnd(28) + String(r.n).padStart(9) + ' times' + r.mean.toFixed(1).padStart(10) + ' mean' + r.sd.toFixed(1).padStart(10) + ' sd' + (r.total / 1e6).toFixed(2).padStart(9) + 'M' + (r.gen ? '  (waits)' : ''));
if (process.argv[2]) { fs.writeFileSync(process.argv[2], JSON.stringify(model) + '\n'); console.log('wrote ' + process.argv[2] + ': ' + Object.keys(model.call).length + ' routines'); }
