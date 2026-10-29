'use strict';
// The page's pacing, measured on the game: the test player (test/lib.js, bot) from the start-up on
// the kit's C64 (with the video chip's stolen cycles), first as it plays, through its deaths, a
// game over and the title again, then with the hero kept alive (as scripts/gen-states.js keeps
// him) through every stage, its fight and the intermissions; each instruction's cycles put down
// to the routine of the port it belongs to. The port has a routine for each label the game enters
// (src/core.js), so a routine's own cycles are those from its label to its RTS, the routines it
// calls left out: a JSR to a label begins one, a jump or a branch to another label at the same
// depth of the stack moves on to that one (a tail call), one back to the routine's own label is a
// turn of the call under way, and the stack climbing above where one began ends it. An interrupt
// begins the handler's routine (irq), its seven cycles of entry with it, and the main program's
// routines stand still until its RTI. The cycles the video chip takes from the processor are left
// out: the page's clock adds them as the beam passes (page/runtime.js).
// Writes cost.json: each routine's mean cycles a time it is entered (call), and the main program's
// own between two checkpoints (seg); the sound driver's are counted on its 6502 core as it runs on
// the page, so its routines cost nothing here. A routine whose cost follows the work it is given,
// as the port counts it (P.N, or P.NI in the interrupt: the multiplexer's turns and the sprites it
// places, the sort's scans and moves, a scroll or a column done or not, the mines tested, a text's
// bytes, a picture's bytes and commands, the runs drawn, the bytes swapped), is fitted by least squares as its own cycles and each
// count's ('#mux'), the game's counted where its loops begin (COUNTS). A routine costed by its
// mean whose longest call is more than 1,000 cycles over it is named: on the page that call runs
// short, and its work wants counting.
//   node time-routines.js [out.json] [frames as it plays, default 6000] [frames kept alive, default 34000]
const fs = require('fs');
const lib = require('../test/lib.js');
const standin = require('../test/standin.js');
const { loadPort } = require('../test/port.js');

const GB = loadPort();
const P = GB.makePort(new Uint8Array(65536), {});
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
// the routines the port has, at their labels; the waits' (generators) take what time the game
// gives them, the sound driver's are counted on its core
const SOUND = new Set(['v1_tick', 'v2_tick', 'v3_tick', 'v1_effects', 'v2_effects', 'v3_effects', 'sfx_voice1', 'sfx_start']);
const names = standin.labels(), at = new Map();
for (const [name, a] of names) if (typeof P[name] === 'function') at.set(a, name);
const main = P.GEN;
// the work counted, at the instructions each turn of its loop begins with
const COUNTS = {
  multiplexer: { mux: [0xC47C], mux_place: [0xC486] }, sprites_sort: { sort_scan: [0xCEF1], sort_move: [0xCF04] },
  coarse_scroll: { scroll: [0x3575] }, column_draw: { column: [0x3A01] }, mines_place: { mine_test: [0x3AAE] },
  text_draw: { text: [0xC534] }, picture_draw: { picture: [0xCF46], picture_command: [0xCF53] }, pic_run: { run: [0xCFA9] },
  block_swap: { swap: [0xFF27, 0xFF48] },
};
const countAt = new Map();
for (const [name, c] of Object.entries(COUNTS)) for (const [k, as] of Object.entries(c)) for (const a of as) countAt.set(a, [name, k]);
const samples = new Map();
const CP = new Set(P.CHECKPOINTS);

