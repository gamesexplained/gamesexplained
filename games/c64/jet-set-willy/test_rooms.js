#!/usr/bin/env node
// Hold the room port in reference/jsw-rooms.js, which the Maps / levels and How it works tabs draw
// with, against the game's own code, run on the kit's 6502 simulator over the bytes of the
// committed listing.
// - Every room, 0-59: the game enters at $2E07 with the room in $0E and builds it up to the main
//   loop at $30FF; its item pass at $3988 then runs once. The screen and colour RAM it wrote, the
//   six glyphs at $7908, the border and background colours, which sprites are on, each guardian's
//   place and frame, the rope's pointers and stretch, the sprite colours (left as they were in a
//   room with no guardians) and the conveyor's direction at $13 must be the port's.
// - Every room with a rope, at each of the 34 swing positions: the 192 bytes and six places that
//   $16A2 stages at $0500 must be jswRope's.
// - The Bathroom and the Master Bedroom: $324E, the main loop's sprite 7, run for every value of
//   the pass counter at $1B, every row Willy can be on and Maria there or gone, must leave sprite 7
//   as jswRoom.sprite7 says.
// - Every room with guardians: 400 updates by $32D4 must leave each guardian's state, column,
//   place and frame as jswGuardians says.
// - Every room with arrows: 600 passes of $314D must leave the arrow records and sprite 6 as
//   jswArrows says.
// - Every room with a rope: 100 calls of $16A2 must swing it as jswSwing says.
// - Every room: 40 frames of the play interrupt's conveyor rotation, $3495, must leave the rotated
//   rows and glyph $25 as jswConveyors says.
// It exits 1 on any difference.
//   node games/c64/jet-set-willy/test_rooms.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const FILE = 'reference/jsw-rooms.js';
const { jswRoom } = g.run(FILE, 'jswRoom');
const { jswRope } = g.run(FILE, 'jswRope');
globalThis.jswRoom = jswRoom;                       // the blocks below call it, as the page's script does
const { jswGuardians } = g.run(FILE, 'jswGuardians');
const { jswArrows } = g.run(FILE, 'jswArrows');
const { jswSwing } = g.run(FILE, 'jswSwing');
const { jswConveyors } = g.run(FILE, 'jswConveyors');
const image = g.listing().ram;
const hex = (v, w = 2) => '$' + v.toString(16).toUpperCase().padStart(w, '0');

let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };

// The chips the room code touches: the video chip's registers, colour RAM, and the sound chip,
// which the build silences. Anything else stops the run.
function machine() {
  const m = image.slice(), vic = new Uint8Array(0x40), colour = new Uint8Array(0x400).fill(0xF0);
  for (let a = 0x7C00; a < 0x8000; a++) m[a] = 0x5A;          // a fill, to see which cells are written
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800];
      if (a >= 0xD000 && a < 0xD040) return vic[a - 0xD000];
      throw new Error('read ' + hex(a, 4));
    },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v;
      else if (a >= 0xD000 && a < 0xD040) vic[a - 0xD000] = v;
      else if (!(a >= 0xD400 && a < 0xD420)) throw new Error('write ' + hex(a, 4));
    },
  };
  return { m, vic, colour, cpu: new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io }) };
}

