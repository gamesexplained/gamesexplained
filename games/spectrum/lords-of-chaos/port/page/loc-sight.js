/* loc-sight */
// Lines across the wrapping map, as the game traces them (line_setup $B045, line_step $B0D0,
// trace_line $B41B), and the distance in half squares (distance $724D), on a memory M holding a
// scenario. Pure functions: the game keeps the same numbers at $FF3B-$FF49, and test_sight.js holds
// these to its code.
//   LOCSight.line(r1, c1, r2, c2)   the squares the line visits after the first, the last included,
//                                   each [row, column, length so far in half squares]
//   LOCSight.blocked(M, r1, c1, r2, c2, flag)   the first square on the way, the ends left out, whose
//                                   terrain has `flag` among its flags at $D38E (1 sight on the
//                                   ground, $10 in the air), as [row, column]; null when none does
//   LOCSight.distance(r1, c1, r2, c2)   twice the longer of the two differences plus the shorter
var LOCSight = (function () {
  // the difference from a to b the shorter way round 36, and the step that goes that way
  function axis(a, b) {
    if (a === b) return [0, 0];
    let d = a - b, step = -1;
    if (d < 0) d += 36;
    if (d >= 18) { step = 1; d = 36 - d; }
    return [d, step];
  }
  const wrap = v => (v === 255 || v === -1) ? 35 : v === 36 ? 0 : v;
  function line(r1, c1, r2, c2) {
    const [dc, sc] = axis(c1, c2), [dr, sr] = axis(r1, r2);
    let long, short, lr = 0, lc = 0;
    if (dc >= dr) { long = dc; short = dr; lc = sc; } else { long = dr; short = dc; lr = sr; }
    let err = long >> 1, len = 0, r = r1, c = c1;
    const out = [];
    for (let guard = 0; guard < 80; guard++) {
      err -= short;
      if (err < 0) { err += long; c = wrap(c + sc); r = wrap(r + sr); len += 3; }
      else { c = wrap(c + lc); r = wrap(r + lr); len += 2; }
      out.push([r, c, len & 255]);
      if (r === r2 && c === c2) break;
    }
    return out;
  }
  const w = (M, a) => M[a] | M[a + 1] << 8;
  function terrainAt(M, r, c) { return M[w(M, 0xD030) + 36 * r + c]; }
  function blocked(M, r1, c1, r2, c2, flag) {
    for (const [r, c] of line(r1, c1, r2, c2)) {
      if (r === r2 && c === c2) return null;
      if (M[0xD38E + terrainAt(M, r, c)] & flag) return [r, c];
    }
    return null;
  }
  function distance(r1, c1, r2, c2) {
    const a = axis(r1, r2)[0], b = axis(c1, c2)[0];
    return 2 * Math.max(a, b) + Math.min(a, b);
  }
  return { line, blocked, distance };
})();
// end of loc-sight
