#!/usr/bin/env node
// Hold the room renderer (the ce2-rooms block, in index.html and levels.html alike) against the
// game's own code. For each of the 120 rooms the kit's 6502 runs draw_room ($4000) from the
// listing's bytes, through room_clear, the room's commands and room_finish (which draws the
// pick-ups), with the object table as a new game leaves it, the van parked ($B7 = 1) and every
// room already visited (so no bonus is printed). The video chip answers $D012 with line $60, so
// room_clear's wait ends; colour RAM is kept as the chip would. The port must give the same
// characters, colours and property-map bytes in rows 2-24 (rows 0 and 1 are the status line,
// which the port leaves as the frame), and the same pick-up cells in the character set
// ($0AE8-$0BE7). It exits 1 on any difference.
//   node games/c64/chuckie-egg-2/test_rooms.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('ce2-rooms');
const { ce2Rooms } = g.run(page, 'ce2-rooms', 'ce2Rooms');
const L = g.listing();
const R = ce2Rooms(L.ram), objs = R.objectsAtStart();
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
for (let room = 1; room <= 120; room++) {
  const m = L.ram.slice(), vic = new Uint8Array(0x400), colour = new Uint8Array(1000);
  for (let i = 0; i < 256; i++) m[0x8200 + i] = objs[i];
  for (let i = 0; i <= 120; i++) m[0x1B10 + i] |= 0x80;
  Object.assign(m, { [0xC6]: room, [0xB7]: 1, [0x71]: 1, [0xD7]: 5, [0xB2]: 0xFF, [0xB8]: 1, [0xB0]: 0 });
  const io = {
    read(a) {
      if (a === 0xD012) return 0x60;
      if (a === 0xD01E || a === 0xD01F) return 0;
      if (a >= 0xD000 && a < 0xD400) return vic[a & 0x3F];
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDBE8) colour[a - 0xD800] = v & 15;
      else if (a >= 0xD000 && a < 0xD400) vic[a & 0x3F] = v;
      else if (a >= 0xD800 && a < 0xDC00) { /* the colour RAM past the screen */ }
      else throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  cpu.call(0x4000, {}, { maxSteps: 5000000 });
  const got = R.draw(room, objs);
  if (!got) { fail('room', room, 'port gave up'); continue; }
  for (let o = 80; o < 1000; o++) {
    if (m[0x0400 + o] !== got.scr[o]) { fail('room', room, 'cell', o, 'char game', m[0x0400 + o].toString(16), 'port', got.scr[o].toString(16)); break; }
    if (colour[o] !== (got.col[o] & 15)) { fail('room', room, 'cell', o, 'colour game', colour[o], 'port', got.col[o]); break; }
    if (m[0x1700 + o] !== got.prop[o]) { fail('room', room, 'cell', o, 'property game', m[0x1700 + o].toString(16), 'port', got.prop[o].toString(16)); break; }
  }
  for (let a = 0x0AE8; a < 0x0BE8; a++)
    if (m[a] !== got.chars[a - 0x0800]) { fail('room', room, 'charset $' + a.toString(16)); break; }
  if (vic[0x21 - 0x00] !== undefined && m[0x14] !== got.bg) fail('room', room, 'background game', m[0x14], 'port', got.bg);
}
console.log(bad ? `FAILED - ${bad} difference(s)` : 'OK - the port draws all 120 rooms as draw_room does: characters, colours, property map and pick-up cells');
process.exit(bad ? 1 : 0);
