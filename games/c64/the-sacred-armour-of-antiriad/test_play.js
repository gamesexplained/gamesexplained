'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from the game's first
// instruction. The port's own tests hold each routine and the main loop to the game's code (port/
// test, with moments of play saved in work/); this one holds the page that is published, beside the
// game's own code on the kit's C64 (test_route.js's machine, from listing.json), with nothing from
// work/. The C64 plays the Maps page's route as test_route.js does, each frame's stick from where the
// frame before ended; the page is given the stick of the route's frame its clock is in. Past the
// route's last frame both have the stick let go.
// - The memory the page carries, every instruction of the game but the sound driver's left out,
//   plays as the whole memory does: over the first 3,000 frames of the route, every byte the game
//   keeps outside its code is the same on each frame.
// - From power-on, the title comes up and the game starts within two frames of the C64's.
// - At each stage of the route (the armour put on and taken off, the panel lit, each add-on, each
//   life lost, the mine and the last message), from a moment of play shortly before it, made here on
//   the C64 as port/scripts/gen-states.js makes them, the page reaches the stage within two frames
//   of the C64, and for the first 50 frames Tal's room and place on the page are the C64's on the
//   same frame or the one before or after it, but for at most three frames in a row. The page runs
//   an interrupt's handler whole as it comes, where the C64 takes its fifty lines or so, so a move
//   the handler makes can show on the page a frame before the C64's.
// - Q in play brings the title back.
// - Over 6,000 frames of the page alone no frame throws, the raster's three bands come in each, and
//   the clock keeps to the frames shown.
//   node games/c64/the-sacred-armour-of-antiriad/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid'); g.lib('collide');
g.lib('cpu6502');                   // the 6502 the port's sound driver runs on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, b === 'port/src/core.js' ? 'AntPort' : b === 'port/page/runtime.js' ? 'AntPage' : 'AntGroups');
const { AntPage } = globalThis;
const cost = JSON.parse(/^window\.ANT_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="ant-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const route = require('./route.json');
const joy = lib.joystick();
const { FRAME } = AntPage;

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const stickAt = f => 0x1F & ~(f >= 0 && f < joy.length ? joy[f] : 0);

// ---- the memory the page carries, beside the whole memory: the same game
{
  const whole = lib.boot().save();
  const a = AntPage.create({ data, cost }), b = AntPage.create({ data, cost });
  b.restore(whole, p => p.main());
  const L = g.json('listing.json'), code = new Uint8Array(65536);
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) code[r.a + i] = 1;
  let first = -1;
  for (let f = 0; f < 3000 && first < 0; f++) {
    a.input.joy = b.input.joy = stickAt(f);
    a.runFrame(); b.runFrame();
    for (let x = 2; x < 65536; x++) if (!code[x] && (x < 0x100 || x > 0x1FF) && a.M[x] !== b.M[x]) { first = f; fail('frame ' + f + ': $' + x.toString(16) + ' is ' + a.M[x] + ' on the memory the page carries, ' + b.M[x] + ' on the whole'); break; }
  }
  if (first < 0) console.log('the memory the page carries: 3,000 frames of the route as the whole memory plays them');
}

// ---- the route on the C64: the cycle each of its frames ends at, and a copy of the machine where
// each stage's moment is to be made
const FIELD = { 'into the armour': [1, 1], 'out of the armour': [1, 0], 'the panel lights': [2, 1], 'the Pulsar Beam': [3, 1],
  'the Particle Negator': [4, 1], 'the Gravity Displacer': [5, 1], 'the Implosion Mine': [6, 1], 'the mine goes off': [7, 1], 'the last message': [8, 1] };
