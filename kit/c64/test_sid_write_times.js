'use strict';
// A driver's timed writes in site/lib/sid.js (times, in the driver's contract). An envelope
// sustaining at full level ($FF) that is released and attacked again at one instant wraps to 0 and
// holds there until the next note, as on the chip; a driver that turns the gate off and on a few
// hundred cycles apart never meets that on a C64, and with times its writes land that far apart
// in the player too, so every note sounds. Friday the 13th's tunes lost every other note before
// its driver timed its writes. Also checked: the player lands each write on its own cycle, the
// frame's registers are set once the last has landed, and a start part way into a tune (at) lands
// them in order. Exits 1 on any failure.
// node kit/c64/test_sid_write_times.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));

const E = globalThis.C64Sid.engine();
let fails = 0;
const fail = m => { fails++; console.log('FAIL ' + m); };

// A tune of one voice, sawtooth, attack and decay 0, sustain 15, release 0: a new note every 10
// frames, each started as many drivers start one, the gate off and on again within the call.
function driver(timed, gap) {
  const sid = new Uint8Array(25);
  let writes = [], times = [], f = 0, on = false;
  const w = (r, v, t) => { sid[r] = v; writes.push(r, v); times.push(t); };
  return {
    init() { f = 0; on = true; writes = []; times = []; w(24, 15, 0); w(5, 0, 4); w(6, 0xF0, 8); w(1, 0x10, 12); w(4, 0x21, 16); },
    stop() { on = false; },
    play() {
      if (f++ === 0) return;                              // init's writes go with the first frame
      writes = []; times = [];
      if (f % 10 === 0) { w(1, 0x10 + (f / 10 & 7), 90); w(4, 0x20, 100); w(4, 0x21, 100 + gap); }
    },
    sid, get writes() { return writes; }, get times() { return timed ? times : undefined; }, playing: () => on,
  };
}

// The envelope level at the middle of each of 8 notes
function levels(timed, gap, at) {
  const p = E.createPlayer(driver(timed, gap), 44100, {});
  p.command({ cmd: 'start', tune: 0, at: at || 0 });
  const out = new Float32Array(441), got = [];
  for (let n = 0; n < 90; n++) {
    p.render(out, 441 * 2, 0, null);                       // 20 ms: about a frame
    if (n % 10 === 5) got.push(p.sid.V[0].env);
  }
  return got;
}

// at one instant, as the player had them: every other note silent
const flat = levels(false, 300);
if (!flat.some(e => e === 0)) fail(`writes at one instant: expected the envelope to wrap to 0 on some notes, got ${flat}`);
// timed, 300 cycles apart: every note at full level
const timed = levels(true, 300);
if (!timed.every(e => e > 240)) fail(`timed writes 300 cycles apart: every note should sustain near $FF, got ${timed}`);
// timed, but at the same cycle: the chip's own wrap, kept
const same = levels(true, 0);
if (!same.some(e => e === 0)) fail(`timed writes at one cycle: expected the wrap to 0, got ${same}`);
// a start part way in lands the writes on their cycles too
const later = levels(true, 300, 25);
if (!later.every(e => e > 240)) fail(`a start 25 frames in: every note should sustain, got ${later}`);

// each write lands on its own cycle: the release has run when the attack comes
{
  const p = E.createPlayer(driver(true, 2000), 44100, {});
  p.command({ cmd: 'start', tune: 0 });
  const out = new Float32Array(1);
  let low = 255;
  for (let i = 0; i < 44100 * 0.5; i++) { p.render(out, 1, 0, null); if (i > 44100 * 0.1) low = Math.min(low, p.sid.V[0].env); }
  if (!(low < 255 && low > 0)) fail(`a gap of 2,000 cycles: the release should dip the envelope part way, lowest ${low}`);
  if (p.sid.V[0].ctrl !== 0x21) fail(`the frame's registers after its writes: control ${p.sid.V[0].ctrl.toString(16)}, expected 21`);
}

console.log(fails ? `${fails} failure(s)` : 'timed writes: all cases pass');
process.exit(fails ? 1 : 0);
