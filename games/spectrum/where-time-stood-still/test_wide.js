'use strict';
// The Play tab's wide view (port/page/wide.js) as the page carries it, on a clean checkout: the
// page's blocks run in node as test_play.js runs them, and the game is played twice from the
// hand-over: the leader walks in area 13, then runs into area 14 and back. The wide view keeps a
// copy of the machine where each pass starts to draw the actors ($86D9), as the page does, and:
// - at the next pass, the wide picture at the view's own place is the view that pass drew on the
//   screen, outside the windows. Two kinds of row and pixel are left out. After the view crosses
//   into the next area, the 128 keeps the rows it drew from the area before until they scroll out
//   of the view, and where the two maps differ those rows are not the new area's map, which the
//   picture draws; they are found by drawing the view afresh ($A012) and left out. On a half
//   character, the 128 draws each actor 4 pixels further along its screen byte than the picture,
//   drawn on whole characters, does; a 16-pixel sprite's mask ($A277) clears a pixel either side
//   of its ink, and a sprite whose ink starts at a byte's first pixel loses the pixel to its left,
//   so there the two differ by that pixel, the last of a nibble, and nowhere else. And a pass puts
//   back the actors far from the view and brings in the creatures near it ($DCB9, $DC0B) before it
//   scrolls the view, where a piece does both with the view in its place: a pass whose scroll
//   took the view near a creature or away from an actor shows the change a pass later than the
//   picture does, and is left out;
// - every 50 frames, the picture round the view laid on two grids of pieces, the second moved 13
//   characters across and 7 down, is the same wherever both draw, and each draws where the other
//   does;
// - at the end, the copy's draw_view, which reads banks 0 and 4 where they are kept, puts the same
//   bytes in the view's buffer and leaves the same view's place as the port's ($A012), which pages
//   them in, at 40 places in each area round the view's.
//   node games/spectrum/where-time-stood-still/test_wide.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js', 'port/page/wide.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, b === 'port/page/wide.js' ? 'WTWide' : 'WTPort');
const { WTPage, WTWide } = globalThis;
const cost = JSON.parse(/^window\.WT_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="wt-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const PASS = 0x86A2, DRAW_ACTORS = 0x86D9;
const RIGHT = 1, LEFT = 2, DOWN = 4, UP = 8, FIRE = 16;
const COLS = WTWide.COLS, ROWS = WTWide.ROWS, VW = COLS * 8, VH = ROWS * 8;

const rt = WTPage.create({ data, cost });
const wide = WTWide.create();
// the view's 28 bytes by 144 rows of a screen, through the row table ($8D5D)
const viewOf = (screen, M) => {
  const out = new Uint8Array(COLS * VH);
  for (let y = 0; y < VH; y++) {
    const a = (M[0x8D5D + 2 * y] | M[0x8D5E + 2 * y] << 8) - 0xC000;
    out.set(screen.subarray(a, a + COLS), y * COLS);
  }
  return out;
};
// the rows of the view's buffer ($AE10, 28 bytes by 152 rows) that are not what draw_view draws
// at the view's place: after the view crosses into the next area, the 128 keeps the rows it drew
// from the area before, where the two maps differ, until they scroll out of the view. On a half
// character the buffer's pixel x is pixel x + 4 of the view drawn at its column, and the last 4
// pixels of each row, drawn from the next column, are left out.
const BW = COLS * 8, BH = 152;
const bit = (b, y, x) => (b[y * COLS + (x >> 3)] >> (7 - (x & 7))) & 1;
function kept(s) {
  wide.restore(s);
  wide.P.draw_view();
  const fresh = wide.M.subarray(0xAE10, 0xAE10 + COLS * BH), live = s.M.subarray(0xAE10, 0xAE10 + COLS * BH);
  const h = 4 * s.view.half, rows = new Set();
  for (let y = 0; y < BH; y++) for (let x = 0; x + h < BW; x++) if (bit(live, y, x) !== bit(fresh, y, x + h)) { rows.add(y); break; }
  return rows;
}
// whether the actors in play change when they are put back and brought in with the view where it
// stands, as a piece does
function early(s) {
  const P = wide.P, M = wide.M, slots = () => Array.from({ length: 8 }, (_, i) => M[0x8300 + 32 * i] + ',' + M[0x8301 + 32 * i]).join();
  wide.restore(s);
  P.page_bank_3();
  const before = slots();
  P.setw(0x9635, s.view.col * 8); P.setw(0x9637, s.view.row * 8);
  P.drop_far_actors({});
  P.place_creatures({});
  return slots() !== before;
}
let last = null, prev = null, spare = null, passes = 0, checked = 0, halves = 0, keptPasses = 0, outline = 0, earlier = 0, differ = 0;
const areas = new Set();
const centre = s => {
  wide.windows(s, rt);
  if (early(s)) { earlier++; return; }
  const v = s.view, h = 4 * v.half;
  const scr = viewOf(rt.mem.bank(s.bank), rt.M);
  const pic = wide.render(s, v.col * 8 + h, v.row * 8 + v.pixel, VW, VH);
  const old = kept(s);
  if (old.size) keptPasses++;
  // the view is the screen's columns 2 to 29 and rows 1 to 18
  const under = new Set();
  for (const w of s.windows) for (let r = w.row; r < w.row + w.rows; r++) for (let c = w.col; c < w.col + w.cols; c++) under.add((r - 1) * COLS + c - 2);
  let d = 0;
  for (let y = 0; y < VH; y++) {
    if (old.has(y + v.pixel)) continue;
    for (let x = 0; x < VW; x++) {
      if (under.has((y >> 3) * COLS + (x >> 3))) continue;
      if (bit(scr, y, x) === pic[y * VW + x]) continue;
      // the pixel to the left of a sprite's ink, at the last of a nibble, alone on its row
      if (h && (x & 3) === 3 && bit(scr, y, x - 1) === pic[y * VW + x - 1] && bit(scr, y, x + 1) === pic[y * VW + x + 1]) outline++;
      else d++;
    }
  }
  checked++;
  if (v.half) halves++;
  areas.add(s.area);
  if (d && differ++ < 5) fail('pass ' + passes + ', area ' + s.area + ', view at ' + v.col + (v.half ? '½' : '') + ', ' + v.row + ': ' + d + ' pixels differ from the screen');
};
let f = 0, threw = null, grids = 0, gridDiffer = 0;
const run = (n, keys = [], joy = 0) => {
  rt.input.keys = new Set(keys); rt.input.joy = joy;
  for (let i = 0; i < n && !threw; i++, f++) {
    try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
};
// the two grids on the copy the last pass checked
function grid() {
  const s = prev;
  if (!s) return;
  const W = 1000, H = 700, v = s.view;
  const x0 = v.col * 8 + 4 * v.half + VW / 2 - W / 2, y0 = v.row * 8 + v.pixel + VH / 2 - H / 2;
  const a = wide.render(s, x0, y0, W, H);
  const b = wide.render(s, x0, y0, W, H, null, { col: v.col + 13, row: v.row + 7 });
  let d = 0, one = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 2 || b[i] === 2) { if (a[i] !== b[i]) one++; } else if (a[i] !== b[i]) d++;
  }
  grids++;
  if ((d || one) && gridDiffer++ < 5) fail('frame ' + f + ', area ' + s.area + ', view at ' + v.col + ', ' + v.row + ': the two grids differ at ' + d + ' pixels, and ' + one + ' are drawn by one only');
}
// a game from the hand-over: the title, the control selection (Kempston, 0 and Y), then the
// route, each leg a direction of the stick and its frames, the two grids every 50 frames
function play(legs) {
  last = prev = spare = null;
  rt.restore(data, P => (function* () {
    for (const y of P.program(true)) {
      if (y && y.cp === PASS) { passes++; if (last) { centre(last); spare = prev; prev = last; last = null; } }
      if (y && y.cp === DRAW_ACTORS) last = wide.snap(rt, spare);
      yield y;
    }
  })());
  const p0 = passes;
  run(30);
  for (const k of ['2', '0', 'Y']) { run(8, [k]); run(32); }
  run(100);
  if (passes === p0) fail('no pass of play 222 frames from the hand-over');
  for (const [joy, n] of legs) for (let k = 0; k < n && !threw; k += 50) { run(50, [], joy); grid(); }
}
// walks in area 13, where the view stands on a half character as often as on a whole one
play([[UP, 400], [RIGHT, 600], [DOWN, 600]]);
// runs into area 14 near the foot of its map and area 13's, where the two differ, and back
play([[RIGHT | FIRE, 300], [RIGHT | DOWN | FIRE, 600], [UP | FIRE, 600], [UP | LEFT | FIRE, 600], [UP | FIRE, 600]]);
console.log(passes + ' passes; the centre checked at ' + checked + ', ' + halves + ' of them on a half character, in areas ' + [...areas].sort((a, b) => a - b).join(', ') + '; left out, ' + earlier + ' passes whose actors changed a pass later, the rows kept from the area before at ' + keptPasses + ' and ' + outline + ' pixels of sprites\' outlines; the two grids at ' + grids);
if (earlier * 10 > passes) fail(earlier + ' passes of ' + passes + ' left out for actors that changed a pass later');
if (!areas.has(13) || !areas.has(14)) fail('the route reached only areas ' + [...areas].join(', '));
if (!keptPasses) fail('the view crossed into area 14 and kept no rows from area 13');

