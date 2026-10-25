// The panel below the playfield: its colours, the two energy bars and the energy they show, from
// the main loop; the message strip, the score and the meters, from the interrupt's bands.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.panel = function (P) {
  const M = P.M, io = P.io, R = P.irqByte;

  // colour_panel ($89C2): the first time the armour is activated, once its wait (zpa_87) is over
  // and voice 1 is off track $8C: screen rows 17-24 recoloured by panel_chars ($FC60) and
  // panel_colours ($FC7C), 11 for a character not in the list; then tracks $8F-$91 asked for and
  // the panel switched on (zp_panel_on). It takes the C64 most of six frames: each look in the list
  // is counted (P.N.tries) and paid a row at a time, so the rows change colour as the C64 changes
  // them.
  P.colour_panel = function () {
    if (!(M[0x89] & 0x80) || R(0x87) || R(0x0355) === 0x8C) return {};
    for (let x = 0x11; x < 0x19; x++) {
      const y = x << 1, lo = M[0xF128 + y], hi = M[0xF129 + y];
      M[0x02] = M[0x04] = lo; M[0x03] = hi; M[0x05] = (hi + 0x98) & 255; M[0x63] = x;
      const screen = lo | hi << 8, colour = (lo | M[0x05] << 8);
      for (let i = 0x27; i >= 0; i--) {
        const c = M[(screen + i) & 0xFFFF];
        let k = 0x1B;
        while (k >= 0 && M[0xFC60 + k] !== c) k--;
        P.N.tries = (P.N.tries || 0) + (k >= 0 ? 0x1C - k : 0x1C);
        P.wr((colour + i) & 0xFFFF, k >= 0 ? M[0xFC7C + k] : 0x0B);
      }
      P.paid();
    }
    M[0x035E] = 0x8F; M[0x035F] = 0x90; M[0x0360] = 0x91;
    M[0x89] = 0x00; M[0x8A] = 0x80;
    return {};
  };

  // update_energy_bars ($8A23): each bar a pixel towards its energy, once a frame (zpa_8F).
  P.update_energy_bars = function () {
    if (!(M[0x8A] & 0x80) || R(0x8F)) return {};
    // one read of each energy gives the compare's equal and its carry
    const suit = R(0x4F);
    if (M[0x50] !== suit) P.step_suit_bar({ c: M[0x50] >= suit ? 1 : 0 });
    const tal = R(0x51);
    if (M[0x52] !== tal) P.step_tal_bar({ c: M[0x52] >= tal ? 1 : 0 });
    M[0x8F] = 0x01;
    return {};
  };
  // step_suit_bar ($8A42) and step_tal_bar ($8A72): rows 2-5 of the bar's four characters, a
  // 32-bit row each, shifted right with a set bit in (carry clear: the bar grows) or left (it
  // shrinks), and the shown value moved.
  const bar = (base, shown, c) => {
    for (let x = 5; x >= 2; x--) {
      const a = base + x;
      let v = (M[a] << 24 | M[a + 8] << 16 | M[a + 16] << 8 | M[a + 24]) >>> 0;
      v = c ? (v << 1) >>> 0 : ((v >>> 1) | 0x80000000) >>> 0;
      M[a] = v >>> 24; M[a + 8] = (v >>> 16) & 255; M[a + 16] = (v >>> 8) & 255; M[a + 24] = v & 255;
    }
    M[shown] = (M[shown] + (c ? -1 : 1)) & 255;
    return { x: 1 };
  };
  P.step_suit_bar = r => bar(0x7788, 0x50, r.c);
  P.step_tal_bar = r => bar(0x7768, 0x52, r.c);

  // energy_tick ($8AA2), with the interrupts held off: every 100 frames in the suit a point back to
  // Tal (up to 31), and in room 0 two off the suit's; every 50 out of it the room's radiation
  // (zp_radiation) off Tal's.
  P.energy_tick = function () {
    P.sei();
    if (!R(0x91)) {
      if (M[0x7B] & 0x80) {
        M[0x91] = 0x64;
        if (R(0x51) < 0x1F) M[0x51] = (R(0x51) + 1) & 255;
        if (!M[0x5B]) {
          const a = (R(0x4F) - 2) & 255;
          M[0x4F] = a & 0x80 ? 0 : a;
        }
      } else {
        const a = (R(0x51) - M[0x75]) & 255;
        M[0x51] = a & 0x80 ? 0 : a;
        M[0x91] = 0x32;
      }
    }
    P.cli();
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
