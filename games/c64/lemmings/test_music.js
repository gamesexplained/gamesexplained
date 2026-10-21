#!/usr/bin/env node
// Hold index.html's music player against the game's own code. The page's lm-music block
// (createDriver) runs the game's players on the kit's 6502 as sid.js hands it; this runs the same
// players on the simulator itself, making the calls each tune lists (as the game makes them: see
// work/mktunes.js), and compares every SID write of every frame, in order, for 6,000 frames of
// every tune (two minutes), and 150 frames of each of the six sound effects. It also checks that the players' code the page carries is the committed
// listings' bytes, and that tune A, the one level 1 loads, is the game part's bytes at $3652. The end
// tune's player (lm-end-music) is held against the ending's code with a CIA 2 timer written here
// separately, call by call, for the whole end sequence's 2,592 frames.
//   node games/c64/lemmings/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver } = g.run('index.html', 'lm-music', 'createDriver');
const mt = g.read('reference/lem-tunes.js').match(/window\.LEM_TUNES = (\{.*\});/);
if (!mt) { console.error('no LEM_TUNES in reference/lem-tunes.js'); process.exit(1); }
const D = JSON.parse(mt[1]);
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// the bytes the page carries against the listings
const owner = { game: 'game', intro: 'intro', SA: 'game' };
for (const [name, part] of Object.entries(owner)) {
  const L = g.listing('parts/' + part + '/listing.json');
  for (const [base, hex] of D.blocks[name]) for (let i = 0; i < hex.length / 2; i++)
    if (!L.has[base + i] || L.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(`block ${name} at $${(base + i).toString(16)} is not part ${part}'s byte`); break; }
}
if (D.tunes.length !== 10) fail('expected 10 tunes beside the end tune, found', D.tunes.length);
{
  const L = g.listing('parts/ending/listing.json');
  for (const [base, hex] of D.end.blocks) for (let i = 0; i < hex.length / 2; i++)
    if (!L.has[base + i] || L.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(`the end tune's bytes at $${(base + i).toString(16)} are not the ending part's`); break; }
}
const FRAMES = 6000;
for (const [list, frames] of [[D.tunes, FRAMES], [D.sfx, 150]]) list.forEach((T, t) => {
  const m = new Uint8Array(0x10000);
  for (const b of T.blocks) for (const [base, hex] of D.blocks[b]) for (let i = 0; i < hex.length / 2; i++) m[base + i] = parseInt(hex.substr(2 * i, 2), 16);
  let writes = [];
  const io = {
    read(a) { return 0; },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  for (const [e, a, x] of T.calls) cpu.call(e, { a, x, y: 0, d: 0 });
  let first = writes;
  const drv = createDriver({ blocks: D.blocks, tunes: list }, kit);
  drv.init(t);
  let notes = 0;
  for (let f = 0; f < frames; f++) {
    writes = [];
    cpu.call(T.play, { d: 0 });
    const want = first.concat(writes); first = [];
    drv.play();
    if (want.join() !== drv.writes.join()) { fail(T.name, 'frame', f, 'game', want.join().slice(0, 100), 'page', drv.writes.join().slice(0, 100)); break; }
    for (let i = 0; i < want.length; i += 2) if (want[i] < 21 && want[i] % 7 === 4 && want[i + 1] & 1) notes++;
  }
  if (notes < (list === D.sfx ? 1 : 100)) fail(T.name, 'plays almost nothing:', notes, 'gate-on writes');
  console.log(`${T.name}: ${frames} frames, ${notes} gate-on writes`);
});
// the end tune: the ending's code on the simulator, its timer counted here in whole cycles
{
  const { createEndDriver } = g.run('index.html', 'lm-end-music', 'createEndDriver');
  const E = D.end, P = E.period, FRAME = 312 * 63;
  const m = new Uint8Array(0x10000);
  for (const [base, hex] of E.blocks) for (let i = 0; i < hex.length / 2; i++) m[base + i] = parseInt(hex.substr(2 * i, 2), 16);
  let writes = [], latch = 0xFFFF, count = 0xFFFF, run = false, mask = false;
  const io = {
    read(a) { if (a === 0xDD0D) return 0; throw new Error('end tune: read $' + a.toString(16)); },
    write(a, v) {
      if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v);
      else if (a >= 0xD419 && a <= 0xD41F) { /* end_silence clears them too; the chip takes no write there */ }
      else if (a === 0xDD04) latch = latch & 0xFF00 | v;
      else if (a === 0xDD05) { latch = latch & 0xFF | v << 8; if (!run) count = latch; }
      else if (a === 0xDD0D) { if (v & 1) mask = (v & 0x80) !== 0; }
      else if (a === 0xDD0E) { run = (v & 1) !== 0; if (v & 0x10) count = latch; }
      else throw new Error('end tune: write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  cpu.call(E.init, { a: 0 });
  let first = writes;
  const drv = createEndDriver(E, kit);
  drv.init();
  let clock = 0, nextFrame = 0, vol = 0, ok = true;
  const calls = Math.ceil(2592 * FRAME / P);
  for (let c = 0; c < calls && ok; c++) {
    writes = [];
    // this call's span of cycles: [clock, clock + P); the timer ticks once a cycle while it runs
    for (let k = 0; k < P; k++) {
      if (!run) continue;
      if (count === 0) { count = latch; if (mask) cpu.nmi(E.nmi); } else count--;
    }
    if (nextFrame < clock + P) { nextFrame += FRAME; cpu.call(E.frame, {}); }   // a frame starts inside this call
    clock += P;
    const want = first.concat(writes); first = [];
    drv.play();
    if (want.join() !== drv.writes.join()) { fail('the end tune, call', c, 'game', want.join().slice(0, 100), 'page', drv.writes.join().slice(0, 100)); ok = false; }
    for (let i = 0; i < want.length; i += 2) if (want[i] === 24) vol++;
  }
  if (vol < 100000) fail('the end tune writes the volume only', vol, 'times');
  console.log(`The end: ${calls} calls of ${P} cycles, ${vol} writes to the volume register`);
}
if (bad) { console.log(`FAILED: ${bad} difference(s)`); process.exit(1); }
console.log('OK - the page plays every tune as the game\'s own players do');