const BEFORE = 120, AFTER = 30, HOLD = 50;
const stages = route.stages.filter(s => FIELD[s.what] || s.what === 'a life lost');
const ends = [];
const copies = [];
{
  const m = lib.boot();
  for (let f = 0, k = 0; f < joy.length; f++) {
    m.joy = stickAt(f);
    m.runFrames(1);
    ends.push(m.cpu.cycles);
    while (k < stages.length && f + 1 >= stages[k].frame - BEFORE) { copies.push(m.save()); k++; }
  }
}
// the route's frame a cycle is in, and the C64 run on to a cycle with the route's stick
const frameOf = c => { let lo = 0, hi = ends.length; while (lo < hi) { const h = (lo + hi) >> 1; if (ends[h] > c) hi = h; else lo = h + 1; } return lo; };
const endOf = f => f < ends.length ? ends[f] : Infinity;
function drive(m) {
  const run = m.runCycles.bind(m);
  m.runCycles = n => {
    const until = m.cpu.cycles + n;
    while (m.cpu.cycles < until) {
      const f = frameOf(m.cpu.cycles);
      m.joy = stickAt(f);
      if (!run(Math.min(until, endOf(f)) - m.cpu.cycles)) return false;
    }
    return true;
  };
  return m;
}

// ---- the page and the C64 side by side from a moment, frame by frame: the C64's memory as each
// frame begins, beside the page's frame's (what the page draws it from), and the changes the look
// sees on each. A frame here is the clock's (19,656 cycles); the route's frames are each a few cycles
// longer, where its machine ran past the frame's end, and are some frames behind by the ending.
const look = r => [r[0xB0] >> 7 || !r[0x260] ? 0 : 1, r[0x7B] >> 7, r[0x8A] >> 7, r[0x67E] >> 7, r[0x67F] >> 7, r[0x680] >> 7, r[0x681] >> 7,
  r[0xB1] ? 1 : 0, r[0x54] === 0x95 ? 1 : 0, r[0xAC]].join(',');
const place = r => r[0x5B] + ',' + (r[0x200] + (r[0x210] & 1 ? 256 : 0)) + ',' + r[0x201];
function beside(m, rt, frames, each) {
  Object.defineProperty(rt.input, 'joy', { get: () => stickAt(frameOf(rt.t)), set: () => {}, configurable: true });
  const n0 = Math.floor(m.cpu.cycles / FRAME), A = [], B = [];
  let la = null, lb = null;
  for (let f = 1; f <= frames; f++) {
    const n = n0 + f, at = n * FRAME;
    rt.runUntil(at);
    m.runCycles(at - m.cpu.cycles);
    const F = rt.frameAt(n);
    if (!F || F.frame !== n) throw new Error('the page kept no frame ' + n);
    const ka = look(F.mem), kb = look(m.ram);
    if (ka !== la) { A.push([n, ka]); la = ka; }
    if (kb !== lb) { B.push([n, kb]); lb = kb; }
    if (each) each(f, F.mem, m.ram);
  }
  return { A, B };
}
// the frames a stage is first seen on, in order
function when(E, what) {
  const at = [];
  for (let i = 1; i < E.length; i++) {
    const a = E[i - 1][1].split(','), b = E[i][1].split(',');
    if (what === 'a life lost' ? +b[9] > +a[9] : a[FIELD[what][0]] !== b[FIELD[what][0]] && +b[FIELD[what][0]] === FIELD[what][1]) at.push(E[i][0]);
  }
  return at;
}
// the clock's frame a stage of the route is first seen on, as the route's machine came to it
const seenOn = f => Math.ceil(ends[f - 1] / FRAME);

// ---- from power-on: the title, and the game started by the route's fire
{
  const m = drive(lib.boot()), rt = AntPage.create({ data, cost });
  const start = route.stages.find(s => s.what === 'the game starts').frame;
  const r = beside(m, rt, seenOn(start) + 20);
  const on = E => { const e = E.find(x => x[1][0] === '1'); return e ? e[0] : -1; };
  const fa = on(r.A), fb = on(r.B);
  if (Math.abs(fb - seenOn(start)) > 1) fail('from power-on: the C64 starts the game on frame ' + fb + ', the route on ' + seenOn(start));
  else if (fa < 0 || Math.abs(fa - fb) > 2) fail('from power-on: the page starts the game on frame ' + fa + ', the C64 on ' + fb);
  else console.log('from power-on: the title, and the game started ' + (fa - fb) + ' frames from the C64 (frame ' + fb + ')');
}

