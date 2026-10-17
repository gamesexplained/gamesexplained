// The view on the screen ($963B): the view's buffer copied to the screen not shown.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.view = function (P) {
  const M = P.M;
  // show_view ($963B): the 144 rows of the buffer ($AE10 plus $9630, 28 bytes a row, one after
  // another) to the screen paged in at $C000, each row to the address the next word of the row
  // table at $8D5D names, with the interrupts off; then a pass of the sound driver. The game reads
  // the table through the stack pointer, which it keeps meanwhile at $962E: $BFEC, where the main
  // loop's stack stands whenever this runs ($86CA calls $98FF, which comes to $9987, which calls
  // this).
  P.def(0x963B, 'show_view', () => {
    let hl = 0xAE00 | ((0x10 + M[0x9630]) & 255);
    M[0x962E] = 0xEC; M[0x962F] = 0xBF;
    const mem = P.mem;
    for (let row = 0, t = 0x8D5D; row < 0x90; row++, t += 2) {
      const de = M[t] | M[t + 1] << 8;
      for (let i = 0; i < 28; i++) M[mem.alias((de + i) & 0xFFFF)] = M[(hl + i) & 0xFFFF];
      hl = (hl + 28) & 0xFFFF;
    }
    P.snd_frame({});
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
