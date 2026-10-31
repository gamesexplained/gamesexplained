#!/usr/bin/env node
// Hold the pages' picture code against the game's own. levels.html's hulk-pictures block (HulkPics)
// decodes a file as decode_picture ($7A9A) does and draws a room as draw_room ($759E) does; here
// the game does the same on the kit's simulator (kit/cpu/cpu6502.js) over the listing.
//   1. Every file the page carries (hulk-files, the 70 pictures and pieces on the disk), put at
//      $07FE as the loader puts it and decoded by $7A9A: the bitmap ($2000-$3F3F), the screen's
//      colours ($0400-$071F), colour RAM, the background ($D021) and the bottom row ($1F26) must
//      match the port's.
//   2. Every room from 0 to 20 drawn by $759E with the items where a new game puts them, with every
//      item put in it, and dark; room 98, the inventory, with every item carried. The disk is a
//      model here: the fast loader's two routines, send_byte ($78A3) and receive_byte ($7859), are
//      hooks that take the seven characters of the name and answer as the drive does, a status and
//      then the file in blocks, or a failure when no file fits the name. The same four outputs, and
//      the files drawn in order, must match.
// Every page that carries the block must carry the same one (g.sameBlock). It exits 1 on any
// difference.
//   node games/c64/the-incredible-hulk/test_pictures.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('hulk-pictures');
const { HulkPics } = g.run('levels.html', 'hulk-pictures', 'HulkPics');
const { HULK_FILES } = g.run('levels.html', 'hulk-files', 'HULK_FILES');
const files = HulkPics.unpack(HULK_FILES);
const L = g.listing();
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

function machine() {
  const m = L.ram.slice(), colour = new Uint8Array(1024), vic = new Uint8Array(64);
  const io = {
    read(a) { throw new Error('the game read $' + a.toString(16)); },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
      if (a >= 0xD000 && a < 0xD040) { vic[a & 63] = v; return; }
      throw new Error('the game wrote $' + a.toString(16));
    },
  };
  return { m, colour, vic, cpu: new CPU(m, { port: 0x36, io }) };
}
function compare(what, M, S) {
  cases++;
  const at = differ(M.m.subarray(0x2000, 0x3F40), S.bm.subarray(0, 0x1F40));
  if (at >= 0) fail(what, 'bitmap at $' + (0x2000 + at).toString(16), 'game', M.m[0x2000 + at], 'page', S.bm[at]);
  const sa = differ(M.m.subarray(0x0400, 0x0720), S.screen.subarray(0, 800));
  if (sa >= 0) fail(what, 'screen at', sa, 'game', M.m[0x400 + sa], 'page', S.screen[sa]);
  const ca = differ(M.colour.subarray(0, 800), S.colour.subarray(0, 800));
  if (ca >= 0) fail(what, 'colour RAM at', ca, 'game', M.colour[ca], 'page', S.colour[ca]);
  if ((M.vic[0x21] & 15) !== S.bg) fail(what, '$D021', 'game', M.vic[0x21] & 15, 'page', S.bg);
  if (M.m[0x1F26] !== S.height) fail(what, 'bottom row', 'game', M.m[0x1F26], 'page', S.height);
}

// 1. each file through decode_picture
for (const name of Object.keys(files).sort()) {
  const M = machine(), S = HulkPics.blank(), f = files[name];
  M.m.fill(0, 0x2000, 0x4000); M.m.fill(0, 0x0400, 0x0800);
  M.m.set(f, 0x07FE);
  M.cpu.call(0x7A9A, {}, { maxSteps: 2e6 });
  HulkPics.decode(L.ram, f, S);
  compare(name, M, S);
}

// 2. rooms through draw_room, the disk answering through hooks
function drawRoom(room, locs, dark) {
  const M = machine(), asked = [];
  M.m[0x1F22] = 0xFF;                    // the picture is on
  M.m[0x755E] = 0xFF;                    // no picture in the cache: the listing holds none
  M.m[0x1C22] = room; M.m[0x1C23] = 0;
  M.m[0x1C11] = dark ? 0xFF : 0;
  locs.forEach((v, i) => { M.m[0x1C3C + 2 * i] = v; M.m[0x1C3D + 2 * i] = 0; });
  M.m.fill(0, 0x2000, 0x4000);
  let name = [], reply = [];
  const hooks = {
    0x78A3(cpu) {                        // send_byte: a character of the name
      name.push(cpu.a);
      if (name.length === 7) {
        const s = String.fromCharCode(...name); name = [];
        const hit = Object.keys(files).find(k => k[0] === s[0] && k.slice(3, 6) === s.slice(3, 6) &&
          (s[6] === '*' ? k.length === 6 : k.length === 7 && k[6] === s[6]));
        if (hit) {
          asked.push(hit);
          const f = files[hit]; reply = [0];
          for (let i = 0; i < f.length; i += 254) { const b = f.subarray(i, i + 254); reply.push(b.length, ...b); }
          reply.push(0);
        } else reply = [1];
      }
      cpu.rts();
    },
    0x7859(cpu) {                        // receive_byte: the next byte from the drive
      const v = reply.length ? reply.shift() : 0;
      cpu.a = v; cpu.z = v === 0; cpu.n = (v & 0x80) !== 0;
      cpu.rts();
    },
  };
  M.cpu.call(0x759E, {}, { hooks, maxSteps: 2e7 });
  return { M, asked, after: Array.from({ length: 55 }, (_, i) => M.m[0x1C3C + 2 * i]) };
}
const start = Array.from({ length: 55 }, (_, i) => L.ram[0x1C3C + 2 * i]);
const runs = [];
for (let r = 0; r <= 20; r++) {
  runs.push([`room ${r}, a new game`, r, start, false]);
  runs.push([`room ${r}, every item in it`, r, start.map((x, i) => i ? r : 0), false]);
}
runs.push(['room 2, dark', 2, start, true]);
runs.push(['room 98, every item carried', 98, start.map((x, i) => i ? 0xFF : 0), false]);
runs.push(['room 98, the inventory pieces carried', 98, start.map((x, i) => files[HulkPics.name('B', i, 'I')] ? 0xFF : 0), false]);
for (const [what, room, locs, dark] of runs) {
  const { M, asked } = drawRoom(room, locs, dark);
  const ram = L.ram.slice(); ram[0x1C11] = dark ? 0xFF : 0;
  const S = HulkPics.drawRoom(ram, files, room, locs);
  compare(what, M, S);
  if (asked.join() !== S.drawn.join()) fail(what, 'files drawn: game', asked.join(' '), 'page', S.drawn.join(' '));
}
console.log(`${Object.keys(files).length} files and ${runs.length} rooms, ${cases} cases: ` +
  (bad ? bad + ' differences' : 'the bitmap, the screen colours, colour RAM, the background and the bottom row match the game\'s code'));
process.exit(bad ? 1 : 0);
