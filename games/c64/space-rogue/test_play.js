'use strict';
// Holds the Play tab's Native resolution (port/page/modern.js) to the port it watches. The page's
// own blocks run in node: the port, the page's machine (port/page/runtime.js) and the modern view,
// on the disk the page carries. Two machines start from power-on and go to the cockpit as Skip to
// the cockpit does, then fly on a script: the stick round its directions, the view key (cockpit,
// chase and cinematic views) and the target key. One has the modern view attached and asks it at
// every frame for the pass on show, as the page does; the other runs alone. At every frame
// - the two machines' memory, colour RAM, chips, clocks and programs are the same: the modern view
//   only reads the game.
// At every pass the game draws
// - the view modern.js builds from the game's memory is the port's own drawing: the same polygons
//   in the same order and colours, each dot, ring and burst at the same place and size to within a
//   pixel, each corner of a model to within 2.5 pixels (the game rounds where the page does not).
// Each count must clear its mark and each kind of view must be reached, so a script that stops
// reaching them fails. With the moments the port's tests save in work/states (a contributor's,
// port/test/lib.js), the same checks run again from each moment of flight, of a fight and of
// docking.
//   node games/c64/space-rogue/test_play.js [frames of flight] [moment filter]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/modern.js')) { console.log('FAIL: play.html has no port/page/modern.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SRPort');
const { SRPage, SRModern } = globalThis;
const cost = JSON.parse(/^window\.SR_COST = (.*);$/m.exec(page)[1]);
const disk = JSON.parse(/<script type="application\/json" id="sr-disk">([^<]*)<\/script>/.exec(page)[1]);
const b64 = s => Uint8Array.from(Buffer.from(s, 'base64'));
const FRAMES = +process.argv[2] || 2400, FILTER = process.argv[3] || '';

let fails = 0;
const fail = (...w) => { if (fails++ < 12) console.log('FAIL', ...w); };
function machine() {
  const files = {}, sectors = {};
  for (const [k, v] of Object.entries(disk.files)) files[k] = b64(v);
  for (const [k, v] of Object.entries(disk.sectors)) sectors[k] = b64(v);
  return SRPage.create({ disk: { files, sectors }, cost });
}
// The page's Skip to the cockpit: a key at the title, N, the name and RETURN, a key at each page of
// the story, until the main program's 51st frame
function skip(rt) {
  const name = 'ROGUE', script = [[150, 'SPACE', 8], [400, 'N', 20]];
  name.split('').forEach((c, i) => script.push([500 + i * 15, c, 8]));
  script.push([500 + name.length * 15 + 40, 'RETURN', 10]);
  for (let f = 0, story = 0; ; f++) {
    for (const [at, k, d] of script) { if (f === at) rt.input.keys.add(k); if (f === at + d) rt.input.keys.delete(k); }
    if (rt.program === 'intro' && f > script[script.length - 1][0] + 60) {
      if (f % 120 === 0) rt.input.keys.add('SPACE'); else if (f % 120 === 8) rt.input.keys.delete('SPACE');
    }
    rt.runFrame();
    if (rt.program === 'main' && ++story > 50) { rt.input.keys.clear(); return; }
    if (f > 20000) throw new Error('the story did not end');
  }
}
// The script of flight: the stick round its directions, V twice every 400 frames, T every 150
const plan = f => ({
  joy: 0x1F & ~[8, 1, 4, 2, 9, 0][Math.floor(f / 80) % 6],
  keys: f % 400 === 200 || f % 400 === 201 ? ['V'] : f % 150 === 30 ? ['T'] : [],
});

