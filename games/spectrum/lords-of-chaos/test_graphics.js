'use strict';
// The Graphics page's drawing (the block loc-gfx, with loc-map) against the game's own code run on the
// kit's Z80 from the committed listings, in each of the three scenarios:
//   - the animation: 300 working frames of the page's tick against interrupt_work's loop ($A8B2 to
//     $A8D1), the sparkle started on both at the 100th, the whole things table compared after each;
//   - every frame of every thing (each frame its cycle reaches, the sparkle's frames 165 to 168 too)
//     drawn by LOCMap.block and by the game's draw_thing_at ($A843), the nine cells compared;
//   - the four cursors drawn into the window by the game's draw_map ($A94C) and by LOCGfx.cursor,
//     and their graphics and colour sets against the LD HL,nn the game sets $FF86 and $FF87 with;
//   - every step of the death animation of each wizard, the game's death_animation_frame ($8C6A) for
//     each of its seven frames against LOCGfx.deathStep, the window compared at each step's sound;
//   - draw_hit ($AEC2) on each of the window's 49 squares, from origins that wrap, against
//     LOCGfx.hitPlace and hitStep, the window compared at each graphic's sound;
//   - the missile shapes: LOCGfx.SHAPES against the bytes shapes ($AD4E) points to, and each shape
//     plotted by the game's draw_shape ($AD1D) and by LOCGfx.shape at places in and past the
//     window's edges, with and without an attribute; the styles against missile_styles' bytes;
//   - DEATH_T and HIT_T measured again on the game's code: the T-states from each step's sound
//     ($C856) to the next, and from the last to the map's redraw.
//   node games/spectrum/lords-of-chaos/test_graphics.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-map');
g.sameBlock('loc-gfx');
const { LOCMap } = g.run('graphics.html', 'loc-map', 'LOCMap');
globalThis.LOCMap = LOCMap;                 // loc-gfx draws through loc-map, as on the page
const { LOCGfx } = g.run('graphics.html', 'loc-gfx', 'LOCGfx');

const w16 = (M, a) => M[a] | M[a + 1] << 8;
const RET = (cpu, M) => { cpu.pc = M[cpu.sp] | M[(cpu.sp + 1) & 0xFFFF] << 8; cpu.sp = (cpu.sp + 2) & 0xFFFF; return true; };
const STOP = cpu => { cpu.pc = 0; return true; };
const cellsOf = (r0, c0, rows, cols) => {
  const out = [];
  for (let r = r0; r < r0 + rows; r++) for (let c = c0; c < c0 + cols; c++) {
    for (let k = 0; k < 8; k++) out.push(0x4000 + ((r & 0x18) << 8) + ((r & 7) << 5) + (k << 8) + c);
    out.push(0x5800 + 32 * r + c);
  }
  return out;
};
const WINDOW = cellsOf(0, 0, 21, 21), SCREEN = Array.from({ length: 0x1B00 }, (_, i) => 0x4000 + i);
let fails = 0;
const counts = {};
function check(what, G, P, cells, say) {
  counts[what] = (counts[what] || 0) + 1;
  const bad = cells.find(a => G[a] !== P[a]);
  if (bad !== undefined && fails++ < 8) console.log(`FAIL ${what}, ${say}: $${bad.toString(16)} game ${G[bad]} page ${P[bad]}`);
}
function fresh(n) {
  const M = memory(n);
  M[0xD0D0] = 0;                              // the cursor off
  M[0xC839] = 0;                              // no sound running
  M[0xD03C] = 0xFF;                           // no character set in use, so thing_graphic looks it up
  return M;
}

