/* jswRoom */
// The room builder, ported from the game's own: $2E55 copies the room's 256-byte record,
// $2E9C draws its name, its 32 by 16 cells and its six glyphs, $2F28 the conveyor, $2F5A the
// ramp, $2FCD places the guardians' sprites, $30A8 the rope's, $30E1 patches room 32, and
// $3983 draws the items not yet taken. ram is the game's 64 KB, as C64.load gives it.
const jswRoom = (function () {
  const SCREEN = 0x7C00, ROW0 = 0x7C04;                   // $2BCB: row r starts at $7C04 + 40r
  const record = n => n < 30 ? 0xB000 + 256 * n : 0xE000 + 256 * (n - 30);
  const at = (col, row) => ROW0 + 40 * row + col - SCREEN; // $35E4, as an offset into the screen
  function build(ram, n) {
    const R = ram.subarray(record(n), record(n) + 256);
    const screen = new Int16Array(1024).fill(-1), colour = new Int16Array(1024).fill(-1);
    const put = (o, code, c) => { screen[o] = code; if (c !== undefined) colour[o] = c & 15; };
    const tileColour = [R[0xD7], R[0xD8], R[0xD9], R[0xDA]];
    const vic = { border: R[0xD6], bg0: R[0xD7], bg3: R[0xD6] };
    for (let i = 0; i < 32; i++) {                        // the name, row 17 from column 4
      let c = R[i]; if (c >= 0x41) c &= 0x1F;
      put(0x2AC + i, c | 0x80, 1);
    }
    for (let i = 0; i < 128; i++)                         // the map: four 2-bit cells a byte, top bits first
      for (let k = 0; k < 4; k++) {
        const t = (R[0x20 + i] >> (6 - 2 * k)) & 3, cell = i * 4 + k;
        put(at(cell & 31, cell >> 5), 0x20 + t, tileColour[t]);   // $222C: $20 $21 $22 $23
      }
    const glyphs = R.slice(0xA0, 0xD0);                   // codes $21-$26 at $7908
    let conveyor = 0;
    if (R[0xD0]) {                                        // $2F28
      conveyor = R[0xD0] & 0x80 ? -1 : 1;
      let o = at(R[0xD2], R[0xD1]);
      for (let k = R[0xD0] & 0x3F; k; k--) put(o++, 0x25, R[0xDB]);
    }
    let ramp = { drawn: false, everyFloor: false, direction: 0 };
    if (R[0xD3] & 0x80) ramp = { drawn: false, everyFloor: true, direction: R[0xD4] };   // $2F65
    else if (R[0xD5]) {
      const left = R[0xD5] & 0x80, stride = left ? 39 : 41;
      ramp = { drawn: true, everyFloor: false, direction: left ? -1 : 1 };
      let o = at(R[0xD4], R[0xD3]);
      for (let k = R[0xD5] & 0x3F; k; k--, o += stride) put(o, 0x24, tileColour[3]);
    }
    const sprites = [];                                   // sprite 0 is Willy, placed by the player code
    // a room with no guardians skips the colours too, and keeps the last room's
    const colours = R[0xE1] ? Array.from(ram.subarray(0x29EB + 8 * n, 0x29EB + 8 * n + 8)) : null;
    for (let i = 0; i < R[0xE1]; i++) {                   // $2FCD
      const g = ram.subarray(0x2443 + 8 * (R[0xE0] + i), 0x2443 + 8 * (R[0xE0] + i) + 8);
      const x = ((g[1] << 3) & 0xFF) + 0x38, y = (((g[2] << 3) & 0xFF) + 0x32) & 0xFF;
      sprites.push({ n: i + 1, x: x & 0x1FF, y, pointer: g[3], colour: colours[i + 1] & 15,
                     record: R[0xE0] + i, facing: g[0] & 0x40 ? 1 : 0 });
    }
    const rope = !!R[0xE2];                               // $30A8: sprites 5-7, pointers $AC-$AE
    if (rope) for (const s of sprites) if (s.n >= 5) s.pointer = 0xA9 + s.n;
    if (n === 32) {                                       // $30E1: six conveyor cells, no colour,
      for (const a of [0x7C5A, 0x7C83, 0x7CAC, 0x7CD5, 0x7CFE, 0x7D27]) put(a - SCREEN, 0x25);
      conveyor = 1;                                       // moving right
    }
    return { record: record(n), R, screen, colour, glyphs, vic, sprites, colours, rope, conveyor, ramp,
             exits: Array.from(R.subarray(0xDC, 0xE0)) };
  }
  // $3983: every item record of room n not yet taken is glyph $26, its colour the pass's phase
  // counter, which goes up by one for every one of the 80 records.
  function items(ram, n, phase) {
    const out = [];
    for (let i = 0; i < 80; i++, phase++) {
      const r = ram.subarray(0x22C3 + 4 * i, 0x22C3 + 4 * i + 4);
      if (r[0] === n && r[3] === 0) out.push({ i, x: r[1], y: r[2], offset: at(r[1], r[2]), colour: phase & 15 });
    }
    return out;
  }
  // $324E and $3284, on every pass of the main loop, put sprite 7 in two rooms: the toilet in The
  // Bathroom, lid up ($0E) and down ($0F) by turns every 16 passes, and Maria in the Master Bedroom
  // until 50 items are taken ($0400): $02 and $03 by turns while Willy is on row 13 or below, $04
  // on row 12 and $05 above it. Her room turns every sprite off but Willy's and hers. pass is the
  // counter at $1B after the loop has counted it.
  function sprite7(n, { pass = 0, mariaGone = false, willyRow = 13 } = {}) {
    if (n === 33) return { n: 7, x: 0x118, y: 0x9A, colour: 1, pointer: 0x0E | (pass >> 4 & 1) };
    if (n === 35 && !mariaGone)
      return { n: 7, x: 0xA8, y: 0x8A, colour: 7, only: true,
               pointer: willyRow >= 13 ? 2 | (pass >> 3 & 1) : willyRow >= 12 ? 4 : 5 };
    return null;
  }
  return { build, items, sprite7, record, at };
})();
// end of jswRoom

