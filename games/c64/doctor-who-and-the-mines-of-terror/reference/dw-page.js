// Shared by the Doctor Who and the Mines of Terror pages: the game's memory from listing.json,
// the cavern map, sprites and messages, drawn from the same bytes the Source tab shows.
// Needs ../../lib/c64.js. The start zone's 16 swapped characters (zone_graphics, $ABCF) are
// copied from the running game, because the hand-over image holds another zone's set.
const DW = (function () {
  const START_ZONE = {"glyph":{"161":[235,215,235,215,235,215,235,215],"162":[0,0,0,0,0,0,0,0],"163":[1,48,15,10,11,17,0,120],"164":[176,100,12,2,32,8,58,208],"165":[0,0,34,4,47,146,0,30],"245":[3,51,3,48,113,254,109,108],"246":[109,110,109,110,109,110,109,110],"247":[59,12,4,20,56,13,8,12],"248":[33,206,32,32,28,32,19,32],"249":[0,47,47,203,203,242,242,0],"250":[242,242,242,242,242,242,242,242],"251":[242,242,242,0,203,203,47,47],"252":[255,213,218,218,216,216,216,216],"253":[213,213,53,53,29,77,19,7],"254":[87,87,92,92,116,112,208,196],"255":[184,205,205,221,50,205,205,255]},"colour":{"161":10,"162":10,"163":13,"164":217,"165":33,"245":13,"246":217,"247":221,"248":45,"249":11,"250":12,"251":10,"252":15,"253":10,"254":10,"255":33}};
  let game = null;
  async function load() {
    if (game) return game;
    if (!window.C64) throw new Error('This widget needs the site\'s shared script, lib/c64.js.');
    game = await C64.load('listing.json');
    const M = game.ram;
    // The hand-over image holds the graphics set that the code lock's characters come from: keep
    // those 16 shapes (codes $A1-$A5, $F5-$FF, swap_char_codes $ABAC) before the start zone's replace them.
    game.lockGlyphs = {};
    for (const c of M.subarray(0xABAC, 0xABBC)) game.lockGlyphs[c] = Array.from(M.subarray(0x4000 + c * 8, 0x4008 + c * 8));
    // Start-up writes the 17 switchable cells into the map from cell_states $1D00 (switch_restore_all,
    // $AECA, called at $4A3C): row from $ADBC, column from $ADAB. The hand-over image is from before that.
    for (let i = 0; i < 17; i++) M[0xFB80 - 0x80 * M[0xADBC + i] + M[0xADAB + i]] = M[0x1D00 + i];
    for (const c in START_ZONE.glyph) START_ZONE.glyph[c].forEach((v, i) => M[0x4000 + c * 8 + i] = v);
    for (const c in START_ZONE.colour) M[0x2F00 + +c] = START_ZONE.colour[c];
    return game;
  }
  const rgb = () => C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));

  // The whole mine at one C64 pixel a pixel: 128 x 56 blocks of 4 x 4 characters.
  // Row r of the map starts at $FB80 - $80 * r, row 0 at the bottom; a block's rows are stored bottom first.
  function drawMine(M) {
    const W = 128, H = 56, full = document.createElement('canvas');
    full.width = W * 32; full.height = H * 32;
    const ctx = full.getContext('2d'), img = ctx.createImageData(full.width, full.height), P = rgb(), bg = [0, 9, 8];
    const plot = (x, y, c) => { const o = (y * full.width + x) * 4, k = P[c]; img.data[o] = k[0]; img.data[o + 1] = k[1]; img.data[o + 2] = k[2]; img.data[o + 3] = 255; };
    for (let r = 0; r < H; r++) {
      const row = 0xFB80 - 0x80 * r;
      for (let c = 0; c < W; c++) {
        const b = M[row + c], ba = M[0x1400 + b] | M[0x1500 + b] << 8;
        for (let i = 0; i < 16; i++) {
          const ch = M[ba + i], col = M[0x2F00 + ch] & 15, px = c * 32 + (i & 3) * 8, py = (H - 1 - r) * 32 + (3 - (i >> 2)) * 8;
          for (let y = 0; y < 8; y++) {
            const g = M[0x4000 + ch * 8 + y];
            if (col & 8) for (let x = 0; x < 4; x++) { const v = (g >> (6 - 2 * x)) & 3, k = v === 3 ? col & 7 : bg[v]; plot(px + 2 * x, py + y, k); plot(px + 2 * x + 1, py + y, k); }
            else for (let x = 0; x < 8; x++) plot(px + x, py + y, (g & (0x80 >> x)) ? col : 0);
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return full;
  }

  // A multicolour sprite image from bank 1: pointer p is 64 bytes at $4000 + p * 64.
  function drawSprite(cv, M, p, s, own) {
    const ctx = C64.canvas(cv, 24 * s, 21 * s), a = 0x4000 + p * 64, cols = [0, 2, own == null ? 12 : own, 8];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < 21; y++) for (let b = 0; b < 3; b++) { const g = M[a + y * 3 + b];
      for (let x = 0; x < 4; x++) { const v = (g >> (6 - 2 * x)) & 3; if (!v) continue; ctx.fillStyle = C64.PAL[cols[v]]; ctx.fillRect((b * 8 + x * 2) * s, y * s, 2 * s, s); } }
  }

  // The game's private alphabet: a letter is its ASCII code + 155, a digit n is $F6 + n, $94 a space, $00 the end.
  function str(M, p) { let o = ''; while (M[p]) { const b = M[p++]; o += b >= 0xF6 ? String(b - 0xF6) : b === 0x94 ? ' ' : String.fromCharCode((b - 155) & 255); } return o; }
  // A message is a chain of strings through the pointer tables $95CB/$9626, ended by a high byte of $FF.
  function message(M, n) { const out = []; for (let i = n; M[0x9626 + i] !== 0xFF; i++) out.push(str(M, M[0x95CB + i] | M[0x9626 + i] << 8)); return out.join(''); }
  // Item names: ten characters at $1770 + $1720[object].
  const itemName = (M, o) => { const a = 0x1770 + M[0x1720 + o]; let t = ''; for (let i = 0; i < 10; i++) { const b = M[a + i]; t += b >= 0xF6 ? String(b - 0xF6) : b >= 0xDC && b <= 0xF5 ? String.fromCharCode(b - 155) : ' '; } return t.trim(); };
  function fail(e) { document.querySelectorAll('canvas').forEach(c => c.insertAdjacentHTML('afterend', '<p class="cap">' + e.message + '</p>')); }
  return { load, drawMine, drawSprite, str, message, itemName, fail };
})();
