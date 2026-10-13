#!/usr/bin/env node
// Hold the page's port of the tune player against the game's own. index.html's clowns-music block
// (createDriver) runs beside play_tune ($F3AA) on the kit's 6502 simulator, over the bytes of the
// committed listing. Each tick of the game ends where wait_tick ($F711) restarts the timer
// (INC $DC0E); the SID writes of every tick must be the port's for that play(), in order, for all
// three tunes, and the port must stop where the game returns. The page reads the driver's data from
// the listing as this test does. It exits 1 on any difference.
//   node games/c64/clowns/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'clowns-music', 'createDriver');
const L = g.listing(), image = L.ram;
const DATA = { notes: Array.from(image.slice(0xFF17, 0xFF73)), lengths: Array.from(image.slice(0xFF73, 0xFFA0)),
  start: Array.from(image.slice(0xFFA0, 0xFFA3)), sid: Array.from(image.slice(0xF74C, 0xF762)) };
let bad = 0, ticks = 0, notes = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

for (let t = 0; t < 3; t++) {
  const m = image.slice(), game = [[]];
  const io = {
    read(a) { if (a === 0xDC0E) return 0; throw new Error('read $' + a.toString(16)); },   // the timer has run out
    write(a, v) {
      if (a >= 0xD400 && a <= 0xD418) game[game.length - 1].push(a - 0xD400, v);
      else if (a === 0xDC0E) { if (v & 1) game.push([]); }    // INC $DC0E writes twice; the new value starts the next tick
      else throw new Error('write $' + a.toString(16));
    },
  };
  new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io }).call(0xF3AA, { a: t });
  if (game[game.length - 1].length) fail('tune', t, 'writes after the last tick');
  game.pop();
  const drv = createDriver(DATA);
  drv.init(t);
  game.forEach((w, i) => {
    drv.play();
    if (w.join() !== drv.writes.join()) fail('tune', t, 'tick', i, w.join(), '|', drv.writes.join());
    for (let k = 0; k < w.length; k += 2) if (w[k] === 1 && w[k + 1]) notes++;
    ticks++;
  });
  drv.play();
  if (drv.playing() || drv.writes.length) fail('tune', t, 'the port plays on after the game returns');
}
console.log(`${ticks} ticks of three tunes, ${notes} notes, ${bad ? bad + ' differences' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