/* jswRope */
// $16A2, every second player tick in a room with a rope: the three sprites of the rope at swing
// position pos (0-33) are the 192 bytes the table at $1856 points to, and $178A + 6 * pos holds
// their places, the x and y of sprites 5, 6 and 7. The interrupt at $3538 copies both to the
// sprites. A room starts its rope at position 16 ($30B5).
function jswRope(ram, pos) {
  const src = ram[0x1856 + 2 * pos] | ram[0x1857 + 2 * pos] << 8;
  return { src, data: ram.slice(src, src + 192), coords: ram.slice(0x178A + 6 * pos, 0x178A + 6 * pos + 6) };
}
// end of jswRope

/* jswPicture */
// A room as the screen shows it once the builder has run: columns 4-35 of rows 0-17, the 32 by 16
// cells, the row of border below them and the name, with the guardians where they start and the
// rope where it starts. The screen is in extended colour mode: a code's low six bits choose the
// glyph and its top two bits the background, $D021 for the cells ($20-$26), $D023 for the name
// ($80-$BF) and $D024 for the cells outside the room ($C0), which is the border's colour. $2CD7 and
// $2CE3 clear $D022 and $D023. Sprites are single-colour, in front of the cells, sprite 1 on top;
// sprite 0, Willy, is left out.
// Returns 256 by 144 palette indices.
// A room with no guardians keeps the sprite colours of the room before (from, by default the room
// its right-hand exit leads to); the only such room with a rope is The Beach.
function jswPicture(ram, n, { phase = 8, ropeAt = 16, guardians = true, items = true, from, mariaGone = false } = {}) {
  const W = 256, H = 144, px = new Uint8Array(W * H);
  const B = jswRoom.build(ram, n);
  if (!B.colours) {
    if (from === undefined) from = B.exits[3] < 60 && B.exits[3] !== n ? B.exits[3] : B.exits[2];
    B.colours = from < 60 ? Array.from(ram.subarray(0x29EB + 8 * from, 0x29EB + 8 * from + 8)) : [1, 1, 1, 1, 1, 1, 1, 1];
  }
  const charset = ram.slice(0x7800, 0x8000);
  charset.set(B.glyphs, 0x21 * 8);
  const screen = B.screen.slice(), colour = B.colour.slice();
  if (items) for (const it of jswRoom.items(ram, n, phase)) { screen[it.offset] = 0x26; colour[it.offset] = it.colour; }
  const bg = [B.vic.bg0, 0, 0, B.vic.bg3];
  for (let row = 0; row < 18; row++) for (let col = 0; col < 32; col++) {
    const o = 40 * row + col + 4, code = screen[o] < 0 ? 0xC0 : screen[o];
    const g = (code & 0x3F) * 8, back = bg[code >> 6] & 15, fore = colour[o] & 15;
    for (let y = 0; y < 8; y++) {
      const bits = charset[g + y];
      for (let x = 0; x < 8; x++) px[(row * 8 + y) * W + col * 8 + x] = bits & (0x80 >> x) ? fore : back;
    }
  }
  const sprite = (data, sx, sy, c, tall) => {
    for (let y = 0; y < 21 * (tall ? 2 : 1); y++) for (let x = 0; x < 24; x++) {
      const yy = tall ? y >> 1 : y;
      if (!(data[yy * 3 + (x >> 3)] & (0x80 >> (x & 7)))) continue;
      const X = sx - 56 + x, Y = sy - 50 + y;
      if (X >= 0 && X < W && Y >= 0 && Y < H) px[Y * W + X] = c & 15;
    }
  };
  const shown = [];
  if (guardians) for (const s of B.sprites) if (!(B.rope && s.n >= 5)) shown.push({ n: s.n, data: ram.subarray(0x4000 + 64 * s.pointer), x: s.x, y: s.y, c: s.colour });
  if (B.rope) {
    const R = jswRope(ram, ropeAt);
    for (let k = 0; k < 3; k++) shown.push({ n: 5 + k, data: R.data.subarray(64 * k), x: R.coords[2 * k], y: R.coords[2 * k + 1], c: B.colours[5 + k], tall: true });
  }
  const s7 = jswRoom.sprite7(n, { mariaGone });
  if (s7 && guardians) {                                  // sprite 7 is the toilet's or Maria's, and
    for (let i = shown.length - 1; i >= 0; i--)           // Maria's room shows no other sprite
      if (shown[i].n === 7 || s7.only) shown.splice(i, 1);
    shown.push({ n: 7, data: ram.subarray(0x4000 + 64 * s7.pointer), x: s7.x, y: s7.y, c: s7.colour });
  }
  shown.sort((a, b) => b.n - a.n);
  for (const s of shown) sprite(s.data, s.x, s.y, s.c, s.tall);
  return { w: W, h: H, px, room: B };
}
// end of jswPicture