// The port's own drawing at each pass it draws, read where its routines leave it: each polygon's
// slot, number and colour (draw_polygon), each dot, ring and burst (draw_at), each model's corners
// on the screen (draw_model). Only reads.
const KIND = { 0x8834: 'disc', 0x88E4: 'ring', 0x89CF: 'burst', 0x8A08: 'annulus', 0x8A29: 'ragged', 0x8B1B: 'sparks', 0x8BEF: 'flicker' };
const s16 = v => (v << 16) >> 16;
function record(rt, st) {
  const P = rt.P, M = P.M, w16 = a => M[a] | M[a + 1] << 8, passes = [];
  let rec = null;
  const plain = (name, before, after) => { const f = P[name]; P[name] = function (r) { if (before) before(r); const v = f.call(this, r); if (after) after(r, v); return v; }; };
  const build = P.build_draw_list;
  P.build_draw_list = function* (r) {
    rec = { polys: [], flats: [], models: {} };
    const v = yield* build.call(this, r);
    if (st.drawing) passes.push({ rec, scene: st.drawing });
    rec = null;
    return v;
  };
  plain('draw_at', a => { if (rec && KIND[a]) rec.flats.push({ slot: M[0x5C], k: KIND[a], x: s16(w16(0x51)), y: s16(w16(0x53)), d: M[0x4D], c: M[0x8FC9] }); });
  plain('draw_model', null, () => {
    if (!rec) return;
    const pts = [];
    for (let i = 0; i < M[0x9B]; i++) pts.push(M[0xFB08 + M[0x0846 + i] + (M[0x086E + i] << 8)] & 0x80 ? [s16(w16(0xFC20 + 4 * i)), s16(w16(0xFC22 + 4 * i))] : null);
    rec.models[M[0x5C]] = pts;
  });
  plain('draw_polygon', r => {
    if (!rec) return;
    const at = (zp, i) => M[(w16(zp) + i) & 0xFFFF];
    const c = (M[0xFA36 + at(0xB0, r.y)] & 0x80) ? at(0xB2, r.y) : at(0xB4, r.y);
    if (c !== 0xFF) rec.polys.push(M[0x5C] + ':' + r.y + ':' + c);
  });
  return passes;
}

const T = { passes: 0, views: {}, polys: 0, polyBad: 0, flats: 0, flatBad: 0, pts: 0, ptBad: 0, ptMax: 0,
  frames: 0, shown: 0 };
// What modern.js builds at a pass against what the port drew there
function compare(what, rec, scene) {
  T.passes++; T.views[scene.view] = (T.views[scene.view] || 0) + 1;
  scene.prims = null;
  const prims = SRModern.render(scene);
  const mine = prims.filter(p => p.k === 'poly').map(p => p.slot + ':' + p.n + ':' + p.c), game = rec.polys;
  T.polys += game.length;
  let bad = Math.abs(mine.length - game.length);
  for (let i = 0; i < Math.min(mine.length, game.length); i++) if (mine[i] !== game[i]) bad++;
  T.polyBad += bad;
  const flats = prims.filter(p => p.at && p.k !== 'poly');
  T.flats += rec.flats.length;
  for (let i = 0; i < Math.max(flats.length, rec.flats.length); i++) {
    const a = flats[i], b = rec.flats[i];
    const ok = a && b && a.slot === b.slot && a.k === b.k && Math.abs(Math.floor(a.at[0]) - b.x) <= 1 &&
      Math.abs(Math.floor(a.at[1]) - b.y) <= 1 && Math.abs(Math.floor(a.d) - b.d) <= 1 && (a.c === b.c || a.k === 'annulus');
    if (!ok) T.flatBad++;
  }
  for (const p of prims.filter(p => p.k === 'model')) {
    const q = rec.models[p.slot];
    if (!q) { T.ptBad += p.pts.length; continue; }
    p.pts.forEach((m, i) => {
      if (!m || !q[i]) { if (!!m !== !!q[i]) T.ptBad++; return; }
      const e = Math.max(Math.abs(m[0] - q[i][0] - 0.5), Math.abs(m[1] - q[i][1] - 0.5));
      T.pts++; T.ptMax = Math.max(T.ptMax, e); if (e > 2.5) T.ptBad++;
    });
  }
}

