#!/usr/bin/env node
// Hold the Levels tab (levels.html) against the game. The page carries, for each level, the bytes it draws from and
// the emulator's picture of the first screen of play. This checks that:
//  1. every byte of the map, the tile tables, the character shapes and colours, and the chase scripts that the page
//     embeds is the byte of the part's listing.json (a byte the listing does not hold is counted, not trusted);
//  2. the page's own drawing of each level's first screen differs from the emulator's picture in no more than a few
//     per cent of the pixels, and that every difference lies in a small box (a sprite is at most 48 by 42 pixels);
//  3. in the engine levels (2, 4 and 6), every box either holds the sprite of the player or of an object that held a
//     slot when the snapshot was taken, at the position the page's map pixel formula gives, or is a few pixels;
//  4. the chase's scripts play out inside the screen and in order.
// It prints, for each level, how many pixels differ and why, and exits 1 on a failure.
//   node test_levels.js [levels.html]
const fs = require('fs'), path = require('path');
let ROOT = __dirname;
while (!fs.existsSync(path.join(ROOT, 'kit/scripts/port_check.js'))) { const up = path.dirname(ROOT); if (up === ROOT) throw new Error('no kit/scripts/port_check.js above ' + __dirname); ROOT = up; }
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
// the game folder is the nearest folder above this one with a game.json (the test sits in it, or in work/pages)
let GAME = __dirname;
while (!fs.existsSync(path.join(GAME, 'game.json'))) GAME = path.dirname(GAME);
const page = path.resolve(process.argv[2] || path.join(__dirname, 'levels.html'));
const g = game(GAME);
const { DM } = g.run(page, 'levels-core', 'DM');
const { DM_LEVELS: LV } = g.run(page, 'levels-data', 'DM_LEVELS');
let bad = 0;
const fail = (...w) => { bad++; if (bad <= 30) console.log('FAILS', ...w); };
const hex = n => '$' + n.toString(16).toUpperCase();
if (LV.length !== 6) fail('the page holds', LV.length, 'levels, not 6');

