// Shared by the Skate or Die! pages: any part's memory from parts/<id>/listing.json, the half-pipe picture and
// the skater's poses drawn the game's way. Needs ../../lib/c64.js.
const SOD = (function () {
  const games = {};
  // A part's memory as its snapshot holds it, from parts/<id>/listing.json; High Jump's by default.
  async function load(part) {
    part = part || 'highjump';
    if (games[part]) return games[part];
    if (!window.C64) throw new Error('This widget needs the site\'s shared script, lib/c64.js.');
    games[part] = await C64.load('parts/' + part + '/listing.json');
    return games[part];
  }
  const PAL = () => C64.PAL;

  // The picture as the VIC shows it: multicolour bitmap at $4000, screen matrix at $6400 (pairs 01 and
  // 10 take its high and low nibbles), colour RAM copied from $6000 (pair 11), background black ($08AB).
  // Text row 0 is the status line, shown hires: the band-0 interrupt clears multicolour above line $3A
  // ($0B21, $0CA3). frame: 0 or 1 for every animated cell, or null for the picture as loaded.
  function picture(cv, M, s, frame) {
    const ctx = C64.canvas(cv, 320 * s, 200 * s);
    const bm = M.slice(0x4000, 0x6000), scr = M.slice(0x6400, 0x67E8), col = M.slice(0x6000, 0x63E8);
    if (frame !== null && frame !== undefined) cells(M, bm, scr, col, frame);
    for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
      const i = cy * 40 + cx, c = [0, scr[i] >> 4, scr[i] & 15, col[i] & 15];
      for (let r = 0; r < 8; r++) {
        const b = bm[i * 8 + r];
        if (cy === 0) { for (let k = 0; k < 8; k++) { ctx.fillStyle = PAL()[(b >> (7 - k)) & 1 ? c[1] : c[2]]; ctx.fillRect((cx * 8 + k) * s, (cy * 8 + r) * s, s, s); } }
        else for (let k = 0; k < 4; k++) { ctx.fillStyle = PAL()[c[(b >> (6 - 2 * k)) & 3]]; ctx.fillRect((cx * 8 + k * 2) * s, (cy * 8 + r) * s, 2 * s, s); }
      }
    }
    return ctx;
  }
  // animate_cell ($192E): cell n's offset into the bitmap is the word at $1B91 + 2n; frame f's colours are
  // $1C1B and $1CA5 at 2n + f, its pixels the eight bytes at $1D2F + 8(2n + f).
  function cells(M, bm, scr, col, f) {
    for (let n = 0; n < 69; n++) {
      const off = M[0x1B91 + 2 * n] | M[0x1B92 + 2 * n] << 8, x = 2 * n + f, cell = off >> 3;
      for (let r = 0; r < 8; r++) bm[off + r] = M[0x1D2F + 8 * x + r];
      scr[cell] = M[0x1C1B + x]; col[cell] = M[0x1CA5 + x] & 15;
    }
  }
  function cellRects(M) {
    const out = [];
    for (let n = 0; n < 69; n++) { const off = M[0x1B91 + 2 * n] | M[0x1B92 + 2 * n] << 8, cell = off >> 3; out.push([cell % 40, Math.floor(cell / 40)]); }
    return out;
  }

  // A pose ($095D): a 30-byte record at $7000 + 30 * pose, five six-byte parts, one per sprite 0-4.
  // Part bytes: shape offset from $8284 (two bytes), the shape's last byte, signed x and y offsets.
  // Shapes keep only the rows they use (place_part_sprite $0C4C, copy_sprite_block $13FD).
  // Sprites 1 and 2 are multicolour ($D01C = $66 AND $45): pairs 01, 10, 11 are $D025 white, the
  // sprite's colour, $D026 blue ($09E0). cols: one of the colour sets at $2D7F / $2D87.
  function parts(M, pose) {
    const r = 0x7000 + 30 * pose, out = [];
    const sg = v => v > 127 ? v - 256 : v;
    for (let k = 0; k < 5; k++) {
      const p = r + 6 * k, off = M[p] | M[p + 1] << 8, n = M[p + 2];
      out.push({ k, shape: M.slice(0x8284 + off, 0x8284 + off + n + 1), dx: sg(M[p + 3]), dy: sg(M[p + 4]) });
    }
    return out;
  }
  function bounds(M, pose) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of parts(M, pose)) { const h = Math.ceil(p.shape.length / 3); if (!p.shape.length) continue;
      x0 = Math.min(x0, p.dx); y0 = Math.min(y0, p.dy); x1 = Math.max(x1, p.dx + 24); y1 = Math.max(y1, p.dy + h); }
    return x0 > x1 ? [0, 0, 24, 21] : [x0, y0, x1, y1];
  }
  // Draw pose facing right, as on the right half of the ramp, origin at (ox, oy) in C64 pixels.
  function pose(ctx, M, n, ox, oy, s, set) {
    const cols = M.slice(set ? 0x2D87 : 0x2D7F, (set ? 0x2D87 : 0x2D7F) + 8);
    for (const p of parts(M, n)) {
      const mc = p.k === 1 || p.k === 2, c = cols[p.k];
      for (let i = 0; i < p.shape.length; i++) {
        const b = p.shape[i], x = ox + p.dx + (i % 3) * 8, y = oy + p.dy + Math.floor(i / 3);
        if (mc) for (let q = 0; q < 4; q++) { const v = (b >> (6 - 2 * q)) & 3; if (!v) continue;
          ctx.fillStyle = PAL()[[0, 1, c, 6][v]]; ctx.fillRect((x + 2 * q) * s, y * s, 2 * s, s); }
        else for (let q = 0; q < 8; q++) if ((b >> (7 - q)) & 1) { ctx.fillStyle = PAL()[c]; ctx.fillRect((x + q) * s, y * s, s, s); }
      }
    }
  }
  // Any multicolour bitmap as the VIC shows it: 8 bytes a cell in screen order, 2 bits a pixel; pair 01 is
  // the screen byte's high nibble, 10 its low nibble, 11 the colour-RAM nibble, 00 the background.
  function mcBitmap(cv, M, o) {
    const s = o.s || 2, ctx = C64.canvas(cv, 320 * s, 200 * s);
    for (let i = 0; i < 1000; i++) {
      const cx = i % 40, cy = Math.floor(i / 40), sc = M[o.screen + i], c = [o.bg || 0, sc >> 4, sc & 15, M[o.colour + i] & 15];
      for (let r = 0; r < 8; r++) { const b = M[o.bitmap + i * 8 + r];
        for (let k = 0; k < 4; k++) { ctx.fillStyle = PAL()[c[(b >> (6 - 2 * k)) & 3]]; ctx.fillRect((cx * 8 + k * 2) * s, (cy * 8 + r) * s, 2 * s, s); } }
    }
    return ctx;
  }
  function fail(e) { document.querySelectorAll('canvas').forEach(c => c.insertAdjacentHTML('afterend', '<p class="cap">' + e.message + '</p>')); }
  return { load, mcBitmap, picture, cellRects, parts, bounds, pose, fail };
})();
