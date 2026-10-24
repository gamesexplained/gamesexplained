/* brain.js */
// The opponents' brain, opp_brain (engine $6B00), ported line for line: what a guard or Akuma does
// each frame he is moved. It reads zero page and the stage's four tables at $BFE1-$BFFD, and
// draws its random numbers from the routine at $6C95 ($48 = $48 x 17 + $A1). think() leaves zero
// page as the routine leaves it and returns the command it would carry out (engine $6540), or null
// where it returns without one. test_brain.js holds it to the game's own code run on the kit's 6502
// over 670,000 cases. index.html loads it for the brain calculator.
//
//   KarBrain.think(z, t, x)   z: zero page (256 bytes, changed in place), t(a): the stage's byte at
//                             a, x: the X register on entry (the caller's). Returns { cmd } or null.
//   KarBrain.LIMIT            opp_limit ($6C6C): the column an opponent stops at on the first screen,
//                             by stage
//   KarBrain.random(z)        the next random number
globalThis.KarBrain = (function () {
  const LIMIT = [0x0D, 0x0D, 0x0F, 0x13, 0x13];

  function random(z) {
    z[0x48] = ((((z[0x48] << 4) & 0xFF) + z[0x48]) & 0xFF) + 0xA1 & 0xFF;
    return z[0x48];
  }

  // $6C71: a height for the blow in $2A, $FF up, 0 middle, 1 down; Akuma ($4D = 1) never aims down.
  // It loads X with $4D, and a punch refused for the legs' pose goes on with that X ($6C2F)
  function height(z) {
    const r = random(z);
    if (z[0x4D] === 1) z[0x2A] = r >= 0x80 ? 0xFF : 0;
    else z[0x2A] = r < 0x55 ? 0xFF : r < 0xAA ? 0 : 1;
  }

  function think(z, t, x) {
    const none = () => { z[0x2A] = 0; z[0x29] = 0; return { cmd: 0 }; };            // $6B80
    const ahead = a => {                                                            // $6C58
      if (z[0x44] === 0 && LIMIT[z[0xD0]] >= z[0x22]) z[0x29] = 0;
      return { cmd: a };
    };
    const step = () => { z[0x29] = 1; z[0x2A] = 1; return ahead(1); };              // $6C52
    const noBlow = () => {                                                          // $6C2F
      if (z[0x25] !== 3) return none();
      z[0x29] = random(z) >= t(0xBFF2 + x) ? 0 : 1;
      return ahead(z[0x29]);
    };
    const kick = () => {                                                            // $6C20
      if (random(z) >= z[0xD7]) return noBlow();
      height(z);
      return { cmd: 0xC5 };
    };
    const stepIn = () => {                                                          // $6BE0
      if (random(z) >= z[0xD9]) return noBlow();
      return z[0x20] === 6 ? step() : noBlow();
    };
    const punch = () => {                                                           // $6BEF
      if (random(z) >= z[0xD8]) return noBlow();
      height(z);
      x = z[0x4D];                                  // $6C71 leaves the opponent's type in X
      if (z[0x26] === 0x0D && z[0x4D]) z[0x2A] = 0;
      if (z[0x20] !== 0x16 && (z[0x20] !== 6 || z[0x21] !== 6)) return noBlow();
      z[0x29] = 0;
      return { cmd: 0xD7 };
    };

    if (z[0x60] === 0x13) {                         // the hero lies dead
      if (z[0x4D]) return none();
      z[0x29] = 0;
      return { cmd: z[0x2F] || 0x9B };
    }
    if (z[0x2F]) {                                  // the opponent standing
      if (z[0x30]) {                                // walking on to his place
        let a = z[0x22];
        if (z[0x62] >= 0x12) a = (a - 6) & 0xFF;
        const there = a < 0x2D && (z[0x4B] === z[0x4C] || (!(z[0x52] & 0x80) && z[0x52] >= 0x31));
        if (there) { z[0x29] = 0; return { cmd: 0x9B }; }
        if (z[0xD0] >= 3) return null;
        z[0x29] = 1;
        return { cmd: 1 };
      }
      if (z[0x22] >= 0x28) return null;
      if (z[0x33] < 0x0D) return { cmd: 0x9B };
      if (z[0x6F] === 0) return { cmd: 0x9B };
      if (z[0x65] !== 0x1A) return null;
      return { cmd: 0xC2 };                         // the hero bows: bow back
    }
    if (z[0x5D] === 0) return none();               // the hero dead
    if (z[0x6F]) return z[0x33] < 8 ? kick() : step();   // the hero standing
    if (z[0x33] >= 0x0C) return step();
    x = Math.max(z[0x33], 7);
    if (z[0x4D] && z[0x22] >= 0x20 && z[0x22] < 0x27) {
      const r = random(z);
      if (r >= t(0xBFE1 + x)) return noBlow();
      if (r < t(0xBFEB + x)) return stepIn();
      z[0x2A] = 0;
      return { cmd: 0xC5 };
    }
    const r = random(z);
    if (r >= t(0xBFE1 + x)) return noBlow();
    if (r >= t(0xBFE6 + x)) return kick();
    if (r >= t(0xBFEB + x)) return punch();
    return stepIn();
  }

  return { LIMIT, random, think };
})();
