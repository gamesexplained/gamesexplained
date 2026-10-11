// Checks reference/goonies-music.js, the port of The Goonies' music driver, against the driver
// itself ($BA00-$C028) run in the kit's 6502 simulator on the bytes of the committed listing. Each
// tune is started the game's way, through start_sound ($92C7) with the tune's sound number, and
// every frame runs what the interrupt runs (the effects at $BA09, then the tune at $BA21): the SID
// registers the port leaves must equal what the game last wrote to $D400-$D418.
//   node tests/music.js [frames]      (default 30000 frames a tune, ten minutes of music)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/c64/cpu6502'));
const GOONMUSIC = require(path.join(__dirname, '../reference/goonies-music.js'));
const L = require(path.join(__dirname, '../listing.json')).records;
const N = +process.argv[2] || 30000;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
let bad = 0;
const SOUND = [16, 17, 18, 24];                 // the sounds that are tunes 0-3 ($93CF)
for (let t = 0; t < 4; t++) {
  const m = image.slice();
  const regs = new Uint8Array(25);
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) regs[a - 0xD400] = v; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = GOONMUSIC.createDriver(image.slice(0xBA00, 0xD000));
  m[0xBA26] = 1;                                // the last tune has ended, so start_sound starts this one
  cpu.call(0x92C7, { a: SOUND[t] });
  drv.init(t);
  let diffs = 0, end = -1;
  const cmp = (f) => { for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) {
    if (!diffs) console.log(`tune ${t} frame ${f}: $D4${r.toString(16).padStart(2, '0')} game ${regs[r]} port ${drv.sid[r]}`);
    diffs++; } };
  cmp(-1);
  for (let f = 0; f < N; f++) {
    cpu.call(0xBA09, {}); cpu.call(0xBA21, {});
    drv.play();
    cmp(f);
    if (end < 0 && !drv.playing()) end = f;
  }
  console.log(`tune ${t}: ${N} frames, ends at frame ${end}, ${diffs ? diffs + ' registers differ' : 'every register matches'}`);
  bad += diffs;
}
process.exit(bad ? 1 : 0);
