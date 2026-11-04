'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from the loader's hand-over.
// The port's lockstep (port/test/lockstep.js) holds each pass of the race to the game's code; this
// one holds the page that is published, beside the game's own code on the kit's C64
// (kit/c64/machine.js), its memory the listing's bytes with the page's data around them, with
// nothing from work/:
// - from the hand-over, the main menu, a name, Practise, Little Ramp and a race driven a set way
//   for 2,000 frames: each change of the screen's mode ($3DF8: the menus, the race) the C64's, in
//   the same order, within three frames; the passes of the race within two per cent of the C64's
//   (counted as each pass begins, its stretch paid); the same laps;
// - Start the Racing Season and a race against a driver, the same;
// - P pauses the race until O is pressed, on both;
// - the page on the memory it carries and on the whole memory, the listing's code included, the
//   same at every frame in every byte outside the code: the port reads none of the code the page
//   leaves out;
// - every stretch the page meets has a cost the fit measured, and the clock keeps to the frames.
//   node games/c64/stunt-car-racer/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SCRPort');
const { SCRPage } = globalThis;
const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const { FRAME } = lib;

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const PASS = 0x3D08;

// The whole memory: the listing's bytes, the code among them, and the page's elsewhere
const L = g.listing();
const whole = Buffer.from(data.ram, 'base64');
for (let a = 0; a < 0x10000; a++) if (L.has[a]) whole[a] = L.ram[a];
const code = new Uint8Array(0x10000);
for (const r of L.listing.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) code[r.a + i] = 1;
const full = Object.assign({}, data, { ram: whole.toString('base64') });

// Scripts of input, frame by frame from the hand-over, as test/lockstep.js's sessions begin
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
// driving: forward, then forward with a turn each way, braking, the boost
const DRIVE = [{ frames: 180, joy: J.fire }, { frames: 500, joy: J.up }, { frames: 60, joy: J.up & J.left }, { frames: 300, joy: J.up },
  { frames: 60, joy: J.up & J.right }, { frames: 100, joy: J.down }, { frames: 400, joy: J.up }, { frames: 100, joy: J.up & J.fire }, { frames: 300, joy: J.up }];
const SCRIPTS = {
  practice: [...MENUS, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire),
    { frames: 300 }, ...tap(J.fire), { frames: 600 }, ...DRIVE],
  season: [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire),
    { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...DRIVE],
};
const frames = s => s.reduce((n, x) => n + x.frames, 0);

// the game on the kit's C64, from the same hand-over
function gameMachine() {
  const m = lib.restore(full, { dma: true, passAt: PASS });
  m.frames = 0; m.passes = 0;
  return m;
}
// each change of $3DF8 as [frame, value]; the passes once the race has begun (its first pass)
function note(L, f, v) { if (!L.length || L[L.length - 1][1] !== v) L.push([f, v]); }

