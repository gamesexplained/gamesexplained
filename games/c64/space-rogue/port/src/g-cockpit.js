// The cockpit's instruments and the TAC display: the speed, hit points and weapon readouts, the
// attack and threat lamps, and the TAC's two pages, the target's data and its picture in 3D. SR's
// code from $3102 to $3688.
//
// The instruments are drawn into the $C000 bitmap and its screen, and their lamps are screen cells
// set in both screens ($E000 and its copy at $6000), so they stay when the 3D view flips buffers.
// The TAC's picture is drawn into the $C000 buffer and copied to the $4000 one (tac_copy).
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.cockpit = function (P) {
  const M = P.M;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  // a screen cell's colours in both screens
  const cell = (a, v) => { M[0xE000 + a] = v; M[0x6000 + a] = v; };
  // the text row above: rows count up the screen, nine pixel rows to a line
  const lineDown = () => { M[0x50] = (M[0x50] - 9) & 255; };

  // ---- the instruments
  // All of them, then the TAC; from frame_update every seventh pass, and after keys that change one
  P.update_cockpit = function* (r) {
    P.window_full();
    yield* P.draw_speed();
    P.draw_armour_bar();
    yield* P.draw_weapon();
    P.attack_lamp();
    P.threat_lamps();
    return yield* P.draw_tac();
  };
  P.draw_tac = function* (r) { return M[0x7C] ? P.tac_picture() : yield* P.tac_data(); };
  // The TAC's area in colour 1, in both buffers (SEG0's tac_fill and tac_copy)
  P.clear_tac = function (r) {
    P.set_colour({ x: 1 });
    P.tac_fill();
    return P.tac_copy();
  };

  // The attack lamp: $8A when a ship in slots 1-5 whose type does damage ($0AEF) has the player
  // as its target, $C5 otherwise
  P.attack_lamp = function (r) {
    let a = 0xC5, x = r && r.x, y;
    for (y = 5; y; y--) {
      if (!M[0x05F9 + y] || M[0x0445 + y]) continue;
      x = M[0x060D + y];
      if (M[0x0AEF + x]) { a = 0x8A; break; }
    }
    cell(0x2F1, a);
    return { a, x, y };
  };
  // The three threat lamps, one for each ship in slots 5 down to 1 whose type does no damage: 1
  // for present, 2 with a target, 3 with the player as its target. The levels are counted in $86-$88
  // from $FF; a fourth and fifth such ship count in $89 and $8A, which no lamp shows.
  P.threat_lamps = function (r) {
    M[0x86] = M[0x87] = M[0x88] = M[0x85] = 0xFF;
    let x = r && r.x;
    for (let y = 5; y; y--) {
      if (!M[0x05F9 + y]) continue;
      x = M[0x060D + y];
      if (M[0x0AEF + x]) continue;
      M[0x85] = (M[0x85] + 1) & 255;
      x = M[0x85];
      const k = (0x86 + x) & 255;
      M[k] = (M[k] + 1) & 255;
      const t = M[0x0445 + y];
      if (t & 0x80) continue;
      M[k] = (M[k] + 1) & 255;
      if (t) continue;
      M[k] = (M[k] + 1) & 255;
    }
    let o = P.threat_colour({ x: M[0x86] });
    cell(0x38B, o.a);
    o = P.threat_colour({ x: M[0x87] });
    cell(0x363, o.a);
    o = P.threat_colour({ x: M[0x88] });
    cell(0x33B, o.a);
    return { a: o.a, x: o.x, y: 0 };
  };
  // Level X + 1, kept to 0-3, as a colour from threat_colours
  P.threat_colour = function (r) {
    let x = (r.x + 1) & 255;
    if (x & 0x80) x = 0;
    if (x >= 4) x = 3;
    return { a: M[0x31AE + x], x };
  };

  // The speed: "CF" or "NF", reversed when the drive is damaged ($0409 bit 2), and the number,
  // which in Newtonian flight ($0D02) is the actual speed (kept to 99 and written to $0415); then
  // the bar, the actual speed (kept to $42) in pattern 5 against pattern 1
  P.draw_speed = function* (r) {
    let a = P.speed_of({ y: 0 }).a;
    M[0x8A] = a;
    if (M[0x0D02]) {
      if (a >= 0x64) a = 0x63;
      M[0x0415] = a;
    }
    M[0x4F] = 0x03; M[0x50] = 0x12;
    yield* P.print_text(M[0x0D02] ? { x: 0x3D, y: 0x32 } : { x: 0x3A, y: 0x32 });
    if (M[0x0409] & 0x04) yield* P.print_char({ a: 0x0F });
    M[0x4F] = 0x08;
    if (!(M[0x0415] & 0x80)) yield* P.print_char({ a: 0x20 });
    yield* P.print_signed({ a: M[0x0415] });
    yield* P.print_char({ a: 0x10 });
    let s = M[0x8A];
    if (s >= 0x43) s = 0x42;
    M[0x8A] = s;
    P.set_colour({ x: 1 });
    if (s !== 0x42) P.draw_bar({ x: s + 0x18, a: 0x42 - s - 1, y: 0x21 });
    const o = P.set_colour({ x: 5 });
    if (!s) return { a: 0, x: o.x, y: 0x21 };
    return P.draw_bar({ a: s - 1, x: 0x18, y: 0x21 });
  };
  // The hit points bar: bits 2-8 of the player's hit points ($051D/$051E), a quarter of them, plus
  // one, kept to $3C, in pattern 4 against pattern 1; in pattern 7 when it is under $10
  P.draw_armour_bar = function (r) {
    P.window_right();
    M[0x60] = M[0x051D]; M[0x61] = M[0x051E];
    const hi = M[0x61];
    M[0x61] = (hi & 0x80) | hi >> 1;                     // ASL A, ROR, ROR: halved, sign kept
    M[0x60] = (hi & 1) << 7 | M[0x60] >> 1;
    let v = (M[0x60] >> 1) + 1;                           // and halved again, the high byte dropped
    if (v >= 0x3D) v = 0x3C;
    M[0x8A] = v;
    P.set_colour({ x: 1 });
    if (v !== 0x3C) P.draw_bar({ x: v + 0x4E, a: 0x3C - v - 1, y: 0x13 });
    P.set_colour({ x: 4 });
    if (v) {
      const a = v - 1;
      if (a < 0x0F) P.set_colour({ x: 7 });
      P.draw_bar({ a, x: 0x4E, y: 0x13 });
    }
    return P.window_full();
  };
  // The weapon at column $1E, row $1E. The beam: reversed when it is damaged ($0409 bit 1), its heat
  // ($0D00 halved, kept to 3) as one of the characters 9-12, A or M for automatic or manual fire,
  // then " -". A missile: its symbol, the count left and a space. The cells under the first
  // character ($E366, $E33E) are $5D, or $2A when a missile cannot be fired: none left, or
  // reloading ($0836). The launcher's damage was meant to count too, and to reverse the count:
  // the game tests bit 0 of what print_char leaves in A where $0409 was meant, and that is $BC
  // or 0, so it never does. Then the weapon's two characters ($3363) and their colours ($3367,
  // $336B).
  P.draw_weapon = function* (r) {
    M[0x4F] = 0x1E; M[0x50] = 0x1E;
    const w = M[0x0CFE];
    let colour;
    if (!w) {
      if (M[0x0409] & 0x02) yield* P.print_char({ a: 0x0F });
      let h = M[0x0D00] >> 1;
      if (h >= 4) h = 3;
      yield* P.print_char({ a: h + 9 });
      M[0x4F] = (M[0x4F] + 1) & 255;
      yield* P.print_char({ a: M[0x0CFF] ? 0x41 : 0x4D });
      yield* P.print_char({ a: 0x10 });
      yield* P.print_char({ a: 0x20 });
      yield* P.print_char({ a: 0x2D });
      colour = 0x5D;
    } else {
      const o = yield* P.print_char({ a: 0x7C });
      M[0x4F] = (M[0x4F] + 1) & 255;
      M[0x8B] = 0;
      if (o.a & 0x01) {
        M[0x8B]++;
        yield* P.print_char({ a: 0x0F });
      }
      const n = M[0x0731 + M[0x0CFE]];
      if (!n) M[0x8B]++;
      yield* P.print_signed({ a: n });
      yield* P.print_char({ a: 0x10 });
      yield* P.print_char({ a: 0x20 });
      if (M[0x0836]) M[0x8B]++;
      colour = M[0x8B] ? 0x2A : 0x5D;
    }
    cell(0x366, colour); cell(0x33E, colour);
    const c = M[0x3363 + M[0x0CFE]];
    M[0x8A] = c;
    yield* P.print_char({ a: c });
    const o = yield* P.print_char({ a: (c + 1) & 255 });
    const y = M[0x0CFE];
    cell(0x36B, M[0x3367 + y]); cell(0x343, M[0x3367 + y]);
    cell(0x36C, M[0x336B + y]); cell(0x344, M[0x336B + y]);
    return { a: M[0x336B + y], x: o.x, y };
  };

  // ---- the TAC's data page
  // The player's target ($0445) in $8A and its type in $8B. No target: the player's hit points and
  // systems under an empty name (type 0's). A ship (slots 0-5): its name and label, range, tactic,
  // hit points and systems. Anything else: its name and range.
  P.tac_data = function* (r) {
    const y = M[0x0445];
    M[0x8A] = y;
    if (y & 0x80) {
      M[0x8A] = 0; M[0x8B] = 0;
      yield* P.tac_name();
      M[0x50] = (M[0x50] - 1) & 255;
      yield* P.tac_armour();
      yield* P.tac_systems();
      return P.window_view();
    }
    M[0x8B] = M[0x060D + y];
    yield* P.tac_name();
    if (y < 6) {
      yield* P.tac_label();
      M[0x50] = (M[0x50] - 1) & 255;
      yield* P.tac_range();
      yield* P.tac_tactic();
      yield* P.tac_armour();
      yield* P.tac_systems();
    } else {
      M[0x50] = (M[0x50] - 1) & 255;
      yield* P.tac_range();
    }
    return P.window_view();
  };
  // The type's name at column $0E, row $2E, padded with spaces to column $15; reversed when the
  // target is a ship whose own target is the player. A is the column at the end.
  P.tac_name = function* (r) {
    const x = M[0x8A];
    if (x < 6 && !M[0x0445 + x]) yield* P.print_char({ a: 0x0F, x, y: r && r.y });
    M[0x4F] = 0x0E; M[0x50] = 0x2E;
    const y = (M[0x8B] << 1) & 255;
    let o = yield* P.print_text({ x: M[0x0B12 + y], y: M[0x0B13 + y] });
    while (M[0x4F] < 0x15) o = yield* P.print_char({ a: 0x20, x: o.x, y: o.y });
    return { a: M[0x4F], x: o.x, y: o.y };
  };
  // The target's own three-character label ($366D) at column $15, and reverse off
  P.tac_label = function* (r) {
    M[0x4F] = 0x15;
    const o = yield* P.print_ship_label({ a: M[0x8A], x: r && r.x, y: r && r.y });
    return yield* P.print_char({ a: 0x10, x: o.x, y: o.y });
  };
  // "RAN " and the range: the target's distance from the player ($7947), a log, plus 2 (times
  // four), as a number ($B5E0); "30+ km" from $7500 up, otherwise the number and "m"
  P.tac_range = function* (r) {
    M[0x4F] = 0x0E;
    lineDown();
    yield* P.print_text({ x: 0xEC, y: 0x34 });
    const b = P.bearing({ x: M[0x8A], y: 0 });
    M[0x81] = (M[0x81] + 2) & 255;
    M[0x5F] = M[0x80]; M[0x60] = M[0x81];
    const l = P.log_to_lin({ y: b.y });
    if (M[0x61] >= 0x75) return yield* P.print_text({ x: 0xE5, y: 0x34 });
    const o = yield* P.print_number({ x: l.x, y: l.y });
    return yield* P.print_char({ a: 0x6D, x: o.x, y: o.y });
  };
  // "TAC " and the ship's tactic ($043F) by its eight-byte name at $0CAE; nothing for a negative one
  P.tac_tactic = function* (r) {
    M[0x4F] = 0x0E;
    lineDown();
    const o = yield* P.print_text({ x: 0xF1, y: 0x34 });
    const y = M[0x8A], t = M[0x043F + y];
    if (t & 0x80) return { a: t, x: o.x, y };
    let a = t, c = 0;
    for (let k = 0; k < 3; k++) { c = a >> 7; a = (a << 1) & 255; }
    const s = a + 0xAE + c;
    return yield* P.print_text({ x: s & 255, y: (0x0C + (s >> 8)) & 255 });
  };
  // "ARM  " and the slot's hit points
  P.tac_armour = function* (r) {
    M[0x4F] = 0x0E;
    lineDown();
    const o = yield* P.print_text({ x: 0xF6, y: 0x34 });
    const y = (M[0x8A] << 1) & 255;
    M[0x60] = M[0x051D + y]; M[0x61] = M[0x051E + y];
    return yield* P.print_number({ x: o.x, y });
  };
  // "SYS " and a letter for each system the type has ($0C45): c f a e b m for the bits $20 to $01,
  // reversed when the slot's is damaged ($0409), a space for one the type lacks
  const SYSTEMS = [[0x20, 0x63], [0x10, 0x66], [0x08, 0x61], [0x04, 0x65], [0x02, 0x62], [0x01, 0x6D]];
  P.tac_systems = function* (r) {
    M[0x4F] = 0x0E;
    lineDown();
    let o = yield* P.print_text({ x: 0xFC, y: 0x34 });
    for (const [a, y] of SYSTEMS) o = yield* P.tac_system_letter({ a, x: o.x, y });
    return o;
  };
  P.tac_system_letter = function* (r) {
    M[0x8C] = r.y;
    let a = r.a & M[0x0C45 + M[0x8B]], y = M[0x8B];
    if (!a) { M[0x8C] = 0x20; a = 0x10; }
    else { y = M[0x8A]; a = a & M[0x0409 + y] ? 0x0F : 0x10; }
    let o = yield* P.print_char({ a, x: r.x, y });
    o = yield* P.print_char({ a: M[0x8C], x: o.x, y: o.y });
    return yield* P.print_char({ a: 0x10, x: o.x, y: o.y });
  };

  // ---- the TAC's picture page
  // The player's target, or the player's own ship with none, drawn in 3D into the TAC window of the
  // $C000 buffer ($4F by $2D from x $70, row 9) at scale 2.0, then copied to the $4000 buffer
  P.tac_picture = function (r) {
    let y = M[0x0445];
    if (y & 0x80) y = 0;
    M[0xA2] = y;
    const buffer = M[0x3A];
    M[0x3A] = 0;
    P.set_colour({ x: 1 });
    P.tac_fill();
    M[0x41] = 0x4F; M[0x42] = 0x2D;
    P.set_window({ x: 0x70, a: 0, y: 0x09 });
    M[0x5F] = 0; M[0x60] = 2;
    P.set_projection();
    P.tac_draw_model();
    P.tac_copy();
    M[0x3A] = buffer;
    P.window_view();
    M[0x5F] = 0; M[0x60] = 0;
    return P.set_projection();
  };
  // Slot $A2's model, seen from the player's position along the line to it at the type's size
  // ($0A63) plus $02CE, kept at $366A (its top byte as it is). The camera is the player's
  // orientation ($044B; the identity for the player's own ship) turned to face the slot, the third
  // row replaced by the way to it ($0098) and made orthonormal. The slot's orientation (the
  // identity past slot 6) takes the camera's offset into the model's frame, and the two
  // orientations multiplied into $0D40; then the type's draw routine ($08F8) with its data ($0999)
  // in $76/$77, its scale in $5F/$60 and the record at $3664 in $74/$75.
  P.tac_draw_model = function (r) {
    const s = M[0xA2], t = (M[0x060D + s] << 1) & 255;
    const lo = 0xCE + M[0x0A63 + t];
    M[0x366A] = lo & 255;
    M[0x366B] = (0x02 + M[0x0A64 + t] + (lo >> 8)) & 255;
    const from = s ? 0x044B : 0x0DA8;
    for (let y = 0x1A; y >= 0; y--) M[0x86 + y] = M[from + y];
    setp(0x74, 0x065D); setp(0x76, 0x065D + M[0x0846 + s]); setp(0x78, 0x0098);
    P.vec_sub_to_log();
    setp(0x78, 0x0086);
    P.mat_orthonormal();
    setp(0x74, 0x0098); setp(0x78, 0x089F);
    M[0x5F] = M[0x366A]; M[0x60] = M[0x366B]; M[0x61] = M[0x366C];
    P.vec_scale_signed();
    setp(0x76, s < 7 ? 0x044B + M[0x083C + s] : 0x0DA8);
    setp(0x7A, ptr(0x76));
    setp(0x74, 0x089F); setp(0x78, 0x0D5B);
    P.mat_times_vec();
    setp(0x74, 0x0D5B);
    P.vec_log_to_lin();
    setp(0x74, ptr(0x7A)); setp(0x76, 0x0086); setp(0x78, 0x0D40);
    P.mat_times_mat();
    setp(0x78, 0x0D40); setp(0x74, 0x3664);
    const y = (M[0x060D + M[0xA2]] << 1) & 255;
    M[0x76] = M[0x0999 + y]; M[0x77] = M[0x099A + y];
    M[0x5F] = M[0x0A63 + y]; M[0x60] = M[0x0A64 + y];
    M[0x85] = M[0x08F8 + y]; M[0x86] = M[0x08F9 + y];
    return P.draw_at(ptr(0x85));
  };

  // The three-character label of ship slot A, at $0421 + 3 A
  P.print_ship_label = function* (r) {
    M[0x80] = r.a;
    const y = (((r.a << 1) & 255) + r.a + (r.a >> 7)) & 255;
    const second = M[0x0422 + y], third = M[0x0423 + y];
    let o = yield* P.print_char({ a: M[0x0421 + y], x: r.x, y });
    o = yield* P.print_char({ a: second, x: o.x, y: o.y });
    return yield* P.print_char({ a: third, x: o.x, y: o.y });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
