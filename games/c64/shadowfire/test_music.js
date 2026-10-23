#!/usr/bin/env node
// Hold the page's two sound players against the game's own music driver. index.html's sf-music
// block (createDriver) runs Fred Gray's driver ($1600-$1FC5) on the kit's 6502, handed in as
// sid.js hands it, for every button of the music player (SF_TUNES) and of the effects player
// (SF_EFFECTS). The same calls on the kit's simulator over the listing's bytes, with the SID's data
// bus answering reads as VICE's does (C64Sid.engine().createBus), must write the same values to
// the same registers in the same order, frame by frame: play_music ($1606) once a frame, after the
// four request bytes ($1600-$1603) are set as the page sets them, and for a tune of the title's
// ring after the title music has run on to the frame that tune begins, where the page's player
// must hold the same registers. 6,000 frames a button. It exits 1 on any difference.
//   node games/c64/shadowfire/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, SF_TUNES, SF_EFFECTS } = g.run(page, 'sf-music', 'createDriver', 'SF_TUNES', 'SF_EFFECTS');
g.lib('sid');
const L = g.listing();
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const FRAMES = 6000;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [list, set] of [[SF_TUNES, 'music'], [SF_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), regs = new Uint8Array(25), frame = { w: [] };
  const bus = C64Sid.engine().createBus('8580');
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); regs[a - 0xD400] = v; bus.write(v, cpu.cycles); } else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  m[0x1600] = c.tune; m[0x1601] = c.once || 0; m[0x1602] = c.beat || 0; m[0x1603] = c.pulse || 0;
  if (c.from) for (let n = 0; n < 20000 && m[0x1600] !== c.from; n++) cpu.call(0x1606, Z);
  const drv = createDriver({ mem: [[0x1600, L.ram.slice(0x1600, 0x1FC6)]], tunes: list }, kit);
  drv.init(t);
  if ([...drv.sid].join() !== [...regs].join()) fail(set, c.name, 'registers at the start', [...regs].join(), '|', [...drv.sid].join());
  for (let f = 0; f < FRAMES; f++) {
    frame.w = [];
    cpu.call(0x1606, Z); drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    frames++;
  }
  if (!drv.playing()) fail(set, c.name, 'stopped');
});
console.log(`${SF_TUNES.length + SF_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the driver'));
process.exit(bad ? 1 : 0);
