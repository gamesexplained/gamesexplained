'use strict';
// Holds the Play tab's modern view (port/page/modern.js), which Native resolution and Fast CPU
// draw with, to the port it watches. The page's own blocks run in node: the port, the
// page's machine (port/page/runtime.js) and the modern view, on the memory the page carries. Two
// machines start from the loader's jump and go through the title, the language and the character
// to the Wilderness, then walk on a script: forward, back, turning both ways, looking up and down.
// One has the modern view attached; the other runs alone. At every frame the two machines'
// memory, colour RAM, chips and clocks are the same: the modern view only reads the game.
// At every pass the game draws the view
// - the painter's order modern.js works out from the bounds the game sorts is the game's own;
// - the scene modern.js works out from what the drawing reads is the game's: the same objects in
//   the same order, each face in the same colour with as many corners, its corners within 2
//   pixels (the game rounds as it goes, the page does not); faces whose first three corners, as
//   the game rounds them, wind a different way on the page (one in a hundred at most) are
//   counted, and so are faces the view's edges cut where the game's cut and the page's differ (one
//   in a hundred at most, every one at the view's edge);
// - that scene, painted in the C64's pixels, is the game's own buffer but for a few pixels at the
//   faces' edges.
// Each count must clear its mark and the walk must reach each kind of view, so a script that stops
// reaching them fails. With the moments the port's tests save in work/states (a contributor's,
// port/test/lib.js), the same checks run again from each.
//   node games/c64/castle-master/test_modern.js [frames of walking] [moment filter]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/modern.js')) { console.log('FAIL: play.html has no port/page/modern.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'CMPort');
const { CMPage, CMModern, C64 } = globalThis;
const cost = JSON.parse(/^window\.CM_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="cm-data">([^<]*)<\/script>/.exec(page)[1]);
const FRAMES = +process.argv[2] || 3000, FILTER = process.argv[3] || '';

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };

// the walk: each step a key held, then a few frames with none
const STEPS = [['UP', 90], ['X', 40], ['UP', 120], ['P', 30], ['Z', 60], ['L', 50], ['DOWN', 60], ['Z', 25], ['UP', 80], ['L', 20], ['X', 70]];
function plan(f) {
  let n = f % 820;
  for (const [k, hold] of STEPS) { if (n < hold) return [k]; n -= hold; if (n < 10) return []; n -= 10; }
  return [];
}

// the game's drawing of a pass: its render records, read when the draw is done (directory $10A6,
// records from $969A: an id, the faces, each a colour and its corners on the 120 by 120 view)
function records(M) {
  const n = M[0x106A], out = [];
  let d = (M[0x10A6] | M[0x10A7] << 8) + 4;
  for (let i = 0; i < n; i++, d += 4) {
    let r = M[d] | M[d + 1] << 8;
    const id = M[r], nf = M[r + 1] & 0x7F, faces = [];
    r += 2;
    for (let k = 0; k < nf; k++) {
      const h = M[r], cnt = h & 0x0F, pts = [];
      for (let j = 0; j < cnt; j++) pts.push([M[r + 1 + 2 * j], M[r + 2 + 2 * j]]);
      faces.push({ col: h >> 4, pts });
      r += 1 + 2 * cnt;
    }
    out.push({ id, faces });
  }
  return out;
}
// the directory as the sort finds it: each entry's id and its bounds (six signed words)
function directory(M) {
  const n = M[0x106A], out = [];
  for (let i = 0, d = (M[0x10A6] | M[0x10A7] << 8) + 4; i < n; i++, d += 4) {
    const bb = M[d + 2] | M[d + 3] << 8, b = [];
    for (let k = 0; k < 12; k += 2) b.push(((M[bb + k] | M[bb + k + 1] << 8) << 16) >> 16);
    out.push({ id: M[M[d] | M[d + 1] << 8], b });
  }
  return out;
}

const T = { frames: 0, passes: 0, sorts: 0, sortBad: 0, objects: 0, objBad: 0, extra: 0, unmatched: 0, orderBad: 0, faces: 0, faceBad: 0, dropped: 0,
  near: 0, far: 0, farCut: 0, ptMax: 0, px: 0, pxBad: 0, pxMax: 0, turned: 0, slid: 0, looked: 0 };
