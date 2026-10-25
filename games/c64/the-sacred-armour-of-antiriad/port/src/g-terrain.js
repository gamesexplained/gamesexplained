// Tal against the scenery, from the interrupt (tal_terrain): the scenery is told apart by the
// colour of its cells in colour RAM, open colours (open_colours_floor $CE12, open_colours_wall
// $CE1C) letting him through and every other one solid; the energy barrier is character $FF.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.terrain = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);
  const tal = a => { M[0x0260] = a; M[0x0261] = a + 1; return P.start_tal_anim(); };
  const dir = d => { M[0x02C8] = d; M[0x02C9] = d; };
  // a cell's colour, through the chips at $D800
  const colour = a => P.rd(a) & 0x0F;
  const open = (c, table, n) => { for (let k = n - 1; k >= 0; k--) if (c === M[table + k]) return true; return false; };
  const FLOOR = 0xCE12, WALL = 0xCE1C;
  // row r of the screen (screen_rows, $F128), or of colour RAM, into zpa_22
  const row = (r, plus) => { const x = (r << 1) & 255; M[0x22] = M[0xF128 + x]; M[0x23] = (M[0xF129 + x] + plus) & 255; };

  // tal_terrain ($9A5C): unless on the title, dying, rising again or facing the player, each way
  // Tal moves checked against the scenery.
  P.tal_terrain = function () {
    if (R(0xB0) & 0x80) return {};
    const a = R(0x0260);
    if (a === 0xA6 || a === 0xAA || a === 0xA8 || a === 0x88) return {};
    P.count('grounds');
    M[0x59] = R(0x02C8);
    const bit = () => { const c = M[0x59] & 1; M[0x59] >>= 1; return c; };
    if (R(0x7B) & 0x80) {
      if (bit()) P.suit_up_wall();
      if (bit()) P.suit_down_floor();
      if (bit()) P.suit_left_wall();
      if (bit()) P.suit_right_wall();
      return {};
    }
    if (!(R(0x6D) & 0x80)) P.walk_off_edge();
    if (bit()) P.jump_rise();
    if (bit()) P.fall();
    if (bit()) P.foot_left_wall();
    if (bit()) P.foot_right_wall();
    return {};
  };
  // jump_rise ($9ABD): rising, the jump's counter down and his step from jump_steps ($C5E1); at
  // its end or against something overhead, he falls, the other way up.
  P.jump_rise = function () {
    P.check_head();
    if (R(0x83) & 0x80) M[0x6C] = 0;
    else if (R(0x6C)) {
      dec(0x6C);
      const x = R(0x6C), s = M[0xC5E1 + x];
      M[0x02F8] = s; M[0x02F9] = s;
      return { a: s, x };
    }
    if (R(0x0260) === 0x98) { M[0x0260] = 0x9A; M[0x0261] = 0x9B; }
    else { M[0x0260] = 0x94; M[0x0261] = 0x95; }
    dir(R(0x02C8) ^ 0x03);
    return P.start_tal_anim();
  };
  // fall ($9B06): falling faster, the counter up to 19; landing, he stands (or lands from a jump),
  // on the row.
  P.fall = function () {
    const n = R(0x6C);
    P.check_floor();
    if (!(R(0x84) & 0x80)) {
      if (n >= 0x13) return {};
      inc(0x6C);
      const x = R(0x6C), s = M[0xC5E1 + x];
      M[0x02F8] = s; M[0x02F9] = s;
      return { a: s, x };
    }
    const a = R(0x0260);
    if (a === 0x9A || a === 0x86 || a === 0x82 || a === 0xA0) tal(0x9C);
    else if (a !== 0x9C) tal(0x96);
    dir(0);
    M[0x6D] = 0;
    return P.snap_to_row();
  };
  // walk_off_edge ($9B6B): no floor under him and not rising, he starts to fall.
  P.walk_off_edge = function () {
    P.check_floor();
    if (R(0x84) & 0x80) return {};
    if (R(0x02C8) & 0x01) return {};
    dir(R(0x02C8) | 0x02);
    M[0x6C] = 0;
    M[0x6D] = 0x80;
    const a = R(0x0260);
    if (a === 0x80 || a === 0x84) return tal(0x94);
    if (a === 0x82 || a === 0x86) return tal(0x9A);
    return {};
  };
  // foot_left_wall ($9BBB) and foot_right_wall ($9BFF): into a wall walking he stops; in a jump
  // he drops.
  function footWall(walk, stand, drop) {
    if (R(0x45) & 0x80) return {};
    if (R(0x0260) === walk) { dir(0); return tal(stand); }
    dir(0x02);
    M[0x6C] = 0;
    M[0x6D] = 0x80;
    return tal(drop);
  }
  P.foot_left_wall = () => { P.wall_left(); return footWall(0x80, 0x84, 0x94); };
  P.foot_right_wall = () => { P.wall_right(); return footWall(0x82, 0x86, 0x9A); };
  // suit_up_wall ($9C43): the suit rising into something bounces down.
  P.suit_up_wall = function () {
    P.check_head();
    if (!(R(0x83) & 0x80)) return {};
    M[0x035E] = 0x8B;
    dir((R(0x02C8) & 0x0C) | 0x02);
    return {};
  };
  // suit_down_floor ($9C5D): the suit sinking onto something: facing the player it lands ($B2);
  // sideways it bounces up; on the row either way.
  P.suit_down_floor = function () {
    P.check_floor();
    if (!(R(0x84) & 0x80)) return {};
    if (R(0x0260) === 0xB0) {
      M[0x035E] = 0xA0;
      dir(0);
      M[0x0260] = 0xB2; M[0x0261] = 0xB3;
    } else {
      M[0x035E] = 0x8B;
      dir((R(0x02C8) & 0x0C) | 0x01);
    }
    return P.snap_to_row();
  };
  // suit_left_wall ($9C9C) and suit_right_wall ($9CBF): into a wall or the barrier the suit
  // bounces back, its speed halved.
  function suitWall(barrier, way) {
    if (R(0x45) & 0x80) {
      barrier();
      if (R(0x45) & 0x80) return {};
    }
    M[0x035E] = 0x8B;
    dir((R(0x02C8) & 0x03) | way);
    M[0x80] = R(0x80) >> 1;
    return {};
  }
  P.suit_left_wall = () => { P.wall_left(); return suitWall(P.barrier_left, 0x08); };
  P.suit_right_wall = () => { P.wall_right(); return suitWall(P.barrier_right, 0x04); };
  // wall_left ($9CE2) and wall_right ($9D42): five cells down the column at his side (fewer above
  // the playfield) until a solid one; zpa_45 goes negative when all are open. In the suit, its top
  // cell anything but black is solid.
  function wall(side) {
    M[0x85] = 0x32;
    let { x, y } = P.tal_cell();
    y = (y + side) & 255;
    M[0x85] = x;
    M[0x86] = 0;
    const t = R(0x0201);
    if (t <= 0x32) M[0x86] = ((0x32 - t) & 255) >> 3;
    M[0x45] = (4 - R(0x86)) & 255;
    for (;;) {
      let r = R(0x85);
      if (r >= 0x0F) r = 0x0F;
      row(r, 0x98);
      if ((R(0x7B) & 0x80) && !R(0x85) && colour(at(0x22, y))) return { y };
      if (!open(colour(at(0x22, y)), WALL, 12)) return { y };
      inc(0x85);
      if (dec(0x45) & 0x80) return { y };
    }
  }
  P.wall_left = () => wall(0);
  P.wall_right = () => wall(2);
  // barrier_left ($9DA4) and barrier_right ($9DD8): the barrier (character $FF) in the five cells
  // at his side: effect $A7, and zpa_45 left positive.
  function barrier(side) {
    M[0x85] = 0x32;
    let { x, y } = P.tal_cell();
    y = (y + side) & 255;
    M[0x85] = x;
    M[0x45] = 4;
    for (;;) {
      let r = R(0x85);
      if (r >= 0x0F) r = 0x0E;
      row(r, 0);
      if (M[at(0x22, y)] === 0xFF) { M[0x035F] = 0xA7; return { y }; }
      inc(0x85);
      if (dec(0x45) & 0x80) return { y };
    }
  }
  P.barrier_left = () => barrier(0);
  P.barrier_right = () => barrier(2);
  // tal_cell ($8F73): Tal's cell under sprite 0, as the chip has it: row X from its Y less
  // zp_cell_top, eighths rounded; column Y from its 9-bit X, eighths rounded, less 3.
  P.tal_cell = function () {
    let a = io.vicRead(0x01);
    if (a < R(0x85)) a = R(0x85);
    const d = (a - R(0x85)) & 255;
    return column((d >> 3) + ((d >> 2) & 1));
  };
  // tal_cell_from_y0 ($8F67): the row from shadow sprite 0's Y instead ((Y - 16) / 8).
  P.tal_cell_from_y0 = () => column(((R(0x0201) - 0x10) & 255) >> 3);
  function column(r) {
    const v = ((io.vicRead(0x10) & 1) << 8) | io.vicRead(0x00);
    const y = ((v >> 3) + ((v >> 2) & 1) - 3) & 255;
    return { a: r, x: r, y };
  }
  // check_floor ($8FA3): something solid under his feet: the cell below his row, its colour not
  // open (zp_on_floor $80); the cell at his feet solid while moving down stops the test there.
  P.check_floor = function () {
    M[0x85] = 0x32;
    let { x, y } = P.tal_cell_from_y0();
    if (x >= 0x0F) x = 0x0F;
    M[0x86] = x;
    row(x, 0x98);
    y = (y + 1) & 255;
    M[0x84] = 0;
    if (!open(colour(at(0x22, y)), FLOOR, 10) && (R(0x02C9) & 0x02)) return { y };
    if (R(0x86) >= 0x0F) return { y };
    y = (y + 0x28) & 255;
    if (open(colour(at(0x22, y)), FLOOR, 10)) return { y };
    M[0x84] = 0x80;
    return { y };
  };
  // check_head ($8FFA): something solid over his head (zp_head_blocked $80): the cell beside his
  // head, and in the suit the one above it.
  P.check_head = function () {
    M[0x85] = 0x32;
    if (!(R(0x7B) & 0x80)) M[0x85] = 0x2E;
    let { x, y } = P.tal_cell();
    M[0x83] = 0;
    if (R(0x85) >= io.vicRead(0x01)) return { y };
    M[0x85] = x;
    row(x, 0x98);
    y = (y + 1) & 255;
    if (!(R(0x7B) & 0x80) && R(0x85)) return { y };
    if (open(colour(at(0x22, y)), FLOOR, 10)) return { y };
    if (R(0x85)) {
      const p = (w(0x22) - 0x28) & 0xFFFF;
      M[0x22] = p & 255; M[0x23] = p >> 8;
      if (open(colour(at(0x22, y)), FLOOR, 10)) return { y };
    }
    M[0x83] = 0x80;
    return { y };
  };
  // snap_to_row ($9061): Tal on a character row, his upper sprite 21 lines over his lower.
  P.snap_to_row = function () {
    const a = ((((R(0x0203) - 0x32) & 255) | 0x07) + 0x2E) & 255;
    M[0x0203] = a;
    M[0x0201] = (a - 0x15) & 255;
    return { a: (a - 0x15) & 255 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
