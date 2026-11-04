// The interrupts ($CD5C-$CF55, $9A32, $FFB1): the raster interrupt that splits the screen into its
// bands, places the sprites of each band, flips the bitmap shown, moves the engine's note and
// turns the front wheels; and the NMI, which does nothing. Plain functions, as the lockstep runs
// them (kit/c64/lockstep.js, irqs).
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.irq = P => {
  const M = P.M;
  // the interrupt's tables ($CF56-$CF67): the boost flame's two sprites' places across, low
  // ($CF56, $CF58) and high ($CF66), and down ($CF5A, $CF5C), for each of the two frames it
  // alternates; their pointers ($CF5E, $CF60), four on in the other bitmap
  // IRQ ($CDAA): the raster interrupt. Anything else that interrupts (a CIA) is acknowledged and
  // left. With $3DF8 clear it does nothing more; with it positive the menus' bands (MENU_BANDS);
  // otherwise the race's: above line $80 the view's top (RACE_TOP), from it the dashboard
  // (RACE_LOWER). Each band sets the line of the next.
  P.IRQ = () => {
    if (!(P.rd(0xD019) & 0x80)) { P.rd(0xDC0D); P.rd(0xDD0D); return; }
    P.wr(0xD019, 1);
    const s = M[0x3DF8];
    if (!s) return;
    let line;
    if (!(s & 0x80)) line = menuBands(s);
    else if (P.rd(0xD012) & 0x80) line = raceLower();
    else line = raceTop();
    P.wr(0xD012, line);
    P.wr(0xD011, P.rd(0xD011) & 0x7F);
  };
  // the menus' bands ($CD5C): with $3DF8 bit 0 set, multicolour from the top to line $72 and hi-res
  // below it; otherwise multicolour with a black background ($D021 0) from line $CE, the
  // background dark grey ($0B) from line $D5, and hi-res from line $28
  const menuBands = s => {
    const hires = () => { P.wr(0xD016, P.rd(0xD016) & 0xEF); return 0x28; };
    if (s & 1) {
      if (P.rd(0xD012) >= 0x72) return hires();
      P.wr(0xD016, P.rd(0xD016) | 0x10);
      return 0x72;
    }
    const y = P.rd(0xD012);
    if (y & 0x80) {
      if (y >= 0xD5) return hires();
      P.wr(0xD021, 0x0B);
      return 0xD5;
    }
    P.wr(0xD016, P.rd(0xD016) | 0x10);
    P.wr(0xD021, 0);
    return 0xCE;
  };
  // the race's top band ($CDC5): the bitmap shown ($D018 $70 or $78) by $C35F, which takes $C370
  // unless a flip is waiting ($C37A). While a message is up ($C355), its two sprites at the top
  // ($FE and $FF, $C399 their colour) until line $64. Then sprites 2 and 3 placed for the
  // dashboard's clocks, and while the boost's flame shows ($72 bit 7) sprites 0 and 1 for it, the
  // two frames of its table in turn ($C36D); the sprites $6E names on; the next band at line $C5
  const raceTop = () => {
    let a;
    if (M[0xC37A]) a = M[0xC35F];
    else { a = M[0xC370]; M[0xC35F] = a; }
    if (a & 0x80) P.wr(0xD018, 0x70);
    else {
      P.wr(0xD018, 0x78);
      if (M[0xC355] && P.rd(0xD012) < 0x64) {
        P.wr(0xD001, 0x50); P.wr(0xD003, 0x50);
        P.wr(0xD000, 0xA0); P.wr(0xD002, 0xB8);
        P.wr(0xD027, M[0xC399]); P.wr(0xD028, M[0xC399]);
        M[0x5FF8] = 0xFE; M[0x5FF9] = 0xFF;
        return 0x64;
      }
    }
    P.wr(0xD005, 0xBB); P.wr(0xD007, 0xBB);
    P.wr(0xD004, 0x38); P.wr(0xD006, 0x20);
    P.wr(0xD010, 0xC8);
    P.wr(0xD01C, 0xFF);
    M[0x5FFA] = 0x64; M[0x5FFB] = 0x63;
    P.wr(0xD029, 3); P.wr(0xD02A, 3);
    if (M[0x72] & 0x80) {
      let x = (M[0xC36D] - 1) & 255;
      if (x & 0x80) x = 1;
      M[0xC36D] = x;
      P.wr(0xD000, M[0xCF56 + x]); P.wr(0xD002, M[0xCF58 + x]);
      P.wr(0xD010, M[0xCF66 + x]);
      P.wr(0xD001, M[0xCF5A + x]); P.wr(0xD003, M[0xCF5C + x]);
      if (M[0xC35F] & 0x80) x += 4;
      M[0x5FF8] = M[0xCF5E + x]; M[0x5FF9] = M[0xCF60 + x];
      P.wr(0xD027, 7); P.wr(0xD028, 7);
    }
    P.wr(0xD015, M[0x6E]);
    return 0xC5;
  };
  // the race's lower bands ($CEA1): from line $C5 the bitmap at $78 and the flip seen ($C37B from
  // $C37A), the next at line $D7; from it the dashboard's sprites 0 to 3 at the bottom (places
  // across at $140D-$1410), black and hi-res, $6F's sprites on; the engine's note ($09/$0A) moved
  // on by $10/$11 (0 if it goes below), into voice 1 and, an octave down, voice 3; the sound
  // effects' frame (EFFECT_TICK); and the engine's count $5F moved on by $5D, the front wheels
  // turning at each carry (WHEELS_TURN); the next band at line $3D
  const raceLower = () => {
    if (P.rd(0xD012) < 0xD7) {
      P.wr(0xD018, 0x78);
      M[0xC37B] = M[0xC37A];
      return 0xD7;
    }
    for (const r of [0xD005, 0xD007, 0xD001, 0xD003]) P.wr(r, 0xE4);
    P.wr(0xD000, M[0x140D]); P.wr(0xD002, M[0x140E]); P.wr(0xD004, M[0x140F]); P.wr(0xD006, M[0x1410]);
    P.wr(0xD010, 0x0C);
    M[0x5FF8] = 0; M[0x5FF9] = 1; M[0x5FFA] = 2; M[0x5FFB] = 3;
    for (const r of [0xD029, 0xD02A, 0xD027, 0xD028, 0xD01C]) P.wr(r, 0);
    P.wr(0xD015, M[0x6F]);
    let t = M[0x09] + M[0x10], x = t & 255;
    let a = (M[0x0A] + M[0x11] + (t >> 8)) & 255;
    if (a & 0x80) { a = 0; x = 0; }
    M[0x0A] = a;
    P.wr(0xD401, a);
    M[0x09] = x;
    P.wr(0xD40F, a >> 1);
    P.wr(0xD400, M[0x09] & 0xFE);
    P.wr(0xD40E, ((M[0x09] & 0xFE) >> 1) | ((a & 1) << 7));
    P.EFFECT_TICK({});
    t = M[0x5F] + M[0x5D]; M[0x5F] = t & 255;
    if (t > 255) P.WHEELS_TURN({});
    return 0x3D;
  };

  // WHEELS_TURN ($FFB1): the front wheels' top halves stepped on by a frame: the right wheel's
  // sprite 7 through frames $60-$62 and the left's sprite 5 through $65-$67, one way round while the
  // speed along the road ($0159) is positive and the other while it is negative
  P.WHEELS_TURN = r => {
    let x = M[0x5FFF], y = M[0x5FFD];
    if (!(M[0x0159] & 0x80)) {
      x = (x + 1) & 255; if (x >= 0x63) x = 0x60;
      y = (y - 1) & 255; if (y < 0x65) y = 0x67;
    } else {
      x = (x - 1) & 255; if (x < 0x60) x = 0x62;
      y = (y + 1) & 255; if (y >= 0x68) y = 0x65;
    }
    M[0x5FFF] = x; M[0x5FFD] = y;
    return { x, y };
  };

  // NMI ($9A32): CIA 2's interrupt flags read, to clear them, and nothing else
  P.NMI = () => { P.rd(0xDD0D); };

  // EFFECT ($CF68): sound effect A, from its seven bytes at $AF80 + 8A (START_EFFECT)
  P.EFFECT = r => {
    const a = r.a & 255;
    return P.START_EFFECT({ x: (((a << 3) & 255) + 0x80 + ((a >> 5) & 1)) & 255, y: 0xAF });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
