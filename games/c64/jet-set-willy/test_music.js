#!/usr/bin/env node
// Hold the page's port of the two music players against the game's own. index.html's jswMusic block
// (createDriver) runs beside the title's player ($A0CD, $A139) and the in-game one ($2005, $2066) on the
// kit's 6502 simulator, over the bytes of the committed listing. Each frame is the game's own music
// code from its interrupt, $A821-$A831 or $3435-$3445, run with an RTS after it: every SID write of every
// frame must be the port's for that play(), in order, from the tune's start until it ends ($FE set) or
// starts again. It exits 1 on any difference.
//   node games/c64/jet-set-willy/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'jswMusic', 'createDriver');
const L = g.listing(), image = L.ram;
// The data as the page passes it: the title's voices $6C00-$7517, the in-game tune's $9C00-$9FA9.
const DATA = { title: Array.from(image.slice(0x6C00, 0x7518)), game: Array.from(image.slice(0x9C00, 0x9FAA)),
  titleNotes: Array.from(image.slice(0xA207, 0xA2C7)), gameNotes: Array.from(image.slice(0x20EC, 0x21AC)) };
let bad = 0, frames = 0, notes = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const t of [0, 1]) {
  const m = image.slice(); let out = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) out.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  // One frame of each interrupt's music, the game's own bytes: $A821-$A831 (title) or $3435-$3445
  // (in play), copied to $0340 with an RTS where the interrupt goes on.
  const [from, to] = t ? [0x3435, 0x3446] : [0xA821, 0xA832];
  for (let a = from; a < to; a++) m[0x0340 + a - from] = image[a];
  m[0x0340 + to - from] = 0x60;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  const drv = createDriver(DATA);
  if (t) { m[0x42] = 2; cpu.call(0x2005); } else { m[0x4F] = 2; cpu.call(0xA0CD); }
  drv.init(t);
  if (out.join() !== drv.writes.join()) fail('tune', t, 'init', out.join(), '|', drv.writes.join());
  for (let f = 0; f < 20000 && drv.playing(); f++) {
    out = [];
    cpu.call(0x0340);
    drv.play(); frames++;
    if (out.join() !== drv.writes.join()) fail('tune', t, 'frame', f, out.join(), '|', drv.writes.join());
    for (let k = 0; k < out.length; k += 2) if ([4, 11, 18].includes(out[k]) && out[k + 1] === 0x41) notes++;
    if (t === 0 && m[0xFE] === 0xFF && drv.playing()) fail('tune 0 ended in the game, not the port', f);
  }
  if (t === 0 && m[0xFE] !== 0xFF) fail('tune 0 never ended in the game');
  if (t === 1 && (m[0x90] | m[0x91] << 8) > 0x9C10) fail('tune 1 did not start again in the game where the port stopped');
}
console.log(`${frames} frames of two tunes, ${notes} gate-on writes, ${bad ? bad + ' differences' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
