// Arithmetic: the divisions the rules use.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.maths = P => {
  // $943B: BC = 32 x A divided by B, rounded down (0 for B = 0, with Z). HL is left 32 x A less
  // (BC + 1) x B, as the loop of subtractions leaves it.
  P.def(0x943B, 'div32', r => {
    let hl = 32 * r.a & 0xFFFF;
    const de = r.b;
    if (!de) return { hl, de: 0, bc: 0, a: 0, zf: true };
    let bc = 0;
    for (;;) {
      const d = hl - de;
      hl = d & 0xFFFF;
      if (d < 0) break;
      bc = bc + 1 & 0xFFFF;
    }
    return { hl, de, bc, a: de, cf: true, zf: false };
  });
  // $9452: DE = 32 x HL divided by BC, rounded to the nearest (0 for BC = 0, with Z).
  P.def(0x9452, 'div32Round', r => {
    let bc = r.bc;
    if (!bc) return { de: 0, a: 0, zf: true };
    const a = (bc >> 8) || (bc & 255);
    let hl = 32 * r.hl & 0xFFFF, de = 0;
    for (;;) {
      const d = hl - bc;
      if (d < 0) break;
      hl = d;
      de = de + 1 & 0xFFFF;
    }
    bc >>= 1;
    const d = hl - bc;
    hl = d & 0xFFFF;
    if (d >= 0) de = de + 1 & 0xFFFF;
    return { de, hl, bc, a, cf: d < 0, zf: false };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
