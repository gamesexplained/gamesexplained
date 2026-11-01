#!/usr/bin/env node
// Hold the page's tune player against the title's own code. index.html's tfp-music block
// (createDriver) runs tune_init and tune_play on the kit's 6502 over TFP_DRIVER_RANGES alone, as
// the player's AudioWorklet runs it. Here the title runs on the kit's simulator over the title's
// whole listing as it runs on the machine: start_tune ($4137), which sets the raster interrupt up
// and calls tune_init, then title_irq ($413F) as an interrupt once a frame, which calls tune_play,
// acknowledges the video chip and sets the next line. Both must write the same values to the same
// sound chip registers in the same order, at the start and in every frame, for two passes of the
// tune; and the title's stream must go back to its start (command $82) after 7,446 frames, in the
// 7,447th, the length the page gives. Then Stop: the title's own SPACE handling runs from $4075, its
// interrupts off and the 25 registers cleared, and the page's stop() must write the same, after
// which its play() writes nothing and playing() is false, as the title never calls tune_play
// again. createDriver is made here from its source text alone, in a context of its own, as the
// worklet makes it. It exits 1 on any difference.
//   node games/c64/the-fourth-protocol/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'tfp-music', 'createDriver', 'TFP_DRIVER_RANGES');
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing('parts/title/listing.json');
const PASS = 7446, FRAMES = 2 * PASS + 10;
const mem = B.TFP_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const m = L.ram.slice(), frame = { w: [] };
const io = {
  read(a) { if (a === 0xD011) return 0x3B; if (a === 0xDC0D || a === 0xDD0D) return 0; throw new Error('read $' + a.toString(16)); },
  write(a, v) {
    if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); return; }
    if ((a >= 0xD000 && a <= 0xD02E) || a === 0xDC0D || a === 0xDD0D) return;   // the raster interrupt's set-up
    throw new Error('write $' + a.toString(16));
  },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
cpu.call(0x4137, {}, { maxSteps: 100000 });                                  // start_tune
const drv = createDriver({ mem }, kit);
drv.init(0);
if (frame.w.join() !== drv.writes.join()) fail('start', frame.w.join(), '|', drv.writes.join());
let restarts = [], ptr = m[0xB7] | m[0xB8] << 8;
for (let f = 0; f < FRAMES; f++) {
  frame.w = [];
  cpu.irq(0x413F, { maxSteps: 100000 });                                     // title_irq
  drv.play();
  if (frame.w.join() !== drv.writes.join()) fail('frame ' + f, frame.w.join(), '|', drv.writes.join());
  if (!drv.playing()) fail('frame ' + f, 'the page stopped');
  const p = m[0xB7] | m[0xB8] << 8;
  if (p < ptr) restarts.push(f);                                          // frames before the one that goes back
  ptr = p;
}
if (restarts[0] !== PASS || restarts[1] !== 2 * PASS) fail('the stream starts again after frames', restarts.join(', '), 'not', PASS, 'and', 2 * PASS);
frame.w = [];
cpu.call(0x4075, {}, { maxSteps: 100000, hooks: { 0x4082: (p) => p.rts() } });   // SPACE: stop_interrupts, then the registers cleared
drv.stop();
if (frame.w.join() !== drv.writes.join()) fail('stop', frame.w.join(), '|', drv.writes.join());
if (drv.playing()) fail('stop', 'the page still says the tune is playing');
for (let f = 0; f < 500; f++) {
  drv.play();
  if (drv.writes.length || drv.sid.some((v) => v)) { fail('after stop, frame ' + f, 'the page wrote', drv.writes.join()); break; }
}
console.log(`${FRAMES} frames: ` + (bad ? bad + ' differences' : `every write matches the title's own code; the tune starts again after ${PASS} frames, and Stop silences it as SPACE does`));
process.exit(bad ? 1 : 0);
