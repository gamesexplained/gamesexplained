#!/usr/bin/env node
// Holds the How it works tab's two sound players against the game. The page's createDriver runs the game's own music
// driver and sound-effects code on the kit's 6502 over bytes it carries (PQ_SOUND); this test checks
//   1. those bytes are the listings': $33FF-$3401, $4C00-$4EFF and $5400-$5B4E of the title part, $4F00-$53FF of the
//      menu part (the music driver's tail) and $4F00-$532E of the quiz part (the effects a question block loads);
//   2. every button, run as the page runs it (the driver made from its source text alone, as the player's worklet
//      makes it), writes to the sound chip what the same calls write when run on the whole of the part's memory
//      from the listings: the tune for 14,000 frames, each effect until it ends, every write in order;
//   3. every button writes, never outside $D400-$D418, and never gates a voice on at volume 0, which is silent;
//      each effect ends (playing() turns false) within 400 frames, and the tune is still playing after 14,000.
//   node games/c64/mike-reads-computer-pop-quiz/test_sound.js
const path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createDriver: pageDriver, PQ_SOUND } = g.run('index.html', 'createDriver', 'createDriver', 'PQ_SOUND');
const createDriver = vm.runInNewContext('(' + pageDriver.toString() + ')', {});
const T = g.listing('parts/title/listing.json'), MN = g.listing('parts/menu/listing.json'), Q = g.listing('parts/quiz/listing.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const hexOf = (L, a, b) => Buffer.from(L.ram.slice(a, b + 1)).toString('hex');
if (PQ_SOUND.m0 !== hexOf(T, 0x33FF, 0x3401)) fail('m0 is not $33FF-$3401 of the title listing');
if (PQ_SOUND.m1 !== hexOf(T, 0x4C00, 0x4EFF)) fail('m1 is not $4C00-$4EFF of the title listing');
if (PQ_SOUND.m2 !== hexOf(MN, 0x4F00, 0x53FF)) fail('m2 is not $4F00-$53FF of the menu listing');
if (PQ_SOUND.m3 !== hexOf(T, 0x5400, 0x5B4E)) fail('m3 is not $5400-$5B4E of the title listing');
if (PQ_SOUND.f1 !== hexOf(Q, 0x4F00, 0x532E)) fail('f1 is not $4F00-$532E of the quiz listing');
const data = PQ_SOUND;
function whole(part) {
  const mem = new Uint8Array(0x10000); mem.set(T.ram);
  for (let a = 0x4F00; a <= 0x53FF; a++) mem[a] = part.ram[a];
  let w = [];
  const cpu = new kit.CPU(mem, { port: 0x35, io: { read: () => 0, write(a, v) { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); } } });
  return { cpu, take: () => { const x = w; w = []; return x; } };
}
let frames = 0;
for (let b = 0; b <= data.fx.length; b++) {
  const d = createDriver(data, kit); d.init(b);
  const o = whole(b === 0 ? MN : Q);
  if (b === 0) o.cpu.call(0x4C00, { a: 0 }); else { o.cpu.call(0x5095, {}); for (const [x, y] of data.fx[b - 1]) o.cpu.call(0x4FCB, { x, y }); }
  let pending = o.take(), wrote = 0, vol = 0, ended = false;
  const n = b === 0 ? 14000 : 400;
  for (let f = 0; f < n; f++) {
    d.play(); const mine = d.writes.slice();
    o.cpu.call(b === 0 ? 0x4C03 : 0x4F00, {}); const theirs = pending.concat(o.take()); pending = [];
    frames++;
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) { fail('button', b, 'frame', f, 'writes', mine.slice(0, 16).join(','), 'against', theirs.slice(0, 16).join(',')); break; }
    for (let i = 0; i < mine.length; i += 2) {
      const r = mine[i], v = mine[i + 1];
      if (r > 24) fail('button', b, 'writes register', r);
      if (r === 24) vol = v & 15;
      if (r % 7 === 4 && r < 21 && (v & 1) && !vol) fail('button', b, 'frame', f, 'gates a voice on at volume 0');
      wrote++;
    }
    if (b && !d.playing()) { ended = true; break; }
  }
  if (!wrote) fail('button', b, 'wrote nothing');
  if (b && !ended) fail('effect button', b, 'did not end within 400 frames');
  if (!b && !d.playing()) fail('the tune stopped before 14,000 frames');
}
// the effects player's buttons are the same, one on (fxOnly)
{
  const a = createDriver(Object.assign({}, data, { fxOnly: true }), kit), c = createDriver(data, kit);
  a.init(0); c.init(1);
  for (let f = 0; f < 30; f++) { a.play(); c.play(); if (JSON.stringify(a.writes) !== JSON.stringify(c.writes)) { fail('fxOnly button 0 is not button 1'); break; } }
}
console.log(bad ? bad + ' difference(s)' : `sound test passed: the tune and ten effect buttons match the game's code on the listings, ${frames} frames compared write by write`);
process.exit(bad ? 1 : 0);
