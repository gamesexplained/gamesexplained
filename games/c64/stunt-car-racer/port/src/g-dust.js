// The random numbers, the dust and the debris ($29B9-$2AAD, $2C51-$2DC1): a shift register in
// $02-$06, the dust thrown up from the road while the car is on it (up to 32 specks, falling
// back under their own weight) and the pieces that fly when it is wrecked; the engine's note.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.dust = P => {
  const M = P.M;

  // RANDOM ($29B9): moves the forty-bit shift register at $02-$06 on by eight bits and gives its
  // new first byte in A ($53 and $54 are its scratch); X and Y are kept
  P.RANDOM = r => {
    let c = M[0x06] & 1;
    let a = M[0x05];
    M[0x06] = a;
    let c2 = a & 1; a = (c << 7) | (a >> 1); c = c2;
    M[0x54] = a;
    a = M[0x04];
    M[0x05] = a;
    a &= 0x0F;
    c = a & 1; a >>= 1;
    M[0x53] = a;
    M[0x04] = M[0x03];
    M[0x03] = M[0x02];
    a = (M[0x04] & 0xF0) | M[0x53];
    for (let i = 0; i < 4; i++) { c2 = a & 1; a = (c << 7) | (a >> 1); c = c2; }
    a ^= M[0x54];
    M[0x02] = a;
    return { a, c, n: a >> 7, z: a ? 0 : 1, x: r.x, y: r.y };
  };

  // DEBRIS ($29E3): draws wrecked piece X, at column $80A0 and row $C260 of speck $C6, as a few
  // lines joined end to end ($FEC9), their steps from the tables at $2A3E (across) and $2A4D
  // (down): ten lines for an odd X, five for an even one; bit 1 of X picks the colour ($FC01)
  P.DEBRIS = r => {
    let x = r.x & 255;
    let y = (x & 1) ? 0 : 1;
    M[0xA0] = M[0x2A36 + y];
    M[0x08] = M[0x2A38 + y];
    P.s_FC01({ x: (x >> 1) & 1, y });
    x = M[0xC6];
    let a = (M[0x80A0 + x] + M[0x2A3C + y]) & 255;
    y = M[0xC260 + x];
    do {
      M[0xA220] = a;
      M[0xA26C] = y;
      y = M[0xA0];
      a = (a + M[0x2A3E + y]) & 255;
      M[0xA221] = a;
      M[0xA26D] = (M[0xA26C] + M[0x2A4D + y]) & 255;
      P.s_FEC9({ x: 0x20, y: 0x21 });
      a = M[0xA221];
      y = M[0xA26D];
      M[0xA0] = (M[0xA0] - 1) & 255;
      M[0x08] = (M[0x08] - 1) & 255;
    } while (!(M[0x08] & 0x80));
    return { a, y };
  };

  // DEBRIS_START ($2A5C): where on the outline of the view's top ($C640) a wrecked piece X starts:
  // the first column out from the middle ($40), right then left, where the outline steps by 4 or
  // more, a few pixels about it at random; $C260 = $D2 (none) when there is no such column
  P.DEBRIS_START = r => {
    const x = r.x & 255;
    let y = 0x40;
    M[0x08] = y;
    for (;;) {
      let a = (M[0xC640 + y] - M[0xC63F + y]) & 255;
      M[0x14] = a;
      if (a & 0x80) a = ((a ^ 0xFF) + 1) & 255;
      if (a >= 4) break;
      if (!(M[0x08] & 0x80)) {
        y = (y + 1) & 255;
        if (!(y & 0x80)) continue;
        y = 0x40;
        M[0x08] = (M[0x08] << 1) & 255;
      }
      y = (y - 1) & 255;
      if (!y) { M[0xC260 + x] = 0xD2; return { a: 0xD2, x, y }; }
    }
    if (!(M[0x14] & 0x80)) y = (y - 1) & 255;
    M[0x16] = y;
    M[0xC260 + x] = (((P.RANDOM({}).a & 7) - 2) + M[0xC640 + y]) & 255;
    y = (((P.RANDOM({}).a & 7) - 4) + M[0x16]) & 255;
    M[0x80A0 + x] = y;
    return { a: y, x, y };
  };

  // DUST_WRECKED ($2C51): sixteen pieces fly while the car is wrecked, with a sound of $0A and a
  // speed of the car's ($0188), 16 at most
  P.DUST_WRECKED = r => {
    let a = M[0x0188];
    if (a >= 0x10) a = 0x10;
    M[0xC350] = a;
    return P.DUST_GO({ x: 0x0F, a: 8 });
  };
  // DUST_CLEAR ($2C64): all 32 specks gone ($C260 = $D4)
  P.DUST_CLEAR = r => {
    for (let x = 0x1F; x >= 0; x--) M[0xC260 + x] = 0xD4;
    return { a: 0xD4, x: 0xFF };
  };
  // DUST ($2C6F): the dust, while the car is on the road ($C30A, or lowered at the start, $0E)
  // and not wrecked, moving at all ($0188): 32 specks, their number in the sound of the stones
  // (sound effect 1, its pitch at $AF8C from the speed, 50 at most, or a random 3 or $0D)
  P.DUST = r => {
    if (!M[0xC30A] && !M[0x0E]) return { a: 0 };
    if (M[0x6B] & 0x80) return {};
    let a = M[0x0188];
    if (a < 1) return { a };
    if (a >= 0x32) a = 0x32;
    M[0xC350] = a;
    const y = P.RANDOM({}).a & 7;
    a = M[0xC350];
    if (a < 8) a = 8;
    else if (y >= 6) a = y === 7 ? 0x03 : 0x0D;
    return P.DUST_GO({ x: 0x1F, a, y });
  };
  // DUST_GO ($2CAB): with A the sound's pitch less 2 and X the last speck: in the air ($6A 0) all
  // go (DUST_CLEAR); on the road each speck is rubbed out where it was and moved (DUST_PLOT): it
  // falls faster by 2 ($4120) and moves across by $4100; one that has gone below the view starts
  // again, at random, on the road's edge ($C280, or for a wreck DEBRIS_START), going up by a
  // quarter of $C350 and a little more, and out from the middle by an eighth of its distance from
  // it
  P.DUST_GO = r => {
    M[0xAF8C] = ((r.a & 255) + 2) & 255;
    M[0x2C] = r.x & 255;
    if (!M[0x6A]) return P.DUST_CLEAR({});
    P.s_CF68({ a: 1 });
    let x = M[0x2C];
    do {
      if (!P.DUST_PLOT({ x }).z) continue;
      const a = (M[0x4120 + x] + 2) & 255;
      M[0x4120 + x] = a;
      M[0xC260 + x] = (a + M[0xC260 + x]) & 255;
      M[0x80A0 + x] = (M[0x80A0 + x] + M[0x4100 + x]) & 255;
    } while (((x = (x - 1) & 255) & 0x80) === 0);
    x = M[0x2C];
    do {
      if (M[0xC260 + x] < 0xB8) continue;
      M[0x14] = P.RANDOM({}).a & 7;
      M[0x4120 + x] = (((M[0xC350] >> 2) + M[0x14]) & 255) ^ 0xFF;
      let y;
      if (M[0x6B] & 0x80) y = P.DEBRIS_START({ x }).y;
      else {
        y = ((P.RANDOM({}).a & 0x3F) + 0x20) & 255;
        M[0x80A0 + x] = y;
        M[0xC260 + x] = ((P.RANDOM({}).a | 0xF8) + M[0xC280 + y]) & 255;
      }
      M[0x14] = 0;
      let t = y - 0x40;
      let a = t & 255;
      if (a & 0x80) M[0x14] = 0xFF;
      for (let i = 0; i < 3; i++) { const c = M[0x14] & 1; M[0x14] >>= 1; a = (c << 7) | (a >> 1); }
      M[0x4100 + x] = a;
      P.DUST_PLOT({ x });
    } while (((x = (x - 1) & 255) & 0x80) === 0);
    return { x };
  };
  // DUST_PLOT ($2D3D): speck X drawn: two pixels, one above the other, cleared ($A4C0 the masks)
  // at its column $80A0 and row $C260, or for a wreck a piece of debris (DEBRIS); one outside the
  // view (rows $41-$B7, columns below $80) is gone ($D2), and Z clear says so
  P.DUST_PLOT = r => {
    const x = r.x & 255;
    M[0xC6] = x;
    let y = M[0xC260 + x];
    const a = M[0x80A0 + x];
    if (y >= 0xB8 || (a & 0x80) || y < 0x41) { M[0xC260 + x] = 0xD2; return { a: 0xD2, x, y, z: 0 }; }
    if (M[0x6B] & 0x80) P.DEBRIS({ x, y, a });
    else {
      let v = P.DUST_BYTE({ x: a, y }).a & M[0xA4C0 + a];
      M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF] = v;
      y = (y - 1) & 255;
      v = P.DUST_BYTE({ x: a, y }).a & M[0xA4C0 + a];
      M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF] = v;
    }
    return { a: 0, x: M[0xC6], z: 1 };
  };
  // DUST_BYTE ($2D76): points $1E at the byte of the bitmap being drawn ($12) that holds pixel
  // column X of row Y, less Y, and reads it
  P.DUST_BYTE = r => {
    const x = r.x & 255, y = r.y & 255;
    const t = ((x & 0x7C) << 1) + M[0xA500 + y];
    M[0x1E] = t & 255;
    M[0x1F] = (M[0xA600 + y] + M[0x12] + (t >> 8)) & 255;
    return { a: M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF], x, y };
  };

  // ENGINE_NOTE ($2D89): the size of the speed along the road ($0159/$0156) into $0188, and the
  // engine's note ($5D, added up by the interrupt each frame) from it: eight times it below 8, twice
  // it plus $30 from there, $FF at most; in the air the note falls by a quarter a pass
  P.ENGINE_NOTE = r => {
    M[0x14] = M[0x0156];
    const v = M[0x0159];
    let a = P.NEG16_IF_MINUS({ a: v, n: (v >> 7) & 1 }).a;
    M[0x0188] = a;
    if (!M[0x6A]) {
      M[0x14] = M[0x5D] >> 2;
      M[0x5D] = (M[0x5D] - M[0x14]) & 255;
      return { a: M[0x5D], x: 0 };
    }
    if (a < 8) {
      a = P.SHIFT16({ a, y: 0xFD }).a;
      M[0x5D] = a;
      return { a };
    }
    const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
    a = ((a << 1) | c) & 255;
    a += 0x30;
    if (a > 255) a = 0xFF;
    M[0x5D] = a;
    return { a };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