for (let n = 0; n < 60; n++) {
  const { m, vic, colour, cpu } = machine();
  m[0x0E] = n;
  cpu.call(0x2E07, {}, { sentinel: 0x30FF });
  m[0x19] = 7;                                    // the pass counts it up before the first record
  cpu.call(0x3988, {});
  const P = jswRoom.build(image, n), screen = P.screen.slice(), col = P.colour.slice();
  for (const it of jswRoom.items(image, n, 8)) { screen[it.offset] = 0x26; col[it.offset] = it.colour; }
  const where = o => `room ${n} row ${Math.floor(o / 40)} column ${o % 40}`;
  for (let o = 0; o < 0x3F8; o++) {
    cases++;
    const wrote = m[0x7C00 + o] !== 0x5A;
    if (!wrote && screen[o] < 0) continue;
    if (screen[o] < 0) { fail(where(o), 'the game wrote', hex(m[0x7C00 + o]), 'and the port nothing'); continue; }
    if (m[0x7C00 + o] !== screen[o]) fail(where(o), 'code', hex(m[0x7C00 + o]), 'port', hex(screen[o]));
    if (col[o] >= 0 && (colour[o] & 15) !== col[o]) fail(where(o), 'colour', colour[o] & 15, 'port', col[o]);
  }
  for (let i = 0; i < 48; i++) if (m[0x7908 + i] !== P.glyphs[i]) fail(`room ${n} glyph byte ${hex(0x7908 + i, 4)}`);
  if (vic[0x20] !== P.vic.border || vic[0x21] !== P.vic.bg0 || vic[0x24] !== P.vic.bg3) fail(`room ${n} border or background`);
  let on = 1;
  for (const s of P.sprites) on |= 1 << s.n;
  if (vic[0x15] !== on) fail(`room ${n} sprites on ${vic[0x15].toString(2)}, port ${on.toString(2)}`);
  for (const s of P.sprites) {
    const x = vic[2 * s.n] | (vic[0x10] >> s.n & 1) << 8;
    if (x !== s.x || vic[2 * s.n + 1] !== s.y) fail(`room ${n} sprite ${s.n} at ${x},${vic[2 * s.n + 1]}, port ${s.x},${s.y}`);
    if (m[0x7FF8 + s.n] !== s.pointer) fail(`room ${n} sprite ${s.n} frame ${hex(m[0x7FF8 + s.n])}, port ${hex(s.pointer)}`);
  }
  if (P.rope) for (let k = 5; k < 8; k++) if (m[0x7FF8 + k] !== 0xA7 + k) fail(`room ${n} rope sprite ${k}`);
  for (let i = 0; i < 8; i++) if (vic[0x27 + i] !== (P.colours ? P.colours[i] : 0)) fail(`room ${n} sprite ${i} colour`);
  if (vic[0x17] !== (P.rope ? 0xE0 : 0)) fail(`room ${n} stretch ${hex(vic[0x17])}`);
  if (m[0x13] !== (P.conveyor & 0xFF)) fail(`room ${n} conveyor direction ${hex(m[0x13])}, port ${P.conveyor}`);

  if (P.rope) for (let pos = 0; pos < 34; pos++) {
    cases++;
    m[0x0403] = pos; m[0x1018] = 1;               // the divider runs out on this tick
    cpu.call(0x16A2, {});
    const R = jswRope(image, pos);
    if (Array.from(m.subarray(0x0500, 0x05C0)).join() !== Array.from(R.data).join()) fail(`room ${n} rope at ${pos}: sprites`);
    if (Array.from(m.subarray(0x05C0, 0x05C6)).join() !== Array.from(R.coords).join()) fail(`room ${n} rope at ${pos}: places`);
  }

  {
    const G = jswGuardians(image, n), { m: m2, vic: v2, cpu: c2 } = machine();
    m2[0x0E] = n; c2.call(0x2E07, {}, { sentinel: 0x30FF });
    for (let k = 0; k < 400 && G.list.length; k++) {
      cases++;
      m2[0x3E] = 1; c2.call(0x32D4, {}, { sentinel: 0x3304 }); G.step();
      for (const q of G.list) {
        const i = q.n - 1;
        if (m2[0x0980 + i] !== q.state || m2[0x0988 + i] !== q.coord || v2[2 * q.n] !== q.x || (v2[0x10] >> q.n & 1) !== q.msb ||
            v2[2 * q.n + 1] !== q.y || m2[0x7FF9 + i] !== q.pointer) { fail(`room ${n} guardian ${q.n} update ${k}`); k = 400; break; }
      }
    }
  }
  {
    const recs = image.slice(0x2403, 0x2443);
    if (Array.from({ length: 15 }, (_, i) => recs[4 * i] & 0x7F).includes(n)) {
      const A = jswArrows(recs), { m: m3, vic: v3, cpu: c3 } = machine();
      m3[0x0E] = n; c3.call(0x2E07, {}, { sentinel: 0x30FF });
      let on = v3[0x15] >> 6 & 1;
      Object.assign(A.sprite, { x: v3[0x0C], msb: v3[0x10] >> 6 & 1, y: v3[0x0D], pointer: m3[0x7FFE] });
      for (let k = 0; k < 600; k++) {
        cases++;
        c3.call(0x314D, {}, { sentinel: 0x324E }); const { sprite } = A.step(n);
        if (sprite.on !== undefined) on = sprite.on ? 1 : 0;
        const same = Array.from(m3.subarray(0x2403, 0x2443)).join() === Array.from(recs).join() && (v3[0x15] >> 6 & 1) === on &&
          v3[0x0D] === sprite.y && v3[0x0C] === sprite.x && (v3[0x10] >> 6 & 1) === sprite.msb && m3[0x7FFE] === sprite.pointer;
        if (!same) { fail(`room ${n} arrows pass ${k}`); break; }
      }
    }
  }
  if (P.rope) {
    const S = jswSwing(), { m: m4, cpu: c4 } = machine();
    m4[0x0E] = n; c4.call(0x2E07, {}, { sentinel: 0x30FF });
    for (let k = 0; k < 100; k++) {
      cases++;
      const R = jswRope(image, S.pos); S.next();
      m4[0x1018] = 1; c4.call(0x16A2, {});
      if (Array.from(m4.subarray(0x0500, 0x05C6)).join() !== Array.from(R.data).concat(Array.from(R.coords)).join() ||
          m4[0x0403] !== S.pos || m4[0x0404] !== S.half || m4[0x0406] !== S.step) { fail(`room ${n} swing ${k}`); break; }
    }
  }
  {
    const mine = image.slice(), { m: m5, cpu: c5 } = machine();
    m5[0x0E] = n; c5.call(0x2E07, {}, { sentinel: 0x30FF });
    for (let k = 0; k < 40; k++) {
      cases++;
      c5.call(0x3495, {}, { sentinel: 0x34E0 }); const glyph = jswConveyors(mine, n);
      let same = Array.from(m5.subarray(0x7928, 0x7930)).join() === Array.from(glyph).join();
      for (const [b, c] of [[0x2271, 19], [0x2297, 22]]) for (let i = 0; i < c; i++) {
        const a = image[b + 2 * i] | image[b + 1 + 2 * i] << 8; if (m5[a] !== mine[a]) same = false;
      }
      if (!same) { fail(`room ${n} conveyors frame ${k}`); break; }
    }
  }

  if (n === 33 || n === 35) for (const gone of [0, 1]) for (let pass = 0; pass < 256; pass++) for (let y = 0; y < 256; y += 8) {
    cases++;
    m[0x0400] = gone; m[0x1B] = pass; m[0x1C] = y; vic[0x15] = 0x7F; vic[0x2E] = 0x0F;
    cpu.call(0x324E, {}, { sentinel: 0x32D4 });
    const s = jswRoom.sprite7(n, { pass: (pass + 1) & 255, mariaGone: !!gone, willyRow: y >> 3 });
    const label = `room ${n} pass ${pass} Willy at ${y}${gone ? ', Maria gone' : ''}`;
    if (!s) { if (m[0x1B] !== pass || vic[0x15] !== 0x7F) fail(label, 'the game moved sprite 7 and the port has none'); continue; }
    const x = vic[0x0E] | (vic[0x10] >> 7 & 1) << 8;
    if (x !== s.x || vic[0x0F] !== s.y || vic[0x2E] !== s.colour || m[0x7FFF] !== s.pointer) fail(label, 'sprite 7');
    if (vic[0x15] !== (s.only ? 0x81 : 0xFF)) fail(label, `sprites on ${vic[0x15].toString(2)}`);
  }
}
console.log(`60 rooms, ${cases} cases, ${bad ? bad + ' differences' : 'every case matches'}`);
process.exit(bad ? 1 : 0);
