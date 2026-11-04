'use strict';
// The Graphics tab's pictures (graphics.html), from the Play tab's machine (page-machine.js):
// - the cockpit: a frame of a practice race on Little Ramp, the car moving off, which the page draws
//   with the sprites of the view's band taken out and puts its own over (the front wheels and the
//   boost's flame), with the sprites' shapes, colours and places as the frame has them, and the
//   flame's table ($CF56-$CF67);
// - the opponent: frames of the first race of a season, the opponent's car coming past.
// The frames are carried as the Tracks tab carries its pictures: the first whole, among the bytes
// the drawing reads, and each other only where it differs.
// - How it works (index.html): sixteen frames of the practice race in a row, after the cockpit's.
//   node race-frame.js [out.json]          (default: print the sizes; with a file, write it)
// make(SCRPage, data, cost, C64) is what build-graphics.js puts in the page and test_graphics.js
// holds it to.
const { runs, b64 } = require('./page-machine.js');
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
// Practise, Division 4, Little Ramp, the preview, the race; then forward
const PRACTICE = [...MENUS, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire),
  { frames: 600 }, { frames: 180, joy: J.fire }, { frames: 300, joy: J.up }];
// Start the Racing Season, its first race; forward while the opponent comes past
const SEASON = [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire),
  { frames: 300 }, ...tap(J.fire), { frames: 300 }, { frames: 463, joy: J.up }];
const OPP_FRAMES = 24, OPP_EVERY = 4, PASS_FRAMES = 16;
// the sprites the view's band shows in a race: the front wheels ($60-$69) and the flame ($6A-$6F,
// $5F and $FD), 64 bytes each at $4000 plus 64 times the pointer
const POINTERS = [0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x5F, 0xFD];

function make(SCRPage, data, cost, C64) {
  const drive = (steps, each) => {
    const rt = SCRPage.create({ data, cost });
    let F = null;
    for (const s of steps) {
      rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy;
      for (let i = 0; i < s.frames; i++) F = rt.runFrame();
    }
    return { rt, F };
  };
  const copy = F => ({ mem: Uint8Array.from(F.mem), colourMem: Uint8Array.from(F.colourMem), vic: F.vic.slice(), cia2: F.cia2.slice(), writes: F.writes.map(w => w.slice()) });
  // the cockpit
  const a = drive(PRACTICE);
  const cockpit = copy(a.F);
  // the chips as the view's band leaves them: the frame's registers with its writes before the
  // dashboard's band (line $D7) made
  const vic = cockpit.vic.slice();
  for (const [line, , addr, v] of cockpit.writes) if (line < 0xD7 && addr >= 0xD000 && addr < 0xD040) vic[addr & 0x3F] = v;
  const sprites = {};
  for (const p of POINTERS) sprites[p.toString(16)] = b64(cockpit.mem.subarray(0x4000 + p * 64, 0x4000 + p * 64 + 63));
  const flame = Array.from(cockpit.mem.subarray(0xCF56, 0xCF68));
  // two passes and more of the race, every frame, for How it works (index.html)
  const passes = [];
  for (let i = 0; i < PASS_FRAMES; i++) { const F = a.rt.runFrame(); passes.push(copy(F)); }
  // the opponent
  const b = drive(SEASON);
  const opp = [];
  for (let i = 0; i < OPP_FRAMES * OPP_EVERY; i++) { const F = b.rt.runFrame(); if (i % OPP_EVERY === 0) opp.push(copy(F)); }
  // carried: the bytes the drawings read, the cockpit's whole and the rest where they differ
  const all = [cockpit, ...opp], reads = new Uint8Array(0x10000);
  for (const f of all) { const r = C64.renderFrame(f); for (let x = 0; x < 0x10000; x++) if (r.reads[x]) reads[x] = 1; }
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const view = f => ({ ram: runs(f.mem, reads, cockpit.mem), vic: same(f.vic, cockpit.vic) ? undefined : f.vic,
    writes: same(f.writes, cockpit.writes) ? undefined : f.writes, colour: same(Array.from(f.colourMem), Array.from(cockpit.colourMem)) ? undefined : b64(f.colourMem) });
  return {
    base: { vic: cockpit.vic, cia2: cockpit.cia2, colour: b64(cockpit.colourMem), writes: cockpit.writes, ram: runs(cockpit.mem, reads) },
    band: { vic: Array.from(vic) }, sprites, flame,
    opponent: opp.map(view),
    // How it works: the frames of the practice race after the cockpit's, each with the bitmap the
    // view's band shows: what the interrupt writes to $D018 above line $C5, $70 for the one at $4000
    index: Object.assign(require('./page-machine.js').pack(passes, C64),
      { shown: passes.map(f => { const w = f.writes.find(w => w[2] === 0xD018 && w[0] < 0xC5); return w ? w[3] : f.vic[0x18]; }) }),
    _frames: all, _passes: passes,
  };
}

function graphics(dir) {
  const { SCRPage, data, cost, C64 } = require('./page-machine.js').load(dir);
  return make(SCRPage, data, cost, C64);
}

if (require.main === module) {
  const path = require('path'), fs = require('fs');
  const out = graphics(path.resolve(__dirname, '../..'));
  delete out._frames; delete out._passes;
  const text = JSON.stringify(out);
  console.log('base ' + JSON.stringify(out.base).length + ' bytes; opponent ' + out.opponent.map(v => JSON.stringify(v).length).join(' ') + '; ' + text.length + ' in all');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], text);
}
module.exports = { make, graphics, POINTERS };
