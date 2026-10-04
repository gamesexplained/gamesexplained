// Checks reference/fist-music.js, the port of Fist II's music driver, against the driver itself
// ($F400-$FAB4) run in the kit's 6502 simulator on the bytes of the committed listing: for each
// tune, every frame, the SID registers the port leaves must equal what the driver last wrote to
// $D400-$D418. Both are fed the same voice-3 readback ($D41C, $D41B), a varying sequence, since
// tune 1's filter sweep reads the envelope.
//   node tests/music.js [frames]      (default 30000 frames a tune, ten minutes of music)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/c64/cpu6502'));
const FISTMUSIC = require(path.join(__dirname, '../reference/fist-music.js'));
const L = require(path.join(__dirname, '../listing.json')).records;
const N = +process.argv[2] || 30000;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
let bad = 0;
for (const tune of [1, 2, 3]) {
  const m = image.slice();
  const regs = new Uint8Array(25);
  let env3 = 0, osc3 = 0;
  const io = {
    read(a) { if (a === 0xD41C) return env3; if (a === 0xD41B) return osc3; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) regs[a - 0xD400] = v; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = FISTMUSIC.createDriver(image.slice(0xF400));
  m[0xFF] = tune; drv.init(tune - 1);
  let first = -1, diffs = 0;
  for (let f = 0; f < N; f++) {
    env3 = (f * 37 + (f >> 3)) & 0xFF; osc3 = (f * 101) & 0xFF;
    drv.readback(env3, osc3);
    cpu.call(0xF400, {});
    drv.play();
    for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) {
      diffs++;
      if (first < 0) { first = f; console.log(`tune ${tune} frame ${f}: $D4${(r).toString(16).padStart(2, '0')} game ${regs[r]} port ${drv.sid[r]}`); }
    }
  }
  console.log(`tune ${tune}: ${N} frames, ${diffs ? diffs + ' registers differ' : 'every register matches'}`);
  bad += diffs;
}
process.exit(bad ? 1 : 0);