const PLAYS = +(process.argv[3] || 6000), ALIVE = +(process.argv[4] || 34000);
const m = lib.boot();
const own = new Map(), times = new Map(), seg = new Map();
const add = (map, k, v) => map.set(k, (map.get(k) || 0) + v);
const per = new Map();        // each routine's own cycles a time, for the spread
// the frames of routines under way, innermost last: { name, sp, c }
const stack = [];
let last = m.cpu.cycles, stolen = 0, seen = 0, entry = 0, top = null, lastCp = null, segOwn = 0, prev = -1, polled = -1;
// the sound driver's code (scripts/pack-data.js), whose cycles the page counts on its core
const { DRIVER } = require('./pack-data.js');
const DRIVEN = new Uint8Array(65536);
for (const [f, l] of DRIVER) DRIVEN.fill(1, f, l + 1);
// frame_wait's loop on the frame flag, whose turns take what time the game gives them: on the page
// a turn moves the clock to the next line, so none of the stretch's own cycles are spent there
const POLL = new Set([0x369F, 0x36A2]);
const catchUp = m.dmaCatchUp;
m.dmaCatchUp = function () { const c = this.cpu.cycles; catchUp.call(this); stolen += this.cpu.cycles - c; };
const take = m.take;
m.take = function (v) { const c = this.cpu.cycles; take.call(this, v); entry += this.cpu.cycles - c; };
const longest = new Map();
function close(f) {
  add(own, f.name, f.c);
  if (!(longest.get(f.name) >= f.c)) longest.set(f.name, f.c);
  if (COUNTS[f.name]) { if (!samples.has(f.name)) samples.set(f.name, []); if (samples.get(f.name).length < 200000) samples.get(f.name).push([f.c, f.n || {}]); }
  if (!per.has(f.name)) per.set(f.name, []);
  if (per.get(f.name).length < 4000) per.get(f.name).push(f.c);
}
const executed = new Proxy({}, { set(t, k) {
  const a = +k, cpu = m.cpu, sp = cpu.sp;
  // the cycles since the last instruction, the video chip's left out, the interrupt's entry its
  // own; none for an instruction of the sound driver's
  const dt = prev >= 0 && DRIVEN[prev] ? 0 : cpu.cycles - last - (stolen - seen) - entry;
  last = cpu.cycles; seen = stolen; prev = a;
  if (top) { top.c += dt; if (main.has(top.name) && !inIrq() && !POLL.has(polled)) segOwn += dt; }
  polled = a;
  // the routines the stack has climbed out of
  while (stack.length && stack[stack.length - 1].sp < sp) close(stack.pop());
  top = stack[stack.length - 1] || null;
  const name = at.get(a);
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
  const counted = countAt.get(a);
  if (counted && top && top.name === counted[0]) { top.n = top.n || {}; top.n[counted[1]] = (top.n[counted[1]] || 0) + 1; }
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
// as it plays, then kept alive (an RTS at player_killed and at the mine's explosion, three lives
// or more), as gen-states.js plays
const play = lib.bot(7);
for (let f = 0; f < PLAYS; f++) { play(m); m.runFrames(1); }
const GOD = [0x0C21, 0x3C76];
for (const a of GOD) m.ram[a] = 0x60;
for (let f = 0; f < ALIVE; f++) { if (m.ram[0x03B3] < 3) m.ram[0x03B3] = 3; play(m); m.runFrames(1); }
while (stack.length) close(stack.pop());

const model = { call: {}, seg: {} };
const rows = [];
for (const [name, c] of own) {
  const n = times.get(name) || 1, f = P[name];
  const gen = f instanceof GENERATOR;
  const v = per.get(name) || [];
  const mean = c / n, sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, v.length));
  rows.push({ name, n, mean, sd, total: c, gen });
  if (!gen && !SOUND.has(name) && mean > 0 && typeof f === 'function') model.call[name] = Math.round(mean * 10) / 10;
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
  return Array.from(h, (v, i) => (G[i][i] ? v / G[i][i] : 0));
}
for (const [name, rs] of samples) {
  const keys = Object.keys(COUNTS[name]), x = fit(rs, keys);
  model.call[name] = Math.round(Math.max(0, x[0]) * 10) / 10;
  keys.forEach((k, i) => { model.call['#' + k] = Math.round(Math.max(0, x[i + 1]) * 100) / 100; });
  const err = rs.map(([c, cnt]) => Math.abs(model.call[name] + keys.reduce((s, k) => s + model.call['#' + k] * (cnt[k] || 0), 0) - c) / c);
  err.sort((a, b) => a - b);
  console.log(name + ': ' + model.call[name] + ' cycles and ' + keys.map(k => model.call['#' + k] + ' a ' + k).join(', ') + '; over ' + rs.length +
    ' calls the error is at most ' + (err[err.length - 1] * 100).toFixed(2) + '%, ' + (err[Math.floor(err.length / 2)] * 100).toFixed(2) + '% in the middle');
}
for (const r of rows) {
  if (r.gen || SOUND.has(r.name) || COUNTS[r.name] || longest.get(r.name) - r.mean <= 1000) continue;
  console.log('NOTE: ' + r.name + ' is costed by its mean, ' + r.mean.toFixed(1) + ' cycles, and its longest call took ' + longest.get(r.name) + ': count its work (COUNTS)');
}
model.call['#sound'] = 1;
for (const [k, c] of seg) if (k[0] !== '#') { const v = c / seg.get('#' + k); if (v > 0) model.seg[k] = Math.round(v * 10) / 10; }
rows.sort((a, b) => b.total - a.total);
console.log(PLAYS + ' frames as it plays and ' + ALIVE + ' kept alive, in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s; the video chip took ' + stolen + ' cycles');
for (const r of rows.slice(0, 60)) console.log(r.name.padEnd(28) + String(r.n).padStart(9) + ' times' + r.mean.toFixed(1).padStart(10) + ' mean' + r.sd.toFixed(1).padStart(10) + ' sd' + (r.total / 1e6).toFixed(2).padStart(9) + 'M' + (r.gen ? '  (waits)' : ''));
if (process.argv[2]) { fs.writeFileSync(process.argv[2], JSON.stringify(model) + '\n'); console.log('wrote ' + process.argv[2] + ': ' + Object.keys(model.call).length + ' routines'); }
