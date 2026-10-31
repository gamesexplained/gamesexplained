#!/usr/bin/env node
// Hold the page's tune and effects players against the game's own players. index.html's ns-music
// block (createDriver) runs each player on the kit's 6502, handed in as sid.js hands it, over
// NS_DRIVER_RANGES of its part's listing alone. Here the same player runs on the kit's simulator
// over the part's whole listing: the title's ($9000 with A = 0, then $9003 once a frame, as the
// title's raster interrupt calls it), the ending's ($3000 with A = 0 for the victory and 1 for the
// defeat, then $3003) and the map's sound player ($F128, then $F12B with A = the sound, then $F12E
// once a frame) for every button of NS_TUNES and NS_EFFECTS. Both must write the same values to
// the same registers in the same order in every frame, for 60 seconds of each button or until it
// ends, and end on the same frame. The writes the start makes belong to the first frame. It exits
// 1 on any difference.
//   node games/c64/north-and-south/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('ns-music');
const { createDriver, NS_TUNES, NS_EFFECTS, NS_DRIVER_RANGES } =
  g.run(page, 'ns-music', 'createDriver', 'NS_TUNES', 'NS_EFFECTS', 'NS_DRIVER_RANGES');
const make = vm.runInNewContext('(' + createDriver + ')', {});        // as the worklet makes it
const SRC = { title: 'parts/title/listing.json', ending: 'parts/ending/listing.json', effects: 'parts/map/listing.json' };
const L = {}; for (const k in SRC) L[k] = g.listing(SRC[k]).ram;
const mem = {}; for (const k in NS_DRIVER_RANGES) mem[k] = NS_DRIVER_RANGES[k].map(([a, b]) => [a, L[k].slice(a, b + 1)]);
const FRAMES = 60 * 50;
let bad = 0, frames = 0, buttons = 0, sounding = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const list of [NS_TUNES, NS_EFFECTS]) list.forEach((c, t) => {
  const m = L[c.src].slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD41F) { if (a <= 0xD418) frame.w.push(a - 0xD400, v); return; } throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const call = (ad, a) => cpu.call(ad, { a: a || 0, x: 0, y: 0 });
  if (c.src === 'effects') call(0xF128);
  call(c.init, c.a);
  const on = () => c.on.some((ad) => m[ad] !== 0);
  const drv = make({ mem, tunes: list }, kit);
  drv.init(t);
  buttons++;
  for (let f = 0; f < FRAMES; f++) {
    if (f) frame.w = [];
    call(c.play);
    drv.play();
    frames++;
    if (frame.w.join() !== drv.writes.join()) { fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join()); break; }
    if (frame.w.length) sounding++;
    if (on() !== drv.playing()) { fail(c.name, 'frame ' + f, on() ? 'still plays' : 'has ended'); break; }
    if (!on()) break;
  }
});
if (!sounding) fail('no frame wrote to the chip');
console.log(`${buttons} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s players'));
process.exit(bad ? 1 : 0);
