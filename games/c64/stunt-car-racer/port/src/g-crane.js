// The crane at the start of a race ($EC11-$ED7E): the car held from the crane's chains, lowered to
// the road, held there for a count while the opponent's driver is shown, and let go; and the
// turn of the car's frame applied to its points.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.crane = P => {
  const M = P.M;

  // CRANE ($EC11): the start, while $2F counts down. From $E6 up: the chains' height $C3DF set
  // ($2C, or $D4 with $C36F bit 7) and $34 cleared. At $E5: the chains swung in (CRANE_SWING 0) and
  // the car lowered by 3 (CRANE_LOWER). At $E4: lowered by 4 and swung out ($FF); when the chains
  // are home, the count set to $A0-$BF at random ($8C in practice) and message 4 shown from $2C
  // (or $3C with $C37C bit 7). Below: swung in, lowered by 2, the count on (not past 1); the car
  // let go ($2F, $6B and $C355 cleared, $C37C = $80) once the count is below $80, or, with $C37C
  // set, once $C398 is clear.
  P.CRANE = r => {
    const x = M[0x2F];
    if (!x) return { a: r.a, x };
    if (x >= 0xE6) {
      M[0xC3DF] = (M[0xC36F] & 0x80) ? 0xD4 : 0x2C;
      M[0x34] = 0;
      M[0x2F] = (M[0x2F] - 1) & 255;
      return { a: 0, x };
    }
    if (x === 0xE5) {
      P.CRANE_SWING({ a: 0 });
      const q = P.CRANE_LOWER({ a: 3 });
      if (!(q.a & 0x80)) M[0x2F] = (M[0x2F] - 1) & 255;
      return { a: q.a, x };
    }
    if (x === 0xE4) {
      P.CRANE_LOWER({ a: 4 });
      const q = P.CRANE_SWING({ a: 0xFF });
      if (!q.z) return { a: q.a, x };
      let a = ((P.RANDOM({ x }).a & 0x1F) + 0xA0) & 255;
      const y = (M[0xC37C] & 0x80) ? 0x3C : 0x2C;
      if (!(M[0xC76C] & 0x80)) a = 0x8C;
      M[0x2F] = a;
      return P.SHOW_MESSAGE({ a: 4, x, y });
    }
    P.CRANE_SWING({ a: 0 });
    P.CRANE_LOWER({ a: 2 });
    M[0x2F] = (M[0x2F] - 1) & 255;
    if (!M[0x2F]) M[0x2F] = 1;
    if (M[0xC37C]) { if (M[0xC398]) return { a: M[0xC398], x }; }
    else if (M[0x2F] & 0x80) return { a: M[0xC37C], x };
    M[0x2F] = 0; M[0x6B] = 0; M[0xC355] = 0;
    M[0xC37C] = 0x80;
    return { a: 0x80, x };
  };

  // CRANE_LOWER ($EC9A): the car's height ($0171/$0174) brought down by an eighth of its height
  // over the road ($46/$64 less $C35D/$C35E, less A), at most $0200 a pass; A + 2 back
  P.CRANE_LOWER = r => {
    M[0x16] = r.a & 255;
    const t = M[0x46] - M[0xC35D]; M[0x14] = t & 255;
    let a = (M[0x64] - M[0xC35E] - (t < 0 ? 1 : 0) - M[0x16]) & 255;
    M[0x16] = a;
    a = (P.SHIFT16({ a, y: 3 }).a - 1) & 255;
    if ((a & 0x80) && a < 0xFE) { M[0x14] = 0; a = 0xFE; }
    M[0x15] = a;
    const u = M[0x0171] - M[0x14]; M[0x0171] = u & 255;
    M[0x0174] = (M[0x0174] - M[0x15] - (u < 0 ? 1 : 0)) & 255;
    a = M[0x16] + 2;
    return { a: a & 255, c: a > 255 ? 1 : 0, n: (a >> 7) & 1, z: (a & 255) ? 0 : 1 };
  };

  // CRANE_SWING ($ECDB): the chains' top ($C3DF/$34) moved by A ($100 parts, the other way with
  // $C36F bit 7) until it reaches $10 (or $F0); the car's point $0123/$0126 put under it, less its
  // place across ($B5/$B6 over 32), and $014E/$014F cleared; Z set when the chains are there
  P.CRANE_SWING = r => {
    let a = r.a & 255, y = 0x10;
    if (M[0xC36F] & 0x80) { a = (0 - a) & 255; y = 0xF0; }
    M[0x4E] = y;
    M[0x14] = 0;
    a = P.A_TO_15({ a, y: 0 }).a & 255;
    M[0x1A] = a; M[0x18] = M[0x15];
    M[0x14] = M[0xB5];
    const q = P.SHIFT16({ a: M[0xB6], y: 0xFB });
    M[0x15] = q.a & 255;
    if (M[0xC3DF] !== M[0x4E]) {
      const t = M[0x34] + M[0x1A]; M[0x34] = t & 255;
      M[0xC3DF] = (M[0xC3DF] + M[0x18] + (t >> 8)) & 255;
    }
    const t = M[0x34] - M[0x14]; M[0x0123] = t & 255;
    M[0x0126] = (M[0xC3DF] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    M[0x014E] = 0; M[0x014F] = 0;
    a = M[0xC3DF];
    return { a, y: q.y, z: a === M[0x4E] ? 1 : 0, c: a >= M[0x4E] ? 1 : 0 };
  };

  // TURN_POINTS ($ED39): the turn of the car's frame ($C36F's sign) applied to two of its points:
  // matrix entries $0776/$079E (negated) and $0777/$079F times $A0, over 8, added to the places of
  // points 2 and 0 ($0100/$0103/$0106 three bytes each)
  P.TURN_POINTS = r => {
    let y = 2, a = 0;
    for (let x = 2; x >= 0; x -= 2) {
      M[0x14] = M[0x0774 + y];
      a = M[0x079C + y];
      if (x === 2) a = P.NEG16({ a }).a & 255;
      M[0x5A] = M[0xC36F];
      M[0x15] = 0xA0;
      a = P.MUL_S16_S8({ a }).a & 255;
      a = P.SHIFT16({ a, y: 0xFD }).a & 255;
      M[0x15] = a;
      let t = M[0x0100 + x] + M[0x14]; M[0x0100 + x] = t & 255;
      t = M[0x0103 + x] + M[0x15] + (t >> 8); M[0x0103 + x] = t & 255;
      t = M[0x0106 + x] + M[0x2D] + (t >> 8); M[0x0106 + x] = t & 255;
      a = t & 255;
      y = 3;
    }
    return { a, x: 0xFE, y: 3 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
