#!/usr/bin/env node
// Hold the pages' room drawings against the game's own routines. The ant-room block (ANT), the
// same on every page that carries it, draws each room, its sprites and the title from the
// listing's bytes. Here the game's routines run on the kit's 6502 over the listing's whole memory:
// - build_room ($852C), returning after animate_tiles with an RTS put at $85C1, for each of the 69
//   rooms: the playfield rows 0-15 of the screen at $4000, their colour RAM, the shape of every
//   code on them in the character set at $7800 (filled with $AA first, so a shape left unloaded
//   shows), the room's shared multicolours at $4D and $4E, against ANT.room;
// - place_room_sprites ($8716) for each room: the X (spr_xy and spr_xhi), Y and animation
//   (slot_materialise, else slot_anim) of slots 3 to 7, and which slots wait for a striped
//   creature ($64 in the counter at $02B0 + slot), against ANT.sprites;
// - the animated tiles of every room that has them, for 1,500 frames: count_timers ($AF86) once
//   a frame and animate_tiles ($8C30) three times after it, as the interrupt and the main loop's
//   passes run them, against ANT.tilesFrame: the character set and each slot's script, step and
//   wait ($0250, $0258, $0248) after every frame;
// - draw_title_screen ($8421): the whole screen and colour RAM it leaves, against ANT.title.
// It exits 1 on any difference.
//   node games/c64/the-sacred-armour-of-antiriad/test_rooms.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('ant-room');
g.sameBlock('ant-ui');
const { ANT } = g.run('index.html', 'ant-room', 'ANT');
const L = g.listing(), sym = L.sym, FRAMES = 1500;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
// the game's memory with colour RAM kept apart; VIC and SID writes are dropped, any other I/O stops
function machine(m, col) {
  const io = {
    read(a) { throw new Error('read ' + hex(a)); },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDC00) { col[a - 0xD800] = v & 15; return; }
      if (a >= 0xD000 && a < 0xD800) return;
      throw new Error('write ' + hex(a));
    },
  };
  return new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
}

let rooms = 0;
for (let r = 0; r < ANT.ROOMS; r++) {
  const m = L.ram.slice(), col = new Uint8Array(1024);
  m.fill(0xAA, 0x7800, 0x8000);
  m[0x85C1] = 0x60;
  m[0x5B] = r;
  machine(m, col).call(sym('build_room'), { a: 0, x: 0, y: 0 }, { maxSteps: 2000000 });
  const R = ANT.room(L.ram, r), d = [];
  for (let i = 0; i < 640 && d.length < 3; i++) {
    if (m[0x4000 + i] !== R.scr[i]) d.push('screen cell ' + i + ': ' + hex(m[0x4000 + i]) + ' / ' + hex(R.scr[i]));
    if (col[i] !== R.cram[i]) d.push('colour cell ' + i + ': ' + col[i] + ' / ' + R.cram[i]);
    const c = R.scr[i];
    if (c) for (let k = 0; k < 8; k++) if (m[0x7800 + 8 * c + k] !== R.shapes[8 * c + k]) { d.push('shape of ' + hex(c)); break; }
  }
  if (R.mc && (m[0x4D] !== R.m1 || m[0x4E] !== R.m2)) d.push('multicolours ' + m[0x4D] + ',' + m[0x4E] + ' / ' + R.m1 + ',' + R.m2);
  if (d.length) fail('room', hex(r), d.join('; '));
  rooms++;
}

let sprites = 0;
for (let r = 0; r < ANT.ROOMS; r++) {
  const m = L.ram.slice();
  m[0x5B] = r;
  machine(m, new Uint8Array(1024)).call(sym('place_room_sprites'), { a: 0, x: 0, y: 0 }, { maxSteps: 2000000 });
  const want = {}, d = [];
  for (const s of ANT.sprites(L.ram, r)) want[s.slot] = s;
  for (let x = 3; x < 8; x++) {
    const s = want[x], anim = m[sym('slot_materialise') + x] || m[sym('slot_anim') + x];
    if (!s) { if (anim) d.push('slot ' + x + ' holds ' + hex(anim)); continue; }
    sprites++;
    const X = m[sym('spr_xy') + 2 * x] + ((m[sym('spr_xhi')] >> x) & 1 ? 256 : 0), Y = m[sym('spr_xy') + 2 * x + 1];
    if (X !== s.x || Y !== s.y) d.push('slot ' + x + ' at ' + X + ',' + Y + ' / ' + s.x + ',' + s.y);
    if (anim !== s.anim) d.push('slot ' + x + ' animation ' + hex(anim) + ' / ' + hex(s.anim));
    if ((m[0x02B0 + x] === 0x64) !== s.held) d.push('slot ' + x + (s.held ? ' does not wait' : ' waits'));
  }
  if (d.length) fail('sprites of room', hex(r), d.join('; '));
}

let tileRooms = 0, tileFrames = 0;
for (let r = 0; r < ANT.ROOMS; r++) {
  const R = ANT.room(L.ram, r);
  if (!R.tiles.length) continue;
  const m = L.ram.slice(), col = new Uint8Array(1024);
  m[0x85C1] = 0x60;
  m[0x5B] = r;
  const cpu = machine(m, col), call = (a) => cpu.call(a, { a: 0, x: 0, y: 0 }, { maxSteps: 2000000 });
  call(sym('build_room'));
  tileRooms++;
  for (let f = 0; f <= FRAMES; f++) {
    if (f) {
      call(sym('count_timers'));
      for (let k = 0; k < 3; k++) call(sym('animate_tiles'));
      ANT.tilesFrame(L.ram, R.tiles, R.shapes);
      tileFrames++;
    }
    let d = '';
    for (let a = 0; a < 0x800 && !d; a++) if (m[0x7800 + a] !== R.shapes[a]) d = 'character byte ' + hex(0x7800 + a);
    R.tiles.forEach((s, x) => {
      if (!d && (m[0x0250 + x] !== s.anim || m[0x0258 + x] !== s.step || m[0x0248 + x] !== s.wait))
        d = 'slot ' + x + ' ' + [m[0x0250 + x], m[0x0258 + x], m[0x0248 + x]].map(hex) + ' / ' + [s.anim, s.step, s.wait].map(hex);
    });
    if (d) { fail('animated tiles of room', hex(r), 'frame', f, d); break; }
  }
}

{
  const m = L.ram.slice(), col = new Uint8Array(1024);
  machine(m, col).call(sym('draw_title_screen'), { a: 0, x: 0, y: 0 }, { maxSteps: 2000000 });
  const T = ANT.title(L.ram, false);
  let d = 0;
  for (let i = 0; i < 1000; i++) if (m[0x4000 + i] !== T.scr[i] || col[i] !== T.cram[i]) {
    if (!d++) fail('title cell', i, hex(m[0x4000 + i]) + '/' + col[i], 'against', hex(T.scr[i]) + '/' + T.cram[i]);
  }
}

console.log(`${rooms} rooms, ${sprites} sprites, ${tileRooms} rooms' animated tiles over ${FRAMES} frames each and the title: ` +
  (bad ? bad + ' differences' : 'every room, sprite, character and title cell matches the game'));
process.exit(bad ? 1 : 0);
