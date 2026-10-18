'use strict';
// The site's SN76489, site/lib/sn76489.js, against the chip's rules in
// kit/skills/bbc/bbc-reference, "Sound": which byte names which register, how a tone's two bytes
// make N, f = 4,000,000 / (32 N) with N = 0 as 1,024, 2 dB a step of attenuation and 15 silent,
// and the noise's rates and restart. The model is jsbeeb's (src/soundchip.js); where jsbeeb is
// installed (tools/bbc), a log of writes is also played through jsbeeb's own chip, and the two
// outputs' pitch and loudness compared. With KIT_REQUIRE_TOOLS set, a missing jsbeeb fails
// rather than skips. Exits 1 on any failure. node kit/bbc/test_sn76489.js
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'site', 'lib', 'sn76489.js'));
const S = globalThis.BBCSound;
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const CLOCK = 2000000;
const log = (writes, seconds) => ({ clock: CLOCK, start: 0, end: seconds * CLOCK,
  writes: writes.map(([t, b]) => [Math.round(t * CLOCK), b]) });

// The registers, by the first byte
const st = S.decode(log([[0, 0x85], [0, 0x0D], [0, 0xA1], [0, 0x3F], [0, 0xCE], [0, 0x01], [0, 0x93],
                          [0, 0xB0], [0, 0xDF], [0, 0xE5], [0, 0xF2]], 1)).pop();
check(st.tone[0] === 0x0D * 16 + 5, '&85 then &0D: SOUND 3\'s tone, N = 213');
check(st.tone[1] === 0x3F * 16 + 1, '&A1 then &3F: SOUND 2\'s, N = 1009');
check(st.tone[2] === 0x01 * 16 + 14, '&CE then &01: SOUND 1\'s, N = 30');
check(st.vol.join() === '3,0,15,2', 'volumes from &90, &B0, &D0, &F0');
check(st.noise === 5, 'noise control from &E0');
const st2 = S.decode(log([[0, 0x90], [0, 0x07]], 1)).pop();
check(st2.vol[0] === 7, 'a byte with bit 7 clear after a volume sets that volume, as jsbeeb does');

// Pitch and loudness of the output
function measure(out, rate, from) {
  let cross = 0, mean = 0, peak = 0;
  for (let i = from; i < out.length; i++) mean += out[i];
  mean /= out.length - from;
  for (let i = from + 1; i < out.length; i++) {
    if (out[i - 1] < mean && out[i] >= mean) cross++;
    peak = Math.max(peak, Math.abs(out[i] - mean));
  }
  return { hz: cross / ((out.length - from) / rate), peak };
}
const RATE = 48000;
for (const n of [278, 100, 1023, 0]) {
  const out = S.render(log([[0, 0xA0 | (n & 15)], [0, n >> 4 & 0x3F], [0, 0xB0]], 2), RATE);
  const m = measure(out, RATE, RATE / 2), want = 4000000 / (32 * (n || 1024));
  check(Math.abs(m.hz - want) / want < 0.01, `N = ${n}: ${m.hz.toFixed(1)} Hz, the formula's ${want.toFixed(1)}`);
}
const loud = measure(S.render(log([[0, 0xA0 | 6], [0, 17], [0, 0xB0]], 1), RATE), RATE, RATE / 4).peak;
const less = measure(S.render(log([[0, 0xA0 | 6], [0, 17], [0, 0xB5]], 1), RATE), RATE, RATE / 4).peak;
check(Math.abs(20 * Math.log10(less / loud) + 10) < 0.3, `five steps of attenuation: ${(20 * Math.log10(less / loud)).toFixed(2)} dB, the chip's -10`);
const quiet = measure(S.render(log([[0, 0xA0 | 6], [0, 17], [0, 0xBF]], 1), RATE), RATE, RATE / 4).peak;
check(quiet < 1e-6, '15 is silent');

// The noise: periodic noise repeats every 15 shifts of the register, and at rate 0 it shifts
// every 64 chip steps (a counter of &10, less 0.5 a step, reaching zero twice a shift):
// 500,000 / (64 x 15) = 520.8 Hz
const per = measure(S.render(log([[0, 0xE0], [0, 0xF0]], 2), RATE), RATE, RATE / 2);
check(Math.abs(per.hz - 500000 / 960) / (500000 / 960) < 0.02, `periodic noise at rate 0: ${per.hz.toFixed(1)} Hz, 520.8 by the rule`);

// pack and unpack keep every write
const L = log([[0, 0x80], [0.001, 0x01], [0.5, 0x9F]], 1);
check(JSON.stringify(S.unpack(S.pack(L)).writes) === JSON.stringify(L.writes), 'pack, then unpack, gives the writes back');

// The same writes through jsbeeb's own chip, where it is installed
const JS = path.join(ROOT, 'tools', 'bbc', 'node_modules', 'jsbeeb', 'src', 'soundchip.js');
async function againstJsbeeb() {
  if (!fs.existsSync(JS)) {
    if (process.env.KIT_REQUIRE_TOOLS) { fails++; console.log('FAIL no jsbeeb in tools/bbc, and KIT_REQUIRE_TOOLS is set'); }
    else console.log('skip jsbeeb is not installed in tools/bbc: the comparison with its chip is skipped');
    return;
  }
  const { SoundChip } = await import(JS);
  const writes = [[0, 0x80 | 14], [0, 0x11], [0, 0x92], [0.3, 0xA0 | 3], [0.3, 0x28], [0.3, 0xB0],
                  [0.6, 0xE4], [0.6, 0xF4], [0.9, 0x9F], [0.9, 0xBF], [0.9, 0xFF]];
  const seconds = 1.2, L2 = log(writes, seconds);
  // jsbeeb's chip at its own 500 kHz, poked at each write's sample
  const chunks = [];
  const chip = new SoundChip(b => chunks.push(Float32Array.from(b)));
  chip.enabled = true;
  for (let i = 0; i < 4; i++) chip.volume[i] = 0;
  const total = Math.round(seconds * 500000), buf = new Float32Array(total);
  let at = 0;
  for (const [c, b] of L2.writes) {
    const to = Math.round(c / CLOCK * 500000);
    if (to > at) { chip.generate(buf, at, to - at); at = to; }
    chip.poke(b);
  }
  chip.generate(buf, at, total - at);
  const ours = S.render(L2, 500000);
  const ranges = [[0.05, 0.3], [0.35, 0.6], [0.65, 0.9], [0.95, 1.2]];
  for (const [a, b] of ranges) {
    const A = buf.subarray(a * 500000, b * 500000), B = ours.subarray(a * 500000, b * 500000);
    const ma = measure(A, 500000, 0), mb = measure(B, 500000, 0);
    const okHz = Math.abs(ma.hz - mb.hz) <= Math.max(2, ma.hz * 0.01);
    const okPeak = Math.abs(ma.peak - mb.peak) <= Math.max(1e-4, ma.peak * 0.05);
    check(okHz && okPeak, `${a}-${b} s against jsbeeb's chip: ${mb.hz.toFixed(1)} Hz and ${mb.peak.toFixed(4)}, jsbeeb ${ma.hz.toFixed(1)} Hz and ${ma.peak.toFixed(4)}`);
  }
}
againstJsbeeb().then(() => { console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0); });
