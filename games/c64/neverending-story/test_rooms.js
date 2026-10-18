#!/usr/bin/env node
// Hold the Maps page's rooms against the game's code. The nes-data block's nesRooms reads each
// room's exits from the ten direction tables at ($16B4), its picture from OBJ_ROOM_TABLE ($0D4F),
// the objects that start there from $226C and its script from the part's table at ($2F04);
// levels.html draws the map and the room browser from it.
// ACTION_MOVE_DIRECTION ($0E3F) runs on the kit's 6502 over the engine's listing with each part's
// laid over it, $01 = $06, for every room of the part and each of the ten directions (VERB_ID $4C,
// 1-10), with DESCRIBE_CURRENT_ROOM ($107E) and PRINT_SENTENCE ($099B), which it ends by calling,
// stood in for: where the routine moves the player (CURRENT_ROOM, $293F) or prints sentence 2,
// "You can't go in that direction.", nesRooms must list the same exit, or none.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_rooms.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-data');
const { nesRooms } = g.run(page, 'nes-data', 'nesRooms');
const E = g.listing('parts/engine/listing.json');
const parts = [1, 2, 3].map((p) => g.listing(`parts/part-${p}/listing.json`));
let bad = 0, moves = 0, rooms = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase();
for (let p = 0; p < 3; p++) {
  const m = E.ram.slice();
  for (let a = 0x2F00; a < 0x9600; a++) if (parts[p].has[a]) m[a] = parts[p].ram[a];
  m[0x2940] = p;
  const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
  let said;
  const hooks = { 0x107E: (c) => { c.rts(); }, 0x099B: (c) => { said = c.a; c.rts(); } };
  for (const R of nesRooms(m, p)) {
    rooms++;
    for (let d = 0; d < 10; d++) {
      m[0x293F] = R.room; m[0x4C] = d + 1; said = -1;
      cpu.call(0x0E3F, {}, { hooks, maxSteps: 1e5 });
      const want = said === 2 ? null : m[0x293F], e = R.exits.find(([k]) => k === d);
      moves++;
      if (said !== -1 && said !== 2) fail(`part ${p + 1} room ${hex(R.room)} direction ${d + 1}: printed sentence ${said}`);
      if ((e ? e[1] : null) !== want) fail(`part ${p + 1} room ${hex(R.room)} direction ${d + 1}: the game goes to ${want === null ? 'nowhere' : hex(want)}, the page to ${e ? hex(e[1]) : 'nowhere'}`);
    }
  }
}
console.log(`${rooms} rooms, ${moves} moves: ` + (bad ? bad + ' differences' : 'every exit matches'));
process.exit(bad ? 1 : 0);