// 1. the page's bytes against the listings
// A byte is looked up in the part's own listing. The page holds the bytes as they stand in play, and the
// game changes two things after loading: the setup sets bit 3 of every character colour (multicolour), and level 3's
// setup copies the map cells at $2144 to $2145-$2147 and $2241-$2242, and the cell at $2244 to $2245-$2247 (PATCHED).
const PATCHED = new Set([0x2145, 0x2146, 0x2147, 0x2241, 0x2242, 0x2245, 0x2246, 0x2247]);
// what a part's listing may leave out: level 2's holds 192 of its 2,048 shape bytes and 64 of its 256 colours, level 3's
// holds neither (its ranges stop at $5FFF and start again at $E000); the first-screen check is then the only one on them
const NOT_LISTED = { 2: ['shapes', 'colours'], 3: ['shapes', 'colours'] };
function against(lv, label, bytes, addr, key, opts = {}) {
  const chain = [g.listing('parts/level' + lv + '/listing.json')];
  let same = 0, earlier = 0, missing = 0, diff = 0, patched = 0, first = null;
  for (let i = 0; i < bytes.length; i++) {
    const k = chain.findIndex(L => L.has[addr + i]);
    if (k < 0) { missing++; continue; }
    let v = chain[k].ram[addr + i];
    if (opts.or8) v |= 8;
    if (v === bytes[i]) { if (k) earlier++; else same++; }
    else if (opts.patched && PATCHED.has(addr + i)) patched++;
    else { diff++; if (first === null) first = addr + i; }
  }
  if (diff) fail('level', lv, label, 'differs from the listing in', diff, 'bytes, first at', hex(first));
  if (missing && !(NOT_LISTED[lv] || []).includes(key)) fail('level', lv, label, 'is not all in the listings:', missing, 'bytes are not');
  return { same, earlier, missing, patched };
}
const held = {};
for (const l of LV) {
  const L = g.listing('parts/level' + l.n + '/listing.json'), h = held[l.n] = {};
  if (l.kind === 'tiles') {
    const P = DM.prep(l), a = l.addr;
    h.map = against(l.n, 'map', P.map, a.map, 'map', { patched: l.n === 3 });
    h.top = against(l.n, 'tile table (top)', P.top, a.top, 'top');
    h.bot = against(l.n, 'tile table (bottom)', P.bot, a.bot, 'bot');
    h.shapes = against(l.n, 'character shapes', P.charset, a.charset, 'shapes');
    h.colours = against(l.n, 'character colours', P.chcol, a.chcol, 'colours', { or8: true });
    if (l.n === 3) { const m = P.map, o = a.map, c = x => m[x - o]; if ([0x2145, 0x2146, 0x2147, 0x2241, 0x2242].some(x => c(x) !== c(0x2144)) || [0x2245, 0x2246, 0x2247].some(x => c(x) !== c(0x2244))) fail('level 3 map cells are not the ones the setup copies'); }
    if (P.map.length !== l.rows * l.cols) fail('level', l.n, 'map length', P.map.length, 'is not', l.rows, '*', l.cols);
    if (P.top.length !== 2 * a.tiles || P.bot.length !== 2 * a.tiles) fail('level', l.n, 'tile tables are not 2 * tiles long');
    if (Math.max(...P.map) + 1 !== a.tiles) fail('level', l.n, 'the map uses', Math.max(...P.map) + 1, 'tiles, the tables hold', a.tiles);
    if (h.map.missing || h.top.missing || h.bot.missing) fail('level', l.n, 'the listings do not hold the whole map or tile tables');
    if (l.objects) {
      const sy = g.json('parts/level' + l.n + '/symbols.json').symbols, at = nm => sy.find(s => s.name === nm).address;
      let ok = 0;
      for (const o of l.objects) {
        const x = L.ram[at('obj_init_x_lo') + o.i] | L.ram[at('obj_init_x_hi') + o.i] << 8, y = L.ram[at('obj_init_y_lo') + o.i] | L.ram[at('obj_init_y_hi') + o.i] << 8;
        if (x !== o.x || y !== o.y || L.ram[at('obj_init_type') + o.i] !== o.t || !L.has[at('obj_init_type') + o.i]) fail('level', l.n, 'object', o.i, 'differs from the listing'); else ok++;
      }
      h.objects = { same: ok, missing: 0 };
    }
    if (l.n === 1) {
      let ok = 0;
      for (const e of l.enemies) { const a0 = 0x312E + 7 * e.i; if ((L.ram[a0] | L.ram[a0 + 1] << 8) !== e.pos || L.ram[a0 + 2] !== e.side || L.ram[a0 + 4] !== e.slot || !L.has[a0]) fail('level 1 enemy record', e.i, 'differs from the listing'); else ok++; }
      for (const o of l.things) { const a0 = 0x3207 + 4 * o.i; if ((L.ram[a0] | L.ram[a0 + 1] << 8) !== o.pos || L.ram[a0 + 2] !== o.t0 || L.ram[a0 + 3] !== o.t1 || !L.has[a0]) fail('level 1 object record', o.i, 'differs from the listing'); else ok++; }
      h.records = { same: ok, missing: 0 };
    }
  } else {
    const s8 = v => v > 127 ? v - 256 : v; let ok = 0;
    l.chopper.forEach((e, i) => { const a0 = l.addr.chopper + 4 * i; if (!L.has[a0] || s8(L.ram[a0]) !== e[0] || s8(L.ram[a0 + 1]) !== e[1] || L.ram[a0 + 2] !== e[2] || L.ram[a0 + 3] !== e[3]) fail('level 5 chopper entry', i, 'differs from the listing'); else ok++; });
    if (L.ram[l.addr.chopper + 4 * l.chopper.length + 2] !== 255) fail('level 5 chopper script does not end after', l.chopper.length, 'entries');
    l.walls.forEach((e, i) => { const a0 = l.addr.walls + 4 * i; if (!L.has[a0] || [0, 1, 2, 3].some(k => L.ram[a0 + k] !== e[k])) fail('level 5 wall entry', i, 'differs from the listing'); else ok++; });
    if (L.ram[l.addr.walls + 4 * l.walls.length] !== 255) fail('level 5 wall script does not end after', l.walls.length, 'entries');
    l.obstacles.forEach((e, i) => { const a0 = l.addr.obstacles + 4 * i; if (!L.has[a0] || L.ram[a0] !== e[0] || L.ram[a0 + 1] !== e[1] || s8(L.ram[a0 + 2]) !== e[2] || L.ram[a0 + 3] !== e[3]) fail('level 5 obstacle entry', i, 'differs from the listing'); else ok++; });
    if (L.ram[l.addr.obstacles + 4 * l.obstacles.length] !== 255) fail('level 5 obstacle script does not end after', l.obstacles.length, 'entries');
    h.scripts = { same: ok, missing: 0 };
  }
}

