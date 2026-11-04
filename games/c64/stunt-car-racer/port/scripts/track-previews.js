'use strict';
// The eight tracks as the game shows each before a practice race: seen from above in the menus'
// window, turned a quarter at a time with the stick (TRACK_PREVIEW, $F386). The Play page's
// machine (page/runtime.js) runs the game from the loader's hand-over through the main menu, a
// name, Practise, the division and the track, waits until the picture is whole, and takes the
// frame; then steers right until the view turns, three times, a frame for each quarter. The Tracks tab (levels.html)
// carries the frames and draws them with site/lib/c64.js: one whole frame, and for each picture
// only the bytes of memory that differ from it, among those the drawing reads.
//   node track-previews.js [out.json]        (default: print the sizes; with a file, write it)
// previews(dir) runs make on play.html's own blocks: build-levels.js puts what it gives in
// levels.html, and test_levels.js holds the page to it.
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
// the tracks by division and place in its menu, in the league's order (track_order, $3728)
const TRACKS = [[4, 1, 0, 'Little Ramp'], [4, 2, 2, 'Hump Back'], [3, 1, 1, 'Stepping Stones'], [3, 2, 3, 'Big Ramp'],
  [2, 1, 6, 'High Jump'], [2, 2, 7, 'Roller Coaster'], [1, 1, 4, 'Ski Jump'], [1, 2, 5, 'Draw Bridge']];

const tap = (joy, hold = 8, after = 30) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
function script(div, place) {
  const s = [{ frames: 400 }, ...tap(J.fire, 8, 40), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire, 8, 40), { frames: 100 },
    ...tap(J.fire, 8, 40), { frames: 100 }];
  for (let i = div; i < 4; i++) s.push(...tap(J.up));
  s.push(...tap(J.fire, 8, 40), { frames: 100 });
  for (let i = 1; i < place; i++) s.push(...tap(J.down));
  s.push(...tap(J.fire, 8, 40));
  return s;
}

const b64 = u => (typeof Buffer !== 'undefined' ? Buffer.from(u).toString('base64') : btoa(String.fromCharCode(...u)));

