'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on the memory the page carries, from the loader's jump. The
// port's own tests hold each routine and the main loop to the game's code (port/test, with a
// contributor's snapshots); this one holds the page that is published, with nothing from work/.
// In each language:
// - the title, the language, the character and Space reach the first view of the Wilderness, as
//   the C64 does in about nine seconds (port/test/t-page.js times it against the game);
// - a walk and a turn move the player and turn the view;
// - the information screen saves under a typed name, the browser's file has the game's layout
//   (the marker $EA, 106 bytes of state, a byte for each object), and after a walk a load of the
//   name puts the position back; a name with no file loads nothing and the game goes on.
// No frame throws, and the clock keeps to the frames.
//   node games/c64/castle-master/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');                   // the 6502 the port's sound driver runs on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'CMPort');
const { CMPage } = globalThis;
const cost = JSON.parse(/^window\.CM_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="cm-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
// the player's position, three 16-bit words from $2407, and the view's heading
const position = M => Array.from(M.subarray(0x2407, 0x240D));
const AREA = 0x2429, PASSES_AT = 0x47F0;

for (const lang of ['1', '2', '3']) {
  const saved = [];
  const rt = CMPage.create({ data, cost, onSave: (name, bytes) => saved.push([name, bytes]) });
  let f = 0, threw = null;
  const run = (n, keys = []) => {
    rt.input.keys = new Set(keys);
    for (let i = 0; i < n && !threw; i++, f++) {
      try { rt.runFrame(); } catch (e) { threw = e; fail('language ' + lang + ', frame ' + f + ': ' + e.message); }
    }
  };
  // a key held for a few frames, then let go for a while
  const tap = (k, hold = 3, after = 30) => { run(hold, [k]); run(after); };
  // the information screen: the game reads the keys once a pass of play, so I is held until the
  // screen is up ($109B 6), and let go before the screen waits for a key, which any other ends
  const info = () => {
    let n = 0;
    while (rt.M[0x109B] !== 6 && n < 200 && !threw) { run(1, ['I']); n++; }
    if (rt.M[0x109B] !== 6) fail('language ' + lang + ': I held ' + n + ' frames left the information screen shut');
    run(60);
  };
  run(60); tap(lang, 6, 54); tap('RETURN', 6, 54); tap('2', 6, 54); tap('RETURN', 6, 454); tap('SPACE', 6, 300);
  if (threw) continue;
  const what = 'language ' + lang;
  if (rt.M[AREA] !== 1) fail(what + ': area ' + rt.M[AREA] + ' after the opening, not the Wilderness (1)');
  if (Math.abs(rt.t / CMPage.FRAME - (rt.shown + 1)) > 200) fail(what + ': the clock at frame ' + Math.round(rt.t / CMPage.FRAME) + ' with frame ' + rt.shown + ' shown');
  // walk and turn
  const p0 = position(rt.M);
  run(100, ['UP']); run(30); run(40, ['X']); run(30);
  const p1 = position(rt.M);
  if (p0.join() === p1.join()) fail(what + ': walking and turning left the position at ' + p0);
  // save to disk under a name, walk on, load it back
  info(); tap('S', 3, 40); tap('D', 3, 40);
  for (const c of 'TOWER') tap(c, 3, 12);
  tap('RETURN', 3, 200);
  if (saved.length !== 1) fail(what + ': ' + saved.length + ' files saved');
  else {
    const [name, b] = saved[0];
    const flags = b.length - 2 - 0x6A;
    if (!/^TOWER/.test(name) || b[2] !== 0xEA || flags < 1) fail(what + ': the file saved, "' + name + '", ' + b.length + ' bytes, first ' + b[2]);
    else console.log(what + ': saved "' + name + '", ' + b.length + ' bytes from ' + hex(b[0] | b[1] << 8) + ', ' + flags + ' objects\' flags');
  }
  const p2 = position(rt.M);
  run(100, ['UP']); run(40, ['Z']); run(30);
  if (position(rt.M).join() === p2.join()) fail(what + ': the walk after the save left the position as it was');
  info(); tap('L', 3, 40); tap('D', 3, 40);
  for (const c of 'TOWER') tap(c, 3, 12);
  tap('RETURN', 3, 300);
  if (position(rt.M).join() !== p2.join()) fail(what + ': the load put the position at ' + position(rt.M) + ', saved at ' + p2);
  // a name with no file
  info(); tap('L', 3, 40); tap('D', 3, 40);
  for (const c of 'NONE') tap(c, 3, 12);
  tap('RETURN', 3, 300);
  if (position(rt.M).join() !== p2.join() || rt.M[0x109B]) fail(what + ': the load of a name with no file left the position at ' + position(rt.M) + ', the session\'s end ' + rt.M[0x109B]);
  run(100, ['UP']);
  if (position(rt.M).join() === p2.join()) fail(what + ': no walk after the load of a name with no file');
  if (!threw) console.log(what + ': ' + f + ' frames from the loader\'s jump, the Wilderness reached, walked, saved, loaded back' + (fails ? '' : ', and a name with no file let the game go on'));
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