// 2 and 3. the first screens
const rectsHit = (b, r, m = 6) => b.x < r.x + r.w + m && b.x + b.w > r.x - m && b.y < r.y + r.h + m && b.y + b.h > r.y - m;
const rows = [];
(async () => {
  for (const l of LV) {
    if (l.kind !== 'tiles') continue;
    const P = DM.prep(l), [wx, wy, w, h] = l.ref.win, ref = await DM.unz(l.ref.px);
    if (ref.length !== w * h) { fail('level', l.n, 'the picture is', ref.length, 'bytes, the window needs', w * h); continue; }
    const pix = DM.windowPixels(l, P), d = DM.diff(pix, ref), boxes = DM.boxes(d.mask, w, h);
    if (pix.includes(255)) fail('level', l.n, 'the window reaches outside the map');
    const rects = DM.windowRects(l), rw = rects.reduce((a, r) => a + r.w, 0);
    if (rw !== w) fail('level', l.n, 'the window pieces are', rw, 'pixels across, not', w);
    const frac = d.n / (w * h), biggest = boxes.reduce((a, b) => Math.max(a, b.w, b.h), 0);
    if (frac > 0.05) fail('level', l.n, 'differs in', (100 * frac).toFixed(2), '% of the pixels, over 5 %');
    if (biggest > 56 || boxes.length > 6) fail('level', l.n, 'has', boxes.length, 'boxes, the largest', biggest, 'pixels across: more than sprites');
    let why = 'sizes of sprites', unexplained = 0;
    if (l.live) {
      // the sprite rectangles, in window pixels: a sprite's position is (world - camera) in sprite coordinates, and
      // frame column = sprite X + 8, frame row = sprite Y + 2
      const sp = l.live.filter(o => o.t).map(o => ({ x: o.x - l.camera[0] + 8 - wx, y: o.y - l.camera[1] + 2 - wy, w: 24, h: 21 }));
      sp.push({ x: l.player[0] + 8 - wx, y: l.player[1] + 2 - wy, w: 24, h: 42 });
      let hit = 0;
      for (const b of boxes) if (sp.some(r => rectsHit(b, r))) hit++; else unexplained += b.n;
      if (unexplained > 100) fail('level', l.n, 'boxes with', unexplained, 'differing pixels hold no sprite of the player or a live object');
      why = hit + ' of ' + boxes.length + ' boxes hold the player or a live object' + (unexplained ? ', ' + unexplained + ' pixels in the others' : '');
    }
    rows.push([l.n, d.n, w * h, (100 * frac).toFixed(2) + ' %', boxes.length, biggest, why]);
  }
  // 4. the chase
  const c = LV.find(l => l.kind === 'chase');
  if (c) {
    const s = DM.chopperAt(c, 0), end = DM.chopperAt(c, DM.chopperFrames(c) + 1);
    if (s.x !== c.start.x || s.y !== c.start.y) fail('the chopper does not start at', c.start.x, c.start.y);
    if (!end.done) fail('the chopper script does not end');
    for (let f = 0; f <= DM.chopperFrames(c); f += 5) {
      const p = DM.chopperAt(c, f);
      if (p.x < 24 || p.x > 24 + 320 + 40 || p.y < 50 || p.y > 50 + 152) fail('the chopper is off the playfield at frame', f, p.x, p.y);
    }
    const wt = DM.wallTimes(c), ot = DM.obstacleTimes(c);
    if (wt.some((t, i) => i && t < wt[i - 1]) || ot.some((t, i) => i && t < ot[i - 1])) fail('wall or obstacle times are not in order');
    c.walls.forEach((x, i) => { if (x[0] < 0 || x[0] + 3 > 40 || ![1, 2, 3].includes(x[1])) fail('wall', i, 'is off the playfield or of an unknown type'); });
    c.obstacles.forEach((x, i) => { if (DM.obstacleFlight(x) < 5 || DM.obstacleFlight(x) >= 1000) fail('obstacle', i, 'flight', DM.obstacleFlight(x)); });
    rows.push([5, '', '', '', '', '', `no picture of play to compare; chopper ${DM.chopperFrames(c)} frames, ${c.walls.length} walls ending at frame ${wt[wt.length - 1]}, ${c.obstacles.length} obstacles ending at ${ot[ot.length - 1]}, time bar ${c.barFrames}`]);
  }
  // the objects' classes and what the page marks
  for (const l of LV) if (l.objects) {
    const n = {}; l.objects.filter(DM.drawn).forEach(o => { const k = DM.classOf(o.t); n[k] = (n[k] || 0) + 1; });
    for (const o of l.objects.filter(DM.drawn)) { const m = DM.markOf(l, o); if (m.x < -200 || m.y < -200 || m.x > l.cols * 16 + 200 || m.y > l.rows * 16 + 200) fail('level', l.n, 'object', o.i, 'is marked far outside the map', m.x, m.y); }
    console.log('level', l.n, 'markers', JSON.stringify(n), 'of', l.objects.length, 'objects');
  }
  console.log('bytes held against the listings (equal / not in the listing):');
  for (const l of LV) console.log('  level', l.n, Object.entries(held[l.n]).map(([k, v]) => k + ' ' + v.same + (v.earlier ? '+' + v.earlier + ' from an earlier level' : '') + (v.patched ? '+' + v.patched + ' set up by the game' : '') + '/' + (v.missing || 0)).join(', '));
  console.log('first screens (level, differing pixels, window pixels, share, boxes, largest box, what the boxes hold):');
  for (const r of rows) console.log('  ', r.join(' | '));
  if (bad) { console.log(bad, 'failures'); process.exit(1); }
  console.log('levels: ok');
})().catch(e => { console.error(e); process.exit(1); });
