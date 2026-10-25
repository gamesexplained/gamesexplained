// The sprites, from the interrupt: each slot moved a frame in its direction (move_sprites), its
// animation stepped (animate_sprites), and its dissolving or materialising, a step every fourth
// frame through the sixteen masks at $0800 (sprite_effects).
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.sprites = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const setw = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);
  const BIT = 0xF118, CLEAR = 0xF120;                    // bit_masks, bit_clear_masks

  // move_sprites ($98A5): Tal against the scenery first, then every slot neither dissolving nor
  // materialising a frame in its direction (slot_dir: 1 up, 2 down, 4 left, 8 right).
  P.move_sprites = function () {
    P.tal_terrain();
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      if ((R(0x0290 + x) | R(0x02A8 + x)) & 0x80) continue;
      P.count('moves');
      y = (x << 1) & 255;
      M[0x59] = R(0x02C8 + x);
      const bit = () => { const c = M[0x59] & 1; M[0x59] >>= 1; return c; };
      if (bit()) P.move_up({ x, y });
      if (bit()) P.move_down({ x, y });
      if (bit()) P.move_left({ x, y });
      if (bit()) P.move_right({ x, y });
    }
    return { x: 0xFF, y };
  };
  // move_up ($98DA): slot X (its Y at $0201 + Y) up by its step, no higher than $1D; Tal there
  // leaves by the top, to come in at the bottom ($9C) of the room above.
  P.move_up = function (r) {
    const x = r.x, y = r.y;
    const v = (R(0x0201 + y) - R(0x02F8 + x)) & 255;
    M[0x0201 + y] = v;
    if (v >= 0x1D) return {};
    M[0x0201 + y] = 0x1D;
    if (x >= 1 || (R(0x6B) & 0x80)) return {};
    P.sei(); M[0x6B] = 0x83; M[0x0201] = 0x9C; M[0x0203] = 0xB1; P.cli();
    return {};
  };
  // move_down ($9906): slot X down by its step. At $9C or below Tal leaves by the bottom, the
  // stone (slot 2) is spent and the bomber's bomb (slot 5, animation $D2) drops another; between
  // $94 and $9C a falling object (and slot 7 below) lands.
  P.move_down = function (r) {
    const x = r.x, y = r.y;
    const v = (R(0x0201 + y) + R(0x02F8 + x)) & 255;
    M[0x0201 + y] = v;
    if (v >= 0x9C) {
      if (x < 1) {
        if (R(0x6B) & 0x80) return {};
        P.sei(); M[0x6B] = 0x82; M[0x0201] = 0x1D; M[0x0203] = 0x32; P.cli();
        return {};
      }
      if (x === 5) { if (R(0x0260 + x) === 0xD2) P.place_bomb(); return {}; }
      if (x !== 7) { if (x === 2) { M[0x0262] = 0; M[0x02DA] = 0; M[0x7C] = 0; } return {}; }
    }
    if (R(0x0201 + y) >= 0x94) P.land_object({ x });
    return {};
  };
  // move_left ($9962): slot X left by its step, its X high bit cleared when it crosses 256; Tal
  // under $32 leaves by the left, the stone under $0E is spent.
  P.move_left = function (r) {
    const x = r.x, y = r.y;
    if (R(0x0210) & M[BIT + x]) {
      const s = R(0x0200 + y) - R(0x02F0 + x);
      M[0x0200 + y] = s & 255;
      if (s >= 0) return {};
      P.sei(); M[0x0210] = R(0x0210) & M[CLEAR + x]; P.cli();
      return {};
    }
    const v = (R(0x0200 + y) - R(0x02F0 + x)) & 255;
    M[0x0200 + y] = v;
    if (v >= 0x32) return {};
    if (x < 1) {
      if (R(0x6B) & 0x80) return {};
      P.sei();
      M[0x6B] = 0x81; M[0x0200] = 0x2C; M[0x0202] = 0x2C; M[0x0210] = R(0x0210) | 0x03;
      P.cli();
      return {};
    }
    if (x === 2 && v < 0x0E) { M[0x0262] = 0; M[0x02DA] = 0; M[0x7C] = 0; }
    return {};
  };
  // move_right ($99C6): slot X right by its step, its X high bit set when it crosses 256; Tal
  // past 256 + $2C leaves by the right, the stone past 256 + $59 is spent.
  P.move_right = function (r) {
    const x = r.x, y = r.y;
    if (!(R(0x0210) & M[BIT + x])) {
      const s = R(0x0200 + y) + R(0x02F0 + x);
      M[0x0200 + y] = s & 255;
      if (s < 256) return {};
      P.sei(); M[0x0210] = R(0x0210) | M[BIT + x]; P.cli();
      return {};
    }
    const v = (R(0x0200 + y) + R(0x02F0 + x)) & 255;
    M[0x0200 + y] = v;
    if (v < 0x2C) return {};
    if (x < 1) {
      if (R(0x6B) & 0x80) return {};
      P.sei();
      M[0x6B] = 0x80; M[0x0200] = 0x32; M[0x0202] = 0x32; M[0x0210] = R(0x0210) & 0xFC;
      P.cli();
      return {};
    }
    if (x === 2 && v >= 0x59) { M[0x0262] = 0; M[0x02DA] = 0; M[0x7C] = 0; }
    return {};
  };
  // land_object ($9A2A): a falling object (fall_anims, $06A3) landed: its landing animation
  // (land_anims, $06A0), no path, and sprite 7's Y on the row.
  P.land_object = function (r) {
    const x = r.x, a = R(0x0260 + x);
    for (let y = 2; y >= 0; y--) {
      if (a !== M[0x06A3 + y]) continue;
      M[0x0260 + x] = M[0x06A0 + y];
      M[0x02D8 + x] = 0; M[0x0268 + x] = 0;
      M[0x0270 + x] = 2;
      M[0x020F] = ((((R(0x020F) - 0x32) & 0xF8) + 0x35) & 255);
      return { y };
    }
    return { y: 0xFF };
  };

  // animate_sprites ($9E0E): each slot neither dissolving nor materialising, shown and stepped
  // when it has an animation (bit 7), hidden when it has none.
  P.animate_sprites = function () {
    for (let x = 7; x >= 0; x--) {
      if ((R(0x02A8 + x) | R(0x0290 + x)) & 0x80) continue;
      P.count('animated');
      if (R(0x0260 + x) & 0x80) {
        M[0x0215] = R(0x0215) | M[BIT + x];
        P.step_animation({ x });
      } else M[0x0215] = R(0x0215) & M[CLEAR + x];
    }
    return { x: 0xFF };
  };
  // step_animation ($9E39): a frame of slot X's animation (anim_ptrs, $FCA6). When its wait is
  // over: the header's frame time, colour and the multicolour, wide and tall bits, then the
  // script at slot_pos: a picture (16 or more) shown for the frame time, or a command: 0 back to the
  // start, 1 the end (a landing animation's end spawns the room's enemy), 2 a jump, more another
  // animation.
  P.step_animation = function (r) {
    const x = r.x;
    for (;;) {
      if (R(0x0268 + x)) { dec(0x0268 + x); return {}; }
      let y = (R(0x0260 + x) << 1) & 255;
      M[0x1E] = M[0xFCA6 + y]; M[0x1F] = M[0xFCA7 + y];
      M[0x021C] = R(0x021C) & M[CLEAR + x];
      M[0x0217] = R(0x0217) & M[CLEAR + x];
      M[0x021D] = R(0x021D) & M[CLEAR + x];
      M[0x0268 + x] = M[at(0x1E, 0)];
      const h = M[at(0x1E, 1)];
      M[0x0227 + x] = h & 0x0F;
      M[0x5A] = (h << 3) & 255;
      if (h & 0x80) M[0x021C] = R(0x021C) | M[BIT + x];
      if (h & 0x40) M[0x021D] = R(0x021D) | M[BIT + x];
      if (h & 0x20) M[0x0217] = R(0x0217) | M[BIT + x];
      for (;;) {
        P.anim_sounds({ x });
        y = R(0x0270 + x);
        const a = M[at(0x1E, y)];
        if (a >= 0x10) {
          M[0x0278 + x] = a;
          inc(0x0270 + x);
          dec(0x0268 + x);
          return { a, y };
        }
        if (a === 0) { M[0x0270 + x] = 2; continue; }
        if (a === 1) {
          const n = R(0x0260 + x);
          for (let k = 2; k >= 0; k--) if (n === M[0x06A0 + k]) return P.spawn_enemy({ x });
          M[0x0260 + x] = 0;
          const e = R(0x0215) & M[CLEAR + x];
          M[0x0215] = e;
          io.vicWrite(0x15, e);
          dec(0x0268 + x);
          return { a: e, y: 0xFF };
        }
        y = (y + 1) & 255;
        if (a === 2) { M[0x0270 + x] = (M[at(0x1E, y)] + 2) & 255; continue; }
        M[0x0260 + x] = M[at(0x1E, y)];
        M[0x0268 + x] = 0;
        M[0x0270 + x] = 2;
        break;
      }
    }
  };
  // spawn_enemy ($9F0D): a landed object's end: sprite 7 at the room's spawn point (the first
  // entry of its list, room_sprite_ptrs $CA16), slot X given that entry's path and the animation
  // it materialises into.
  P.spawn_enemy = function (r) {
    const x = r.x;
    const y = (R(0x5B) << 1) & 255;
    M[0x10] = M[0xCA16 + y]; M[0x11] = M[0xCA17 + y];
    M[0x020E] = M[at(0x10, 1)];
    M[0x020F] = M[at(0x10, 2)];
    M[0x02D8 + x] = M[at(0x10, 3)] | 0x80;
    M[0x02A8 + x] = M[at(0x10, 4)];
    P.reset_slot_path({ x });
    M[0x0268 + x] = 0; M[0x02B0 + x] = 0; M[0x02B8 + x] = 0;
    M[0x0270 + x] = 2;
    return P.step_animation({ x });
  };
  // anim_sounds ($A23A): the effect for slot X's animation at this point of its script, from the
  // eight pairs at anim_sound_anims ($C67B) and anim_sound_steps ($C66B), asked of its voice. The
  // count goes on from the voice's number, one less, after a match (the game's own loop).
  P.anim_sounds = function (r) {
    const x = r.x;
    if (R(0xB0) & 0x80) return {};
    let y = 7;
    do {
      if (R(0x0260 + x) === M[0xC67B + y] && R(0x0270 + x) === M[0xC66B + y]) {
        const a = M[0xC663 + y];
        y = M[0xC673 + y];
        M[0x035E + y] = a;
      }
      y = (y - 1) & 255;
    } while (y < 0x80);
    return { y };
  };

  // sprite_effects ($9F4A): each slot's dissolve and materialise.
  P.sprite_effects = function () {
    for (let x = 7; x >= 0; x--) {
      if (R(0x0290 + x) & 0x80) P.dissolve_step({ x });
      if (R(0x02A8 + x) & 0x80) P.materialise_step({ x });
    }
    return { x: 0xFF };
  };
  // dissolve_step ($9F60): every fourth call, slot X's picture saved (at the first step) and
  // masked; after the ninth, the sprite gone and its picture put back. Tal's (slot 0), unless he
  // is teleporting, is his leaving the armour: he stands where the suit stood, the suit empty
  // ($B2, $B3), and the first time the armour's power-up starts.
  P.dissolve_step = function (r) {
    const x = r.x;
    if (R(0x0298 + x)) { dec(0x0298 + x); return {}; }
    M[0x0298 + x] = 4;
    if (R(0x02A0 + x) < 9) {
      if (!R(0x02A0 + x)) P.save_sprite_shape({ x });
      P.mask_sprite_shape({ x });
      inc(0x02A0 + x);
      dec(0x0298 + x);
      return {};
    }
    M[0x0260 + x] = 0; M[0x0290 + x] = 0;
    const e = R(0x0215) & M[CLEAR + x];
    M[0x0215] = e;
    io.vicWrite(0x15, e);
    P.restore_sprite_shape({ x });
    if (x >= 1 || (R(0x6E) & 0x80)) return {};
    M[0x0200] = R(0x0206); M[0x0202] = R(0x0206);
    M[0x0201] = R(0x0207);
    M[0x0203] = R(0x0209);
    let h = R(0x0210) & 0xFC;
    M[0x0210] = h;
    if (h & 0x18) M[0x0210] = R(0x0210) | 0x03;
    M[0x0263] = 0; M[0x0264] = 0;
    M[0x80] = 0; M[0x81] = 0; M[0x82] = 0; M[0x8E] = 0;
    M[0x0268] = 0; M[0x0269] = 0;
    M[0x0270] = 2; M[0x0271] = 2;
    io.vicWrite(0x25, 0x0E);
    io.vicWrite(0x26, 0x0B);
    M[0x7B] = 0xB2; M[0x0260] = 0xB2;
    M[0x0261] = 0xB3;
    M[0x93] = 0x64;
    if (R(0x88) & 0x80) return {};
    M[0x035E] = 0x8C; M[0x035F] = 0x8D; M[0x0360] = 0x8E;
    M[0x88] = 0xC2; M[0x89] = 0xC2; M[0xA0] = 0xC2;
    M[0x42F8 + 0x22] = 0xC2;
    io.colourWrite(0x02F8 + 0x22, 0x05);
    M[0x87] = 0x96;
    return {};
  };
  // The sprites' pictures are 64 bytes from $4000, the masks 64 bytes from $0800, and each slot's
  // saved picture 64 bytes from $0361.
  const picture = n => (n << 6) + 0x4000, mask = n => (n << 6) + 0x0800, saved = x => (x << 6) + 0x0361;
  // mask_sprite_shape ($A030): slot X's picture ANDed with the mask of its dissolve's step.
  P.mask_sprite_shape = function (r) {
    const x = r.x;
    setw(0x1A, picture(R(0x0278 + x)));
    setw(0x18, mask(R(0x02A0 + x)));
    let a = 0;
    for (let y = 0x3F; y >= 0; y--) { a = M[at(0x1A, y)] & M[at(0x18, y)]; M[at(0x1A, y)] = a; }
    return { a, y: 0xFF };
  };
  // save_sprite_shape ($A073): slot X's picture into its saved copy.
  P.save_sprite_shape = function (r) {
    const x = r.x;
    setw(0x18, picture(R(0x0278 + x)));
    setw(0x1A, saved(x));
    let a = 0;
    for (let y = 0x3F; y >= 0; y--) { a = R(at(0x18, y)); M[at(0x1A, y)] = a; }
    return { a, y: 0xFF };
  };
  // restore_sprite_shape ($A0B1): slot X's saved copy back over its picture.
  P.restore_sprite_shape = function (r) {
    const x = r.x;
    setw(0x1A, picture(R(0x0278 + x)));
    setw(0x18, saved(x));
    let a = 0;
    for (let y = 0x3F; y >= 0; y--) { a = R(at(0x18, y)); M[at(0x1A, y)] = a; }
    return { a, y: 0xFF };
  };
  // materialise_step ($A0EF): every fourth call, a step of slot X appearing: at the first, its
  // target's first picture saved and the sprite shown (unless an enemy of a later slot is still
  // there, when this one is dropped); each step that picture through the inverse of the step's
  // mask; after the ninth, the target animation started. The armour's ($88) also sets the wait at $93.
  P.materialise_step = function (r) {
    const x = r.x;
    if (R(0x02B0 + x)) { dec(0x02B0 + x); return {}; }
    M[0x02B0 + x] = 4;
    const n = R(0x02B8 + x);
    if (n >= 9) {
      const a = R(0x02A8 + x);
      M[0x0260 + x] = a;
      M[0x02A8 + x] = a & 0x7F;
      if (a === 0x88) { M[0x93] = 0x64; return { a: 0x64 }; }
      dec(0x02B0 + x);
      return {};
    }
    if (!n) {
      const k = R(0x7D);
      if (x < k && x >= 3 && k && !((R(0x0290 + k) ^ R(0x0260 + k)) & 0x80)) {
        M[0x02A8 + x] = 0; M[0x0260 + x] = 0; M[0x02D8 + x] = 0;
        return { a: 0, y: k };
      }
      P.save_target_shape({ x });
      P.draw_materialise({ x });
      M[0x0278 + x] = R(0x02C0 + x);
      M[0x0215] = R(0x0215) | M[BIT + x];
    } else P.draw_materialise({ x });
    inc(0x02B8 + x);
    dec(0x02B0 + x);
    return {};
  };
  // draw_materialise ($A160): slot X's colour and multicolour bit from its target's header, and
  // its picture: the saved copy ANDed with the inverse of the step's mask.
  P.draw_materialise = function (r) {
    const x = r.x;
    const y = (R(0x02A8 + x) << 1) & 255;
    M[0x18] = M[0xFCA6 + y]; M[0x19] = M[0xFCA7 + y];
    M[0x021C] = R(0x021C) & M[CLEAR + x];
    const h = M[at(0x18, 1)];
    M[0x0227 + x] = h & 0x0F;
    if (h & 0x80) M[0x021C] = R(0x021C) | M[BIT + x];
    const pic = M[at(0x18, 2)];
    setw(0x1A, picture(pic));
    setw(0x18, saved(x));
    setw(0x2C, mask(R(0x02B8 + x)));
    let a = 0;
    for (let k = 0x3F; k >= 0; k--) { a = (M[at(0x2C, k)] ^ 0xFF) & R(at(0x18, k)); M[at(0x1A, k)] = a; }
    return { a, y: 0xFF };
  };
  // save_target_shape ($A1E9): the first picture of slot X's target animation (header byte 2),
  // kept at $02C0 and copied into the slot's saved copy.
  P.save_target_shape = function (r) {
    const x = r.x;
    const y = (R(0x02A8 + x) << 1) & 255;
    M[0x18] = M[0xFCA6 + y]; M[0x19] = M[0xFCA7 + y];
    const pic = M[at(0x18, 2)];
    M[0x02C0 + x] = pic;
    setw(0x18, picture(pic));
    setw(0x1A, saved(x));
    let a = 0;
    for (let k = 0x3F; k >= 0; k--) { a = R(at(0x18, k)); M[at(0x1A, k)] = a; }
    return { a, y: 0xFF };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
