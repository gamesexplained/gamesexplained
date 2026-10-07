// Checks the How it works page's port of the music driver (between the music-driver markers in
// index.html) against the driver itself ($C000-$C4B1) run in the kit's 6502 simulator on the bytes
// of the engine's committed listing. For each of the four tunes, started as music_init ($C000)
// starts it and played by music_play ($C059) once a frame, as the game's interrupts call it: every
// SID write of every frame, in order, the registers after it, and the driver's variables
// ($C057-$C058, $C4B2-$C554) must be the same. Then 200 seeded random tunes, written over the
// real ones, which with the four run every instruction of the driver.
//   node tests/music.js [frames] [port.js]   (default 30000 frames a tune, ten minutes of music;
//                                            port.js: a file holding createDriver, for drafts)
const fs = require('fs');
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/c64/cpu6502'));
const L = require(path.join(__dirname, '../parts/engine/listing.json')).records;
const N = +process.argv[2] || 30000;
const src = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8')
  : fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').split('// <music-driver>')[1].split('// </music-driver>')[0];
const createDriver = new Function(src + '\nreturn createDriver;')();
const image = new Uint8Array(65536);
for (const r of L) if (r.b) image.set(r.b, r.a);
const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 2, '0');
const executed = new Uint8Array(65536);

// Runs one tune on both; returns the number of differences and the frame the music stopped (-1).
function compare(m0, tune, frames, label) {
  const m = m0.slice();
  const regs = new Uint8Array(25);
  let w = [];
  const io = {
    read(a) { throw new Error('read ' + hex(a, 4)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) { regs[a - 0xD400] = v; w.push(a - 0xD400, v); } else throw new Error('write ' + hex(a, 4)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver(m0.slice(0xC000, 0xD000));
  let diffs = 0, ended = -1;
  const report = (f, s) => { if (diffs++ < 3) console.log(label + ' frame ' + f + ': ' + s); };
  cpu.call(0xC000, { a: tune }, { executed });
  drv.init(tune);
  for (let f = 0; f < frames; f++) {
    cpu.call(0xC059, {}, { executed });
    drv.play();
    if (w.join() !== drv.writes.join()) report(f, 'writes ' + w.join(',') + ' / port ' + drv.writes.join(','));
    for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) report(f, hex(0xD400 + r, 4) + ' ' + regs[r] + ' / port ' + drv.sid[r]);
    for (const a of [0xC057, 0xC058]) if (m[a] !== drv.m[a]) report(f, hex(a, 4) + ' ' + m[a] + ' / port ' + drv.m[a]);
    for (let a = 0xC4B2; a <= 0xC554; a++) if (m[a] !== drv.m[a]) report(f, hex(a, 4) + ' ' + m[a] + ' / port ' + drv.m[a]);
    w = [];
    if (ended >= 0) break;                          // one frame more once it has stopped: no writes
    if (!drv.playing()) ended = f;
  }
  return { diffs, ended };
}

let bad = 0;
const NAMES = ['title', 'demo', 'high scores', 'loading screen'];
for (let tune = 0; tune < 4; tune++) {
  const { diffs, ended } = compare(image, tune, N, 'tune ' + tune);
  console.log(`tune ${tune} (${NAMES[tune]}): ${ended < 0 ? N + ' frames' : 'stops after ' + (ended + 1) + ' frames'}, ` +
    (diffs ? diffs + ' differences' : 'every write, register and variable matches'));
  bad += diffs;
}

// Random tunes over the real ones: three tracks of loops, repeats, fades, restarts and stops, and
// patterns of notes with rests, ties, instrument changes and slides, using every instrument. Each
// track's last entry before its restart or stop is a pattern, as in every tune: a track of commands
// alone would restart onto pattern $FF, whose address the driver reads from past its table.
const ROUTINE = [0xC000, 0xC4B1];
const missing = () => { const a = []; for (let p = ROUTINE[0]; p <= ROUTINE[1]; p++) if (codeAt[p] && !executed[p]) a.push(p); return a; };
const codeAt = new Uint8Array(65536);
for (const r of L) if (r.m && r.a >= ROUTINE[0] && r.a <= ROUTINE[1]) codeAt[r.a] = 1;
let seed = 20261007;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) % n; };
let tries = 0;
for (; tries < 200; tries++) {
  const m = image.slice();
  const PATS = 0xC81F, NP = 12;                       // twelve patterns over the real ones
  let at = PATS;
  for (let p = 0; p < NP; p++) {
    m[0xC785 + p] = at & 0xFF; m[0xC7D2 + p] = at >> 8;
    for (let n = 1 + rnd(6); n > 0; n--) {
      const head = rnd(64) | (rnd(4) === 0 ? 0x40 : 0) | (rnd(3) === 0 ? 0x80 : 0);
      m[at++] = head;
      if (head & 0x80) m[at++] = rnd(2) ? rnd(21) : 0x80 | rnd(128);
      m[at++] = (12 + rnd(70)) | (rnd(4) === 0 ? 0x80 : 0);
    }
    m[at++] = 0xFF;
  }
  for (let x = 0; x < 3; x++) {                       // the tracks, after the patterns
    m[0xC765 + x] = at & 0xFF; m[0xC768 + x] = at >> 8;
    for (let e = 1 + rnd(6); e > 0; e--) {
      const k = e > 1 ? rnd(10) : 2;               // a track ends on a pattern: none ends on commands alone
      if (k === 0) { m[at++] = 0xFD; m[at++] = rnd(4); }
      else if (k === 1) { m[at++] = 0x40 | (1 + rnd(3)); m[at++] = 1 + rnd(3); m[at++] = rnd(NP); m[at++] = 1 + rnd(2); m[at++] = rnd(NP); m[at++] = 0x41; }
      else { m[at++] = 1 + rnd(3); m[at++] = rnd(NP); }
    }
    m[at++] = rnd(3) ? 0xFF : 0x80 + rnd(0x7F);
  }
  m[0xC76B] = rnd(3); m[0xC76C] = rnd(9);             // the tempo counts
  const { diffs } = compare(m, 0, 3000, 'random tune ' + tries);
  bad += diffs;
}
const left = missing();
console.log(`random tunes: ${tries}, ${bad ? 'differences found' : 'every write, register and variable matches'}; ` +
  (left.length ? 'instructions never run: ' + left.map((a) => hex(a, 4)).join(' ') : 'every instruction of the driver has run'));
process.exit(bad || left.length ? 1 : 0);
