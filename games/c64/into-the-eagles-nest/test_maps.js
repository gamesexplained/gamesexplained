#!/usr/bin/env node
// Hold the Maps tab's floors against the game's own builder. levels.html's en-build block builds a
// floor's map from its description; here the game's builder at $6A4B is run on the kit's 6502 over
// the committed listing, once for each of the four floors, and every one of the 16,384 tiles it
// writes at $9000 must match the page's. It exits 1 on any difference.
//   node games/c64/into-the-eagles-nest/test_maps.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));

const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
const { buildFloor } = g.run(page, 'en-build', 'buildFloor');
const image = g.listing().ram;

let bad = 0;
for (let floor = 0; floor < 4; floor++) {
  const m = image.slice();
  m[0x02A7] = floor;            // the floor the builder reads, low two bits
  m[0x02CF] = 0;                // the figure list's count, which a mission's start clears
  const io = { read: (a) => m[a], write: (a, v) => { m[a] = v; } };
  const cpu = new C64Cpu.CPU(m, { port: 0x36, io });
  cpu.call(0x6A4B, { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 }, { maxSteps: 3000000 });
  const theirs = m.subarray(0x9000, 0xD000), mine = buildFloor(image, floor);
  let wrong = 0, first = -1;
  for (let i = 0; i < 0x4000; i++) if (theirs[i] !== mine[i]) { wrong++; if (first < 0) first = i; }
  if (wrong) {
    bad++;
    console.log(`DIFFERS floor ${floor}: ${wrong} tiles, the first at column ${first % 128}, row ${first >> 7} ` +
                `(game $${theirs[first].toString(16)}, page $${mine[first].toString(16)})`);
  }
}
console.log(`four floors of 16,384 tiles: ` + (bad ? `${bad} differ` : 'every tile matches the game\'s builder'));
process.exit(bad ? 1 : 0);
