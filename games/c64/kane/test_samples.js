#!/usr/bin/env node
// Hold the page's sample player against the game's own sample data. The kane-samples block of
// index.html (kaneSample) runs the game's sample player on the kit's 6502 for each of the five
// sounds in KANE_SAMPLES. The test runs the same routine on the simulator with its own log of every
// write to voice 1's control register ($D404) and the volume ($D418), and checks:
// - that the bits voice 1 is given are the sample's own bytes from the listing, read in blocks of a
//   volume byte and sixteen bytes, highest bit first, from the routine's start address to its end;
// - that each block's volume is the volume byte capped at 15, less sample_volume (and 1 more for a
//   byte under 16, which the compare before the subtraction leaves with the carry clear), at least
//   1 ($9411-$9422);
// - that the page's levels change on the same cycles as the log's.
// It exits 1 on any difference.
//   node games/c64/kane/test_samples.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { KANE_SAMPLES, kaneSample } = g.run(page, 'kane-samples', 'KANE_SAMPLES', 'kaneSample');
const L = g.listing();
// Where each routine reads its sample: the start and end it stores ($9337-$9369)
const SPAN = { 0x9337: [0xF3F0, 0xF6B0], 0x9349: [0xFCC0, 0xFF90], 0x935B: [0x9E00, 0x9FFF] };
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const out = [];
for (const s of KANE_SAMPLES) {
  const m = L.ram.slice(), log = [];
  m[0x9448] = s.volume; m[0x9449] = s.rate;
  let reload = 0, line = 0;
  const io = {
    read(a, cpu) {
      if (a === 0xD012) { line = line === 0x14 ? 0x13 : 0x14; return line; }
      if (a === 0xDD04) return (0xFFFF - (cpu.cycles - reload)) & 0xFF;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v, cpu) {
      if (a === 0xDD0E) { if (v & 0x10) reload = cpu.cycles; return; }
      if (a === 0xD404 || a === 0xD418) log.push([cpu.cycles, a, v]);
    },
  };
  const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  cpu.cycles = 0;
  cpu.call(s.entry, { a: 0, x: 0, y: 0 }, { maxSteps: 3e7 });
  // the bits and volumes the sample's bytes give
  const [from, end] = SPAN[s.entry], want = [];
  for (let a = from; a < end;) {
    const b = L.ram[a];
    let v = b >= 0x10 ? 15 - s.volume : b - s.volume - 1;
    if (v <= 0) v = 1;
    want.push(['vol', v]);
    for (let k = 1; k <= 16 && a + k < end; k++) for (let i = 7; i >= 0; i--) want.push(['bit', (L.ram[a + k] >> i) & 1]);
    a += 17;
  }
  const got = log.filter(([, a, v]) => !(a === 0xD404 && (v & 0x41) !== 0x41)).map(([, a, v]) => a === 0xD418 ? ['vol', v & 15] : ['bit', v & 8 ? 1 : 0]);
  got.pop();                                               // the volume put back to 15 at the end
  const n = Math.min(got.length, want.length);
  let at = -1;
  for (let i = 0; i < n; i++) if (got[i].join() !== want[i].join()) { at = i; break; }
  if (at >= 0 || got.length !== want.length) fail(s.name, 'the stream', at >= 0 ? 'first difference at ' + at + ': ' + got[at] + ' | ' + want[at] : 'lengths ' + got.length + ' | ' + want.length);
  // the page's levels change where the log's do
  const ev = kaneSample(L.ram, C64Cpu, s), mine = [];
  let bit = 0, vol = 0;
  for (const [c, a, v] of log) {
    if (a === 0xD404) bit = v & 8 ? 1 : 0; else vol = v & 15;
    if (!mine.length || mine[mine.length - 1][1] !== bit || mine[mine.length - 1][2] !== vol) mine.push([c, bit, vol]);
  }
  if (mine.join(' ') !== ev.join(' ')) fail(s.name, 'the page\'s levels differ from the log');
  const bits = want.filter((w) => w[0] === 'bit').length, span = log[log.length - 1][0] - log[0][0];
  out.push(`${s.name}: ${bits} bits in ${(span / 985248).toFixed(3)} s`);
}
console.log(bad ? bad + ' differences' : out.join('; ') + ': every bit and volume is the sample\'s own');
process.exit(bad ? 1 : 0);
