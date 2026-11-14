/* pq-g0-base */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 0, the worked example the other groups follow.
// random ($3DA3) and draw_tile ($13C9), one function each, on the game's memory (pq-core.js says how).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M;
    // random ($3DA3): new + 1 = 254 x (seed with its bytes swapped + 1) mod 65537, the seed at $46/$47 and the
    // working bytes $40-$44, as the routine leaves them; returns the new high byte in A
    P.random = function (r) {
      M[0x43] = M[0x46]; M[0x42] = M[0x47]; M[0x41] = M[0x42]; M[0x40] = 0xFD; M[0x44] = M[0x43];
      let c = 1, t;
      const sbc = (a, b) => { t = a - b - (1 - c); c = t >= 0 ? 1 : 0; return t & 255; };
      M[0x40] = sbc(M[0x40], M[0x42]); M[0x41] = sbc(M[0x41], M[0x43]); M[0x44] = sbc(M[0x44], 0);
      M[0x40] = sbc(M[0x40], M[0x42]); M[0x41] = sbc(M[0x41], M[0x43]); M[0x44] = sbc(M[0x44], 0);
      M[0x42] = M[0x44]; M[0x43] = 0;
      M[0x40] = sbc(M[0x40], M[0x42]); M[0x41] = sbc(M[0x41], M[0x43]);
      if (!c) { M[0x40] = (M[0x40] + 1) & 255; if (M[0x40] === 0) M[0x41] = (M[0x41] + 1) & 255; }
      M[0x46] = M[0x40]; M[0x47] = M[0x41];
      r.a = M[0x41]; r.c = c; r.z = r.a === 0 ? 1 : 0; r.n = r.a >> 7;   // the carry of the last sbc, at $3DEC
      return r;
    };
    // draw_tile ($13C9): tile tile_number ($1261) at text row cell_row ($15), column cell_column ($16): its screen
    // colour, its colour RAM and its 8 bitmap bytes, through the operands the routine writes into itself
    P.draw_tile = function (r) {
      M[0x125F] = r.x; M[0x1260] = r.y;
      const tile = M[0x1261];
      if (tile >= 0x20 && tile < 0x3E) M[0x15] = (M[0x15] + M[0x125E]) & 255;
      const row = M[0x15], col = M[0x16];
      let s = M[0x4B00 + tile] + 0x62; M[0x1446] = s & 255;
      M[0x1447] = (M[0x4A00 + tile] + 0xAF + (s >> 8)) & 255;
      s = M[0x1717 + row] + col; M[0x1412] = s & 255;
      M[0x1413] = (M[0x1730 + row] + 0x5C + (s >> 8)) & 255;
      H.wr(M[0x1412] | M[0x1413] << 8, M[0x116B + tile]);
      s = M[0x1717 + row] + col; M[0x142C] = s & 255;
      M[0x142D] = (M[0x1730 + row] + 0xD8 + (s >> 8)) & 255;
      H.wr(M[0x142C] | M[0x142D] << 8, M[0x112C + tile]);
      s = M[0x1659 + row] + M[0x4B00 + col]; M[0x1449] = s & 255;
      M[0x144A] = (M[0x1672 + row] + M[0x4A00 + col] + (s >> 8)) & 255;
      const src = M[0x1446] | M[0x1447] << 8, dst = M[0x1449] | M[0x144A] << 8;
      let a = 0;
      for (let y = 0; y < 8; y++) { a = H.rd((src + y) & 0xFFFF); H.wr((dst + y) & 0xFFFF, a); }
      r.a = a; r.x = M[0x125F]; r.y = M[0x1260]; r.z = r.y === 0 ? 1 : 0; r.n = r.y >> 7;
      return r;
    };
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
