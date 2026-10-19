'use strict';
// The site's model of TED's sound, site/lib/ted-sound.js, against the chip's rules in
// kit/skills/c16/c16-reference, "Sound" (f = 110,840 / (1023 - value), and 1024 counted for 1023;
// the volumes 0 to 8, 9 to 15 as 8; voice 2's square over its noise; the noise's 8-bit register
// and its taps; D/A), and against plus4emu's own output for the same writes: the eleven cases
// kit/c16/sound.py recorded in kit/c16/fixtures/ted-sound.json, each within 1 % of plus4emu's
// level. `python3 kit/c16/sound.py test` makes that comparison again against the running server,
// and `--record` writes the fixture afresh. Exits 1 on any failure.
//   node kit/c16/test_ted_sound.js
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'site', 'lib', 'ted-sound.js'));
const T = globalThis.TEDSound;
const { check } = require(path.join(__dirname, 'ted_sound_check.js'));
let fails = 0;
const ok = (good, what) => { if (!good) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const CLOCK = T.CLOCK, RATE = 48000;
const log = (writes, seconds) => ({ clock: CLOCK, frame: T.FRAME, start: 0, end: Math.round(seconds * CLOCK),
  writes: writes.map(([t, a, v]) => [Math.round(t * CLOCK), a, v]) });

function measure(out, from) {
  let cross = 0, mean = 0, sq = 0;
  for (let i = from; i < out.length; i++) mean += out[i];
  mean /= out.length - from;
  for (let i = from + 1; i < out.length; i++) {
    if (out[i - 1] < mean && out[i] >= mean) cross++;
    sq += (out[i] - mean) ** 2;
  }
  return { hz: cross / ((out.length - from) / RATE), rms: Math.sqrt(sq / (out.length - from)) };
}

// The frequency, from the rule
for (const v of [0, 0x200, 0x300, 0x3C0]) {
  const m = measure(T.render(log([[0, 0xFF0E, v & 255], [0, 0xFF12, v >> 8], [0, 0xFF11, 0x18]], 1.5), RATE), RATE / 2);
  const want = 110840 / (1023 - v);
  ok(Math.abs(m.hz - want) / want < 0.01, `voice 1 at ${v}: ${m.hz.toFixed(1)} Hz, the rule's ${want.toFixed(1)}`);
}
ok(Math.abs(T.hz(1023) - 110840.4 / 1024) < 0.01, `1023 counts 1024: ${T.hz(1023).toFixed(2)} Hz`);
{
  const m = measure(T.render(log([[0, 0xFF0F, 0x80], [0, 0xFF10, 2], [0, 0xFF11, 0x28]], 1.5), RATE), RATE / 2);
  ok(Math.abs(m.hz - 110840 / (1023 - 0x280)) < 3, `voice 2's square at $280: ${m.hz.toFixed(1)} Hz`);
}
// value 1022: the counter runs out at every tick and never turns the output over, which plus4emu
// holds high after 0.85 s (a last step at 0.85 s, then nothing)
const still = measure(T.render(log([[0, 0xFF0E, 0xFE], [0, 0xFF12, 3], [0, 0xFF11, 0x18]], 2.5), RATE), Math.round(1.5 * RATE));
ok(still.rms < 1e-4, 'value 1022 never turns over: silent once the voice is held high and the DC filters settle');

// The volumes: 0, 6, 16, 26, 36, 46, 56, 66 and 75, and 9 to 15 as 8
const level = vol => measure(T.render(log([[0, 0xFF0E, 0], [0, 0xFF12, 2], [0, 0xFF11, 0x10 | vol]], 1), RATE), RATE / 2).rms;
const l8 = level(8);
ok(level(0) < 1e-6, 'volume 0 is silent');
ok(Math.abs(level(4) / l8 - 36 / 75) < 0.03, `volume 4 is ${(level(4) / l8).toFixed(3)} of 8, the table's ${(36 / 75).toFixed(3)}`);
ok(Math.abs(level(15) - l8) < 1e-9 && Math.abs(level(9) - l8) < 1e-9, 'volumes 9 and 15 play as 8');

// Voice 2: the square wins over the noise when both are on; the noise alone is not a square
const sq = T.render(log([[0, 0xFF0F, 0x80], [0, 0xFF10, 2], [0, 0xFF11, 0x28]], 1), RATE);
const both = T.render(log([[0, 0xFF0F, 0x80], [0, 0xFF10, 2], [0, 0xFF11, 0x68]], 1), RATE);
ok(sq.every((x, i) => x === both[i]), "voice 2's square and noise both on play the square");
const noise = measure(T.render(log([[0, 0xFF0F, 0x80], [0, 0xFF10, 2], [0, 0xFF11, 0x48]], 1.5), RATE), RATE / 2);
ok(noise.rms > 0.05 && Math.abs(noise.hz - 110840 / (1023 - 0x280)) > 20, `the noise sounds and is no square: ${noise.hz.toFixed(1)} crossings a second`);

// The noise register: 8 bits, bit 0 taking the parity of bits 7, 5, 4 and 1; it repeats every 255
// shifts. The chip's own register, shifted by voice 2 at value 1021 (two ticks a turn over)
{
  const c = T.model.chip();
  c.write(0x0F, 0xFD); c.write(0x10, 3);
  c.write(0x11, 0x80); c.tick(); c.tick();                 // D/A: the counter held, the register filled with 1s
  c.write(0x11, 0x48);
  const seen = [];
  let n = 0xFF;
  for (let k = 0; k < 600; k++) {
    c.tick(); c.tick();
    let p = n & 0xB2; p ^= p >> 1; p ^= p >> 2; p ^= p >> 4;
    n = ((n << 1) | (p & 1)) & 255;
    seen.push(c.state.noise === n);
  }
  ok(seen.every(Boolean), 'the noise register shifts as the rule says, from all 1s after D/A');
  let m = 0xFF, period = 0;
  do { let p = m & 0xB2; p ^= p >> 1; p ^= p >> 2; p ^= p >> 4; m = ((m << 1) | (p & 1)) & 255; period++; } while (m !== 0xFF);
  ok(period === 255, `the noise repeats every ${period} shifts`);
}

// D/A: both outputs held high, the output the volume times the voices switched on
{
  const c = T.model.chip();
  c.write(0x11, 0x98); c.tick(); c.tick();
  const one = c.tick();
  c.write(0x11, 0xB8); c.tick();
  const two = c.tick();
  ok(one === T.model.DIST[150] && two === T.model.DIST[300], `D/A at volume 8: ${one} with voice 1, ${two} with both`);
}

// pack and unpack keep every write; decode reads the registers
{
  const L = log([[0, 0xFF0E, 0x12], [0.01, 0xFF12, 0xC9], [0.02, 0xFF11, 0x37], [0.5, 0xFF0F, 0x40], [0.5, 0xFF10, 0xFE]], 1);
  ok(JSON.stringify(T.unpack(T.pack(L)).writes) === JSON.stringify(L.writes), 'pack, then unpack, gives the writes back');
  const e = T.decode(L).pop();
  ok(e.value[0] === 0x112 && e.value[1] === 0x240 && e.vol === 7 && e.voice1 && e.square && !e.noise,
    'decode: voice 1 at $112 from $FF0E and $FF12, voice 2 at $240, volume 7, both squares');
}

// plus4emu's own output, recorded by kit/c16/sound.py
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'ted-sound.json'), 'utf8'));
for (const l of fx.logs) {
  const r = check(T, l, fx.from, fx.to);
  ok(r && r.error < 0.01, `${l.name}: ${(100 * r.error).toFixed(2)} % off plus4emu's output`);
}
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