// Watches A's drawing of each pass, inside the modern view's own watch
function record(A, st) {
  const P = A.P, M = A.M, sort = P.PAINTER_SORT_VISIBLE_ENTRIES, draw = P.DRAW_SORTED_VISIBLE_QUEUE;
  let sorted = false;
  P.PAINTER_SORT_VISIBLE_ENTRIES = function (r) {
    const before = directory(M), v = sort.call(this, r);
    const mine = CMModern.sort(before).map(o => o.id).join(), game = directory(M).map(o => o.id).join();
    T.sorts++; if (mine !== game) T.sortBad++;
    sorted = true;
    return v;
  };
  P.DRAW_SORTED_VISIBLE_QUEUE = function (r) {
    const v = draw.call(this, r), pic = st.pending;
    if (sorted && pic) { sorted = false; compare(P, M, pic, records(M)); }
    return v;
  };
}
// the farthest of a face's corners from the game's, the outline started at whichever corner
// fits best (the game's clipping can begin it at another)
function farthest(a, b) {
  let best = Infinity;
  for (let s = 0; s < b.length; s++) {
    let e = 0;
    for (let j = 0; j < a.length; j++) { const q = b[(j + s) % b.length]; e = Math.max(e, Math.abs(a[j][0] - q[0]), Math.abs(a[j][1] - q[1])); }
    best = Math.min(best, e);
  }
  return best;
}
function compare(P, M, pic, game) {
  T.passes++;
  const sc = CMModern.scene(P, pic), mine = sc.objects;
  T.objects += game.length;
  const gi = game.map(o => o.id), mi = mine.map(o => o.id);
  for (const id of gi) if (!mi.includes(id)) T.objBad++;
  for (const o of mine) if (!gi.includes(o.id)) T.extra++;
  if (pic.drawn.size !== M[0x106A]) T.unmatched += M[0x106A] - pic.drawn.size;
  const common = gi.filter(id => mi.includes(id)), mc = mi.filter(id => common.includes(id));
  if (common.join() !== mc.join()) T.orderBad++;
  for (const o of game) {
    const m = mine.find(q => q.id === o.id);
    if (!m) continue;
    T.faces += o.faces.length;
    if (m.faces.length === o.faces.length + 1) { T.dropped++; continue; }
    if (m.faces.length !== o.faces.length) { T.faceBad += o.faces.length; continue; }
    o.faces.forEach((a, k) => {
      const b = m.faces[k];
      if (a.col !== b.col || a.pts.length !== b.pts.length) { T.faceBad++; return; }
      const e = farthest(a.pts, b.pts);
      T.near++; T.ptMax = Math.max(T.ptMax, e);
      if (e > 2) { T.far++; if (a.pts.some(q => q[0] === 0 || q[0] === 119 || q[1] === 0 || q[1] === 119)) T.farCut++; }
    });
  }
  // the scene painted in the C64's pixels against the game's buffer, two bits a pixel
  const buf = CMModern.paintBuffer(sc);
  let d = 0;
  for (let i = 0; i < 3600; i++) {
    const x = M[pic.buffer + i] ^ buf[i];
    if (x) for (let q = 0; q < 8; q += 2) if ((x >> q) & 3) d++;
  }
  T.px += 14400; T.pxBad += d; T.pxMax = Math.max(T.pxMax, d);
}

function machine() { return CMPage.create({ data, cost }); }
// through the title, the language and the character, as test_play.js does, on both machines
function opening(A, B) {
  const run = (n, keys = []) => { for (const rt of [A, B]) rt.input.keys = new Set(keys); for (let i = 0; i < n; i++) { A.runFrame(); B.runFrame(); } };
  const tap = (k, hold, after) => { run(hold, [k]); run(after); };
  run(60); tap('1', 6, 54); tap('RETURN', 6, 54); tap('2', 6, 54); tap('RETURN', 6, 454); tap('SPACE', 6, 300);
}