/* jswGuardians */
// The guardians of a room as they move, ported from $2FCD, which places them, and $3614 (up and
// down) and $369E (across), which $32D4 runs for each of them on every twelfth pass of the main
// loop. A guardian's record is eight bytes: type (bit 7 across, bit 6 its first direction),
// column, row, base frame, upper bound, frame mask, speed, lower bound. Its state is a count
// and, in bit 7, its direction: down or right while clear. Its place is its sprite's: y in
// pixels, x a column at a time, the ninth bit of x in msb.
function jswGuardians(ram, n) {
  const R = ram.subarray(jswRoom.record(n), jswRoom.record(n) + 256);
  const list = [];
  for (let i = 0; i < R[0xE1]; i++) {
    const rec = ram.slice(0x2443 + 8 * (R[0xE0] + i), 0x2443 + 8 * (R[0xE0] + i) + 8);
    const x = ((rec[1] << 3) & 0xFF) + 0x38;
    list.push({ n: i + 1, rec, state: rec[0] & 0x40 ? 0x80 : 0, coord: rec[1],
                x: x & 0xFF, msb: x > 0xFF ? 1 : 0, y: (((rec[2] << 3) & 0xFF) + 0x32) & 0xFF, pointer: rec[3] });
  }
  const turn = g => { g.state ^= 0x80; };
  function upDown(g) {                                    // $3614
    const r = g.rec;
    if (!(g.state & 0x80)) {
      const y = (g.y + r[6]) & 0xFF;
      if ((((y - 0x32) & 0xFF) >> 3) >= r[4]) return turn(g);
      g.y = y;
      g.state = ((g.state + 1) & 0xFF) & r[5] & 3;
      g.pointer = (r[3] + g.state) & 0xFF;
    } else {
      const y = (g.y - r[6]) & 0xFF, row = ((y - 0x32) & 0xFF) >> 3;
      if (row >= 0x0F || row < r[7]) return turn(g);
      g.y = y;
      g.state = (((g.state - 1) & 0xFF) & r[5] & 3) | 0x80;
      g.pointer = (r[3] + (g.state & 3)) & 0xFF;
    }
  }
  function place(g) {                                     // $36F8: the new column, and the frame
    const x = ((g.coord << 3) & 0xFF) + 0x38;
    g.x = x & 0xFF; g.msb = x > 0xFF ? 1 : 0;
    g.pointer = (r => g.state & 0x80 ? (g.state & 3) + r[3] : (g.state & 3) + r[3] + (r[5] >= 4 ? 4 : 0))(g.rec) & 0xFF;
  }
  function across(g) {                                    // $369E
    const r = g.rec;
    if (!(g.state & 0x80)) {
      const c = (g.state + 1) & 0x0F;
      if ((r[5] & 3) >= c) {
        g.state = c;
        g.pointer = ((c & 3) + r[3] + (r[5] >= 4 ? 4 : 0)) & 0xFF;
        return;
      }
      g.state = 0;
      g.coord = (g.coord + 1) & 0xFF;
      if (g.coord >= r[4]) return turn(g);
      place(g);
    } else {
      const c = ((g.state & 0x7F) - 1) & 0xFF;
      if (!(c & 0x80)) {
        g.state = c | 0x80;
        g.pointer = (c + r[3]) & 0xFF;
        return;
      }
      g.state = 0x83;
      g.coord = (g.coord - 1) & 0xFF;
      if (g.coord & 0x80 || g.coord < r[7]) return turn(g);
      place(g);
    }
  }
  return { list, step() { for (const g of list) (g.rec[0] & 0x80 ? across : upDown)(g); } };
}
// end of jswGuardians

