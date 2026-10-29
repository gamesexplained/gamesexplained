#!/usr/bin/env node
// Hold the page's port of the music driver against the game's own. index.html's en-driver block
// (createDriver) runs beside the game's init ($18D6) and driver ($1947) on the kit's 6502
// simulator, over the bytes of the committed listing. Every write to the sound chip must be the
// port's, in order, for the init and for 2,000 calls of the driver, which is 666 ticks of the tune
// and more than one time round it. The page reads the driver's tables from the listing as this
// test does. It exits 1 on any difference.
//   node games/c64/into-the-eagles-nest/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));

const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'en-driver', 'createDriver');
const image = g.listing().ram;
const win = (a) => Array.from(image.slice(a, a + 256));
const DATA = { stream: [win(0x15E2), win(0x1680), win(0x1768)],
               hi: win(0x17F8), lo: win(0x1842), len: win(0x188C),
               wave: Array.from(image.slice(0x1930, 0x1933)) };

const CALLS = 2000;
let bad = 0, notes = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

// The game's own driver, with the chip watched. Nothing else in $D000-$DFFF is touched by it.
const m = image.slice();
let writes = [];
const io = {
  read(a) { throw new Error('the driver read $' + a.toString(16)); },
  write(a, v) {
    if (a >= 0xD400 && a <= 0xD418) { writes.push(a - 0xD400, v); return; }
    throw new Error('the driver wrote $' + a.toString(16));
  },
};
const cpu = new CPU(m, { port: 0x36, io });
const regs = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const call = (at) => { writes = []; cpu.call(at, Object.assign({}, regs), { maxSteps: 200000 }); return writes; };

const drv = createDriver(DATA);
const theirInit = call(0x18D6);
drv.init(0);
if (theirInit.join() !== drv.writes.join())
  fail('the init writes differ:', theirInit.join(), '|', drv.writes.join());

for (let i = 0; i < CALLS; i++) {
  const theirs = call(0x1947);
  drv.play();
  if (theirs.join() !== drv.writes.join()) fail('call', i, theirs.join(), '|', drv.writes.join());
  for (let k = 0; k < theirs.length; k += 2) if (theirs[k] % 7 === 1 && theirs[k + 1] !== 0) notes++;
}
console.log(`${CALLS} calls of the driver, ${notes} notes, `
  + (bad ? bad + ' differences' : 'every write matches'));
process.exit(bad ? 1 : 0);
