'use strict';
// The site's AY-3-8912, site/lib/ay.js, against what ZEsarUX 13.0 gave for the same registers on
// 17 October 2026 (the measurements in the script's header): a tone's frequency, each volume's
// level, the noise's rate, the mixer's bits and the beeper's swing. Also pack() and unpack(),
// decode() reading a period, a volume and the envelope's bit, and the live player a Play tab feeds
// as the game runs: the same samples as render(), each write at its T-state, the queue held to its
// length, and the worklet's source text running on its own. Exits 1 on any failure.
// node kit/spectrum/test_ay.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'ay.js'));
const A = globalThis.SpectrumAY;
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const log = (calls, n) => ({ clock: A.CLOCK, hz: A.HZ, calls: calls.concat(Array(n - calls.length).fill([])) });

// track(): each tone channel's pitch and loudness at each call, for the bouncing ball
{
  const tr = A.track(log([[0, 0xFE, 1, 0, 7, 0x3E, 8, 15], [8, 7], [7, 0x3F]], 4));
  const a = tr.voices[0];
  check(tr.rate === A.HZ && tr.voices.length === 3 && a.hz.length === 4, 'track(): a call a tick, three voices');
  check(Math.abs(a.hz[0] - A.hz(0xFE)) < 1e-3 && a.level[0] === 1 && Math.abs(a.level[1] - A.VOLUME[7] / A.VOLUME[15]) < 1e-6,
    'track(): a tone\'s pitch, and its loudness against full volume');
  check(Number.isNaN(a.hz[2]) && Number.isNaN(tr.voices[1].hz[0]), 'track(): no pitch where the tone is off');
}

// decode
const st = A.decode(log([[0, 0x34, 1, 0x12, 2, 0xFF, 3, 0x0F, 4, 0, 5, 0, 6, 0x25, 7, 0x38, 8, 15, 9, 0x13, 10, 0, 16, 1]], 1))[0];
check(st.tone.join() === [0x234, 0xFFF, 1].join(), 'periods from R0-R5: the coarse byte\'s low four bits, 0 as 1');
check(st.noise === 5 && st.mixer === 0x38, 'R6\'s five bits and R7');
check(st.vol.join() === '15,3,0' && st.env.join() === '0,1,0' && st.beeper === 1, 'volumes, bit 4 as the envelope, the beeper');

// measure a rendered stretch: rising crossings per second and the swing
function measure(out, rate, from, to) {
  to = Math.min(to, out.length);
  let mean = 0, lo = Infinity, hi = -Infinity, cross = 0, changes = 0;
  for (let i = from; i < to; i++) mean += out[i];
  mean /= to - from;
  for (let i = from + 1; i < to; i++) {
    if (out[i - 1] < mean && out[i] >= mean) cross++;
    if ((out[i - 1] < mean) !== (out[i] < mean)) changes++;
    lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]);
  }
  return { hz: cross / ((to - from) / rate), swing: hi - lo, changes };
}
const RATE = 48000, second = n => [0, Math.floor(n * RATE)];

// Pitch: ZEsarUX played period 256 at 430.7 Hz; the model's clock gives 433.0
for (const p of [256, 100, 1000, 4095]) {
  const out = A.render(log([[0, p & 255, 1, p >> 8, 7, 0x3E, 8, 15]], 300), RATE);
  const m = measure(out, RATE, RATE / 2, RATE * 6), want = A.CLOCK / (16 * p);
  check(Math.abs(m.hz - want) <= Math.max(want * 0.01, 1 / 5.5), `period ${p}: ${m.hz.toFixed(1)} Hz, the formula's ${want.toFixed(1)}`);
}
const m256 = measure(A.render(log([[0, 0, 1, 1, 7, 0x3E, 8, 15]], 100), RATE), RATE, RATE / 2, RATE * 2 - 100);
check(Math.abs(m256.hz - 430.7) / 430.7 < 0.01, `period 256 within 1% of ZEsarUX's 430.7 Hz (${m256.hz.toFixed(1)})`);

// Volume: ZEsarUX's levels in its units, 24 at 15
const ZESARUX = { 15: 24, 14: 20, 13: 16, 12: 14, 11: 10, 10: 8, 9: 6, 8: 4, 7: 3, 6: 2, 5: 2, 4: 1, 3: 1, 2: 1, 1: 0 };
const swing = v => measure(A.render(log([[0, 0, 1, 1, 7, 0x3E, 8, v]], 50), RATE), RATE, RATE / 2, RATE - 100).swing;
const full = swing(15);
for (const v of Object.keys(ZESARUX).map(Number)) {
  const u = swing(v) / full * 24;
  check(Math.abs(u - ZESARUX[v]) <= 0.5 + 0.05 * ZESARUX[v], `volume ${v}: ${u.toFixed(2)} units, ZEsarUX ${ZESARUX[v]}`);
}
check(swing(0) < 1e-6, 'volume 0 is silent');