function beside(name, script, extra) {
  const rt = SCRPage.create({ data, cost });
  const m = gameMachine();
  const A = [], B = [];
  let pa = 0, firstA = -1, firstB = -1;
  const ctl = rt.P.CONTROLS;
  rt.P.CONTROLS = function (...a) { pa++; return ctl.apply(this, a); };
  let f = 0;
  const run = (s, each) => {
    rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy;
    m.keys.clear(); for (const k of s.keys || []) m.press(k); m.joy = rt.input.joy;
    for (let i = 0; i < s.frames; i++, f++) {
      try { rt.runFrame(); } catch (e) { fail(name + ': frame ' + f + ': ' + e.message); return false; }
      m.runFrames(1);
      if (rt.t < rt.target || rt.t > rt.target + 2 * FRAME) { fail(name + ': frame ' + f + ': the clock at ' + rt.t + ', the frame\'s end at ' + rt.target); return false; }
      note(A, f, rt.M[0x3DF8]); note(B, f, m.ram[0x3DF8]);
      if (firstA < 0 && pa) firstA = f;
      if (firstB < 0 && m.passes) firstB = f;
      if (each) each(f);
    }
    return true;
  };
  for (const s of script) if (!run(s)) break;
  if (extra) extra(run, rt, m);
  // the same changes in the same order, each within three frames
  if (A.length !== B.length || A.some((e, i) => e[1] !== B[i][1])) fail(name + ': $3DF8 went ' + A.map(e => e[1].toString(16)).join(' ') + ' on the page and ' + B.map(e => e[1].toString(16)).join(' ') + ' on the C64');
  else {
    const gaps = A.map((e, i) => Math.abs(e[0] - B[i][0])), worst = Math.max(...gaps), w = gaps.indexOf(worst);
    if (worst > 3) fail(name + ': $3DF8 became ' + A[w][1].toString(16) + ' at frame ' + A[w][0] + ' on the page and ' + B[w][0] + ' on the C64');
    else console.log('ok   ' + name + ': $3DF8\'s ' + A.length + ' changes in the same order, within ' + worst + ' frames');
  }
  const pb = m.passes;
  if (!pa || !pb) fail(name + ': no race: ' + pa + ' passes on the page, ' + pb + ' on the C64');
  else {
    const e = (pa - pb) / pb;
    if (Math.abs(e) > 0.02) fail(name + ': ' + pa + ' passes of the race on the page, ' + pb + ' on the C64');
    else console.log('ok   ' + name + ': ' + pa + ' passes of the race on the page, ' + pb + ' on the C64 (' + (e * 100).toFixed(1) + '%), the first ' + (firstA - firstB) + ' frames apart');
  }
  if (rt.M[0xC378] !== m.ram[0xC378]) fail(name + ': ' + rt.M[0xC378] + ' laps on the page, ' + m.ram[0xC378] + ' on the C64');
  if (rt.missing.size) fail(name + ': stretches with no cost: ' + [...rt.missing].join(' '));
  return { rt, m };
}

// ---- beside the C64
beside('practice', SCRIPTS.practice);
beside('season', SCRIPTS.season);

// ---- the pause: P held until the game has paused, the race still for 300 frames, O goes on
beside('pause', SCRIPTS.practice.slice(0, -3), (run, rt, m) => {
  let pa = 0;
  const ctl = rt.P.CONTROLS;
  rt.P.CONTROLS = function (...a) { pa++; return ctl.apply(this, a); };
  run({ frames: 30, keys: ['P'], joy: J.up });
  const a0 = pa, b0 = m.passes;
  run({ frames: 300, joy: J.up });
  if (pa !== a0 || m.passes !== b0) fail('pause: the race went on while paused: ' + (pa - a0) + ' passes on the page, ' + (m.passes - b0) + ' on the C64');
  run({ frames: 10, keys: ['O'], joy: J.up });
  run({ frames: 200, joy: J.up });
  if (pa - a0 < 10 || m.passes - b0 < 10) fail('pause: O did not go on: ' + (pa - a0) + ' passes on the page, ' + (m.passes - b0) + ' on the C64');
  else console.log('ok   pause: P stops the race on both, O sets it going');
});

// ---- the memory the page carries against the whole memory
{
  const a = SCRPage.create({ data, cost }), b = SCRPage.create({ data: full, cost });
  let f = 0, bad = -1;
  outer: for (const s of SCRIPTS.season) {
    for (const rt of [a, b]) { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; }
    for (let i = 0; i < s.frames; i++, f++) {
      a.runFrame(); b.runFrame();
      for (let x = 0; x < 0x10000; x++) if (!code[x] && a.M[x] !== b.M[x]) { bad = x; break outer; }
    }
  }
  if (bad >= 0) fail('the page on its own memory and on the whole memory differ at frame ' + f + ', $' + bad.toString(16).toUpperCase() + ': the port read code the page leaves out');
  else console.log('ok   the page on its own memory and on the whole memory alike for ' + f + ' frames');
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
