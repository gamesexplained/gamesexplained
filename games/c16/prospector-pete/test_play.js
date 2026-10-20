'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on listing.json, from the game's first instruction at $1800,
// beside the game's own code on the kit's C16 (kit/c16/machine.js) given the same stick. The
// port's own tests hold each routine and the whole game to the game's code (port/test, on moments
// of play saved in work/); this one holds the page that is published, with nothing from work/.
// - the title comes up and draws, as TED would show it, with the title's colours;
// - fire starts level 1, and its first pass comes within two frames of the C16's (the level built
//   with the screen off, a second's wait, two seconds with it on);
// - in play the page runs as many passes as the C16 in the same frames, to 1 %;
// - right and down move Pete and dig, and the game writes to TED's sound registers, and only to them;
// - ESC goes back to the title;
// - the title's own way to a level, right tapped until it shows the level and then fire, starts
//   each of the sixteen, and each plays on with the clock keeping to the frames.
// No frame throws.
//   node games/c16/prospector-pete/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c16/machine.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c16');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'PetePort');
const { PetePage, PetePort } = globalThis;
const cost = JSON.parse(/^window\.PETE_COST = (.*);$/m.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const vector = M => M[0x0314] | M[0x0315] << 8;
const TITLE = 0x3080, PLAY = 0x1991;
const RIGHT = 0x17, DOWN = 0x1D, FIRE = 0x0F, STILL = 0x1F;
const ESC = 52;                                    // kit/c16/machine.js, KEY.ESC

// The game's memory as the page has it: listing.json's bytes; the page adds what the listing lacks.
const ram = () => g.listing().ram;
const boot = () => { const r = ram(); for (const [a, b] of Object.entries(PetePort.MISSING)) r.set(b, +a); return r; };
const rt = PetePage.create({ ram: ram(), cost });
const m = new Machine({ ram: boot(), pc: 0x1800, passAt: 0x1852 });
let f = 0, threw = null;
const frames = [];
// n frames of both, the stick held at joy
function run(n, joy = STILL, keys = []) {
  for (let i = 0; i < n && !threw; i++, f++) {
    rt.input.joy = m.joy = joy; rt.input.keys = new Set(keys);
    m.releaseAll(); for (const k of keys) m.press(k);
    m.runFrames(1);
    try { frames[f] = rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
}

// the title
run(80);
if (vector(rt.M) !== TITLE) fail('the title is not up at frame 80: the vector is $' + vector(rt.M).toString(16));
const pic = C16.renderBands(frames[f - 1].bands, { size: 0x4000 });
const colours = new Set(pic.px);
if (colours.size < 4) fail('the title drawn in ' + colours.size + ' colours');
else console.log('the title: ' + colours.size + ' colours, ' + frames[f - 1].bands.length + ' bands');

// fire, and the first pass of level 1
const firstPass = who => { const p0 = who.passes; return () => who.passes > p0; };
const mStarted = firstPass(m), pStarted = firstPass(rt);
run(3, FIRE);
let mAt = -1, pAt = -1;
for (let i = 0; i < 250 && (mAt < 0 || pAt < 0) && !threw; i++) {
  run(1);
  if (mAt < 0 && mStarted()) mAt = f;
  if (pAt < 0 && pStarted()) pAt = f;
}
if (mAt < 0 || pAt < 0) fail('level 1 never started: the C16 at ' + mAt + ', the page at ' + pAt);
else if (Math.abs(mAt - pAt) > 2) fail('level 1\'s first pass in frame ' + pAt + ', the C16\'s in ' + mAt);
else console.log('level 1: the first pass ' + (pAt - 80) + ' frames after fire, the C16\'s ' + (mAt - 80));

// play: the passes in the same frames, Pete walking right and digging down
const m0 = m.passes, p0 = rt.passes, col0 = rt.M[0x06], row0 = rt.M[0x07];
let sounds = 0, elsewhere = 0;
const f0 = f;
run(40, RIGHT); const col1 = rt.M[0x06];
run(80, DOWN); const row1 = rt.M[0x07];
run(80, STILL);
for (let i = f0; i < f; i++) {
  const s = frames[i].sound;
  if (s.length) sounds++;
  for (let j = 1; j < s.length; j += 3) if (s[j] < 0xFF0E || s[j] > 0xFF12) elsewhere++;
}
const dm = m.passes - m0, dp = rt.passes - p0;
if (Math.abs(dp - dm) > Math.max(2, dm / 100)) fail('in ' + (f - f0) + ' frames of play the page ran ' + dp + ' passes, the C16 ' + dm);
else console.log('play: ' + dp + ' passes in ' + (f - f0) + ' frames, the C16 ' + dm);
if (col1 <= col0) fail('right held for 40 frames left Pete at column ' + col1 + ' from ' + col0);
if (row1 <= row0) fail('down held for 80 frames left Pete at row ' + row1 + ' from ' + row0);
if (!sounds) fail('no writes to the sound registers in ' + (f - f0) + ' frames of play');
if (elsewhere) fail(elsewhere + ' sound writes outside $FF0E-$FF12');
console.log('Pete: column ' + col0 + ' to ' + col1 + ', row ' + row0 + ' to ' + row1 + '; sound in ' + sounds + ' frames');

// ESC, back to the title
run(6, STILL, [ESC]);
run(60);
if (vector(rt.M) !== TITLE) fail('ESC left the vector at $' + vector(rt.M).toString(16));

// every level the title's way, as the page's level buttons take it (right tapped until the title
// shows the level, then fire), and played for 300 frames with the stick at random
let seed = 4310;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const STICKS = [STILL, 0x1E, DOWN, 0x1B, RIGHT, FIRE];
let started = 0;
for (let lv = 0; lv < 16 && !threw; lv++) {
  const r = PetePage.create({ ram: ram(), cost });
  const step = (n, joy = STILL) => { for (let i = 0; i < n && !threw; i++) { r.input.joy = joy; try { r.runFrame(); } catch (e) { threw = e; fail('level ' + (lv + 1) + ': ' + e.message); } } };
  step(60);
  for (let i = 0; i < 40 && r.M[0xA7] !== lv; i++) { step(2, RIGHT); step(2); }
  step(3, FIRE); step(200);
  if (r.M[0xA7] !== lv || vector(r.M) !== PLAY || !r.M[0xA8]) { fail('level ' + (lv + 1) + ': level ' + (r.M[0xA7] + 1) + ', the vector $' + vector(r.M).toString(16) + ', the level ' + (r.M[0xA8] ? 'on' : 'not on')); continue; }
  const p = r.passes, f1 = r.frame;
  for (let i = 0; i < 10; i++) step(30, STICKS[rnd(STICKS.length)]);
  // a death holds the passes for some 160 frames; the clock keeps to the frames whatever happens
  if (r.passes - p < 100 || r.frame - f1 !== 300) fail('level ' + (lv + 1) + ': ' + (r.passes - p) + ' passes and ' + (r.frame - f1) + ' frames of the clock in 300 frames of play');
  else started++;
}
if (started === 16) console.log('every level started from the title and played');

console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
