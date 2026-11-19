#!/usr/bin/env node
// Hold music.html's sound player against the game's own code. The page's hp-music block
// (createDriver) runs the music code on the kit's 6502 over HP_RANGES. Here the game's path runs on
// the kit's simulator over the whole of listing.json's memory: the routine that starts the tune
// (music_start, $ADD0, which the game reaches through $A000; tune2_start, $1000, for the unused
// tune), then one interrupt for each period of CIA 1's timer A, taken as the processor takes it
// through the KERNAL's entry with the handler the start routine left at $0314: music_irq ($AE03),
// which plays a tick and goes on to the KERNAL at $EA7E, or tune2_irq ($102E), which ends the
// interrupt itself. Both sides must write the same values to the same registers in the same order
// on every call, 12,000 calls a tune, past the end of each. createDriver is made from its source text alone, as the
// AudioWorklet makes it. It exits 1 on any difference.
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const B = g.run('music.html', 'hp-music', 'createDriver', 'HP_TUNES', 'HP_RANGES');
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing();
const mem = B.HP_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
let bad = 0, calls = 0, gates = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const loops = [];
for (const t of B.HP_TUNES) {
  const m = new Uint8Array(L.ram), w = [];
  let bus = 0;
  const io = {
    read(a) { return a >= 0xD400 && a < 0xD800 ? bus : 0; },
    write(a, v) { if (a >= 0xD400 && a < 0xD800) { const r = (a - 0xD400) & 31; bus = v; if (r < 25) w.push(r, v); } },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  const drv = createDriver({ mem, tunes: [t] }, kit);
  const title = t.start === 0xADD0;
  cpu.call(title ? 0xADD0 : 0x1000, {}, { maxSteps: 200000 });
  const want = title ? 0xAE03 : 0x102E;
  if (m[0x0314] + 256 * m[0x0315] !== want) fail(t.name, 'the start routine left $0314 at', (m[0x0314] + 256 * m[0x0315]).toString(16));
  drv.init(0);
  if (w.join() !== drv.writes.join()) fail(t.name, 'start', w.join(), '|', drv.writes.join());
  const hooks = { 0xEA7E: c => { c.pc = 0xEA81; } };   // $EA7E reads CIA 1's flags, then $EA81 ends the interrupt
  let wrapped = -1, pos0 = 0;
  for (let f = 0; f < 12000; f++) {
    w.length = 0;
    drv.readback(0, 0, bus);
    cpu.irq(undefined, { kernal: true, hooks, maxSteps: 200000 });
    drv.play();
    if (w.join() !== drv.writes.join()) fail(t.name, 'call ' + f, w.join(), '|', drv.writes.join());
    for (let i = 0; i < w.length; i += 2) if ([4, 11, 18].includes(w[i]) && (w[i + 1] & 1)) gates++;
    if (wrapped < 0 && (title ? m[0xA3F1] < pos0 : m[0x12])) wrapped = f;   // the first track's position goes back, or the end flag
    pos0 = m[0xA3F1];
    calls++;
  }
  loops.push(t.name + (wrapped < 0 ? '' : `: back to its start after ${wrapped + 1} calls, ${((wrapped + 1) * t.period / 985248).toFixed(1)} s`));
}
if (gates < 100) fail('only', gates, 'gates opened');
console.log(`${B.HP_TUNES.length} tunes, ${calls} calls, ${gates} gates opened: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + loops.join('; ')));
process.exit(bad ? 1 : 0);
