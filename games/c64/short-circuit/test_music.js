#!/usr/bin/env node
// Holds the music page's driver against the game. The page's createDriver runs the game's own sound driver
// on the kit's 6502 over bytes of the listing; this test checks
//   1. the page's bytes are the listing's: $3C73-$3CB2 and $9B4F-$BFFF;
//   2. the first 300 frames of the attract tune, run as the page runs them, play the notes that the
//      emulator's recording of the game's SID (test_music_attract.json) plays, voice by voice: the same
//      frequencies at each note's start, each start within one frame of the recording's (the recording's first frame
//      is the one before the call to start_tune, so the page's list gets a first frame of zeros);
//   3. every one of the six buttons starts, plays 2,000 frames and writes only to registers 0 to 24.
//   node games/c64/short-circuit/test_music.js [page.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'music.html');
const { createDriver, SC_MUSIC } = g.run(page, 'createDriver', 'createDriver', 'SC_MUSIC');
const ram = g.listing().ram;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const hexOf = (a, b) => Buffer.from(ram.slice(a, b + 1)).toString('hex');
if (SC_MUSIC.s1 !== hexOf(0x3C73, 0x3CB2)) fail('s1 is not $3C73-$3CB2 of the listing');
if (SC_MUSIC.s2 !== hexOf(0x9B4F, 0xBFFF)) fail('s2 is not $9B4F-$BFFF of the listing');

function frames(n, tune) {
  const d = createDriver(SC_MUSIC, kit); d.init(tune);
  const out = [];
  for (let f = 0; f < n; f++) {
    d.play();
    const s = d.sid, r = [];
    for (let v = 0; v < 3; v++) { const o = v * 7; r.push(s[o] | s[o + 1] << 8, s[o + 4]); }
    out.push({ r, w: d.writes.slice() });
  }
  return { out, d };
}
// the recording
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_music_attract.json'))).frames;
const mine = [{ r: new Array(6).fill(0) }].concat(frames(299, 0).out);   // the recording's first frame is before the start
// a note's start is a jump of more than 400 in the frequency from the last frequency that was not 0
// (the driver writes a frequency of 0 between some notes, and the frame that shows it depends on where in
// the frame its tick fell)
function onsets(rows, v) {
  const o = []; let prev = 0;
  rows.forEach((r, f) => { const x = r[v]; if (x && Math.abs(x - prev) > 400) o.push([f, x]); if (x) prev = x; });
  return o;
}
let compared = 0;
for (let v = 0; v < 3; v++) {
  const a = onsets(mine.map(m => m.r.filter((_, i) => i % 2 === 0)), v);
  const b = onsets(rec.map(r => [r[0], r[5], r[10]]), v);
  const n = Math.min(a.length, b.length, 30);
  if (n < 10) fail('voice', v + 1, 'too few notes compared:', n);
  for (let i = 0; i < n; i++) {
    compared++;
    if (a[i][1] !== b[i][1]) fail('voice', v + 1, 'note', i, 'frequency', a[i][1], 'against', b[i][1]);
    const d = b[i][0] - a[i][0];
    if (Math.abs(d) > 1) fail('voice', v + 1, 'note', i, 'starts at frame', a[i][0], 'against', b[i][0]);
  }
}
// every button
for (let t = 0; t < SC_MUSIC.tune.length; t++) {
  const { out, d } = frames(2000, t);
  let stray = 0, total = 0;
  for (const f of out) { total += f.w.length / 2; for (let i = 0; i < f.w.length; i += 2) if (f.w[i] > 24) stray++; }
  if (total === 0) fail('button', t, 'wrote nothing');
  if (stray) fail('button', t, stray, 'writes outside registers 0-24');
}
console.log(bad ? bad + ' difference(s)' : `music test passed: ${compared} note starts compared with the emulator's recording, six buttons run for 2,000 frames`);
process.exit(bad ? 1 : 0);
