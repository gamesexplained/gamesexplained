'use strict';
// The Play tab's machine as the published page builds it: its own blocks (the port, the page's
// machine, its pacing and its memory) cut out of play.html in the game's folder and run in node.
// The pictures the Tracks and Graphics tabs carry come from it (track-previews.js, race-frame.js),
// and their tests hold the pages to it.
//   const { SCRPage, data, cost, C64 } = require('./page-machine.js').load(dir);
const path = require('path');
let loaded = null;
function load(dir) {
  if (loaded) return loaded;
  const { game } = require(path.resolve(dir, '../../../kit/scripts/port_check.js'));
  const g = game(dir);
  globalThis.window = globalThis;                  // the page's scripts hand over on window
  g.lib('c64');
  const PAGE = 'play.html', page = g.read(PAGE);
  for (const m of page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)) g.run(PAGE, m[1], 'SCRPort');
  const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
  const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);
  loaded = { SCRPage: globalThis.SCRPage, data, cost, C64: globalThis.C64 };
  return loaded;
}
// A frame's memory as runs of what the drawing reads, for a page to carry: [[address, base64]...],
// with only the bytes that differ from base when one is given
const b64 = u => Buffer.from(u).toString('base64');
function runs(mem, reads, base) {
  const out = [];
  const want = a => reads[a] && (!base || mem[a] !== base[a]);
  for (let a = 0; a < 0x10000; a++) {
    if (!want(a)) continue;
    let e = a;
    while (e + 1 < 0x10000 && (want(e + 1) || (base && e + 2 < 0x10000 && want(e + 2)))) e++;
    out.push([a, b64(mem.subarray(a, e + 1))]);
    a = e;
  }
  return out;
}
module.exports = { load, runs, b64 };
// Frames for a page to carry: the first whole, among the bytes any of them reads in drawing, and
// each other only where it differs ({ base, views }); a page puts a frame together as
// graphicsFrame and trackFrame do
function pack(frames, C64) {
  const reads = new Uint8Array(0x10000), first = frames[0];
  for (const f of frames) { const r = C64.renderFrame(f); for (let x = 0; x < 0x10000; x++) if (r.reads[x]) reads[x] = 1; }
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  return {
    base: { vic: first.vic, cia2: first.cia2, colour: b64(first.colourMem), writes: first.writes, ram: runs(first.mem, reads) },
    views: frames.slice(1).map(f => ({ ram: runs(f.mem, reads, first.mem), vic: same(f.vic, first.vic) ? undefined : f.vic,
      writes: same(f.writes, first.writes) ? undefined : f.writes, colour: same(Array.from(f.colourMem), Array.from(first.colourMem)) ? undefined : b64(f.colourMem) })),
  };
}
module.exports.pack = pack;
