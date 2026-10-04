// Checks reference/dw-music.js, the port of the game's music player, against the player itself
// ($753B-$7647) run in the kit's 6502 simulator on the bytes of the committed listing: for each
// tune, every frame, the SID registers the port leaves must equal what the game last wrote to
// $D400-$D418. The game calls music_update ($74EA) every frame and plays on even frames; the
// test calls the even-frame half ($753B) every other frame, so the tune is not changed by where
// the Doctor stands.
//   node tests/music.js [frames]      (default 30000 frames a tune, ten minutes of music)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/c64/cpu6502'));
const DWMUSIC = require(path.join(__dirname, '../reference/dw-music.js'));
const L = require(path.join(__dirname, '../listing.json')).records;
const N = +process.argv[2] || 30000;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
let bad = 0;
for (const tune of [0, 1, 2, 3, 4]) {
  const m = image.slice();
  const regs = new Uint8Array(25);
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) regs[a - 0xD400] = v; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = DWMUSIC.createDriver(image.slice(0x1F00, 0x7800));
  m[0xE2] = tune; m[0xE1] = 0; drv.init(tune);
  let diffs = 0, first = -1, loopAt = -1;
  for (let f = 0; f < N; f++) {
    if (!(f & 1)) cpu.call(0x753B, {});
    drv.play();
    if (loopAt < 0 && !drv.playing()) loopAt = f;
    for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) {
      diffs++;
      if (first < 0) { first = f; console.log(`tune ${tune} frame ${f}: $D4${r.toString(16).padStart(2, '0')} game ${regs[r]} port ${drv.sid[r]}`); }
    }
  }
  console.log(`tune ${tune}: ${N} frames, first pass ${loopAt} frames, ${diffs ? diffs + ' registers differ' : 'every register matches'}`);
  bad += diffs;
}
process.exit(bad ? 1 : 0);
