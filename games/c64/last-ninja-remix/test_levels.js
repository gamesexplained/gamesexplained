#!/usr/bin/env node
// Hold the Maps / levels page to the game. Its lnr-scene block puts each level together from the
// engine's listing and the level's two loads and runs the game's own renderer on the kit's 6502.
// In each level the area the snapshot was taken in must give the emulator's play window, recorded
// below as a hash of its 240 by 144 palette indices (from work/<part>/game.vsf, with the colour RAM
// and $D021 the snapshot holds). Every slot with a scene must draw without leaving the routines the
// block hands it, and the block's painter must give what C64.renderFrame gives for the same memory.
// Every exit from an area with a scene must lead to another with one (Central Park has no area 0,
// and its group of exits leads nowhere), and each level must start in one.
// It exits 1 on any difference.
//   node games/c64/last-ninja-remix/test_levels.js [levels.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
g.lib('cpu6502'); g.lib('c64');
g.sameBlock('lnr-scene', page);
const { lnrLevel } = g.run(page, 'lnr-scene', 'lnrLevel');
const { lnrTables } = g.run(page, 'lnr-tables', 'lnrTables');
// the emulator's play window in each level's snapshot: the area $A2 held, and the FNV-1a hash
const PLAY = { 'central-park': [1, 'af85f9d3'], street: [0, '3cca8225'], sewers: [0, '8b550a3d'], basement: [0, '805a887f'],
  office: [0, 'f9633ad7'], mansion: [0, '565d10f5'], 'final-battle': [0, '423a6535'] };
const fnv = (px) => { let h = 0x811c9dc5; for (const v of px) { h ^= v; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
let bad = 0, drawn = 0, exits = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const E = g.listing('parts/engine/listing.json');
for (const [id, [play, hash]] of Object.entries(PLAY)) {
  const T = g.listing(`parts/${id}-title/listing.json`), P = g.listing(`parts/${id}/listing.json`);
  const R = lnrLevel({ engine: E, first: T, second: P, header: T.sym('SceneHeader'),
    render: P.sym('RenderSceneForRoomInA'), objects: P.sym('DrawInactiveObject') });
  const got = fnv(R.area(play, true));
  if (got !== hash) fail(id, 'area', play, 'hashes to', got, 'not the emulator\'s', hash);
  const slots = [];
  for (let n = 0; n < 32; n++) if (R.slot(n).scene !== 0xFF) slots.push(n);
  for (const n of slots) for (const objects of [false, true]) {
    let px;
    try { px = R.area(n, objects); } catch (e) { fail(id, 'area', n, e.message); continue; }
    drawn++;
    const { m, colour, bg } = R.state(), vic = new Array(0x2F).fill(0);
    vic[0x11] = 0x3B; vic[0x16] = 0x18; vic[0x18] = 0x18; vic[0x21] = bg;
    const r = C64.renderFrame({ vic, cia2: [0xC7, 0x3F], mem: m, colourMem: colour, writes: [] });
    for (let y = 0; y < 144; y++) for (let x = 0; x < 240; x++)
      if (r.px[(y + 35) * r.w + x + 32] !== px[y * 240 + x]) { fail(id, 'area', n, 'pixel', x, y, 'differs from renderFrame'); y = 144; break; }
  }
  const tab = lnrTables(P);
  if (!slots.includes(tab.start)) fail(id, 'starts in area', tab.start, 'which has no scene');
  tab.exits.forEach((grp, a) => slots.includes(a) && grp.forEach((to) => { exits++; if (!slots.includes(to)) fail(id, 'area', a, 'has an exit to area', to, 'which has no scene'); }));
}
console.log(`7 levels: each play window as the emulator shows it, ${drawn} pictures as renderFrame paints them, ${exits} exits to areas with scenes: ${bad ? bad + ' differences' : 'all agree'}`);
process.exit(bad ? 1 : 0);
