// The steering and the windscreen's frame ($2DC2-$2FCD): the turn the steering and the road put
// on the car, and the frame drawn into the second bitmap.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.steer = P => {
  const M = P.M;

  // STEERING ($2DC2): the car's heading against the road's under it (the piece's place, $F02F;
  // its direction $0189/$018A, flipped by $A4, less the car's $0122/$0125, with a quarter turn
  // either way on a piece with $B2 bit 7, $2EFD/$2F00), its size in $7F:$7D. Steering ($C5) turns
  // the car by the speed along the road ($0159) times $C8 (more or less on such a piece, by the
  // turn's side, $9D), plus the difference over 16 when steering towards the road's direction.
  // Without steering, the car is turned towards the road's direction by its size times the speed
  // plus 10, over 128 (at least 1). More than $1E off, it is turned back straight away by the
  // excess. The turning force $0119/$011F is the steering's less the car's spin about that axis
  // ($010D/$0113), 0 in the air ($6A). The next piece is taken when the car is within 2 of the
  // piece's end ($BE, $C3).
  P.STEERING = r => {
    let x = M[0xC374];
    M[0x2E] = x;
    P.s_F02F({ x });
    let t = M[0x0189] - M[0x0122]; M[0x14] = t & 255;
    M[0x15] = ((M[0x018A] ^ M[0xA4]) - M[0x0125] - (t < 0 ? 1 : 0)) & 255;
    let y = 0;
    if (M[0xB2] & 0x80) { y = 1; if ((M[0x9D] ^ M[0xA4]) & 0x80) y = 2; }
    t = M[0x14] + M[0x2EFD + y]; M[0x14] = t & 255;
    let a = (M[0x15] + M[0x2F00 + y] + (t >> 8)) & 255;
    M[0x77] = a;
    a = P.NEG16_IF_MINUS({ a, n: a >> 7 }).a;
    M[0x7F] = a;
    M[0x7D] = M[0x14];
    if (a < 8) a = P.SHIFT16({ a, y: 0xFC }).a;
    else a = 0x7F;
    M[0xA5] = a;
    if (((M[0xBE] - M[0xC3]) & 255) < 2) { x = P.PIECE_AHEAD({}).x; P.s_F02F({ x }); }
    M[0x79] = M[0x9D] ^ M[0xA4];
    // the turn: L2ED7 with A the steering's factor, or straight to L2E6C
    let turn = null;
    if (M[0xC5]) {
      M[0x14] = M[0xC5] ^ M[0x77];
      if (M[0xB2] & 0x80) {
        if (!((M[0xC5] ^ M[0x79]) & 0x80)) {
          a = (M[0xC8] + 0x2D) & 255;
          if (!(M[0x14] & 0x80)) a = (a + M[0xA5]) & 255;
        } else {
          M[0xC5] = M[0x79];
          a = (M[0xC8] - 0x23) & 255;
        }
      } else {
        a = M[0xC8];
        if (!(M[0x14] & 0x80)) a = (a + M[0xA5]) & 255;
      }
      turn = a;
    } else {
      M[0x16] = 0; M[0x17] = 0;
      if (M[0xB2] & 0x80) { M[0xC5] = M[0x79]; turn = M[0xC8]; }
    }
    let toForce = false;
    if (turn !== null) {
      M[0x15] = turn;
      M[0x14] = M[0x0156];
      let o = P.MUL_S16_U8({ a: M[0x0159] });
      o = P.NEG16_IF_MINUS({ a: o.a, n: (M[0xC5] >> 7) & 1 });
      o = P.SHIFT16({ a: o.a, y: 3 });
      M[0x17] = o.a; M[0x16] = M[0x14];
      if (M[0x7F] < 0x1E) toForce = true;
    }
    if (!toForce) {
      // L2E6C: back towards the road's direction
      y = M[0x7D];
      M[0x14] = y;
      a = M[0x7F];
      let far = false;
      if (a) {
        a = (a - 0x1E) & 255;
        if (!(a & 0x80)) far = true;
        else y = 0xFF;
      }
      if (!far) {
        M[0x15] = y;
        let s = M[0x0159];
        if (s & 0x80) s = ((s ^ 0xFF) + 1) & 255;
        let o = P.MUL8({ a: (s + 0x0A) & 255 });
        o = P.SHIFT16({ a: o.a, y: 7 });
        a = o.a;
        if (!M[0x14]) M[0x14] = 1;
      }
      a = P.NEG16_IF_MINUS({ a, n: (M[0x77] >> 7) & 1 }).a;
      M[0x15] = a;
      t = M[0x0122] + M[0x14]; M[0x0122] = t & 255;
      M[0x0125] = (M[0x0125] + M[0x15] + (t >> 8)) & 255;
    }
    // L2EB0: the turning force
    M[0x14] = M[0x010D];
    M[0x15] = P.SHIFT16({ a: M[0x0113], y: 0 }).a;
    t = M[0x16] - M[0x14]; M[0x0119] = t & 255;
    a = (M[0x17] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    y = M[0x6A];
    if (!y) { M[0x0119] = 0; a = 0; }
    M[0x011F] = a;
    return { a, y };
  };

  // FRAME ($2F03): the windscreen's frame drawn into the bitmap at $4000 from the picture at
  // $6000: the edges above and below the view (patterns of 24 bytes repeated across, from $6130,
  // $6270, $63B0 and $64F0), the two pillars (FRAME_PILLAR) and the corners
  P.FRAME = r => {
    let x = 0;
    for (let y = 0; y < 0x90; y++) {
      M[0x4010 + y] = M[0x6130 + x]; M[0x40A0 + y] = M[0x6130 + x];
      M[0x4150 + y] = M[0x6270 + x]; M[0x41E0 + y] = M[0x6270 + x];
      M[0x5690 + y] = M[0x63B0 + x]; M[0x5720 + y] = M[0x63B0 + x];
      M[0x57D0 + y] = M[0x64F0 + x]; M[0x5860 + y] = M[0x64F0 + x];
      x++;
      if (x === 0x18) x = 0;
    }
    M[0x1E] = 0x48;
    P.FRAME_PILLAR({ a: 0x41, x: 0x30, y: 0x66 });
    M[0x1E] = 0x68;
    return P.FRAME_PILLAR({ a: 0x42, x: 0x40, y: 0x66 });
  };
  // FRAME_PILLAR ($2F4E): a pillar of the frame: eighteen character rows of 16 bytes into the
  // bitmap from ($1E) (A its high byte), from the three rows at X:Y and the two below in turn, then
  // the corners' bytes ($AA, $80, $02, $A9, $2A, $A8, $6A)
  P.FRAME_PILLAR = r => {
    M[0x1F] = r.a & 255;
    M[0x16] = r.x & 255; M[0x17] = r.y & 255;
    M[0x14] = 0x12;
    let src = 0, dst = M[0x1E] | M[0x1F] << 8;
    outer: for (;;) {
      M[0x99] = M[0x17]; M[0x98] = M[0x16];
      src = M[0x98] | M[0x99] << 8;
      M[0x15] = 3;
      for (;;) {
        for (let y = 0; y < 0x10; y++) M[(dst + y) & 0xFFFF] = M[(src + y) & 0xFFFF];
        M[0x14]--;
        if (!M[0x14]) break outer;
        dst = (dst + 0x140) & 0xFFFF;
        M[0x1E] = dst & 255; M[0x1F] = dst >> 8;
        M[0x15]--;
        if (!M[0x15]) continue outer;
        src = (src + 0x140) & 0xFFFF;
        M[0x98] = src & 255; M[0x99] = src >> 8;
      }
    }
    for (let x = 5, y = 2; x >= 0; x--, y++) {
      M[0x4008 + x] = 0xAA; M[0x4130 + x] = 0xAA; M[0x57C8 + y] = 0xAA; M[0x58F0 + y] = 0xAA;
      M[0x4268 + x] = 0x80;
      M[0x5690 + y] = 0x02;
    }
    for (let x = 1; x >= 0; x--) {
      M[0x400E + x] = 0xA9; M[0x4136 + x] = 0x2A; M[0x57C8 + x] = 0xA8; M[0x58F0 + x] = 0x6A;
    }
    return { a: 0x6A, x: 0xFF, y: 8 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
