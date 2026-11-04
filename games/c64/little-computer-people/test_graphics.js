#!/usr/bin/env node
'use strict';
// The Graphics tab. Its lcp-figures block runs the main loop's figure stages, and the steps of two
// activities, on the kit's 6502 over listing.json; its third section shows the images the two
// views above it do not, by LCP_SHOWN. This runs the block as the page does and checks that:
// - the man reaches each of the 48 floor locations he can be sent to, and comes back to standing;
// - over a long run of the house (random targets, the three moods, the bowl filled), and of the
//   exercise and the talking, the images the man's body, his head and the dog are unpacked from are
//   exactly LCP_SHOWN: none shown is left out of it, and none in it goes unshown;
// - the exercise steps through its three poses, the talking through its two mouths, and the dog
//   eats from the bowl.
//   node games/c64/little-computer-people/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { lcpMachine, LCP_SCENES, lcpGraphic, lcpShownSet } =
  g.run('graphics.html', 'lcp-figures', 'lcpMachine', 'LCP_SCENES', 'lcpGraphic', 'lcpShownSet');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = n => '$' + n.toString(16).toUpperCase().padStart(2, '0');

// Every location, in turn
{
  const M = lcpMachine(L.ram, CPU);
  for (let loc = 0; loc < 48; loc++) {
    M.send(loc);
    let p = 0;
    do { M.pass(); p++; } while (p < 5000 && !(M.idle() && p > 2));
    if (!M.idle() || M.m[0x03C0] !== loc) fail('location', loc, 'not reached in 5000 passes');
    else if (M.m[0x038B] !== 8) fail('location', loc, 'reached, standing in pose', h2(M.m[0x038B]), 'rather than 8');
  }
}

// What is shown
const shown = lcpShownSet(L.ram), seen = new Set(), poses = new Set(), heads = new Set(), dog = new Set();
const note = M => {
  for (const f of [0, 1, 4]) seen.add(lcpGraphic(M.m, f, M.m[0x038B + f]));
  poses.add(M.m[0x038B]); heads.add(M.m[0x038F]); dog.add(M.m[0x038C]);
};
{
  const M = lcpMachine(L.ram, CPU);
  let r = 1;
  for (let p = 0; p < 60000; p++) {
    if (M.idle() && p % 300 === 0) { r = (r * 1103515245 + 12345) & 0x7FFFFFFF; M.send((r >> 8) % 48); }
    if (p % 20000 === 0) M.fillBowl();
    if (p % 5000 === 0) M.mood((p / 5000) % 3);
    M.pass(); note(M);
  }
  for (const d of [0x1A, 0x1B]) if (!dog.has(d)) fail('the dog never takes its eating pose', h2(d));
}
for (const s of ['ex', 'talk']) {
  const M = lcpMachine(L.ram, CPU), before = new Set(poses), hb = new Set(heads);
  poses.clear(); heads.clear();
  M.scene = LCP_SCENES[s](); M.scene.start(M);
  for (let p = 0; p < 3000; p++) { M.pass(); note(M); }
  const want = s === 'ex' ? [[poses, [0x21, 0x5B, 0x08, 0x5C, 0x22, 0x3A, 0x3B, 0x3C]]] : [[heads, [0x08, 0x1C, 0x1D]]];
  for (const [set, list] of want) for (const v of list) if (!set.has(v)) fail(s, 'never shows', h2(v));
  for (const v of before) poses.add(v); for (const v of hb) heads.add(v);
}
const extra = [...seen].filter(x => !shown.has(x)), missing = [...shown].filter(x => !seen.has(x));
if (extra.length) fail('shown above but also in the gallery of the others:', extra.map(h2).join(' '));
if (missing.length) fail('left out of the gallery but never shown above:', missing.map(h2).join(' '));

if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log(`48 locations reached; ${seen.size} images shown by the views, ${183 - seen.size} in the gallery of the others: every image in one or the other`);
