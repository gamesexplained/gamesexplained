#!/usr/bin/env node
// Hold the page's two sound players against the game's own music driver. index.html's sf-music
// block (createDriver) runs Fred Gray's driver ($1600-$1FC5) on the kit's 6502, handed in as
// sid.js hands it, for every button of the music player (SF_TUNES) and of the effects player
// (SF_EFFECTS). The same calls on the kit's simulator over the listing's bytes, with the SID's data
// bus answering reads as VICE's does (C64Sid.engine().createBus), must write the same values to
// the same registers in the same order, frame by frame: play_music ($1606) once a frame, after the
// four request bytes ($1600-$1603) are set as the page sets them: 6,000 frames a button, and for
// the title music two rounds of its ring. The ring the page lights under the player (sfRing) must
// be the one the driver on the simulator plays: the same tunes asked for ($1600) in the same
// frames. It exits 1 on any difference.
//   node games/c64/shadowfire/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, sfRing, SF_TUNES, SF_EFFECTS } = g.run(page, 'sf-music', 'createDriver', 'sfRing', 'SF_TUNES', 'SF_EFFECTS');
g.lib('sid');
const L = g.listing();
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const FRAMES = 6000, TITLE = 7, RING_FRAMES = 9000;
let bad = 0, frames = 0, rings = '';
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
  const drv = createDriver({ mem: [[0x1600, L.ram.slice(0x1600, 0x1FC6)]], tunes: list }, kit);
  drv.init(t);
  if ([...drv.sid].join() !== [...regs].join()) fail(set, c.name, 'registers at the start', [...regs].join(), '|', [...drv.sid].join());
  const asked = [];
  for (let f = 0, n = c.tune === TITLE ? RING_FRAMES : FRAMES; f < n; f++) {
    frame.w = [];
    const before = m[0x1600] & 0x7F;
    cpu.call(0x1606, Z); drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if ((m[0x1600] & 0x7F) !== before) asked.push([m[0x1600] & 0x7F, f]);
    frames++;
  }
  if (c.tune === TITLE) {
    const ring = sfRing({ mem: [[0x1600, L.ram.slice(0x1600, 0x1FC6)]], tunes: list }, kit);
    const want = [];
    for (let k = 0; ring && k < 2; k++) for (const r of ring.tunes) want.push([r.tune, r.frame + k * ring.round]);
    want.push([ring ? ring.tunes[0].tune : -1, ring ? ring.start + 2 * ring.round : -1]);
    const got = asked.slice(0, want.length);
    if (!ring || got.join(' ') !== want.join(' ')) fail(set, c.name, 'the ring', got.join(' '), '|', want.join(' '));
    else rings = `; the ring: ${ring.tunes.map((r) => r.tune).join(' ')}, ${ring.round} frames round`;
  }
  if (!drv.playing()) fail(set, c.name, 'stopped');
});
console.log(`${SF_TUNES.length + SF_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the driver' + rings));
process.exit(bad ? 1 : 0);
