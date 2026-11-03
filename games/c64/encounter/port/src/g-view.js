// The view: the two screens drawn into by turns ($08), the objects in sight found, sorted by range
// and drawn farthest first as scaled shapes of character cells, each shape's edges built in
// characters of their own; the ground half made by turning the sky half over; the stargate as a
// rectangle; the scene's colours and the backdrop's six sprites turned with the player.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
G.view = function (P) {
  const M = P.M;
  const io = P.io;
  const T = () => P.T;
  const F9 = (y) => ((M[0xF9] | M[0xFA] << 8) + y) & 0xFFFF;
  const FB = (y) => ((M[0xFB] | M[0xFC] << 8) + y) & 0xFFFF;
  const FD = (y) => ((M[0xFD] | M[0xFE] << 8) + y) & 0xFFFF;
  const F7 = (y) => ((M[0xF7] | M[0xF8] << 8) + y) & 0xFFFF;
  // the N flag of a compare of Y with v
  const neg = (y, v) => ((y - v) & 0x80) !== 0;

  // begin_frame_swap_buffer ($B1A1): the next frame's screen ($08's bit 0: $6000 even, $6400 odd),
  // its view rows 2-9 cleared, and the character allocator started for its character set ($4000
  // or $5000): the next character $80 ($05), its bytes at $4400 or $5400 ($FD:$FE). The carry
  // comes back as $08's bit 0.
  P.begin_frame_swap_buffer = function () {
    M[0x08] = (M[0x08] + 1) & 255;
    const odd = M[0x08] & 1, base = odd ? 0x6400 : 0x6000;
    for (let x = 0xA0; x > 0; x--) { M[base + 0x4F + x] = 0; M[base + 0xEF + x] = 0; }
    M[0x05] = 0x80; M[0xFE] = odd ? 0x54 : 0x44; M[0xFD] = 0;
    M[0x09] = odd ? 0x0A : 0x08; M[0x0A] = odd ? 0x63 : 0x5F;
    return { a: M[0x0A], c: odd };
  };
  // finish_frame_mirror_ground ($B1EC): rows 2-9 of the frame's screen copied, inverted, into rows
  // 17-10, and the characters built so far copied turned over into the mirror set ($4800-$4FFF or
  // $5800-$5FFF) that the ground's rows show.
  P.finish_frame_mirror_ground = function () {
    const odd = M[0x08] & 1, s = odd ? 0x6400 : 0x6000, c = odd ? 0x5000 : 0x4000;
    for (let x = 0x27; x >= 0; x--) {
      for (let k = 0; k < 8; k++) M[s + 40 * (17 - k) + x] = M[s + 40 * (2 + k) + x] ^ 0xFF;
    }
    let x = ((M[0x05] << 3) & 255) | 7, y = x ^ 0xFF;
    do {
      for (let k = 0; k < 8; k++) M[c + 0xF00 - 0x100 * k + y] = M[c + 0x100 * k + x];
      P.count('mirror');
      x = (x - 1) & 255; y = (y + 1) & 255;
    } while (y !== 0);
  };

  // scan_visible_objects ($B77F): the objects $90 down to 1 within $60 of the player on both axes,
  // and inside the view's angle: each one's bearing ($14C0 and $1520), range ($1740) and shape size
  // ($1400, from $8800) kept, and listed at $1460 ($0F of them); a size with its top bit set (too
  // near or too far) is not listed. An obelisk (slots 24 and up) within 4 units is $2D, the one the
  // player's moves check, and its bearing and range are kept though it is out of the view's angle.
  P.scan_visible_objects = function () {
    const t = T();
    let x = M[0x90];
    M[0x0F] = 0;
    M[0x1E] = M[t.OCT]; M[0x1F] = M[t.FINE];
    M[0x2D] = 0;
    x = (x + 1) & 255;
    for (;;) {
      x = (x - 1) & 255;
      if (x === 0) return { x: 0 };
      if (!M[t.STATE + x]) continue;
      let d = (M[t.XH] - M[t.XH + x]) & 255;
      if (d >= 0x60 && d < 0x9F) continue;
      d = (M[t.ZH] - M[t.ZH + x]) & 255;
      if (d >= 0x60 && d < 0x9F) continue;
      P.count('scan');
      let a = P.object_delta_octant({ x, y: 0 }).a;
      let b;
      if (x >= 0x18 && M[0x26] < 4 && M[0x28] < 4) {
        M[0x2D] = x;
        b = P.bearing_from_viewer();
        if (!b.z && b.a !== 7) {
          M[0x14C0 + x] = b.a;
          M[0x1740 + x] = P.log_distance_code().a;
          continue;
        }
      } else {
        const o = (a - M[t.OCT]) & 7;
        if (o !== 0 && o !== 1 && o !== 7) continue;
        b = P.bearing_from_viewer();
        if (!b.z && b.a !== 7) continue;
      }
      // add_object_to_view_list
      M[0x14C0 + x] = b.a;
      M[0x1520 + x] = b.y;
      M[0x0F] = (M[0x0F] + 1) & 255;
      M[0x1460 + M[0x0F]] = x;
      a = P.log_distance_code().a;
      M[0x1740 + x] = a;
      M[0x1400 + x] = M[0x8800 + a];
      if (M[0x1400 + x] & 0x80) M[0x0F] = (M[0x0F] - 1) & 255;
    }
  };
  // sort_view_list_by_range ($B829): the list sorted, each place from the last down taking the
  // farthest of those left ($15 its place, $10 the object), so that entry 1 is the nearest.
  P.sort_view_list_by_range = function (r) {
    let y = M[0x0F];
    if (!y) return { x: r.x };
    do {
      M[0x17] = y;
      let x = M[0x1460 + y];
      let a = M[0x1740 + x];
      M[0x15] = y; M[0x10] = x;
      for (let j = y - 1; j > 0; j--) {
        x = M[0x1460 + j];
        if (a < M[0x1740 + x]) { a = M[0x1740 + x]; M[0x15] = j; M[0x10] = x; }
        P.count('sort');
      }
      y = M[0x17];
      M[0x1460 + M[0x15]] = M[0x1460 + y];
      M[0x1460 + y] = M[0x10];
      y--;
    } while (y);
    return { x: M[0x15] };
  };
  // draw_visible_objects ($B868): the list drawn from the farthest: each object's shape (its type's
  // family with the size), its column from the bearing ($12, and $04 a quarter of it), its shade
  // (the type's low bits); the enemy's column kept in $65. In the stargate's mode ($83) only up to
  // the gate is drawn, or the sky filled if it is not in sight. $65 is first set to X as the sort
  // left it.
  P.draw_visible_objects = function (r) {
    const t = T();
    if (M[0x83]) {
      // find_gate_in_view_list ($B859): from entry $0F down to 1; with none in view, from 0 down
      // through the 256 bytes from $1460, the bearings' tables among them
      let y = M[0x0F], found = false;
      do { if (M[0x1460 + y] === 3) { found = true; break; } y = (y - 1) & 255; } while (y);
      if (!found) return P.fill_gate_mode_rows();
    }
    M[0x65] = r.x;
    let i = M[0x0F];
    if (!i) return {};
    do {
      M[0x11] = i;
      const x = M[0x1460 + i];
      const y = (M[t.TYPE + x] & 0xE0) | M[0x1400 + x];
      const oct = M[0x14C0 + x];
      M[0xFF] = oct >> 1;
      const a = (((oct & 1) << 7) | (M[0x1520 + x] >> 1)) ^ 0x80;
      M[0x12] = a;
      M[0x04] = a >> 2;
      if (x === 2) M[0x65] = M[0x04];
      const shade = M[t.TYPE + x] & 3;
      M[0x8F] = x;
      P.count('object');
      if (x === 3 && M[0x83]) { P.draw_shape({ x: shade, y }); return {}; }
      P.draw_shape({ x: shade, y });
      i = M[0x11] - 1;
    } while (i);
    return {};
  };

  // draw_shape ($AD76): shape Y (its script at $9600/$9700) at column $04 of the frame's view, in
  // shade X: the solid character ($0B, $BC81) and the pattern of its fill ($8E, $BD81); a shape
  // number from $E0 is the stargate (draw_stargate_rect). The script's header says where its rows
  // start and whether it has four variants for the column's quarter-cell ($12's low bits) or two
  // drawn either way round (draw_shape_mirrored). Its bytes: 0 the end, $01-$1E a row's start
  // column (the row below), $20-$3F a run of solid cells, $40 and up an edge cell's profile, $1F n
  // the narrow profile n.
  P.draw_shape = function (r) {
    const x = r.x;
    M[0x06] = x;
    M[0x0B] = M[0xBC81 + x];
    M[0x8E] = M[0xBD81 + x];
    if (r.y >= 0xE0) return P.draw_stargate_rect();
    M[0xF7] = M[0x9600 + r.y]; M[0xF8] = M[0x9700 + r.y];
    const head = M[F7(0)];
    const four = head >> 7;
    let s = ((head << 1) & 255) + 0x14;
    let a = s & 255;
    let c = a >> 7;
    a = (a << 1) & 255;
    M[0xF9] = a;
    M[0xFA] = (M[0x0A] + c) & 255;
    a = M[0x12] & 3;
    let start;
    if (four) {
      start = a === 3 ? 3 : M[F7(a + 1)];
    } else {
      if (a >> 1) return P.draw_shape_mirrored({ a: 1, c: a & 1 });
      start = a & 1 ? 1 : M[F7(1)];
    }
    M[0x15] = start;
    return draw_forward();
  };
  function draw_forward() {
    const next = () => { M[0x15] = (M[0x15] + 1) & 255; P.count('byte'); return M[F7(M[0x15])]; };
    let a = next();
    for (;;) {
      if (a === 0) return {};
      if (a >= 0x40) {
        // draw_shape_edge_byte
        if (M[0x02] >= 0xD8) P.draw_edge_cell({ a, y: M[0x02] });
        M[0x02] = (M[0x02] + 1) & 255;
        if (!(M[0x02] & 0x80)) { a = skip_row(); if (a === null) return {}; continue; }
        a = next(); continue;
      }
      if (a === 0x1F) {
        // draw_shape_edge_alt_byte
        const y = (M[0x15] + 1) & 255;
        M[0x15] = y;
        const v = M[F7(y)];
        if (M[0x02] >= 0xD8) P.draw_edge_cell_alt({ a: v, y: M[0x02] });
        M[0x02] = (M[0x02] + 1) & 255;
        if (!(M[0x02] & 0x80)) { a = skip_row(); if (a === null) return {}; continue; }
        a = next(); continue;
      }
      if (a < 0x1F) { a = row_start(a); if (a === null) return {}; continue; }
      // a run of solid cells
      let n = a & 0x1F;
      if (n) {
        let y = M[0x02], past = false;
        const ch = M[0x0B];
        do {
          if (y >= 0xD8) M[F9(y)] = ch;
          P.count('fill');
          y = (y + 1) & 255;
          if (!(y & 0x80)) { past = true; break; }
          n--;
        } while (n);
        if (past) { a = skip_row(); if (a === null) return {}; continue; }
        M[0x02] = y;
      }
      M[0x03] = M[0x06] | 4;
      a = next();
    }
    // draw_shape_skip_row ($ADF3): the row's bytes passed over to the next row's start, or the end
    // (null); then the row started
    function skip_row() {
      for (;;) {
        M[0x15] = (M[0x15] + 1) & 255;
        P.count('byte');
        const v = M[F7(M[0x15])];
        if (!v) return null;
        if (v === 0x1F) M[0x15] = (M[0x15] + 1) & 255;
        if (v < 0x11) return v;
      }
    }
    // draw_shape_row_start ($AE05): the column ($02) of the next row's first cell, that row's
    // address; a row that starts past the right edge is passed over
    function row_start(v) {
      for (;;) {
        M[0xFF] = v;
        M[0x02] = (M[0x04] + 0xCD - v) & 255;
        const s = M[0xF9] + 0x28;
        M[0xF9] = s & 255;
        if (s > 255) M[0xFA] = (M[0xFA] + 1) & 255;
        if (M[0x02] & 0x80) { M[0x03] = M[0x06]; return next(); }
        v = skip_row();
        if (v === null) return null;
      }
    }
  }
  // draw_shape_mirrored ($AE49): the script read right to left from its column, for a two-variant
  // shape's third and fourth quarter-cells.
  P.draw_shape_mirrored = function (r) {
    let a = ((r.a << 1) | r.c) ^ 3;
    M[0x15] = a ? 1 : M[F7(1)];
    const next = () => { M[0x15] = (M[0x15] + 1) & 255; P.count('byte'); return M[F7(M[0x15])]; };
    function skip_row() {
      for (;;) {
        M[0x15] = (M[0x15] + 1) & 255;
        P.count('byte');
        const v = M[F7(M[0x15])];
        if (!v) return null;
        if (v === 0x1F) M[0x15] = (M[0x15] + 1) & 255;
        if (v < 0x11) return v;
      }
    }
    function row_start(v) {
      for (;;) {
        M[0x02] = (v + 0xCB + M[0x04]) & 255;
        const s = M[0xF9] + 0x28;
        M[0xF9] = s & 255;
        if (s > 255) M[0xFA] = (M[0xFA] + 1) & 255;
        if (!neg(M[0x02], 0xD8)) { M[0x03] = M[0x06] | 4; return next(); }
        v = skip_row();
        if (v === null) return null;
      }
    }
    // a step left after an edge cell: on, or the row's end
    function stepLeft() {
      M[0x02] = (M[0x02] - 1) & 255;
      if (neg(M[0x02], 0xD8)) return skip_row();
      return next();
    }
    a = next();
    for (;;) {
      if (a === null || a === 0) return {};
      if (a >= 0x40) {
        if (M[0x02] & 0x80) P.draw_edge_cell({ a, y: M[0x02] });
        a = stepLeft(); continue;
      }
      if (a === 0x1F) {
        const y = (M[0x15] + 1) & 255;
        M[0x15] = y;
        const v = M[F7(y)];
        if (M[0x02] & 0x80) P.draw_edge_cell_alt({ a: v, y: M[0x02] });
        a = stepLeft(); continue;
      }
      if (a < 0x1F) { a = row_start(a); continue; }
      let n = a & 0x1F;
      if (n) {
        let y = M[0x02], past = false;
        const ch = M[0x0B];
        do {
          if (y & 0x80) M[F9(y)] = ch;
          P.count('fill');
          y = (y - 1) & 255;
          if (neg(y, 0xD8)) { past = true; break; }
          n--;
        } while (n);
        if (past) { a = skip_row(); continue; }
        M[0x02] = y;
      }
      M[0x03] = M[0x06];
      a = next();
    }
  };

  // draw_edge_cell ($AEDB) and draw_edge_cell_alt ($B053): profile A in the cell at ($F9),Y: each of
  // its eight rows a pair mask and pattern ($BC85/$BD05, the profile's row byte from $8FC0-$9500, or
  // the narrow set $9800-$9B80, with the shade's bits in $03) laid over the cell's character. A cell
  // that still holds one of the four fill characters gets a new character of its own first
  // (draw_edge_cell_new_char, draw_cell_alloc_new_char), from the fill's pattern.
  const WIDE = [0x8FC0, 0x9080, 0x9140, 0x9200, 0x92C0, 0x9380, 0x9440, 0x9500];
  const NARROW = [0x9800, 0x9880, 0x9900, 0x9980, 0x9A00, 0x9A80, 0x9B00, 0x9B80];
  function edge(r, tabs) {
    M[0x10] = r.a;
    const ch = M[F9(r.y)];
    if (!(ch & M[0xBC7E])) return newChar(ch, r.y, tabs);
    M[0xFB] = (ch << 3) & 255;
    M[0xFC] = ((M[0x09] << 3) | (ch >> 5)) & 255;
    P.count('edge');
    for (let k = 0; k < 8; k++) {
      const x = M[tabs[k] + M[0x10]] | M[0x03];
      M[FB(k)] = (M[FB(k)] & M[0xBC85 + x]) | M[0xBD05 + x];
    }
    return {};
  }
  function newChar(ch, y, tabs) {
    const x = ((ch << 4) & 0xF0) | (ch >> 5);
    M[0x07] = M[0xBD81 + x];
    M[F9(y)] = M[0x05];
    P.count('newchar');
    for (let k = 0; k < 8; k++) {
      const i = M[tabs[k] + M[0x10]] | M[0x03];
      M[FD(k)] = (M[0x07] & M[0xBC85 + i]) | M[0xBD05 + i];
    }
    return P.alloc_next_char();
  }
  P.draw_edge_cell = r => edge(r, WIDE);
  P.draw_edge_cell_alt = r => edge(r, NARROW);
  // alloc_next_char ($B035): the next character code ($05, $20 on, the carry over into bit 0: the
  // codes whose bits 5 and 6 are clear are the four fills') and where its bytes go ($FD:$FE).
  P.alloc_next_char = function () {
    const s = M[0x05] + 0x20;
    M[0x05] = ((s & 255) + (s >> 8)) & 255;
    M[0xFE] = ((M[0xFE] + 1) & 0xF7) & 255;
    if (!(M[0xFE] & 7)) M[0xFD] = (M[0xFD] + 8) & 255;
    return {};
  };

  // draw_stargate_rect ($BA04): the stargate, a rectangle its range wide and its height from the
  // horizon, in the shade's character; the whole sky filled ($83, the gate's mode, the player
  // inside) but for a hole the gate's size. Its edges are patched cells (patch_rect_edge_cell).
  P.draw_stargate_rect = function () {
    const x = M[0x8F];
    M[0x20] = M[0x8D00 + M[0x1740 + x]];
    let a = M[0x75];
    if (!(a & 0x80)) {
      M[0x6B] = P.mul8x8_y_entry({ y: (a << 1) & 255, c: 0 }).a;
      M[0x6A] = 0;
    } else {
      const m = P.mul8x8_y_entry({ y: (a << 1) & 255, c: 1 });
      M[0x6A] = m.a;
      M[0x6B] = P.mul8x8_y_entry({ y: 0xFE, c: m.c }).a;
    }
    a = M[0x6B] || 1;
    M[0x7D] = a;
    M[0x7E] = a >> 3;
    a = M[0x6A] || 1;
    let c = a & 1;
    a >>= 1;
    M[0x7F] = a;
    let s = a + M[0x12] + c;
    if (s > 255) a = 0x9F;
    else {
      s -= 0x31;
      if (s < 0) return P.fill_gate_mode_rows();
      a = s < 0xA0 ? s : 0x9F;
    }
    M[0x81] = a;
    M[0x82] = a >> 2;
    s = M[0x12] - M[0x7F];
    if (s < 0) a = 0;
    else { s -= 0x30; a = s < 0 ? 0 : s; }
    if (a >= 0xA0) return P.fill_gate_mode_rows();
    M[0x7F] = a;
    M[0x80] = a >> 2;
    let i;
    if (M[0x80] === M[0x82]) {
      M[0xFF] = M[0x81] & 3;
      i = ((M[0x7F] & 3) << 2) | M[0xFF];
    } else {
      M[0x84] = M[0xBC02 + (M[0x7F] & 3)] ^ M[0x83];
      M[0x87] = (M[0x84] ^ 0xFF) & M[0x8E];
      i = M[0x81] & 3;
    }
    M[0x85] = M[0xBC06 + i] ^ M[0x83];
    M[0x88] = (M[0x85] ^ 0xFF) & M[0x8E];
    M[0xF9] = 0x68;
    M[0xFA] = (M[0x0A] + 2) & 255;
    M[0x8A] = M[0x8B] = M[0x8D] = 0xFF;
    M[0x8C] = 7;
    const up = () => {
      const d = M[0xF9] - 0x28;
      M[0xF9] = d & 255;
      M[0xFA] = (M[0xFA] - (d < 0 ? 1 : 0)) & 255;
    };
    for (;;) {
      // rect_next_row
      M[0x8A] = (M[0x8A] + 1) & 255;
      if (M[0x8A] === 8) return {};
      if (M[0x8A] === M[0x7E]) {
        const v = (M[0x7D] & 7) ^ 7;
        M[0x8B] = v;
        if (!M[0x83]) M[0x8D] = v;
      }
      let y = M[0x80];
      if (y !== M[0x82]) { P.patch_rect_edge_cell({ a: M[0x84], x: M[0x87], y }); y = M[0x82]; }
      P.patch_rect_edge_cell({ a: M[0x85], x: M[0x88], y });
      a = M[0x0B];
      let toB39 = false;
      if (M[0x83]) {
        for (y = 0x27; y !== M[0x82] && !(y & 0x80); y = (y - 1) & 255) { M[F9(y)] = a; P.count('rect'); }
        for (y = (M[0x80] - 1) & 255; !(y & 0x80); y = (y - 1) & 255) { M[F9(y)] = a; P.count('rect'); }
      } else if (!(M[0x8B] & 0x80)) toB39 = true;
      else {
        y = M[0x80];
        if (y !== M[0x82]) for (y = (y + 1) & 255; y !== M[0x82]; y = (y + 1) & 255) { M[F9(y)] = a; P.count('rect'); }
      }
      if (!toB39) {
        a = M[0x8B];
        if (a & 0x80) { up(); continue; }
      }
      // b_BB39: the bottom of the gate reached
      if (M[0x83]) { M[0x8C] = a; M[0x80] = (M[0x80] - 1) & 255; M[0x82] = (M[0x82] + 1) & 255; }
      y = M[0x80];
      if (y !== M[0x82]) {
        for (y = (y + 1) & 255; y !== M[0x82]; y = (y + 1) & 255) {
          M[0x15] = y;
          P.patch_rect_edge_cell({ a: 0, x: M[0x8E], y });
          y = M[0x15];
        }
      }
      if (!M[0x83]) return {};
      for (let k = M[0x8A] + 1; k !== 8; k++) {
        up();
        a = M[0x0B];
        for (y = 0x27; !(y & 0x80); y--) { M[F9(y)] = a; P.count('rect'); }
      }
      return {};
    }
  };
  // fill_gate_mode_rows ($BB81): in the gate's mode, the sky's eight rows filled with character $40.
  P.fill_gate_mode_rows = function () {
    if (!M[0x83]) return {};
    M[0x0B] = 0x40;
    M[0xF9] = 0x68;
    M[0xFA] = (M[0x0A] + 2) & 255;
    for (let k = 0; k < 8; k++) {
      if (k) {
        const d = M[0xF9] - 0x28;
        M[0xF9] = d & 255;
        M[0xFA] = (M[0xFA] - (d < 0 ? 1 : 0)) & 255;
      }
      for (let y = 0x27; y >= 0; y--) { M[F9(y)] = 0x40; P.count('rect'); }
    }
    return {};
  };
  // patch_rect_edge_cell ($BB99): the cell at ($F9),Y kept by mask A and patterned by X, from row
  // $8C down to the row after $8D; a fill character gets a new character first, filled above and
  // below the patched rows.
  P.patch_rect_edge_cell = function (r) {
    M[0x86] = r.a; M[0x89] = r.x;
    const ch = M[F9(r.y)];
    P.count('patch');
    if (ch & M[0xBC7E]) {
      M[0xFB] = (ch << 3) & 255;
      M[0xFC] = ((M[0x09] << 3) | (ch >> 5)) & 255;
      let y = M[0x8C];
      if (y === M[0x8D]) return {};
      do { M[FB(y)] = (M[FB(y)] & M[0x86]) | M[0x89]; y = (y - 1) & 255; } while (y !== M[0x8D]);
      return {};
    }
    const x = ((ch << 4) & 0xF0) | (ch >> 5);
    M[0x07] = M[0xBD81 + x];
    M[F9(r.y)] = M[0x05];
    let y = 7;
    for (; y !== M[0x8C]; y = (y - 1) & 255) M[FD(y)] = M[0x07];
    const v = (M[0x07] & M[0x86]) | M[0x89];
    for (; y !== M[0x8D]; y = (y - 1) & 255) M[FD(y)] = v;
    if (y !== 0xFF) for (; !(y & 0x80); y = (y - 1) & 255) M[FD(y)] = M[0x07];
    return P.alloc_next_char();
  };

  // apply_scene_if_changed ($B918) and apply_scene ($B920): scene $63's sixteen bytes ($8010 +
  // $63) to $AB-$BA: the view's colours, the backdrop sprites' size and enable, the bands' colours
  // (to $BB-$BE as well); for a level (not the warp, $63 from $80), its backdrop's 24 sprite
  // pictures, their heights and the six sprites' angles ($8F40-$8F68, from $2600 + $63 x 4); and
  // the view's colour RAM in the fire light's colour $AE.
  P.apply_scene_if_changed = function () {
    if (M[0x63] === M[0x66]) return {};
    M[0x66] = M[0x63];
    return P.apply_scene();
  };
  P.apply_scene = function () {
    let y = M[0x63] | 0x0F;
    for (let x = 0x0F; x >= 0; x--) { M[0xAB + x] = M[0x8010 + y]; y--; }
    io.vicWrite(0x1D, M[0xAF]); io.vicWrite(0x17, M[0xB0]); io.vicWrite(0x15, M[0xB1]);
    P.store(0xBB, M[0xAC]); P.store(0xBC, M[0xB2]); P.store(0xBD, M[0xB3]); P.store(0xBE, M[0xB4]);
    if (!(M[0x63] & 0x80)) {
      // ($63 x 2) | $10, shifted twice more into $26: the backdrop's 64 bytes at $2600 + 4 x that
      let a = ((M[0x63] << 1) & 255) | 0x10;
      let f8 = 0x26;
      for (let i = 0; i < 2; i++) { const c = a >> 7; a = (a << 1) & 255; f8 = ((f8 << 1) | c) & 255; }
      M[0xF8] = f8; M[0xF7] = a;
      y = 0x3F;
      for (let x = 0x17; x >= 0; x--) { M[0x8F68 + x] = M[F7(y)]; y--; }
      for (let x = 0x17; x >= 0; x--) { M[0x8F40 + x] = M[F7(y)]; y--; }
      for (let x = 0x0A; x >= 0; x -= 2) { M[0x8F59 + x] = M[F7(y)]; y--; }
      for (let x = 0x0A; x >= 0; x -= 2) M[0x8F58 + x] = 0xFF;
    }
    const a = M[0xAE];
    for (let x = 0xA0; x > 0; x--) {
      io.colourWrite(0x4F + x, a); io.colourWrite(0xEF + x, a); io.colourWrite(0x18F + x, a); io.colourWrite(0x22F + x, a);
    }
    return {};
  };
  // update_scenery_sprites ($B9A5): the backdrop's six sprites (2-7) placed by their angles less the
  // player's heading, the ninth bits of X gathered in $FF for $D010; a sprite whose quarter of the
  // circle changed takes that quarter's picture and height.
  P.update_scenery_sprites = function () {
    const t = T();
    for (let x = 0x0A; x >= 0; x -= 2) {
      let a = M[0x8F59 + x] << 1;
      let c = a >> 8;
      a &= 255;
      let v = (M[0x1E] << 1) | c;
      M[0x1E] = v & 255;
      let d = a - M[t.FINE];
      const y = d & 255;
      c = d >= 0 ? 1 : 0;
      d = (M[0x1E] & 1) - M[t.OCT] - (1 - c);
      a = d & 255;
      c = a & 1;
      a >>= 1;
      M[0x1F] = a;
      v = (M[0xFF] << 1) | c;
      M[0xFF] = v & 255;
      a = (M[0xFF] & 1) + (y >= 0xA0 ? 1 : 0);
      c = (a >> 1) & 1;
      a = y;
      if (c) { a = (y - M[0xC0]) & 255; M[0x1F] = (M[0x1F] + 1) & 255; }
      io.vicWrite(0x04 + x, a);
      a = M[0x1F] & 3;
      if (a === M[0x8F58 + x]) continue;
      M[0x8F58 + x] = a;
      const i = ((x << 1) & 255) | a;
      const p = M[0x8F40 + i];
      io.vicWrite(0x05 + x, M[0x8F68 + i]);
      M[0x63FA + (x >> 1)] = p; M[0x67FA + (x >> 1)] = p;
    }
    io.vicWrite(0x10, (M[0xFF] << 2) & 255);
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
