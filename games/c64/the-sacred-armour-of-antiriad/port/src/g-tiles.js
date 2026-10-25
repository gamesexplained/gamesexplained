// The animated tiles: up to eight slots a room, each stepping through its script of character
// frames copied into the character set (the main loop, once a pass), with their sounds and the
// machine gunner's bullet.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.tiles = function (P) {
  const M = P.M, R = P.irqByte;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;

  // animate_tiles ($8C30): every running slot (tile_anim bit 7) through animate_tile.
  P.animate_tiles = function () {
    for (let x = 7; x >= 0; x--) if (R(0x0250 + x) & 0x80) P.animate_tile({ x });
    return { x: 0xFF };
  };
  // animate_tile ($8C3E): once slot X's wait is over, its effect and the gunner's shot, then the
  // script's step (tile_step): a frame (a pointer whose high byte is 3 or more) copied in, with the
  // animation's frame time (its script's byte 0) as the wait; or a command: 0 back to the first
  // step, 1 to step n, 2 on to animation n, 3 or more the end.
  P.animate_tile = function (r) {
    const x = r.x;
    for (;;) {
      if (R(0x0248 + x)) return {};
      P.tile_anim_sound({ x });
      P.gunner_fires({ x });
      P.tile_anim_header({ a: R(0x0250 + x) });
      let y = (R(0x0258 + x) << 1) & 255;
      M[0x14] = M[at(0x12, y)];
      y = (y + 1) & 255;
      const hi = M[at(0x12, y)];
      if (hi >= 3) {
        M[0x15] = hi;
        P.copy_tile_frame();
        M[0x0258 + x] = (R(0x0258 + x) + 1) & 255;
        M[0x0248 + x] = M[at(0x12, 0)];          // the copy leaves Y at $FF, one on is 0
        return {};
      }
      const c = M[0x14];
      if (c === 0) { M[0x0258 + x] = 3; continue; }
      y = (y + 1) & 255;
      if (c === 1) { M[0x0258 + x] = (M[at(0x12, y)] + 3) & 255; continue; }
      if (c === 2) { M[0x0250 + x] = M[at(0x12, y)] | 0x80; M[0x0258 + x] = 3; continue; }
      M[0x0250 + x] = R(0x0250 + x) & 0x7F;
      return {};
    }
  };
  // tile_anim_header ($8CA7): animation A's header (tile_anim_ptrs, $06BC): zp_ptr_12 at its
  // script, its character count (zp_count) and where it draws (zp_ptr_16).
  P.tile_anim_header = function (r) {
    const y = (r.a << 1) & 255;
    M[0x12] = M[0x06BC + y]; M[0x13] = M[0x06BD + y];
    M[0x58] = M[at(0x12, 2)];
    M[0x16] = M[at(0x12, 4)];
    M[0x17] = M[at(0x12, 5)];
    return { a: M[0x17], y: 5 };
  };
  // copy_tile_frame ($8CC5): zp_count characters from zp_ptr_14 to zp_ptr_16, the last byte first,
  // each counted for the page's clock (P.N).
  P.copy_tile_frame = function () {
    let y = ((M[0x58] << 3) - 1) & 255, a = 0;
    do { a = M[at(0x14, y)]; M[at(0x16, y)] = a; y = (y - 1) & 255; P.N.bytes = (P.N.bytes || 0) + 1; } while (y !== 0xFF);
    return { a, y: 0xFF };
  };
  // tile_anim_sound ($8CD6): the effect for slot X's animation and step, if tile_sound_anims ($C600)
  // and tile_sound_steps ($C5FB) have the pair, asked of voice 2 (tile_sound_tracks, $C5F6).
  P.tile_anim_sound = function (r) {
    const x = r.x;
    for (let y = 4; y >= 0; y--) {
      if (R(0x0250 + x) === M[0xC600 + y] && R(0x0258 + x) === M[0xC5FB + y]) M[0x035F] = M[0xC5F6 + y];
    }
    return { y: 0xFF };
  };
  // gunner_fires ($8CF2): the machine gunner (animation $89) at step 5 starts its bullet on sprite
  // 5: animation $DB, path $A6, at (134, 126).
  P.gunner_fires = function (r) {
    const x = r.x;
    if (R(0x0250 + x) !== 0x89 || R(0x0258 + x) !== 5) return {};
    M[0x63] = x;
    P.sei();
    M[0x0265] = 0xDB;
    M[0x02DD] = 0xA6;
    P.reset_slot_path({ x: 5 });
    M[0x026D] = 0;
    M[0x0275] = 2;
    M[0x020A] = 0x86; M[0x020B] = 0x7E;
    M[0x0210] = R(0x0210) & 0xDF;
    P.cli();
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
