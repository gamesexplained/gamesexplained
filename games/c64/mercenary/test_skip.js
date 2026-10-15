#!/usr/bin/env node
// Hold the Play tab's Skip intro against the intro played out. play.html's runtime gives
// skipOpening(n), which runs the frames of the opening as fast as it can to the frame where the
// game hands the player control: the crash landing at the end of the descent, where leave_craft
// ($98C8) puts the player on foot ($A9 = $80). This runs the page's port and runtime twice from
// the same start, as the page boots them:
//   watched  frame by frame with nothing held, as a player who waits sees it
//   skipped  by skipOpening in slices of 25 frames, as the button runs it, with the stick held up
//            and a key down before every slice (skipOpening lets go of them)
// The skip must stop on the first frame that ends with the player on foot, the frame before it
// still in the descent, with the clock, the pass count, all 64 KB, colour RAM and the chips'
// registers the same as the watched game's there; both are then walked on together and must stay
// the same. Everything it needs is committed.
//   node games/c64/mercenary/test_skip.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the port's script hands over as window.MERC_INSTALL
const { MERC_INSTALL } = g.run('play.html',
  "the port: Mercenary's routines, each a function on the game's memory M, named by the listing's label", 'MERC_INSTALL');
const { makeRuntime } = g.run('play.html', 'runtime', 'makeRuntime');
// the page puts the original disk's first message back before it builds the port
const ui = g.block('play.html', 'ui').text;
const ORIGINAL_7009 = /const ORIGINAL_7009 = \[([^\]]*)\]/.exec(ui)[1].split(',').map(Number);
const image = g.listing().ram;
function boot() {
  const M = image.slice();
  ORIGINAL_7009.forEach((v, i) => { M[0x7009 + i] = v; });
  const P = { M, byAddress: {} };
  for (const f of MERC_INSTALL) f(P);
  return makeRuntime(P, {});
}

let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const LIMIT = 6000;                                // two minutes of frames; the intro takes about 73 s

// watched: the frame where the opening ends, and the one before it
const A = boot();
let k = 0, before = null;
while (A.inOpening && k < LIMIT) { before = { a9: A.M[0xA9], passes: A.passes }; A.runFrame(); k++; }
if (A.inOpening) { console.log(`FAIL the opening did not end in ${LIMIT} frames`); process.exit(1); }
if (before.passes === 0 || before.a9 !== 0x0A) fail('the frame before the hand-over is not in the descent: $A9', before.a9, 'passes', before.passes);
if (A.M[0xA9] !== 0x80) fail('the hand-over does not leave the player on foot: $A9 =', A.M[0xA9]);
if (A.M[0x74] !== 0x08 || A.M[0x7A] !== 0x08) fail('the player is not in square 08-08:', A.M[0x74], A.M[0x7A]);

// skipped: in slices, with input held that skipOpening must let go of
const B = boot();
let slices = 0;
for (;;) {
  B.input.joy = 0x1E; B.input.keys = new Set([0x20]);    // stick up, 9 (thrust) down
  if (B.skipOpening(25)) break;
  if (++slices * 25 > LIMIT) { console.log('FAIL the skip did not end'); process.exit(1); }
}
const same = (what, a, b) => { const at = differ(a, b); if (at >= 0) fail(`${what} differs at $${at.toString(16)}: watched ${a[at]}, skipped ${b[at]}`); };
const compare = when => {
  if (A.frame !== B.frame || A.t !== B.t || A.passes !== B.passes)
    fail(when, 'frame', A.frame, B.frame, 'cycle', A.t, B.t, 'passes', A.passes, B.passes);
  same(when + ': memory', A.M, B.M);
  same(when + ': colour RAM', A.colour, B.colour);
  same(when + ': video chip', A.vic, B.vic);
  same(when + ': sound chip', A.sid, B.sid);
};
compare('at the hand-over');
if (B.skipOpening(25) !== true || B.frame !== A.frame) fail('skipOpening after the hand-over ran frames');

// walked on together: the stick up and left for 600 frames, then nothing for 200
for (let f = 0; f < 800; f++) {
  const joy = f < 600 ? 0x1F & ~(1 | (f % 50 < 10 ? 4 : 0)) : 0x1F;
  A.input.joy = B.input.joy = joy;
  A.runFrame(); B.runFrame();
}
compare('800 frames on');
if (A.M[0x79] === 0x88 && A.M[0x73] === 0x88) fail('walking moved nobody: the stick did not reach the game');

const s = (k * 19656 / 985248).toFixed(1);
console.log(`the intro hands over after ${k} frames (${s} s), on foot at 08-08; ` +
            `fast-forwarded in ${slices + 1} slices, it stops there; ${bad ? bad + ' failed' : 'it is the watched game, there and 800 frames on'}`);
// (the last line names no skip: kit/scripts/test_kit.py reads that word there as a test that skipped)
process.exit(bad ? 1 : 0);