for (const n of [1, 2, 3]) {
  // ---- the animation
  {
    const G = fresh(n), P = G.slice(), T = w16(G, 0xD032);
    const table = Array.from({ length: 850 }, (_, i) => T + i);
    for (let t = 0; t < 300; t++) {
      if (t === 100) { G[T + 0x18F] = 0xA5; LOCGfx.sparkle(P); }
      call(G, 0xA8B2, {}, { hooks: { 0xA8D1: STOP } });
      LOCGfx.tick(P);
      check('tick', G, P, table, `scenario ${n}, working frame ${t + 1}`);
    }
  }
  // ---- every frame of every thing
  {
    const base = fresh(n), T = w16(base, 0xD032);
    for (let v = 0; v < 0xA9; v++) {
      const frames = LOCGfx.cycle(base, v).concat(v === 0x4F ? LOCGfx.cycle(base, 0x4F, 0xA5) : []);
      for (const f of frames) {
        const G = base.slice();
        G[T + 5 * v + 1] = f.graphic; G[T + 5 * v + 2] = f.colours;
        const P = G.slice();
        G[0xD0D5] = 3; G[0xD0D6] = 6;
        call(G, 0xA843, { a: v });
        LOCMap.block(P, v, 3, 6);
        check('frame', G, P, cellsOf(3, 6, 3, 3), `scenario ${n}, thing $${v.toString(16)}, frame ${f.frame}`);
      }
    }
  }
  // ---- the cursors
  for (let k = 0; k < 4; k++) for (const [r0, c0, cr, cc] of [[0, 0, 3, 3], [30, 33, 2, 1], [10, 4, 13, 10]]) {
    const G = fresh(n);
    G[0xD0C8] = r0; G[0xD0C9] = c0; G[0xD0D3] = cr; G[0xD0D4] = cc; G[0xD0D0] = 1;
    G[0xFF86] = LOCGfx.CURSORS[k][0]; G[0xFF87] = LOCGfx.CURSORS[k][1];
    const P = G.slice();
    call(G, 0xA94C);
    LOCMap.window(P, r0, c0);
    const y = (cr - r0 + 36) % 36, x = (cc - c0 + 36) % 36;
    if (y < 7 && x < 7) LOCGfx.cursor(P, 3 * y, 3 * x, k);
    check('cursor', G, P, WINDOW, `scenario ${n}, cursor ${k} at ${cr},${cc}`);
  }
  // ---- a wizard's death
  for (let type = 0x8C; type < 0x90; type++) {
    const G = fresh(n);
    G[0xD0C8] = 5; G[0xD0C9] = 5;
    call(G, 0xA94C);
    const P = G.slice();
    G[0xFF05] = type;
    for (let f = 0; f < 7; f++) {
      G[0xFF07] = f;
      let k = 0;
      call(G, 0x8C6A, {}, { hooks: { 0xC856: (cpu, M) => {
        LOCGfx.deathStep(P, type, f, k);
        check('death', M, P, SCREEN, `scenario ${n}, wizard $${type.toString(16)}, frame ${f}, step ${k}`);
        k++;
        return RET(cpu, M);
      } } });
      if (k !== 10) { fails++; console.log(`FAIL death: frame ${f} made ${k} sounds, not 10`); }
    }
  }
  // ---- the hit
  for (const [r0, c0] of [[0, 0], [33, 31], [20, 35]]) for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const G = fresh(n);
    G[0xD0C8] = r0; G[0xD0C9] = c0;
    call(G, 0xA94C);
    const P = G.slice(), e = (r0 + y) % 36, d = (c0 + x) % 36;
    const [row, col] = LOCGfx.hitPlace(P, e, d);
    let k = 0;
    call(G, 0xAEC2, { e, d }, { hooks: { 0xC856: (cpu, M) => {
      LOCGfx.hitStep(P, row, col, k);
      check('hit', M, P, WINDOW, `scenario ${n}, square ${e},${d} from ${r0},${c0}, graphic ${k}`);
      k++;
      return RET(cpu, M);
    } } });
    if (k !== 3) { fails++; console.log(`FAIL hit: ${k} sounds, not 3`); }
    if (G[0xD03D] !== 0x46 || G[0xD03E] !== 0xB6 || G[0xD03C] !== 0) { fails++; console.log('FAIL hit: the character set is not put back to set 0'); }
  }
}

