'use strict';
// Holds the room drawing that index.html, levels.html and graphics.html share: every copy of the
// block friday-room is the same, and fridayRoom draws each of the 44 rooms with the game's
// draw_room on the kit's 6502, leaving its area, column and row where room_number would and a
// tile map at room_map ($0894) equal to the room's 32 bytes at $0C00 + 32 x room, step tiles
// $81 to $84 aside.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('friday-room');
const { fridayRoom } = g.run('levels.html', 'friday-room', 'fridayRoom');
const ram = g.listing('parts/game/listing.json').ram;
let bad = 0;
for (let n = 0; n < 44; n++) {
  const r = fridayRoom(ram, kit, n);
  for (let t = 0; t < 32; t++) {
    const want = ram[0x0C00 + n * 32 + t], got = r.m[0x0894 + t];
    if (got !== want && !(want >= 0x81 && want <= 0x84 && got === 0)) { console.log(`room ${n} tile ${t}: ${got} where the map holds ${want}`); bad++; break; }
  }
}
console.log(bad ? `${bad} room(s) differ` : '44 rooms drawn; every copy of friday-room is the same');
process.exit(bad ? 1 : 0);