// Flight on both machines: A with the modern view, B without
function fly(what, A, B, frames) {
  const st = SRModern.attach(A), passes = record(A, st);
  for (let f = 0; f < frames; f++) {
    const p = plan(f);
    for (const rt of [A, B]) { rt.input.joy = p.joy; rt.input.keys = new Set(p.keys); }
    A.runFrame(); B.runFrame(); T.frames++;
    if (SRModern.onShow(SRModern.attach(A), A.lastFrame())) T.shown++;
    const d = [];
    if (A.program !== B.program) d.push('program ' + A.program + ' / ' + B.program);
    if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
    for (let a = 0; a < 0x10000 && d.length < 6; a++) if (A.M[a] !== B.M[a]) d.push('$' + a.toString(16).toUpperCase().padStart(4, '0') + ' ' + A.M[a] + ' / ' + B.M[a]);
    for (let i = 0; i < 0x400 && d.length < 6; i++) if (A.colour[i] !== B.colour[i]) d.push('colour ' + i);
    for (let r = 0; r < 0x40; r++) if (A.vic[r] !== B.vic[r]) d.push('VIC ' + r);
    for (let r = 0; r < 0x20; r++) if (A.sidw[r] !== B.sidw[r]) d.push('SID ' + r);
    if (d.length) { fail(what + ', frame ' + f + ', with the modern view and without: ' + d.join(', ')); return; }
  }
  for (const { rec, scene } of passes) compare(what, rec, scene);
}

const A = machine(), B = machine();
skip(A); skip(B);
fly('from power-on', A, B, FRAMES);
// The moments the port's tests save, when this is the contributor's checkout
const STATES = path.join(__dirname, 'work/states');
const moments = fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => /^flight-/.test(f) && f.endsWith('.json') && f.includes(FILTER)).sort() : [];
for (const m of moments) {
  const s = JSON.parse(fs.readFileSync(path.join(STATES, m), 'utf8')).machine;
  const a = machine(), b = machine();
  a.restore(s, P => P.main_loop()); b.restore(s, P => P.main_loop());
  fly(m.replace(/\.json$/, ''), a, b, Math.min(FRAMES, 900));
}

const pc = (a, n) => n ? (100 * a / n).toFixed(2) + ' %' : '-';
console.log((moments.length ? 'power-on and ' + moments.length + ' moments' : 'power-on') + ': ' + T.frames + ' frames, ' + T.passes + ' passes drawn ' +
  '(cockpit ' + (T.views[0] || 0) + ', chase ' + (T.views[1] || 0) + ', cinematic ' + (T.views[2] || 0) + ')');
console.log('  polygons as the port drew them  ' + (T.polys - T.polyBad) + ' of ' + T.polys + ' (' + pc(T.polys - T.polyBad, T.polys) + ')');
console.log('  dots, rings and bursts          ' + (T.flats - T.flatBad) + ' of ' + T.flats + ' (' + pc(T.flats - T.flatBad, T.flats) + ')');
console.log('  model corners within 2.5 px     ' + (T.pts - T.ptBad) + ' of ' + T.pts + ', the farthest ' + T.ptMax.toFixed(2) + ' px');
console.log('  frames showing a pass drawn     ' + T.shown + ' of ' + T.frames);
for (const v of [0, 1, 2]) if (!T.views[v]) fail('no pass drew view ' + v + ': the script no longer reaches it');
if (T.polys < 100 || T.polyBad > T.polys * 0.02) fail('polygons: ' + T.polyBad + ' of ' + T.polys + ' differ (the mark is 2 %)');
if (T.flats < 100 || T.flatBad > T.flats * 0.02) fail('dots, rings and bursts: ' + T.flatBad + ' of ' + T.flats + ' differ (the mark is 2 %)');
if (T.pts < 100 || T.ptBad > T.pts * 0.01) fail('model corners: ' + T.ptBad + ' of ' + T.pts + ' further than 2.5 px (the mark is 1 %)');
if (T.shown < T.frames * 0.9) fail('frames showing a pass drawn: ' + T.shown + ' of ' + T.frames + ' (the mark is 90 %)');
console.log(fails ? 'FAIL: ' + fails + ' check(s)' : 'ok');
process.exit(fails ? 1 : 0);
