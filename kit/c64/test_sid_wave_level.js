'use strict';
// C64Sid.waveLevel in site/lib/sid.js: how loud a voice's waveform is against its envelope, which
// the bouncing ball's glow follows. Its pulse widths are held to the model's own output: a voice
// at full volume is played as a pulse of each width and as a square, and the ratio of the two
// RMS levels must match waveLevel. That is how a driver that sweeps a pulse wider from nothing
// fades a voice in (games/c64/wizball, the title's voice 3). No waveform, and the test bit
// holding the oscillator, are silent; a sawtooth is a whole voice. Exits 1 on any failure.
// node kit/c64/test_sid_wave_level.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));

const S = globalThis.C64Sid, E = S.engine(), RATE = 48000, HZ = E.CLOCK / 16777216;
let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };

// the RMS of one voice, held at full volume for a quarter of a second after it has settled
function rms(hz, pw, ctrl) {
  const s = E.createSID(RATE, {});
  const f = Math.round(hz / HZ);
  for (const [r, v] of [[0, f & 255], [1, f >> 8], [2, pw & 255], [3, pw >> 8], [5, 0], [6, 0xF0], [24, 0x0F], [4, ctrl]]) s.write(r, v);
  for (let i = 0; i < RATE / 4; i++) s.sample();
  const N = RATE / 4, buf = new Float64Array(N);
  let mean = 0, m = 0;
  for (let i = 0; i < N; i++) mean += (buf[i] = s.sample());
  mean /= N;
  for (let i = 0; i < N; i++) m += (buf[i] - mean) ** 2;
  return Math.sqrt(m / N);
}

let worst = 0;
for (const hz of [110, 440]) {
  const square = rms(hz, 2048, 0x41);
  for (const pw of [100, 200, 400, 800, 1600, 2048, 3000, 3996]) {
    const got = rms(hz, pw, 0x41) / square, want = S.waveLevel(0x41, pw);
    worst = Math.max(worst, Math.abs(got - want));
    if (Math.abs(got - want) > 0.05) fail(`a pulse ${pw} of 4096 wide at ${hz} Hz: the model gives ${got.toFixed(3)} of a square, waveLevel ${want.toFixed(3)}`);
  }
}
if (S.waveLevel(0x41, 0) !== 0) fail('a pulse of width 0 is not silent');
if (S.waveLevel(0x01, 2048) !== 0) fail('a voice with no waveform is not silent');
if (S.waveLevel(0x49, 2048) !== 0) fail('a voice with the test bit set is not silent');
if (S.waveLevel(0x21, 0) !== 1 || S.waveLevel(0x11, 0) !== 1) fail('a sawtooth or a triangle is not a whole voice');
console.log(fails ? `${fails} failure(s)` : `waveLevel: all cases pass (largest gap from the model ${worst.toFixed(3)})`);
process.exit(fails ? 1 : 0);
