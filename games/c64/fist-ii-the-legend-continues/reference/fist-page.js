// Shared by the Fist II pages: the game's memory from listing.json, and the fighters' sprite
// frames unpacked the game's way. Needs ../../lib/c64.js.
const FIST = (function () {
  let game = null;
  async function load() {
    if (game) return game;
    if (!window.C64) throw new Error('This widget needs the site\'s shared script, lib/c64.js.');
    game = await C64.load('listing.json');
    return game;
  }
  // Frame i starts at $8000 + $B661[i] * 256 + $B57C[i]. A non-zero byte is copied;
  // $00 n writes n zero bytes; the frame ends after 63 bytes (unpack_sprite_frame, $1D3E).
  function unpack(M, i) {
    let a = 0x8000 + M[0xB661 + i] * 256 + M[0xB57C + i];
    const out = new Uint8Array(63); let o = 0;
    while (o < 63) { const b = M[a++]; if (b) out[o++] = b; else { let n = M[a++]; while (n-- && o < 63) out[o++] = 0; } }
    return out;
  }
  // Facing the other way: each row's three bytes in reverse order, each through the pixel-pair
  // reversal table at $BF00 (the mirrored unpacker, $1F58).
  function mirror(M, f) {
    const out = new Uint8Array(63);
    for (let y = 0; y < 21; y++) for (let b = 0; b < 3; b++) out[y * 3 + b] = M[0xBF00 + f[y * 3 + 2 - b]];
    return out;
  }
  // A multicolour sprite: colours for the pairs 01, 10, 11 are $D025, the sprite's own, $D026.
  function draw(cv, f, s, cols, bg = '#000') {
    const ctx = C64.canvas(cv, 24 * s, 21 * s);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < 21; y++) for (let b = 0; b < 3; b++) { const g = f[y * 3 + b];
      for (let x = 0; x < 4; x++) { const v = (g >> (6 - 2 * x)) & 3; if (!v) continue; ctx.fillStyle = C64.PAL[cols[v]]; ctx.fillRect((b * 8 + x * 2) * s, y * s, 2 * s, s); } }
  }
  function fail(e) { document.querySelectorAll('canvas').forEach(c => c.insertAdjacentHTML('afterend', '<p class="cap">' + e.message + '</p>')); }
  return { load, unpack, mirror, draw, fail };
})();