// the copy's draw_view against the port's
const keep = prev;
if (keep) {
  const P = wide.P, M = wide.M;
  let seed = 99, views = 0, bad = 0;
  const rnd = k => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % k; };
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const base = dx || dy ? wide.area(keep, dx, dy) : keep;
    if (!base) continue;
    for (let k = 0; k < 40; k++) {
      const col = rnd(229), row = rnd(110);
      const draw = how => {
        M.set(base.M);
        for (let b = 0; b < 8; b++) P.mem.store[b].set(base.banks[b]);
        P.mem.paged = base.paged; P.mem.shift = base.paged === 5 ? 0x8000 : base.paged === 2 ? 0x4000 : 0;
        M[0x9633] = col; M[0x9634] = row;
        how();
        return Buffer.concat([Buffer.from(M.subarray(0xAE10, 0xAE10 + COLS * 152)), Buffer.from([M[0x9631], M[0x9639], M[0x963A], M[0x9BD2], P.mem.paged])]);
      };
      const a = draw(() => P.draw_view()), b = draw(() => wide.drawViewPaged());
      views++;
      if (!a.equals(b) && bad++ < 5) fail('area ' + (keep.area + dx + 4 * dy) + ', view at ' + col + ', ' + row + ': the copy\'s draw_view differs from the port\'s');
    }
  }
  console.log('draw_view: ' + views + ' views drawn both ways');
  if (views < 120) fail('only ' + views + ' views drawn both ways');
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
