#!/usr/bin/env node
// Hold the page's tune player against the intro's own. index.html's sb-music block (createDriver)
// runs the intro's music player on the kit's 6502, handed in as sid.js hands it, over the bytes
// SB_MUSIC_RANGES names alone, for every button (SB_TUNES). Here the same player runs on the kit's
// simulator over the intro's whole listing, called as the intro calls it: music_init ($0200) with
// the tune's number in A, then music_play ($025D) once a frame, as the frame top runs the music
// object ($1BDC). For the button that fades, fade_speed ($0627) is set to 8 before the frame the
// page names, as the music object's message 2 does when fire is pressed (music_fade, $14B8). Both
// must write the same values to the same registers in the same order every frame, for 6,000
// frames or until music_on ($0628) clears, and stop on the same frame. It exits 1 on any
// difference.
//   node games/c64/speedball-2/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, SB_TUNES, SB_MUSIC_RANGES } = g.run(page, 'sb-music', 'createDriver', 'SB_TUNES', 'SB_MUSIC_RANGES');
const L = g.listing('parts/intro/listing.json');
for (const [a, b] of SB_MUSIC_RANGES) for (let x = a; x <= b; x++) if (!L.has[x]) { console.log('the listing has no byte at $' + x.toString(16)); process.exit(1); }
const mem = SB_MUSIC_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
const FRAMES = 6000;
let bad = 0, frames = 0, gates = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
SB_TUNES.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver({ mem, tunes: SB_TUNES }, kit);
  drv.init(t);
  let f = 0;
  for (; f < FRAMES; f++) {
    frame.w = [];
    if (f === 0) cpu.call(0x0200, { a: c.tune, x: 0, y: 0 });
    if (c.fire === f) m[0x0627] = 8;
    cpu.call(0x025D, { a: 0, x: 0, y: 0 }, { maxSteps: 200000 });
    drv.play();
    frames++;
    if (frame.w.join() !== drv.writes.join()) { fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join()); break; }
    for (let k = 0; k < frame.w.length; k += 2) if (frame.w[k] % 7 === 4 && frame.w[k] < 21 && frame.w[k + 1] & 1) gates++;
    const on = (m[0x0628] & 0x80) !== 0;
    if (on !== drv.playing()) { fail(c.name, 'frame ' + f, on ? 'the game plays on' : 'the game has stopped'); break; }
    if (!on) break;
  }
  if (c.ends !== undefined && f !== c.ends) fail(c.name, 'stopped at frame ' + f + ', the page says ' + c.ends);
  if (c.ends === undefined && f !== FRAMES) fail(c.name, 'stopped at frame ' + f);
  drv.stop();
  if (drv.playing() || drv.sid[24] !== 0) fail(c.name, 'stop() leaves it playing');
});
if (!gates) fail('no voice was ever gated on: the test played silence');
console.log(`${SB_TUNES.length} buttons, ${frames} frames, ${gates} gate writes: ` + (bad ? bad + ' differences' : 'every write matches the intro\'s player'));
process.exit(bad ? 1 : 0);