// ---- the missile shapes and styles (in the program: scenario 1's memory is as good as any)
{
  const M = memory(1);
  LOCGfx.SHAPES.forEach((pts, s) => {
    const a = w16(M, 0xAD4E + 2 * s), bytes = [];
    for (let i = a; M[i] !== 0x7F; i += 2) bytes.push([M[i] << 24 >> 24, M[i + 1] << 24 >> 24]);
    counts.shape = (counts.shape || 0) + 1;
    if (JSON.stringify(bytes) !== JSON.stringify(pts)) { fails++; console.log(`FAIL shape ${s}: the table holds ${JSON.stringify(bytes)}`); }
    for (const [y, x] of [[0x53, 0x53], [0, 0], [2, 165], [166, 3], [0xA7, 0xA7], [100, 7], [7, 100]]) for (const attr of [0xFF, 0x46]) {
      const G = M.slice();
      G.fill(0, 0x4000, 0x5B00);
      const P = G.slice();
      G[0xFF5D] = s; G[0xFF5B] = y; G[0xFF5C] = x; G[0xFF32] = 0; G[0xFF61] = attr;
      call(G, 0xAD1D);
      LOCGfx.shape(P, s, y, x, attr);
      check('plot', G, P, SCREEN, `shape ${s} at ${y},${x}, attribute ${attr}`);
    }
  });
  // the cursors' graphics and colour sets, as the LD HL,nn that set $FF86 and $FF87 load them:
  // reset_ff86, land and make_selected on the ground, fly and make_selected in the air, pick_target
  [[0x78A8], [0x6E45, 0x901A], [0x6E80, 0x9033], [0x7209]].forEach((ats, k) => ats.forEach(at => {
    counts.cursor++;
    if (M[at] !== 0x21 || M[at + 1] !== LOCGfx.CURSORS[k][0] || M[at + 2] !== LOCGfx.CURSORS[k][1]) {
      fails++; console.log(`FAIL cursor ${k}: $${at.toString(16)} loads graphic ${M[at + 1]}, colour set ${M[at + 2]}`);
    }
  }));
  const ss = LOCGfx.styles(M);
  ss.forEach((st, i) => {
    const b = Array.from(M.slice(0xB60E + 8 * i, 0xB616 + 8 * i));
    counts.style = (counts.style || 0) + 1;
    if (JSON.stringify([st.shape, st.speed, st.tail, st.reach, st.attr, st.combat, st.magic, st.sound]) !== JSON.stringify(b)) { fails++; console.log(`FAIL style ${i}`); }
  });
}

// ---- the timings, measured again: the game's own sound routine runs, no hooks but the marks
{
  const M = memory(1), marks = [];
  M[0xFF05] = 0x8C; M[0xC839] = 0;
  call(M, 0x8C1D, {}, { hooks: {
    0xC856: cpu => { marks.push(cpu.tstates); return false; },
    0x8C36: cpu => { marks.push(cpu.tstates); return STOP(cpu); } } });
  const d = marks.slice(1).map((t, i) => t - marks[i]);
  counts.timing = 1;
  if (JSON.stringify(d) !== JSON.stringify(LOCGfx.DEATH_T)) { fails++; console.log('FAIL DEATH_T: the game gives ' + d.join(',')); }
  const H = memory(1), hm = [];
  H[0xD0C8] = 0; H[0xD0C9] = 0;
  const cpu = call(H, 0xAEC2, { e: 3, d: 3 }, { hooks: { 0xC856: cpu => { hm.push(cpu.tstates); return false; } } });
  hm.push(cpu.tstates);
  const hd = hm.slice(1).map((t, i) => t - hm[i]);
  if (JSON.stringify(hd) !== JSON.stringify(LOCGfx.HIT_T)) { fails++; console.log('FAIL HIT_T: the game gives ' + hd.join(',')); }
}

const say = Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ');
console.log(fails ? `FAIL: ${fails} differ (${say})` : `ok - the Graphics page draws as the game draws: ${say}`);
process.exit(fails ? 1 : 0);