function walk(what, A, B, frames) {
  const st = CMModern.attach(A);
  record(A, st);
  let shown = null;
  for (let f = 0; f < frames; f++) {
    const keys = plan(f);
    for (const rt of [A, B]) rt.input.keys = new Set(keys);
    A.runFrame(); B.runFrame(); T.frames++;
    // each new picture: whether the player moved, turned or looked since the one before
    const v = st.flips[st.flips.length - 1];
    if (v && v.pic && v !== shown) {
      if (shown && shown.pic) {
        const a = v.pic.pose, was = shown.pic.pose;
        if (a.yaw !== was.yaw) T.turned++;
        if (a.pitch !== was.pitch) T.looked++;
        if (a.x !== was.x || a.z !== was.z) T.slid++;
      }
      shown = v;
    }
    const d = [];
    if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
    for (let a = 0; a < 0x10000 && d.length < 6; a++) if (A.M[a] !== B.M[a]) d.push('$' + a.toString(16).toUpperCase().padStart(4, '0') + ' ' + A.M[a] + ' / ' + B.M[a]);
    for (let i = 0; i < 0x400 && d.length < 6; i++) if (A.colour[i] !== B.colour[i]) d.push('colour ' + i);
    for (let r = 0; r < 0x40; r++) if (A.vic[r] !== B.vic[r]) d.push('VIC ' + r);
    for (let r = 0; r < 0x20; r++) if (A.sidw[r] !== B.sidw[r]) d.push('SID ' + r);
    if (d.length) { fail(what + ', frame ' + f + ', with the modern view and without: ' + d.join(', ')); return; }
  }
}

{
  const A = machine(), B = machine();
  opening(A, B);
  if (A.M[0x2429] !== 1) fail('after the opening the area is ' + A.M[0x2429] + ', not the Wilderness (1)');
  walk('from the loader\'s jump', A, B, FRAMES);
}
const STATES = path.join(__dirname, 'work/states');
const moments = fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(FILTER)).sort() : [];
if (moments.length) {
  const whole = require(path.join(__dirname, 'port/test/lib.js')).machine('entry').save();
  for (const m of moments) {
    const s = JSON.parse(fs.readFileSync(path.join(STATES, m), 'utf8'));
    const a = CMPage.create({ data: whole, cost }), b = CMPage.create({ data: whole, cost });
    for (const rt of [a, b]) rt.restore(s, P => P.main_loop({ c: s.cpu.p & 1 }));
    walk(m.replace(/\.json$/, ''), a, b, Math.min(FRAMES, 400));
  }
}

const pc = (a, n) => n ? (100 * a / n).toFixed(2) + ' %' : '-';
console.log((moments.length ? 'the loader\'s jump and ' + moments.length + ' moments' : 'the loader\'s jump') + ': ' + T.frames + ' frames, ' + T.passes + ' views drawn');
console.log('  painter\'s order as the game sorts  ' + (T.sorts - T.sortBad) + ' of ' + T.sorts);
console.log('  objects the game drew               ' + (T.objects - T.objBad) + ' of ' + T.objects + ', in the game\'s order in ' + (T.passes - T.orderBad) + ' of ' + T.passes + ' views');
console.log('  faces as the game drew them         ' + (T.faces - T.faceBad - T.dropped) + ' of ' + T.faces + '; ' + T.dropped + ' more on the page');
console.log('  faces with each corner within 2 px  ' + (T.near - T.far) + ' of ' + T.near + '; the ' + T.far + ' others all cut by the view\'s edge (' + T.farCut + '), the farthest ' + T.ptMax.toFixed(1) + ' px');
console.log('  the C64\'s pixels as the game paints ' + pc(T.px - T.pxBad, T.px) + ', at most ' + T.pxMax + ' of 14400 in one view');
console.log('  pictures after the one before       ' + T.slid + ' moved, ' + T.turned + ' turned, ' + T.looked + ' looked up or down');
// the marks: what a correct view passes with room, what a broken one fails
if (T.passes < 20) fail('only ' + T.passes + ' views drawn');
if (!T.slid || !T.turned || !T.looked) fail('the walk did not move, turn and look: ' + T.slid + ', ' + T.turned + ', ' + T.looked);
if (T.sortBad) fail(T.sortBad + ' sorts in another order than the game\'s');
if (T.objBad > T.objects / 200) fail(T.objBad + ' objects the game drew are not in the scene');
if (T.orderBad) fail(T.orderBad + ' views with the objects in another order');
if (T.faceBad + T.dropped > T.faces / 100) fail(T.faceBad + ' faces differ in colour or corners, ' + T.dropped + ' more on the page');
if (T.far > T.near / 100 || T.farCut < T.far) fail(T.far + ' faces with a corner more than 2 pixels from the game\'s, ' + (T.far - T.farCut) + ' of them not cut by the view\'s edge');
if (T.pxBad > T.px / 50) fail('the C64\'s pixels differ from the game\'s buffer in ' + pc(T.pxBad, T.px));
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