/* jswArrows */
// $314D, on every eighth pass of the main loop: the first 15 of the 16 arrow records at $2403,
// four bytes each: room, with bit 7 set while the arrow flies; a countdown to its flight; its
// column, with bit 7 set going left; its row. An arrow is sprite 6, frame $AA flying right or
// $AB left, a column a step. recs is the 64 bytes of the records, which the game changes as
// they fly and keeps from room to room. step(room) returns what the step left of sprite 6:
// {on, x, msb, y, pointer}, on being true, false or undefined (left as it was), and the sound
// the countdown starts at 10 ('whistle') or stops at 0 ('quiet').
function jswArrows(recs) {
  const sprite = { on: undefined, x: 0, msb: 0, y: 0, pointer: 0xAA };
  function show(pointer, col, row) {                      // $320E
    sprite.pointer = pointer; sprite.y = ((row << 3) + 0x32) & 0xFF;
    const x = ((col << 3) & 0xFF) + 0x38; sprite.x = x & 0xFF; sprite.msb = x > 0xFF ? 1 : 0;
  }
  function step(room) {
    let sound = null;
    for (let i = 0; i < 15; i++) {
      const r = recs.subarray(4 * i, 4 * i + 4);
      if ((r[0] & 0x7F) !== room) continue;
      if (!(r[0] & 0x80)) {
        r[1] = (r[1] - 1) & 0xFF;
        if (r[1] === 10) { sound = 'whistle'; continue; }
        if (r[1] !== 0) continue;
        sound = 'quiet'; r[0] |= 0x80; sprite.on = true;
      }
      if (!(r[2] & 0x80)) {
        const x = r[2] + 1;
        if (x < 0x20) { r[2] = x; show(0xAA, x, r[3]); }
        else { r[2] = 0; sprite.y = 0; r[0] &= 0x7F; sprite.on = false; }
      } else {
        const x = (r[2] & 0x7F) - 1;
        if (x >= 0) { r[2] = x | 0x80; show(0xAB, x, r[3]); }
        else { r[2] = 0x9F; sprite.y = 0; r[0] &= 0x7F; }
      }
    }
    return { sprite, sound };
  }
  return { step, sprite };
}
// end of jswArrows

