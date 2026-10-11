// Checks the How it works page's port of Walker's Warbles' music driver (between the
// warbles-driver markers in index.html) against the driver itself ($1000-$1419) run in the kit's
// 6502 simulator on the bytes of the demo's committed listing. For each of the sixteen tune
// headers, started as the demo's init ($1000) starts it and played by its play ($104D) once a
// frame, as the raster interrupt calls it: every SID write of every frame, in order, the
// registers after it, and the driver's variables ($104C, $141A-$14B6) must be the same. Then 200
// seeded random tunes, written over the real ones, which with the sixteen run every instruction
// of the driver.
//   node tests/warbles.js [frames] [port.js]   (default 20000 frames a tune, under seven minutes
//                                              of music; port.js: a file holding createDriver,
//                                              for drafts)
const fs = require('fs');
const path = require('path');
const { CPU } = require(path.join(__dirname, '../../../../kit/c64/cpu6502'));
const L = require(path.join(__dirname, '../parts/warbles/listing.json')).records;
const N = +process.argv[2] || 20000;
const src = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8')
  : fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').split('// <warbles-driver>')[1].split('// </warbles-driver>')[0];
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
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x37 }, io });
  const drv = createDriver(m0.slice(0x1000, 0x6B00));
  let diffs = 0, ended = -1;
  const report = (f, s) => { if (diffs++ < 3) console.log(label + ' frame ' + f + ': ' + s); };
  cpu.call(0x1000, { a: tune }, { executed });
  drv.initTune(tune);
  for (let f = 0; f < frames; f++) {
    cpu.call(0x104D, {}, { executed });
    drv.play();
    if (w.join() !== drv.writes.join()) report(f, 'writes ' + w.join(',') + ' / port ' + drv.writes.join(','));
    for (let r = 0; r < 25; r++) if (regs[r] !== drv.sid[r]) report(f, hex(0xD400 + r, 4) + ' ' + regs[r] + ' / port ' + drv.sid[r]);
    if (m[0x104C] !== drv.m[0x104C]) report(f, '$104C ' + m[0x104C] + ' / port ' + drv.m[0x104C]);
    for (let a = 0x141A; a <= 0x14B6; a++) if (m[a] !== drv.m[a]) report(f, hex(a, 4) + ' ' + m[a] + ' / port ' + drv.m[a]);
    w = [];
    if (ended >= 0) break;                          // one frame more once it has stopped: no writes
    if (!drv.playing()) ended = f;
  }
  return { diffs, ended };
}

let bad = 0;
const PLAYED = { 10: 'key 1', 3: 'key 2', 0: 'key 3', 1: 'key 4' };
for (let tune = 0; tune < 16; tune++) {
  const { diffs, ended } = compare(image, tune, N, 'tune ' + tune);
  console.log(`tune ${tune}${PLAYED[tune] ? ' (' + PLAYED[tune] + ')' : ''}: ` +
    `${ended < 0 ? N + ' frames' : 'stops after ' + (ended + 1) + ' frames'}, ` +
    (diffs ? diffs + ' differences' : 'every write, register and variable matches'));
  bad += diffs;
}

// Random tunes over the real ones: three tracks of repeats, restarts and stops, and patterns of
// notes with rests, ties, instrument changes and slides, and thirty-two random instruments,
// which the demo's own do not cover: none of them arpeggiates relative to the note. Each track's
// last entry before its restart or stop is a pattern, as in every tune: a track that restarts
// with nothing read would take pattern $FF, whose address the driver reads from past its table.
const ROUTINE = [0x1000, 0x1419];
const missing = () => { const a = []; for (let p = ROUTINE[0]; p <= ROUTINE[1]; p++) if (codeAt[p] && !executed[p]) a.push(p); return a; };
const codeAt = new Uint8Array(65536);
for (const r of L) if (r.m && r.a >= ROUTINE[0] && r.a <= ROUTINE[1]) codeAt[r.a] = 1;
let seed = 20261007;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) % n; };
let tries = 0;
for (; tries < 200; tries++) {
  const m = image.slice();
  const PATS = 0x4000, NP = 12;                       // twelve patterns over the real ones
  for (let p = 0; p < NP; p++) {
    let at = PATS + p * 128;
    m[0x2FC0 + p] = at & 0xFF; m[0x3040 + p] = at >> 8;
    for (let n = 1 + rnd(6); n > 0; n--) {
      const head = rnd(64) | (rnd(4) === 0 ? 0x40 : 0) | (rnd(3) === 0 ? 0x80 : 0);
      m[at++] = head;
      if (head & 0x80) m[at++] = rnd(2) ? rnd(32) : 0x80 | rnd(128);
      m[at++] = (12 + rnd(70)) | (rnd(4) === 0 ? 0x80 : 0);
    }
    m[at++] = 0xFF;
  }
  for (let x = 0; x < 3; x++) {                       // the tracks, in tune 0's three slots
    let at = 0x3400 + x * 0x40;
    m[0x30C0 + x] = at & 0xFF; m[0x30C3 + x] = at >> 8;
    for (let e = 1 + rnd(8); e > 0; e--) { m[at++] = rnd(4); m[at++] = rnd(NP); }
    m[at++] = rnd(3) ? 0xFF : 0x80 + rnd(0x7F);       // restart, or stop the music
  }
  m[0x30C6] = rnd(3); m[0x30C7] = rnd(9);             // the tempo counts
  for (let n = 0; n < 32; n++) {                      // and instruments, over all 32 of them: the
    const a = 0x3200 + n * 8, b = 0x3300 + n * 8;     // demo's own leave three instructions unrun,
    m[a] = rnd(256); m[a + 1] = rnd(256);             // having no arpeggio relative to the note
    m[a + 2] = (1 << (rnd(4) + 4)) | (rnd(2) ? 1 : 0);
    m[a + 3] = rnd(64); m[a + 5] = rnd(16);
    m[a + 6] = rnd(4) ? 0 : 1 + rnd(32); m[a + 7] = rnd(256);
    m[b] = rnd(4) ? 0 : rnd(16); m[b + 1] = rnd(96) | (rnd(2) ? 0x80 : 0);
    m[b + 2] = 1 << (rnd(4) + 4); m[b + 3] = 1 << (rnd(4) + 4);
    m[b + 4] = rnd(8) << 4 | rnd(16); m[b + 5] = rnd(96) | (rnd(2) ? 0x80 : 0);
  }
  const { diffs } = compare(m, 0, 3000, 'random tune ' + tries);
  bad += diffs;
}
const left = missing();
console.log(`random tunes: ${tries}, ${bad ? 'differences found' : 'every write, register and variable matches'}; ` +
  (left.length ? 'instructions never run: ' + left.map((a) => hex(a, 4)).join(' ') : 'every instruction of the driver has run'));
process.exit(bad || left.length ? 1 : 0);