// The mixer: tone B alone with B's bit cleared, nothing with every bit set
const toneB = measure(A.render(log([[2, 0, 3, 1, 7, 0x3D, 9, 15]], 50), RATE), RATE, RATE / 2, RATE - 100);
check(Math.abs(toneB.hz - A.CLOCK / 4096) < 5, `R7 = $3D sounds tone B (${toneB.hz.toFixed(1)} Hz)`);
const none = measure(A.render(log([[0, 0, 1, 1, 7, 0x3F, 8, 15]], 50), RATE), RATE, RATE / 2, RATE - 100);
check(none.swing < 1e-3, 'R7 = $3F with a volume of 15 holds the channel still');

// The noise: at NP = 16 ZEsarUX's 15600-a-second output changed level 66 times a frame
const nz = A.render(log([[6, 16, 7, 0x37, 8, 15]], 100), 15606);
const nm = measure(nz, 15606, 15606 / 2, 15606 * 2 - 10), perFrame = nm.changes / 1.5 / A.HZ;
check(Math.abs(perFrame - 66) / 66 < 0.15, `noise at NP = 16: ${perFrame.toFixed(1)} changes a frame, ZEsarUX 66`);

// The beeper: a step of 100 units against a swing of 48 for a channel at 15; a held level fades
const held = A.render(log([[16, 1]], 50), RATE), step = Math.max(...held.subarray(0, 100));
const chan = Math.max(...A.render(log([[7, 0x3F, 8, 15]], 5), RATE).subarray(0, 100));   // a channel's step 0 to 15
check(Math.abs(step / chan * 48 - 100) / 100 < 0.02, `beeper step ${(step / chan * 48).toFixed(1)} units, ZEsarUX 100`);
check(Math.abs(held[RATE * 0.9]) < 0.01 * Math.abs(held[10]) + 1e-4, 'a held beeper level fades');

// pack and unpack keep the state after every call
const L = log([[0, 1, 1, 2, 8, 15], [0, 1, 1, 2, 8, 14], [16, 1], [0, 9, 16, 0]], 6);
const back = A.unpack(A.pack(L));
check(JSON.stringify(A.decode(back)) === JSON.stringify(A.decode(L)), 'pack, then unpack, gives the same state after every call');
check(A.pack(L).w.split(',')[1] === '80e', 'pack keeps only the registers a call changed');

// live(): frames of writes at T-state 0 play as render() plays the same calls. render() times a call
// by call / hz, which rounds a step late at a few frames (44 and 88 of these); those are left empty.
let seed = 5;
const rnd = n => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % n; };
const frameOf = c => { const f = []; for (let i = 0; i < c.length; i += 2) f.push(0, c[i], c[i + 1]); return f; };
let same = true;
for (let k = 0; k < 4; k++) {
  const calls = [];
  for (let f = 0; f < 120; f++) {
    const c = [];
    if (f % 44) for (let j = rnd(6); j > 0; j--) { const r = rnd(17); c.push(r, r === 16 ? rnd(2) : rnd(256)); }
    calls.push(c);
  }
  const want = A.render(log(calls, calls.length), RATE), live = A.live(RATE), got = new Float32Array(want.length - 1);
  live.push(calls.map(frameOf), Infinity);
  live.render(got, got.length);
  for (let i = 0; i < got.length; i++) if (got[i] !== want[i]) { same = false; break; }
}
check(same, 'live() fed frames at T-state 0 gives render()\'s samples');
// a write in the middle of a frame lands at its T-state: at one sample a step, the beeper set at 0
// and cleared at T-state 3200 falls between samples 199 and 200
{
  const live = A.live(A.CLOCK / 8), out = new Float32Array(400);
  live.push([[0, 16, 1, 3200, 16, 0]]);
  live.render(out, out.length);
  check(out[200] - out[199] < -0.9 * A.BEEPER && Math.abs(out[199] - out[198]) < 0.01 * A.BEEPER, 'live() plays a write at its T-state in the frame');
}
// with more than most frames waiting, the oldest are applied at once
{
  const live = A.live(RATE);
  live.push([[0, 8, 1], [0, 8, 2], [0, 8, 3], [0, 8, 4], [0, 8, 5]], 3);
  check(live.queued === 3 && live.chip.reg[8] === 2, 'live() keeps most frames waiting and applies the older ones');
}
// the worklet's source text runs with nothing of the page: a processor fed the same frames gives
// the same samples as live()
{
  let Proc = null;
  const run = new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', A.worklet());
  run(class { constructor() { this.port = {}; } }, (name, c) => { Proc = c; }, RATE);
  const p = new Proc({ processorOptions: { most: 8 } }), frames = [[0, 0, 0x20, 0, 7, 0x3E, 0, 8, 15], [0, 16, 1, 9000, 16, 0]];
  p.port.onmessage({ data: { frames } });
  const out = new Float32Array(2000), ref = A.live(RATE), want = new Float32Array(2000);
  for (let i = 0; i < 2000; i += 128) p.process([], [[out.subarray(i, i + 128)]]);
  ref.push(frames, 8); ref.render(want, 2000);
  check(Proc && out.every((v, i) => v === want[i]) && out.some(v => v !== 0), 'the worklet\'s processor plays as live() does');
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
