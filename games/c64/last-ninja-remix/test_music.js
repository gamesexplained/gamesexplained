#!/usr/bin/env node
// Hold the page's tune player against the game's own players. index.html's lnr-music block
// (createDriver) runs each tune's player on the kit's 6502, handed in as sid.js hands it, for every
// button (LNR_TUNES): a level's player at $4000 of its title load, the intro's at $B000. The same
// calls on the kit's simulator over the part's whole listing, with the SID's data bus answering
// reads as VICE's does (C64Sid.engine().createBus), must write the same values to the same
// registers in the same order, frame by frame: on the first frame the calls the game makes to start
// the tune ($4000 then $4003 from the engine's interrupt, $1EF8 and $1F0E; $B000 from the intro,
// $0897), then the frame call ($4003, or the intro's $B003 from $10C3). 6,000 frames a tune. It
// exits 1 on any difference.
//   node games/c64/last-ninja-remix/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, LNR_TUNES } = g.run(page, 'lnr-music', 'createDriver', 'LNR_TUNES');
g.lib('sid');
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const FRAMES = 6000;
let bad = 0, frames = 0, gates = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const listings = new Map();
const listing = (part) => { if (!listings.has(part)) listings.set(part, g.listing(`parts/${part}/listing.json`)); return listings.get(part); };
const tunes = LNR_TUNES.map((c) => Object.assign({}, c, { mem: [[c.bytes[0], listing(c.part).ram.slice(c.bytes[0], c.bytes[1])]] }));
LNR_TUNES.forEach((c, t) => {
  const m = listing(c.part).ram.slice(), frame = { w: [] };
  const bus = C64Sid.engine().createBus('8580');
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); bus.write(v, cpu.cycles); } else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver({ tunes }, kit);
  drv.init(t);
  for (let f = 0; f < FRAMES; f++) {
    frame.w = [];
    for (const ad of f === 0 ? c.first : [c.play]) cpu.call(ad, Z, { maxSteps: 200000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    for (let k = 0; k < frame.w.length; k += 2) if (frame.w[k] % 7 === 4 && frame.w[k] < 21 && frame.w[k + 1] & 1) gates++;
    frames++;
  }
  if (!drv.playing()) fail(c.name, 'stopped');
});
if (!gates) fail('no voice was ever gated on: the test played silence');
console.log(`${LNR_TUNES.length} tunes, ${frames} frames, ${gates} gate writes: ` + (bad ? bad + ' differences' : 'every write matches the game\'s players'));
process.exit(bad ? 1 : 0);