/* jswSwing */
// The rope's swing, $1720-$1789, moved on each time $16A2 stages the rope: positions 0-16 are one
// side of the swing and 17-33 the other, 0 and 17 the rope hanging straight. A room starts it at
// position 16, half 1, step -1 ($30B5).
function jswSwing() {
  const s = { pos: 16, half: 1, step: 0xFF };
  s.next = function () {
    const p = (s.pos + s.step) & 0xFF;
    if (s.half & 0x80) {
      if (p === 0x10) { s.pos = 0; s.step = 1; s.half = 1; }
      else if (p === 0x22) { s.pos = 0x21; s.step = 0xFF; s.half = 0xFF; }
      else s.pos = p;
    } else {
      if (p === 0xFF) { s.pos = 0x11; s.step = 1; s.half = 0xFF; }
      else if (p === 0x11) { s.pos = 0x10; s.step = 0xFF; s.half = 1; }
      else s.pos = p;
    }
    return s.pos;
  };
  return s;
}
// end of jswSwing

/* jswConveyors */
// The play interrupt's conveyors, $3495-$34DE, every frame: a bit's rotation of the conveyor-glyph
// rows that the 19 pointers at $2271 point to, to the right, and the 22 at $2297, to the left, in
// the room records themselves, then a copy of the current room's conveyor glyph, offsets $C0-$C7
// of its record, to glyph $25. ram is changed in place; it returns the eight bytes of glyph $25.
function jswConveyors(ram, n) {
  for (let i = 18; i >= 0; i--) {
    const a = ram[0x2271 + 2 * i] | ram[0x2272 + 2 * i] << 8, v = ram[a];
    ram[a] = (v >> 1) | (v & 1 ? 0x80 : 0);
  }
  for (let i = 21; i >= 0; i--) {
    const a = ram[0x2297 + 2 * i] | ram[0x2298 + 2 * i] << 8, v = ram[a];
    ram[a] = ((v << 1) & 0xFF) | (v & 0x80 ? 1 : 0);
  }
  return ram.slice(jswRoom.record(n) + 0xC0, jswRoom.record(n) + 0xC8);
}
// end of jswConveyors