// keep, when given, gets each picture's whole frame as { track, view, frame }, for test_levels.js
function make(SCRPage, data, cost, C64, keep) {
  const shots = [];
  for (const [div, place, number, name] of TRACKS) {
    const rt = SCRPage.create({ data, cost });
    let F = null;
    const run = s => { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; for (let i = 0; i < s.frames; i++) F = rt.runFrame(); };
    // the picture whole: the bitmap the same for 50 frames running
    const settle = () => {
      let last = null, same = 0;
      for (let f = 0; f < 3000 && same < 50; f++) {
        run({ frames: 1 });
        const now = rt.M.slice(0x4000, 0x6000);
        same = last && now.every((v, i) => v === last[i]) ? same + 1 : 0;
        last = now;
      }
      if (same < 50) throw new Error(name + ': the picture never settled');
    };
    for (const s of script(div, place)) run(s);
    const views = [];
    for (let q = 0; q < 4; q++) {
      settle();
      // the stick right until the view turns: the game may be busy when a tap comes
      if (q) {
        const was = rt.M[0xC34C] & 3;
        for (let n = 0; n < 5 && (rt.M[0xC34C] & 3) === was; n++) { for (const s of tap(J.right, 12, 60)) run(s); }
        if ((rt.M[0xC34C] & 3) === was) throw new Error(name + ': the view did not turn');
        settle();
      }
      // the frame that ends now, with memory as it began and the changes on its way
      F = rt.runFrame();
      views.push({ quarter: rt.M[0xC34C] & 3, frame: { vic: F.vic.slice(), cia2: F.cia2.slice(), writes: F.writes.map(w => w.slice()),
        mem: Uint8Array.from(F.mem), colour: Uint8Array.from(F.colourMem) } });
    }
    // the track as BUILD_TRACK ($EA34) left it for the race: its pieces ($C764), the boost the
    // league and the Super League give ($C776, $C777), and in each how many presses of a spring
    // past its line in a row add to the damage ($C774, $C775, which OPP_PICK puts at $209B)
    const M = rt.M;
    views.stats = { pieces: M[0xC764], boost: M[0xC776], boostSuper: M[0xC777], presses: M[0xC774], pressesSuper: M[0xC775] };
    shots.push({ number, name, division: div, views, stats: views.stats });
  }
  if (keep) shots.forEach((t, i) => t.views.forEach((v, q) => keep.push({ track: i, view: q,
    frame: { mem: v.frame.mem, colourMem: v.frame.colour, vic: v.frame.vic, cia2: v.frame.cia2, writes: v.frame.writes } })));
  // the base: the first picture; every other the bytes the drawings read that differ from it
  const base = shots[0].views[0].frame;
  const reads = new Uint8Array(0x10000);
  for (const t of shots) for (const v of t.views) {
    const r = C64.renderFrame({ mem: v.frame.mem, colourMem: v.frame.colour, vic: v.frame.vic, cia2: v.frame.cia2, writes: v.frame.writes });
    for (let a = 0; a < 0x10000; a++) if (r.reads[a]) reads[a] = 1;
  }
  const runs = mem => {
    const out = [];
    for (let a = 0; a < 0x10000; a++) {
      if (!reads[a] || mem[a] === base.mem[a]) continue;
      let e = a;
      while (e + 1 < 0x10000 && (reads[e + 1] && mem[e + 1] !== base.mem[e + 1] || (e + 2 < 0x10000 && reads[e + 2] && mem[e + 2] !== base.mem[e + 2]))) e++;
      out.push([a, b64(mem.subarray(a, e + 1))]);
      a = e;
    }
    return out;
  };
  const baseRam = [];
  for (let a = 0; a < 0x10000; a++) {
    if (!reads[a]) continue;
    let e = a;
    while (e + 1 < 0x10000 && reads[e + 1]) e++;
    baseRam.push([a, b64(base.mem.subarray(a, e + 1))]);
    a = e;
  }
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  return {
    base: { vic: base.vic, cia2: base.cia2, colour: b64(base.colour), writes: base.writes, ram: baseRam },
    tracks: shots.map(t => ({ number: t.number, name: t.name, division: t.division, stats: t.stats, views: t.views.map(v => ({
      quarter: v.quarter, ram: runs(v.frame.mem),
      // the frame's chips, where they differ from the base's
      vic: same(v.frame.vic, base.vic) ? undefined : v.frame.vic,
      writes: same(v.frame.writes, base.writes) ? undefined : v.frame.writes,
      colour: same(Array.from(v.frame.colour), Array.from(base.colour)) ? undefined : b64(v.frame.colour) })) })),
  };
}

// The pictures as the published Play tab makes them: its own blocks (the port, the page's machine,
// its pacing and its memory) cut out of play.html in the game's folder and run in node
function previews(dir, keep) {
  const path = require('path');
  const { game } = require(path.resolve(dir, '../../../kit/scripts/port_check.js'));
  const g = game(dir);
  globalThis.window = globalThis;                  // the page's scripts hand over on window
  g.lib('c64');
  const PAGE = 'play.html', page = g.read(PAGE);
  for (const m of page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)) g.run(PAGE, m[1], 'SCRPort');
  const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
  const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);
  return make(globalThis.SCRPage, data, cost, globalThis.C64, keep);
}

if (require.main === module) {
  const path = require('path'), fs = require('fs');
  const out = previews(path.resolve(__dirname, '../..'));
  const text = JSON.stringify(out);
  console.log('base ' + JSON.stringify(out.base).length + ' bytes; ' + out.tracks.map(t => t.name + ' ' + t.views.map(v => v.quarter + ':' + JSON.stringify(v).length).join(' ')).join('; ') + '; ' + text.length + ' in all');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], text);
}
module.exports = { make, previews, TRACKS };
