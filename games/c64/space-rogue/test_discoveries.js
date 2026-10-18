'use strict';
// Holds the Discoveries page's ports against the game's own code, run in the kit's 6502 simulator on
// the committed listings: the raster line bitmap_mode leaves, the HIVE! mound wait, the star field
// after a typed answer, and the distress call's Morse.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const PAGE = 'discoveries.html';
const { rasterAfter } = g.run(PAGE, 'sr-raster', 'rasterAfter');
const { moundWait } = g.run(PAGE, 'sr-mound', 'moundWait');
const { unpackPicture } = g.run(PAGE, 'sr-unpack', 'unpackPicture');
globalThis.unpackPicture = unpackPicture;                  // deniedPicture calls it
const { deniedPicture } = g.run(PAGE, 'sr-denied', 'deniedPicture');
const { morseTimeline } = g.run(PAGE, 'sr-morse', 'morseTimeline');
const I = g.listing('parts/intro/listing.json'), H = g.listing('parts/hive/listing.json');
const T = g.listing('parts/title/listing.json');
const port = { dir: 0x2F, data: 0x34 };
const none = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

// bitmap_mode, the intro's, with the beam on every line of a PAL frame: the line the interrupt waits
// for is bit 8 from what it writes to $D011 and $50 from $D012, which it leaves alone
for (let line = 0; line < 312; line++) {
  const m = new Uint8Array(I.ram); let d011 = null;
  const io = {
    read(a) { if (a === 0xD011) return ((line & 0x100) >> 1) | 0x1B; if (a === 0xD016) return 0xC8; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a === 0xD011) d011 = v; else if (![0xD016, 0xD018, 0xD021].includes(a)) throw new Error('write $' + a.toString(16)); },
  };
  new CPU(m, { port, io, strict: true }).call(0x6FD7, {});
  const got = ((d011 & 0x80) << 1) | 0x50;
  if (got !== rasterAfter(line)) fail('raster: beam on line', line, 'game', got, 'page', rasterAfter(line));
}

// hive_raise_mound from $59D8, for every drop from 0 to 255 and every number random_upto ($A298)
// can give for $5A: its carry is set only when the number equals the limit (its last CMP)
for (let L = 0; L < 256; L++)
  for (let r = 0; r <= 90; r++) {
    const m = new Uint8Array(H.ram); m[0xCE] = L;
    const hooks = { 0xA298: c => { if (c.a !== 0x5A) throw new Error('random_upto asked for ' + c.a); c.a = c.y = r; c.c = r === 90 ? 1 : 0; c.rts(); } };
    new CPU(m, { port, io: none, strict: true }).call(0x59D8, { c: 1 }, { sentinel: 0x59F3, hooks });
    if (m[0xCD] !== moundWait(L, r)) fail('mound: drop', L, 'number', r, 'game', m[0xCD], 'page', moundWait(L, r));
  }

// The star field: the intro's unpack_picture ($712D) puts SPACE up in the $4000 buffer, as before the
// question, then unpacks it again with the answer at $BF00, as access_denied does; the page's
// picture must be what the buffer holds then (the bitmap and the screen matrix) and its border
// what the routine writes to $D020
const SPACE = T.ram.slice(0xB700, 0xC000);
const ANSWERS = ['zz', 'x', 'scout', 'SCOUT', 'hello there', 'qwertyuiopasdfgh', 'Q', '1234567890123456', 'no', 'sunracer',
  'manchi', 'a b c', '!@#$%^&*()', '~~~~~~~~~~~~~~~~', '   '];
for (const ans of ANSWERS) {
  const d = deniedPicture(SPACE, ans);
  const m = new Uint8Array(I.ram); m.fill(0, 0x4000, 0x6800); m.set(SPACE, 0xB700);
  let border = null;
  const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a, v) { if (a === 0xD020) border = v; else throw new Error('write $' + a.toString(16)); } };
  m[0x1E] = 0x40; new CPU(m, { port, io, strict: true }).call(0x712D, { a: 0xB7 });
  const first = border;
  for (let i = 0; i < ans.length; i++) m[0xBF00 + i] = ans.charCodeAt(i);
  m[0xBF00 + ans.length] = 0;
  m[0x1E] = 0x40; new CPU(m, { port, io, strict: true }).call(0x712D, { a: 0xB7 });
  for (let i = 0; i < 0x23E8; i++) {
    if (m[0x4000 + i] !== d.out[i]) { fail('answer', JSON.stringify(ans), 'buffer differs at +$' + i.toString(16)); break; }
  }
  if (first !== d.beforeBorder) fail('answer', JSON.stringify(ans), 'border before', first, 'page', d.beforeBorder);
  if (border !== d.border) fail('answer', JSON.stringify(ans), 'border', border, 'page', d.border);
}

// distress_call ($7359), every element it plays: play_effect ($7345) is asked for effect 4 with
// the length in frames at $731D and the frequency at $72FF/$72FA, 0 for silence; no key is pressed
{
  const m = new Uint8Array(I.ram); m[0x3C] = 0xFF;
  const played = [];
  const hooks = { 0x7345: c => { if (c.a !== 4) throw new Error('effect ' + c.a); played.push({ on: (m[0x72FF] | m[0x72FA]) !== 0, frames: m[0x731D] }); c.rts(); } };
  new CPU(m, { port, io: none, strict: true }).call(0x7359, {}, { hooks });
  const M = morseTimeline(I.ram.slice(0x7397, 0x73EE));
  if (played.length !== M.runs.length) fail('morse: the game plays', played.length, 'elements, the page', M.runs.length);
  for (let i = 0; i < Math.min(played.length, M.runs.length); i++)
    if (played[i].on !== M.runs[i].on || played[i].frames !== M.runs[i].frames) { fail('morse: element', i, 'game', played[i], 'page', M.runs[i]); break; }
  const text = M.letters.map(l => l.ch).join('');
  if (text !== 'SOSSOSPLAYULTIMASOSSOS') fail('morse: the page reads', text);
}

if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_discoveries: bitmap_mode on 312 lines, 23,296 mound waits, ' + ANSWERS.length + ' answers and the distress call agree');
