'use strict';
// The areas as the game keeps them, read from its memory as the loader hands it over: the 29
// records the table at $D006 points to, from $CF3E, in load_area's layout (+0 whether the view is
// cleared first, +1 the count of objects, +2 the area's number, +3 where its scripts are, +5 its
// scale, +6 its four colours, +10 its gas field, +13 its name, +25 its objects), each object in the
// layout find_object and draw_object_list read (+0 its type, bit 7 hidden at the start and bit 6
// hidden now, +1 x, height and z, +4 its size, or an entrance's pitch, heading and roll, +7 its
// number, +8 its length, then its colours and points, and its script after the length $8929 gives
// its type), and each script decoded by the lengths at $8939 as run_script steps over them. The
// Maps tab (../../levels.html, scripts/build-pages.js) runs it in the browser.
//   node maps/areas.js [out.json]
(function (root) {

const OPS = {
  1: 'score', 2: 'energy', 3: 'toggle', 4: 'show', 5: 'hide', 6: 'toggle in area', 7: 'show in area', 8: 'hide in area',
  9: 'add 1 to var', 0x0A: 'take 1 from var', 0x0B: 'if var =', 0x0C: 'set flag', 0x0D: 'clear flag', 0x0E: 'if flag =',
  0x0F: 'sound', 0x10: 'destroy', 0x11: 'destroy in area', 0x12: 'go to area', 0x13: 'shield', 0x14: 'set var',
  0x15: 'swap vehicle', 0x19: 'colours', 0x1A: 'redraw', 0x1B: 'pause', 0x1C: 'sound after view', 0x1D: 'toggle flag',
  0x1E: 'if shown', 0x1F: 'if hidden', 0x20: 'if shown in area', 0x21: 'if hidden in area',
};
function decode(M) {
  const w = a => M[a] | M[a + 1] << 8;
  const base = 0xCF3E, count = M[base], table = 0xD006;
  const fixed = t => M[0x8929 + (t & 15)];
  const len = op => M[0x8939 + op];
  function script(at, n) {
    const out = [];
    for (let i = 0; i < n;) {
      const b = M[at + i], op = b & 0x7F, l = len(op) || 1;
      out.push({ op, shot: !!(b & 0x80), name: OPS[op] || ('op ' + op), args: Array.from(M.subarray(at + i + 1, at + i + l)) });
      i += l;
    }
    return out;
  }
  function object(at) {
    const t = M[at], n = M[at + 8], f = fixed(t);
    const o = { at, type: t & 15, startsHidden: !!(t & 0x80), hidden: !!(t & 0x40), x: M[at + 1], y: M[at + 2], z: M[at + 3],
      sx: M[at + 4], sy: M[at + 5], sz: M[at + 6], id: M[at + 7], length: n, extra: Array.from(M.subarray(at + 9, at + f)) };
    if (n > f) o.script = script(at + f, n - f);
    return o;
  }
  const areas = [];
  for (let k = 0; k < count; k++) {
    const at = (base + w(table + 2 * k)) & 0xFFFF, n = M[at + 1];
    const name = String.fromCharCode(...M.subarray(at + 13, at + 25)).trim();
    const objects = [];
    for (let i = 0, o = at + 25; i < n; i++) { const ob = object(o); objects.push(ob); o += ob.length || 1; }
    const sAt = (at + w(at + 3)) & 0xFFFF, sn = M[sAt];
    // the area's own scripts: a count, then each script's length and bytes
    const scripts = [];
    for (let i = 0, p = sAt + 1; i < sn; i++) { const l = M[p]; scripts.push(script(p + 1, l)); p += l + 1; }
    areas.push({ number: M[at + 2], at, name, open: M[at], scale: M[at + 5], colours: Array.from(M.subarray(at + 6, at + 10)),
      gas: { x: M[at + 10], z: M[at + 11], size: M[at + 12] }, objects, scripts });
  }
  const sh = (base + w(0xCF86)) & 0xFFFF, shared = [];
  for (let i = 0, p = sh + 1; i < M[sh]; i++) { const l = M[p]; shared.push(script(p + 1, l)); p += l + 1; }
  return { areas, shared };
}
root.DRMaps = { decode, OPS };
if (typeof module !== "undefined") module.exports = root.DRMaps;
if (typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const lib = require('../test/lib.js');
  const d = decode(lib.memory());
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(d));
  else for (const a of d.areas) console.log(a.number, a.name, a.objects.length + ' objects');
}
})(typeof window !== 'undefined' ? window : globalThis);
