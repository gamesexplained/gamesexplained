#!/usr/bin/env node
// Hold the page's port of the picture code against the game's own, for every portrait.
// A port is a claim about the game, so this runs both: start_picture ($0586), then
// animate_picture_tick ($05C5) call by call on the kit's 6502 simulator, in the engine's
// committed listing with the portrait's bytes that index.html carries, beside the WLPictures
// block of index.html run by node; the bitmap is compared after every pass of the channels.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 if
// any portrait differs.
//   node games/c64/wasteland/test_portraits.js [steps]     (default 400 a portrait)
const fs = require('fs'), path = require('path');
const GAME = __dirname + '/', ROOT = path.resolve(GAME, '../../..');
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const html = fs.readFileSync(GAME + 'index.html', 'utf8');
const a = html.indexOf('/* pictures/pictures.js */'), b = html.indexOf('})();', a) + 5;
if (a < 0) { console.error('index.html: no pictures.js block'); process.exit(1); }
eval(html.slice(a, b));
const P = globalThis.WLPictures;
const STEPS = +(process.argv[2] || 400);
(async () => {
  const E = await C64.load('parts/engine/listing.json');
  let bad = 0, steps = 0;
  for (const pic of P.PICTURES) {
    if (pic.part === 'startup') continue;
    const [L] = await P.sources('', pic);
    const p = P.prepare(pic, L, E), eng = new P.Engine(p.m);
    const mem = Uint8Array.from(E.ram);
    mem.fill(0, 0x6000, 0x7F40);
    mem.set(p.m.subarray(0x5C00, 0x6000), 0x5C00);                // the window's colours
    mem.set(p.m.subarray(p.base, p.base + 0x1000 > 0x10000 ? 0x10000 : p.base + 0x1000), p.base);
    mem[0xB9] = p.base & 0xFF; mem[0xBA] = p.base >> 8;
    mem[0xAC] = 1; mem[0xC5] = 1; mem[0xB1] = 0;
    for (let x = 0; x < 4; x++) mem[0x5BFB + x] = 1;
    const cpu = new CPU(mem);
    let r = eng.start(p.base);
    cpu.call(0x0586, {}, { maxSteps: 1e6 });
    const same = () => { for (let i = 0x6000; i < 0x7F40; i++) if (mem[i] !== p.m[i]) return i; return -1; };
    let diff = same(), n = 0;
    while (diff < 0 && n < STEPS) {
      r = eng.tick();
      cpu.call(0x05C5, {}, { maxSteps: 1e6 });
      if (r) { n++; diff = same(); }
    }
    steps += n;
    if (diff >= 0) { bad++; console.log(pic.id, 'differs at step', n, 'address $' + diff.toString(16)); }
    else process.stdout.write(pic.id + ' ');
  }
  console.log('\n' + (P.PICTURES.length - 1) + ' portraits, ' + steps + ' steps, ' + bad + ' differing');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
