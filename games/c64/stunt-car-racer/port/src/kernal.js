// Stand-ins for the KERNAL routines the game calls while the KERNAL is banked in: VECTOR ($FF8D)
// at the start-up. The simulator holds no ROM, so the game run on the kit's C64 and the port use
// these alike. They keep the KERNAL's own bytes as the ROM leaves them ($C3/$C4, VECTOR's pointer).
(function (root) {
'use strict';
const K = {
  // VECTOR ($FF8D, $FD1A in the ROM): the 32 bytes of vectors at $0314: with C set copied to X:Y,
  // with C clear set from there
  VECTOR(M, r) {
    M[0xC3] = r.x & 255; M[0xC4] = r.y & 255;
    const b = M[0xC3] | M[0xC4] << 8;
    let a = 0;
    for (let y = 0x1F; y >= 0; y--) {
      a = r.c ? M[0x0314 + y] : M[(b + y) & 0xFFFF];
      M[(b + y) & 0xFFFF] = a;
      M[0x0314 + y] = a;
    }
    return { a, x: r.x & 255, y: 0xFF, n: 1, z: 0, c: r.c };
  },
};
// the machine's hooks at the jump table, for the game's code run on the kit's C64
K.hooks = () => ({
  0xFF8D: c => { const q = K.VECTOR(c.m, c); c.a = q.a; c.y = q.y; c.n = 1; c.z = 0; c.rts(); return false; },
});
root.SCRKernal = K;
const G = root.SCRGroups = root.SCRGroups || {};
G.kernal = P => { P.kernal = { VECTOR: r => K.VECTOR(P.M, r) }; };
})(typeof window !== 'undefined' ? window : globalThis);
