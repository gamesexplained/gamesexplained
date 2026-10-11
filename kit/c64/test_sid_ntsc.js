'use strict';
// The frame player's NTSC option (site/lib/sid.js, opts.ntsc): the driver runs once an NTSC frame
// (263 lines of 65 cycles, 59.83 a second) and the chip runs at the NTSC clock, so a frequency
// register gives the pitch an NTSC machine plays. Without the option, PAL's rates. Exits 1 on any
// failure. node kit/c64/test_sid_ntsc.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
const E = globalThis.C64Sid.engine();
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const RATE = 48000, SECONDS = 4;

function driver(freq) {                                    // a held triangle note, counting its frames
  const sid = new Uint8Array(25);
  let n = 0;
  return { sid, n: () => n, playing: () => true, stop() {},
    init() { sid[0] = freq & 255; sid[1] = freq >> 8; sid[5] = 0x00; sid[6] = 0xF0; sid[4] = 0x11; sid[24] = 15; },
    play() { n++; } };
}
function run(ntsc, hz) {
  const clock = ntsc ? E.NTSC_CLOCK : E.CLOCK;
  const d = driver(Math.round(hz * 16777216 / clock));
  const p = E.createPlayer(d, RATE, ntsc ? { ntsc: true } : {});
  p.command({ cmd: 'start', tune: 0 });
  const out = new Float32Array(RATE * SECONDS);
  p.render(out, out.length, 0);
  let cross = 0;                                           // rising zero crossings in the last 3 s
  const mean = out.slice(RATE).reduce((a, b) => a + b, 0) / (out.length - RATE);
  for (let i = RATE + 1; i < out.length; i++) if (out[i - 1] < mean && out[i] >= mean) cross++;
  return { fps: d.n() / SECONDS, hz: cross / (SECONDS - 1) };
}
check(E.NTSC_CLOCK === 1022727 && E.NTSC_FRAME_CYCLES === 263 * 65, 'NTSC constants exported');
const n = run(true, 440), p = run(false, 440);
check(Math.abs(n.fps - E.NTSC_CLOCK / E.NTSC_FRAME_CYCLES) < 0.5, `NTSC: ${n.fps} driver frames a second (59.83)`);
check(Math.abs(p.fps - E.CLOCK / E.FRAME_CYCLES) < 0.5, `PAL: ${p.fps} driver frames a second (50.12)`);
check(Math.abs(n.hz - 440) < 3, `NTSC: a 440 Hz register value for the NTSC clock sounds at ${n.hz.toFixed(1)} Hz`);
check(Math.abs(p.hz - 440) < 3, `PAL: a 440 Hz register value for the PAL clock sounds at ${p.hz.toFixed(1)} Hz`);
process.exit(fails ? 1 : 0);
