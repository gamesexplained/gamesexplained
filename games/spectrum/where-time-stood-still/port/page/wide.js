// The Play page's wide view: the picture the game would draw were its view somewhere else on the
// map at the same moment, for as much of the map round the view as the screen has room for.
//
// The page keeps a copy of the machine from each pass of the main loop, taken where the pass
// starts to draw the actors ($86D9): the view scrolled and copied to the screen not shown, the
// actors moved. A piece of the wide picture is drawn on that copy by the game's own routines, as
// a pass would draw it with its view standing there: the view's place set ($9631-$9637), the actors
// far from it put back ($DCB9) and the creatures and objects near it brought in ($DC0B), the
// scenery drawn into the view's buffer ($A012) and copied to the screen not shown ($963B), then the
// rope, the shots, the actors and the objects drawn over it ($E6B3, $C21B, $A6F4). The piece is the
// view's 28 characters by 18, read back from that screen; the copy is set back before the next
// piece, and nothing done to it reaches the game.
//
// An area's map overlaps the next one's by a view: the game moves the view into the area to the
// east when its column reaches 228, and to the south when its row reaches 108 ($DB0B). A piece
// that does not lie inside the view's area is drawn in the neighbour it lies inside, on a copy
// that has crossed into it as the game crosses: the actors carried ($DBDD), the objects carried
// twice ($F72A) and the area loaded ($87CF). Areas 12 and 15 have no scenery, and the plateau
// ends at the edge of its four areas by four: there the picture has nothing.
//
//   const wide = WTWide.create()
//   wide.snap(rt, old)     the copy of the page's machine (page/runtime.js) as it stands:
//                          { t, bank, area, view: { col, row, half, pixel }, colour, windows };
//                          bank is the screen the pass draws into, 5 or 7, which is shown from the
//                          next pass's flip, t the clock's time, colour the view's ($AA7D); old, a
//                          copy no longer wanted, lends it its memory
//   wide.windows(snap, rt) the windows the pass drew over that screen ($ABBB), noted on the copy:
//                          [{ col, row, cols, rows }] in the screen's characters
//   wide.render(snap, x, y, w, h, out, anchor)
//                          the picture w by h pixels from (x, y) on the map of the view's area, in
//                          its pixels (the view's top left is at 8 x col + 4 x half, 8 x row +
//                          pixel): a byte a pixel, 1 ink, 0 paper, 2 off the plateau; out, if
//                          given, is filled rather than a new array; anchor { col, row }, for the
//                          tests, lays the grid of pieces from there rather than from the view
//   wide.piece(snap, dx, dy, col, row)
//                          one piece, the screen's bytes 28 a row for 144 rows, or null
//
//   wide.restore(snap)     the copy's machine (wide.P, wide.M) set to the snap, for the tests
//
// The copy draws the scenery with its own draw_view, which reads banks 0 and 4 where they are
// kept; drawViewPaged is the port's, which pages each in, kept for the tests to hold the two equal.
(function (root) {
'use strict';
const COLS = 28, ROWS = 18, PIECE_W = COLS * 8, PIECE_H = ROWS * 8;
// an area's map is 256 characters by 128; the next area's column 0 is this one's 228, its row 0
// this one's 108
const AREA_COLS = 256, AREA_ROWS = 128, NEXT_COL = 228, NEXT_ROW = 108;
// the actors' carry into the next area to the east, west, south and north: BC and A' of $DB43,
// $DB56, $DB75 and $DB88
const CARRY = { '1,0': [0x01C8, 0], '-1,0': [0xFE38, 0], '0,1': [0x01B0, 0xFF], '0,-1': [0xFE50, 0xFF] };
const NO_SCENERY = new Set([12, 15]);

function create() {
  const Port = root.WTPort;
  const M = new Uint8Array(0x10000);
  let paging = 0;
  const io = {
    in: () => 0xFF,
    out(port, v) { if (!(port & 0x8002) && !(paging & 0x20)) { paging = v & 255; mem.page(v & 7); } },
    irqByte: a => M[a],
  };
  const P = Port.makePort(M, io, {});
  const mem = new Port.Banks(M, null, 0);
  P.mem = mem;
  // the sound driver's pass at the end of the view's copy, and the objects' graphic cycled when
  // they are marked: the pass has done both already
  P.snd_frame = () => ({});
  P.cycle_graphic = () => ({});
  const drawViewPaged = P.draw_view;
  P.draw_view = drawView;

  // draw_view ($A012) as g-view.js has it, reading banks 0 and 4 where they are kept rather than
  // paging each in for every character (two copies of 16 KB a character, on a machine of flat
  // memory): the same bytes into the buffer, the same view's place and bank 1 paged in after
  function drawView() {
    const b0 = mem.bank(0), b4 = mem.bank(4);
    const r0 = a => (a >= 0xC000 ? b0[a - 0xC000] : M[a]), r4 = a => (a >= 0xC000 ? b4[a - 0xC000] : M[a]);
    const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
    let first = M[0x9639] | M[0x963A] << 8;
    const blockChars = a => {
      const over = a > M[0x9C13];
      const l = r0(0xC800 + a);
      let t = over ? 0xE864 : 0xE840;
      const x = l === 0xFF ? 0xFE : l;
      for (let n = 0; n < 0x10000 && !(x < r0(t)); n++) t = (t + 3) & 0xFFFF;
      first = r0((t + 1) & 0xFFFF) | r0((t + 2) & 0xFFFF) << 8;
      return ((((over ? 0x100 : 0) | l) << 4) + 0xC8F0) & 0xFFFF;
    };
    const drawChar = (a, de) => {
      const s = ((((first + a) & 0xFFFF) << 3) + 0xCD40) & 0xFFFF;
      for (let i = 0; i < 8; i++) M[(de + 28 * i) & 0xFFFF] = r4(lo(s, i));
    };
    const vc = M[0x9633];
    M[0x9631] = 0;
    for (let n = 0, de = 0xAE10; n < 19; n++, de += 0xE0) {
      const row = (M[0x9634] + n) & 255, v = ((0x1800 | (((row & 0xFC) * 2) & 255)) << 3) & 0xFFFF;
      let hl = (v & 0xFF00) | (((v & 255) + ((vc >> 2) & 0x3F)) & 255);   // map_address ($9A6D)
      const rp = (row & 3) * 4, c = vc & 3;
      let d = de;
      let p = lo(blockChars(r0(hl)), (c + rp) & 255);
      for (let b = (4 - c) & 255; b > 0; b--) { drawChar(r0(p), d); d = (d + 1) & 0xFFFF; p = lo(p, 1); }
      hl = (hl + 1) & 0xFFFF;
      for (let k = 6; k > 0; k--) {
        p = lo(blockChars(r0(hl)), rp);
        for (let q = 0; q < 4; q++) { drawChar(r0(p), d); d = (d + 1) & 0xFFFF; p = lo(p, 1); }
        hl = lo(hl, 1);
      }
      p = lo(blockChars(r0(hl)), rp);
      for (let k = vc & 3; k > 0; k--) { drawChar(r0(p), d); d = (d + 1) & 0xFFFF; p = lo(p, 1); }
    }
    M[0x9639] = first & 255; M[0x963A] = first >> 8;
    M[0x9BD2] = (((M[0x9634] + 18) & 3) * 4) & 255;
    return P.page_bank_1();
  }

  // ---- the copies
  function take(src, banks, paged, pg) {
    return { M: Uint8Array.from(src), banks: banks.map(b => Uint8Array.from(b)), paged, paging: pg };
  }
  function restore(s) {
    M.set(s.M);
    for (let n = 0; n < 8; n++) mem.store[n].set(s.banks[n]);
    mem.paged = s.paged;
    mem.shift = s.paged === 5 ? 0x8000 : s.paged === 2 ? 0x4000 : 0;
    paging = s.paging;
  }
  // the copy as it stands now
  const keep = () => take(M, [0, 1, 2, 3, 4, 5, 6, 7].map(n => mem.bank(n)), mem.paged, paging);

  // old: a copy no longer wanted, whose memory this one takes over
  function snap(rt, old) {
    const live = rt.mem, src = rt.M;
    let s;
    if (old && old.M) {
      s = old;
      s.M.set(src);
      for (let n = 0; n < 8; n++) s.banks[n].set(live.bank(n));
      s.paged = live.paged; s.paging = rt.paging;
    } else s = take(src, [0, 1, 2, 3, 4, 5, 6, 7].map(n => live.bank(n)), live.paged, rt.paging);
    s.t = rt.t;
    s.bank = src[0x8D1E] & 8 ? 5 : 7;
    s.area = src[0x8D1F];
    s.view = { col: src[0x9633], row: src[0x9634], half: src[0x9631] & 1, pixel: src[0x9632] & 7 };
    s.colour = src[0xAA7D];
    s.windows = [];
    s.pieces = new Map(); s.areas = new Map();
    return s;
  }

  // ---- the windows ($ABBB): the menu window open or opening, then the conversation window
  function windows(s, rt) {
    const src = rt.M, b3 = a => rt.mem.bank(3)[a - 0xC000];
    const out = [];
    const one = rd => {
      const cols = rd(0), rows = rd(1);
      if (!cols || !rows) return;
      const table = rd(11) | rd(12) << 8, at = (table + rd(4) * 16) & 0xFFFF;
      const a = src[at] | src[(at + 1) & 0xFFFF] << 8;
      out.push({ col: (rd(2) + rd(3)) & 31, row: ((a >> 8) & 0x18) | ((a >> 5) & 7), cols, rows });
    };
    const m = src[0x8D22];
    if (m & 7) one(k => b3(0xC8A6 + k));
    else if (m & 0x38) one(k => b3(0xC899 + k));
    if (src[0x8D25] & 0xC0) one(k => src[0xAA7E + k]);
    s.windows = out;
    return out;
  }

  // ---- the copy crossed into the area dx, dy from the view's (each -1, 0 or 1), as $DB0B crosses
  function area(s, dx, dy) {
    const key = dx + ',' + dy;
    if (s.areas.has(key)) return s.areas.get(key);
    let a = null;
    const n = s.area + dx + 4 * dy, x = (s.area & 3) + dx;
    if (x >= 0 && x < 4 && n >= 0 && n < 16 && !NO_SCENERY.has(n)) {
      restore(s);
      P.page_bank_3();
      const carry = (bc, a_) => {
        for (let iy = 0x8300; iy < 0x8400; iy += 0x20) {
          if (M[iy] === 0x2D || M[iy + 1] === 0xFF) continue;
          P.carry_actor({ hl: iy, bc, af_: a_ << 8 });
        }
      };
      for (let k = 0; k < Math.abs(dx); k++) { M[0x8D1F] = (M[0x8D1F] + Math.sign(dx)) & 255; carry(...CARRY[Math.sign(dx) + ',0']); }
      for (let k = 0; k < Math.abs(dy); k++) { M[0x8D1F] = (M[0x8D1F] + 4 * Math.sign(dy)) & 255; carry(...CARRY['0,' + Math.sign(dy)]); }
      P.carry_objects({});
      P.carry_objects({});
      P.load_area({});
      a = keep();
    }
    s.areas.set(key, a);
    return a;
  }

  // ---- a piece: the view's 28 characters by 18 from column col and row row of the area dx, dy
  // from the view's, as the screen's bytes, 28 a row; null where there is no such area
  let failed = 0;
  function piece(s, dx, dy, col, row) {
    const key = dx + ',' + dy + ',' + col + ',' + row;
    if (s.pieces.has(key)) return s.pieces.get(key);
    const base = dx || dy ? area(s, dx, dy) : s;
    let out = null;
    if (base) {
      out = new Uint8Array(COLS * PIECE_H);
      try {
        restore(base);
        P.page_bank_3();
        const rope = [0xFA9D, 0xFA9F].map(a => { const iy = P.w(a); return [iy, M[iy], M[(iy + 1) & 0xFFFF]]; });
        M[0x9633] = col; M[0x9634] = row; M[0x9631] = 0; M[0x9632] = 0; M[0x9630] = 0;
        P.setw(0x9635, col * 8); P.setw(0x9637, row * 8);
        P.drop_far_actors({});
        P.place_creatures({});
        // a creature brought in is drawn as it stands, as a pass that brought it in would draw it
        for (let iy = 0x8300; iy < 0x8400; iy += 0x20) if (M[iy + 1] !== 0xFF) M[iy + 0x18] |= 0x80;
        P.draw_view();
        P.page_hidden_screen();
        P.show_view({});
        P.page_bank_3();
        // the rope is drawn between the two actors it ties, so only while both are still the ones
        // it tied
        if (rope.every(([iy, t, st]) => M[iy] === t && M[(iy + 1) & 0xFFFF] === st && st !== 0xFF)) P.draw_rope({});
        P.move_shots({});
        P.draw_actors();
        const screen = mem.bank(M[0x8D1E] & 8 ? 5 : 7);
        for (let y = 0; y < PIECE_H; y++) {
          const a = (M[0x8D5D + 2 * y] | M[0x8D5E + 2 * y] << 8) - 0xC000;
          out.set(screen.subarray(a, a + COLS), y * COLS);
        }
      } catch (e) {
        out = null;
        if (failed++ < 3 && root.console) console.warn('wide view: a piece at ' + col + ', ' + row + ' was not drawn: ' + e.message);
      }
    }
    s.pieces.set(key, out);
    return out;
  }

  // ---- the picture. Each place on the map is drawn from one area: the view's own wherever its map
  // reaches, and past that the next, whose map starts 228 characters across or 108 down from this
  // one's (and so on); an area's map and the next one's agree where they overlap only where the
  // view crosses between them. A view draws 19 rows into its buffer and shows 18, so it shows no
  // more than the first 127 of an area's 128. The pieces lie on a grid of the view's
  // own column and row (anchor, for the tests, another), each moved inside its area's map where it
  // would run off it, and each gives only its part of its square of the grid.
  const areaOf = (v, size, next) => (v >= 0 ? (v < size ? 0 : 1 + Math.floor((v - size) / next)) : -1 - Math.floor((-v - 1) / next));
  function spans(a, b, size, next) {        // [from, to, d] runs of characters a..b-1 in one area
    const out = [];
    for (let v = a; v < b;) {
      const d = areaOf(v, size, next), end = d >= 0 ? (d ? size + d * next : size) : (d + 1) * next;
      const to = Math.min(b, end);
      out.push([v, to, d]); v = to;
    }
    return out;
  }
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  function render(s, x0, y0, w, h, out, anchor) {
    out = out || new Uint8Array(w * h);
    out.fill(2);
    const ac = anchor ? anchor.col : s.view.col, ar = anchor ? anchor.row : s.view.row;
    const i0 = Math.floor((Math.floor(x0 / 8) - ac) / COLS), i1 = Math.floor((Math.floor((x0 + w - 1) / 8) - ac) / COLS);
    const j0 = Math.floor((Math.floor(y0 / 8) - ar) / ROWS), j1 = Math.floor((Math.floor((y0 + h - 1) / 8) - ar) / ROWS);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c0 = ac + COLS * i, r0 = ar + ROWS * j;
      for (const [ra, rb, dy] of spans(r0, r0 + ROWS, AREA_ROWS - 1, NEXT_ROW)) for (const [ca, cb, dx] of spans(c0, c0 + COLS, AREA_COLS, NEXT_COL)) {
        const ox = dx * NEXT_COL, oy = dy * NEXT_ROW;
        const lc = clamp(c0 - ox, 0, AREA_COLS - COLS), lr = clamp(r0 - oy, 0, AREA_ROWS - ROWS - 1);
        const p = piece(s, dx, dy, lc, lr);
        if (!p) continue;
        // the part of the piece in this square of the grid, in pixels of the picture
        const px = (lc + ox) * 8 - x0, py = (lr + oy) * 8 - y0;
        const xa = Math.max(ca * 8 - x0, 0), xb = Math.min(cb * 8 - x0, w);
        const ya = Math.max(ra * 8 - y0, 0), yb = Math.min(rb * 8 - y0, h);
        for (let y = ya; y < yb; y++) {
          const o = y * w, r = (y - py) * COLS;
          for (let x = xa; x < xb; x++) { const u = x - px; out[o + x] = (p[r + (u >> 3)] >> (7 - (u & 7))) & 1; }
        }
      }
    }
    return out;
  }

  return { snap, windows, render, piece, area, restore, P, M, COLS, ROWS, drawViewPaged };
}
root.WTWide = { create, COLS, ROWS, NEXT_COL, NEXT_ROW };
})(typeof window !== 'undefined' ? window : globalThis);
