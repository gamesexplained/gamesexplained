// Checks reference/fire-trap-music.js, the page's driver, against the game itself: the game's own
// music_entry ($8000), the tune or effect request in $B4 or $B5, and the raster handler's play_music
// ($2AA6) run in the kit's 6502 simulator on the bytes of the committed listing. Every frame the SID
// registers the page's driver leaves must equal what the game last wrote to $D400-$D418.
//   node tests/music.js [frames]      (default 3000 frames a sound)
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/cpu/cpu6502'));
const FTMUSIC = require(path.join(__dirname, '../reference/fire-trap-music.js'));
const L = require(path.join(__dirname, '../listing.json')).records;
const N = +process.argv[2] || 3000;
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
let bad = 0;
FTMUSIC.sounds.forEach((s, t) => {
  const m = new Uint8Array(65536);
  m.set(image);
  const regs = new Uint8Array(25);
  const io = { read: (a) => m[a], write(a, v) { if (a >= 0xD400 && a <= 0xD418) regs[a - 0xD400] = v; else m[a] = v; } };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = FTMUSIC.createDriver({ bytes: image.slice(0x8000, 0x8E00), sounds: FTMUSIC.sounds }, { CPU });
  // the game starts at the hand-over's memory; the driver's own state starts clean, as music_entry makes it
  m.fill(0, 0, 0x100);
  cpu.call(0x8000, {});
  m[0xC0] = 0;
  if (s[1] === 'tune') m[0xB4] = s[2];
  else { m[0xB4] = 4; for (let i = 0; i < 3; i++) cpu.call(0x2AA6, {}); m[0xB5] = s[2]; }
  drv.init(t);
  let diffs = 0, end = -1;
  const cmp = (f) => { for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) {
    if (!diffs) console.log(`sound ${t} frame ${f}: $D4${r.toString(16).padStart(2, '0')} game ${regs[r]} page ${drv.sid[r]}`);
    diffs++; } };
  for (let f = 0; f < N; f++) {
    cpu.call(0x2AA6, {});
    const was = drv.playing();
    drv.play();
    if (was) cmp(f);
    if (end < 0 && !drv.playing()) end = f;
    if (!drv.playing() && end >= 0 && f > end + 5) break;
  }
  console.log(`sound ${t} (${s[0]}): ends at frame ${end}, ${diffs ? diffs + ' registers differ' : 'every register matches'}`);
  bad += diffs;
});
process.exit(bad ? 1 : 0);
