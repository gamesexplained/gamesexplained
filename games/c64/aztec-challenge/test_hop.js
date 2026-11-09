#!/usr/bin/env node
// Hold the Levels tab's map of Hopaztec's floor (levels.html, block az-hop, azHopFloor) against the
// game's own hop checks, run on the kit's 6502 over the listing. For every tile the page draws, and
// each of the four directions, the hopper is put on the tile (sprites 0 and 1 at its X and Y, the
// ninth X bits from X, the tile number in $16, no trapped tiles) and the game's check for that
// direction is called as $732A calls it: $7430 forward, $7450 back, $7470 left, $7493 right. Each
// either refuses (returns with the hopper where it was) or hops, running the hop's animation, the
// wait for the stick to be let go ($73AD; the stick reads centred) and the trap check ($1FE8).
// The page must say the same of every hop: refused at its edges; otherwise landing on the tile it
// draws there with the number the game gives, or, where the landing is not one of its tiles, the
// hop is one of the exits it marks, and every exit it marks is a hop the game makes. It exits 1 on any difference, and prints every hop off the floor.
//   node games/c64/aztec-challenge/test_hop.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { azHopFloor } = g.run('levels.html', 'az-hop', 'azHopFloor');
const L = g.listing();
const floor = azHopFloor(L.ram);
const at = {}; for (const t of floor.tiles) at[t.x + ',' + t.y] = t;
const exits = {}; for (const e of floor.exits) exits[e.from.n + e.dir] = e;
const rowMin = (y) => Math.min(...floor.tiles.filter((v) => v.y === y).map((v) => v.x));
const rowMax = (y) => Math.max(...floor.tiles.filter((v) => v.y === y).map((v) => v.x));
let bad = 0, hops = 0;
const off = [];
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
for (const t of floor.tiles) {
  for (const [d, entry] of [['forward', 0x7430], ['back', 0x7450], ['left', 0x7470], ['right', 0x7493]]) {
    const m = L.ram.slice(), vic = new Uint8Array(0x40);
    const io = {
      read(a) { if (a >= 0xD000 && a < 0xD400) return vic[a & 0x3F]; if (a === 0xDC00) return 0xFF; throw new Error('read $' + a.toString(16)); },
      write(a, v) { if (a >= 0xD000 && a < 0xD400) { vic[a & 0x3F] = v; return; } if (a >= 0xD400 && a < 0xD800) return; throw new Error('write $' + a.toString(16)); },
    };
    vic[0] = vic[2] = t.x & 255; vic[1] = t.y; vic[3] = t.y + 21; vic[0x10] = t.x > 255 ? 3 : 0;
    m[0x16] = t.n; m[0x58] = 0; m[0x5C28] = 0xFF;          // one entry in the trap list, $FF, which no tile is
    new CPU(m, { port: 0x37, io }).call(entry, {}, { maxSteps: 2e6 });
    hops++;
    const x = vic[0] | (vic[0x10] & 1) << 8, y = vic[1], n = m[0x16];
    const moved = x !== t.x || y !== t.y;
    const pageRefuses = d === 'forward' ? t.y === 0x46 : d === 'back' ? t.y === 0xC6
      : d === 'left' ? t.x === rowMin(t.y) : t.x === rowMax(t.y);
    if (!moved) { if (!pageRefuses) fail('tile', t.n, d, 'the game refuses, the page does not'); continue; }
    if (pageRefuses) { fail('tile', t.n, d, 'the page refuses, the game hops to', x, y); continue; }
    const land = at[x + ',' + y];
    if (land) { if (land.n !== n) fail('tile', t.n, d, 'lands on', x, y, 'game tile', n, 'page tile', land.n); continue; }
    off.push(t.n + ' ' + d + ' -> ' + n + ' at ' + x + ',' + y);
    const e = exits[t.n + d];
    if (!e || e.x !== x || e.y !== y || e.n !== n) fail('tile', t.n, d, 'leaves the floor to', x, y, n, 'which the page does not mark');
  }
}
if (off.length !== floor.exits.length) fail('the page marks', floor.exits.length, 'exits, the game makes', off.length);
console.log(`${floor.tiles.length} tiles, ${hops} hops: ` + (bad ? bad + ' differences' : 'every hop is the game\'s') + '; off the floor: ' + (off.join('; ') || 'none'));
process.exit(bad ? 1 : 0);
