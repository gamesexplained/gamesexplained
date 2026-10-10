'use strict';
// The frame player's period option (site/lib/sid.js, opts.period, #264): a driver that a game calls
// from a CIA timer runs once a period of so many cycles, each call a period after the one before
// at the first sample at or after its cycle, so no error adds up over a tune. Without the option,
// once a PAL or NTSC frame, as before. A period shorter than a sample still gets every call, and a
// start part-way into a tune runs the chip a period between calls. Exits 1 on any failure.
// node kit/c64/test_sid_period.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
const E = globalThis.C64Sid.engine();
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const RATE = 48000;

function driver() {                                        // a held note, counting its calls
  const sid = new Uint8Array(25);
  let n = 0;
  return { sid, n: () => n, playing: () => true, stop() {},
    init() { n = 0; sid[1] = 0x10; sid[5] = 0xA0; sid[6] = 0xF0; sid[4] = 0x21; sid[24] = 15; },
    play() { n++; } };
}

// Call k must come at the first sample at or after cycle k x period, from the first call on.
function timing(opts, seconds, what) {
  const clock = opts.ntsc ? E.NTSC_CLOCK : E.CLOCK, period = E.periodOf(opts), cps = clock / RATE;
  const d = driver(), p = E.createPlayer(d, RATE, opts), seen = [];
  p.command({ cmd: 'start', tune: 0 });
  const out = new Float32Array(Math.round(RATE * seconds));
  p.render(out, out.length, 0, s => seen.push(s));
  const want = Math.floor((out.length - 1) * cps / period) + 1;
  let late = 0;
  seen.forEach((s, k) => { if (Math.round(s.t * RATE) !== Math.ceil(k * period / cps - 1e-9) || s.frame !== k + 1) late++; });
  check(d.n() === want && seen.length === want && !late,
        `${what}: ${d.n()} calls in ${seconds} s (${want} expected), ${late} at the wrong sample`);
}

check(E.periodOf({}) === E.FRAME_CYCLES && E.periodOf({ ntsc: true }) === E.NTSC_FRAME_CYCLES &&
      E.periodOf({ period: 47288 }) === 47288 && E.periodOf({ ntsc: true, period: 32768 }) === 32768 &&
      E.periodOf({ period: 0 }) === E.FRAME_CYCLES, 'periodOf: the period when given, else the frame');
timing({}, 4, 'PAL, no period: once a frame of 19,656 cycles');
timing({ ntsc: true }, 4, 'NTSC, no period: once a frame of 17,095 cycles');
timing({ period: 47288 }, 10, 'PAL, period 47,288 (a CIA timer latch of $B8B7)');
timing({ period: 32768 }, 10, 'PAL, period 32,768 (a latch of $7FFF)');
timing({ ntsc: true, period: 47288 }, 10, 'NTSC, period 47,288: the NTSC clock');
timing({ period: 10 }, 0.1, 'PAL, period 10, shorter than a sample (20.5 cycles)');

// A start 6 calls in runs the chip 5 periods between them: voice 1's attack ($A, a step every
// 1,954 cycles) has risen that far when the seventh call is heard.
for (const period of [47288, null]) {
  const d = driver(), p = E.createPlayer(d, RATE, period ? { period } : {});
  p.command({ cmd: 'start', tune: 0, at: 6 });
  const cycles = 5 * (period || E.FRAME_CYCLES), env = p.sid.V[0].env;
  check(d.n() === 6 && Math.abs(env - Math.floor(cycles / 1954)) <= 1,
        `a start 6 calls in, ${period ? 'period ' + period : 'once a frame'}: ${d.n()} calls, voice 1's envelope at ${env} (${Math.floor(cycles / 1954)} expected)`);
}
process.exit(fails ? 1 : 0);