/* jswScene */
// A room in motion with nobody in it, built from the ports above at the game's pace: the main
// loop's passes, three to a frame (measured in The Bathroom), move the guardians every twelfth,
// the arrows every eighth, the items' colours every eighteenth and the rope every twelfth, and
// every frame the play interrupt turns the conveyors. ram is copied, since the conveyors and the
// arrows change the game's tables as they go. draw() returns 256 by 144 palette indices, as
// jswPicture does.
function jswScene(ram0, n, { from } = {}) {
  const ram = ram0.slice(), B = jswRoom.build(ram, n), G = jswGuardians(ram, n);
  const A = jswArrows(ram.subarray(0x2403, 0x2443)), S = B.rope ? jswSwing() : null;
  if (!B.colours) {
    if (from === undefined) from = B.exits[3] < 60 && B.exits[3] !== n ? B.exits[3] : B.exits[2];
    B.colours = from < 60 ? Array.from(ram.subarray(0x29EB + 8 * from, 0x29EB + 8 * from + 8)) : [1, 1, 1, 1, 1, 1, 1, 1];
  }
  const st = { pass: 0, phase: 8, items: 1, arrows: 4, guardians: 12, player: 6, rope: 2, special: 0,
               arrowOn: false, glyph25: B.glyphs.slice(0x20, 0x28) };
  function pass() {
    st.pass++;
    if (--st.items === 0) { st.items = 18; st.phase = (st.phase + 1) & 0xFF; st.itemPhase = st.phase; st.phase = (st.phase + 80) & 0xFF; }
    if (--st.arrows === 0) { st.arrows = 8; const { sprite } = A.step(n); if (sprite.on !== undefined) st.arrowOn = sprite.on; }
    if (n === 33 || n === 35) st.special = (st.special + 1) & 0xFF;
    if (--st.guardians === 0) { st.guardians = 12; G.step(); }
    if (--st.player === 0) { st.player = 6; if (S && --st.rope === 0) { st.rope = 2; st.ropeAt = S.pos; S.next(); } }
  }
  function frame() { for (let k = 0; k < 3; k++) pass(); st.glyph25 = jswConveyors(ram, n); }
  function draw({ guardians = true, items = true } = {}) {
    const W = 256, H = 144, px = new Uint8Array(W * H);
    const charset = ram.slice(0x7800, 0x8000);
    charset.set(B.glyphs, 0x21 * 8); charset.set(st.glyph25, 0x25 * 8);
    const screen = B.screen.slice(), colour = B.colour.slice();
    if (items) for (const it of jswRoom.items(ram, n, st.itemPhase === undefined ? 8 : st.itemPhase)) { screen[it.offset] = 0x26; colour[it.offset] = it.colour; }
    const bg = [B.vic.bg0, 0, 0, B.vic.bg3];
    for (let row = 0; row < 18; row++) for (let col = 0; col < 32; col++) {
      const o = 40 * row + col + 4, code = screen[o] < 0 ? 0xC0 : screen[o];
      const g = (code & 0x3F) * 8, back = bg[code >> 6] & 15, fore = colour[o] & 15;
      for (let y = 0; y < 8; y++) {
        const bits = charset[g + y];
        for (let x = 0; x < 8; x++) px[(row * 8 + y) * W + col * 8 + x] = bits & (0x80 >> x) ? fore : back;
      }
    }
    const shown = new Map();
    if (guardians) {
      for (const q of G.list) shown.set(q.n, { data: ram.subarray(0x4000 + 64 * q.pointer), x: q.x | q.msb << 8, y: q.y, c: B.colours[q.n] });
      if (st.arrowOn) { const s = A.sprite; shown.set(6, { data: ram.subarray(0x4000 + 64 * s.pointer), x: s.x | s.msb << 8, y: s.y, c: B.colours[6] }); }
      if (B.rope) {
        const R = jswRope(ram, st.ropeAt === undefined ? 16 : st.ropeAt);
        for (let k = 0; k < 3; k++) shown.set(5 + k, { data: R.data.subarray(64 * k), x: R.coords[2 * k], y: R.coords[2 * k + 1], c: B.colours[5 + k], tall: true });
      }
      const s7 = jswRoom.sprite7(n, { pass: st.special });
      if (s7) { if (s7.only) shown.clear(); shown.set(7, { data: ram.subarray(0x4000 + 64 * s7.pointer), x: s7.x, y: s7.y, c: s7.colour }); }
    }
    for (const k of [...shown.keys()].sort((a, b) => b - a)) {
      const s = shown.get(k);
      for (let y = 0; y < 21 * (s.tall ? 2 : 1); y++) for (let x = 0; x < 24; x++) {
        const yy = s.tall ? y >> 1 : y;
        if (!(s.data[yy * 3 + (x >> 3)] & (0x80 >> (x & 7)))) continue;
        const X = s.x - 56 + x, Y = s.y - 50 + y;
        if (X >= 0 && X < W && Y >= 0 && Y < H) px[Y * W + X] = s.c & 15;
      }
    }
    return { w: W, h: H, px };
  }
  return { room: B, guardians: G, arrows: A, swing: S, state: st, pass, frame, draw };
}
// end of jswScene
