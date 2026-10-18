#!/usr/bin/env node
// Hold the page's port of Rob Hubbard's driver against the game's own. index.html's commando-music
// block (createDriver) runs beside the driver ($5000-$5F69) on the kit's 6502 simulator, over the
// bytes of the committed listing. Every frame, the SID writes each makes must be the same, in the
// same order: 25,000 frames of tune 0, 8,000 of tune 1 and 1,200 of tune 2, each started as the
// game starts them ($5006, then $5000); each of the sixteen sound effects alone ($5003, $5006,
// $500F), through init() and through the effects' own player (data.sfx); and every effect asked
// for over tune 0 in turn, 500 frames apart, as the game asks for them in play ($500F). The page's
// CM_MUSIC must be $5428-$5F0B of the listing. Everything it needs is committed: no disk image, no
// snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/commando/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'commando-music', 'createDriver');
const dm = g.read(page).match(/CM_MUSIC\s*=\s*\{\s*base:\s*0x([0-9A-Fa-f]+),\s*hex:\s*'([0-9a-f]*)'\s*\}/);
if (!dm) { console.error('no CM_MUSIC data in the page'); process.exit(1); }
const DATA = { base: parseInt(dm[1], 16), hex: dm[2] };
const image = g.listing().ram;
let bad = 0, notes = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const hex = Array.from(image.slice(0x5428, 0x5F0C), (v) => v.toString(16).padStart(2, '0')).join('');
if (DATA.base !== 0x5428 || DATA.hex !== hex) fail('CM_MUSIC is not $5428-$5F0B of the listing');

function machine() {
  const m = image.slice();
  let game = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  return { cpu, take() { const w = game; game = []; return w; } };
}
const count = (w) => { for (let i = 0; i < w.length; i += 2) if ((w[i] === 4 || w[i] === 11 || w[i] === 18) && w[i + 1] & 1) notes++; };
// Runs `frames` frames of the game's $5012 and the port's play(), after start(); ask(f) may ask
// for an effect before frame f, on both.
function run(label, data, start, frames, ask) {
  const M = machine(), drv = createDriver(data);
  start(M, drv);
  let a = M.take(), b = drv.writes.slice();
  if (a.join() !== b.join()) fail(label, 'start', a.join(), '|', b.join());
  for (let f = 0; f < frames; f++) {
    if (ask) {
      const n = ask(f);
      if (n >= 0) {
        M.cpu.call(0x500F, { a: n }); drv.effect(n);
        a = M.take(); b = drv.writes.slice();
        if (a.join() !== b.join()) fail(label, 'effect', n, 'asked before frame', f, a.join(), '|', b.join());
      }
    }
    M.cpu.call(0x5012, {}); drv.play();
    a = M.take(); b = drv.writes;
    if (a.join() !== b.join()) fail(label, 'frame', f, a.join(), '|', b.join());
    count(a);
  }
}
const tune = (t) => (M, drv) => { M.cpu.call(0x5006, {}); M.cpu.call(0x5000, { a: t }); drv.init(t); };
const alone = (n, t) => (M, drv) => { M.cpu.call(0x5003, {}); M.cpu.call(0x5006, {}); M.cpu.call(0x500F, { a: n }); drv.init(t); };
run('tune 0', DATA, tune(0), 25000);
run('tune 1', DATA, tune(1), 8000);
run('tune 2', DATA, tune(2), 1200);
for (let n = 0; n < 16; n++) {
  run('effect ' + n, DATA, alone(n, 3 + n), 600);
  run('effect ' + n + ' (sfx)', Object.assign({ sfx: true }, DATA), alone(n, n), 600);
}
run('effects over tune 0', DATA, tune(0), 9000, (f) => f % 500 === 200 ? (f - 200) / 500 & 15 : -1);
console.log(`${notes} notes started, ${bad ? bad + ' differences' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