// ---- each stage of the route, from a moment shortly before it
let inPlay = null;
{
  // a moment: the copy run on to where a pass starts, as gen-states.js saves one; in the ending, where
  // the main loop has stopped, the stage before it is run on to it
  const moments = [];
  copies.forEach((s, k) => {
    const c = drive(lib.restore(s));
    try { lib.player(c).stopAt(lib.PASS, 100); moments.push(c.save()); } catch (e) { moments.push(moments[k - 1]); }
  });
  inPlay = moments[0];
  let held = 0;
  stages.forEach((st, i) => {
    const s = moments[i];
    const m = drive(lib.restore(s)), rt = AntPage.create({ data, cost });
    rt.restore(s, p => p.resume());
    const due = seenOn(st.frame), PA = [], PB = [];
    const r = beside(m, rt, due - Math.floor(s.cpu.cycles / FRAME) + AFTER, (f, a, b) => {
      if (f <= HOLD + 1) { PA.push(place(a)); PB.push(place(b)); }
    });
    // Tal's place on the page is the C64's on the frame, or the one before or after it
    let run = 0, lasting = -1;
    for (let f = 0; f < HOLD; f++) {
      if (PA[f] !== PB[f] && PA[f] !== PB[f - 1] && PA[f] !== PB[f + 1]) { if (++run > 3 && lasting < 0) lasting = f - 3; } else run = 0;
    }
    const what = st.what + ' (frame ' + st.frame + ' of the route)';
    // the C64's that comes when the route's did, and the page's that comes as many times in
    const B = when(r.B, st.what), A = when(r.A, st.what);
    const n = B.findIndex(b => Math.abs(b - due) <= 1);
    let ok = true;
    if (n < 0) { fail(what + ': the C64 from the moment does not reach it on frame ' + due + ' (' + B.join(' ') + ')'); ok = false; }
    else if (A[n] === undefined) { fail(what + ': the page does not reach it'); ok = false; }
    else if (Math.abs(A[n] - B[n]) > 2) { fail(what + ': the page ' + (A[n] - B[n]) + ' frames from the C64'); ok = false; }
    if (lasting >= 0) { fail(what + ': Tal\'s place apart from the C64\'s from frame ' + lasting + ' of the moment'); ok = false; }
    if (ok) held++;
  });
  console.log(held + ' of ' + stages.length + ' stages of the route reached within two frames of the C64, Tal in step for the first ' + HOLD + ' frames before each');
}

// ---- Q in play brings the title back
{
  const rt = AntPage.create({ data, cost });
  rt.restore(inPlay, p => p.resume());
  for (let i = 0; i < 20; i++) rt.runFrame();
  if (rt.M[0xB0] & 0x80) fail('Q: the game is not in play at the moment it is pressed');
  rt.input.keys = new Set(['Q']);
  for (let i = 0; i < 10; i++) rt.runFrame();
  rt.input.keys = new Set();
  let n = 0;
  while (!(rt.M[0xB0] & 0x80) && n < 100) { rt.runFrame(); n++; }
  if (rt.M[0xB0] & 0x80) console.log('Q in play brings the title back');
  else fail('Q in play: no title in 110 frames');
}

// ---- the page alone, from power-on with the route's joystick: no frame throws, the raster's bands
// come, and the clock keeps to the frames shown
{
  const N = 6000, rt = AntPage.create({ data, cost });
  let threw = null, bands = 0;
  const rb = rt.P.raster_bands;
  rt.P.raster_bands = function () { bands++; return rb.apply(this, arguments); };
  for (let f = 0; f < N && !threw; f++) {
    rt.input.joy = stickAt(f);
    try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + rt.shown + ': ' + e.message); }
  }
  const ahead = rt.t / FRAME - (rt.shown + 1);
  if (ahead > 40 || ahead < 0) fail('the clock ' + ahead.toFixed(1) + ' frames from the frame shown');
  if (Math.abs(bands - 3 * N) > N / 20) fail(bands + ' raster bands in ' + N + ' frames');
  if (!threw) console.log(N + ' frames of the page alone, none threw; ' + bands + ' raster bands');
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
