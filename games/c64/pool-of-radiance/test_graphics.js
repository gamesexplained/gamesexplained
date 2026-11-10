#!/usr/bin/env node
// Hold graphics.html's 3D view and its ending to the game's own code, run on the kit's 6502 over the
// committed listings:
// - porWalls.install: every WALLDEF the page carries, installed as each of the three wall sets with
//   the set's flag clear and set, must leave in WALLS the character codes install_wall_def ($1485,
//   dungeon) leaves there, run up to unpack_pushed (tables, $7A00), which unpacks the colours.
// - porWalls.draw on every map the walk offers, from its first square and from eight more squares
//   in each facing, by day and by night: the walls' colours must be the ones set_wall_colour ($1157)
//   leaves, and the view's characters, colours and three colours the ones draw_view ($C183) leaves,
//   both run over the same map and walls.
// - porWalls.ahead and porWalls.move from the same squares: the door bits must be door_state's
//   ($1143), a step must go ahead exactly when check_leave_block ($10EC) lets it, and to the square
//   step_dx_dy ($08EC) gives.
// - porEnding: the sprites as setup_sprites ($0822) leaves them; the colours and images at each
//   frame of flash_spirit ($0A97); dim_pool's ($0AC2) five frames; the colours at each step of
//   fade_sprites ($0AF4); sprite 0's place and colour at each step of sprite_falls ($0B31); the
//   waits, as the resident's $2E23 and delay ($2E1F) take them in cycles; and the delay of 3 that
//   scene_spirit ($0A0B) makes before NOOOO.
// - The heads and bodies a character is made with are portrait_heads and portrait_bodies (gen), and
//   every head and body is one frame of the size ANIMATE00 draws.
// - porPic is bestiary.html's, which test_bestiary.js holds to ANIMATE00.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const D = JSON.parse(g.read('graphics.html').match(/<script type="application\/json" id="por-graphics">([\s\S]*?)<\/script>/)[1]);
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
g.sameBlock('por-pic');
const { porPic } = g.run('graphics.html', 'por-pic', 'porPic');
const { porWalls } = g.run('graphics.html', 'por-walls', 'porWalls');
const { porEnding } = g.run('graphics.html', 'por-ending', 'porEnding');

// the adventure's memory: the resident, DUNGEON, GDRIVE01 and the tables, as the view part shows them
const L = {};
const BASE = new Uint8Array(65536);
for (const p of ['resident', 'dungeon', 'view', 'tables']) {
  L[p] = g.listing(`parts/${p}/listing.json`);
  for (let a = 0; a < 65536; a++) if (L[p].has[a]) BASE[a] = L[p].ram[a];
}
const at = {
  install: L.dungeon.sym('install_wall_def'), unpack: L.tables.sym('unpack_pushed'), wallSet: L.dungeon.sym('wall_set'),
  colour: L.dungeon.sym('set_wall_colour'), leave: L.dungeon.sym('check_leave_block'), door: L.dungeon.sym('door_state'),
  dxdy: L.dungeon.sym('step_dx_dy'), draw: L.view.sym('draw_view'), x: L.view.sym('party_x'), y: L.view.sym('party_y'),
  f: L.view.sym('facing'), ahead: L.view.sym('wall_ahead'),
};
const FLAGS = 0x49E7, COLOURS = 0x49FD, LAST = 0x6DDB;   // the resident's wall-set flags, wall colours, last colour set
const W = porWalls(D.walls, L.view.ram, CPU);

// install_wall_def, every WALLDEF in every set
for (const name of Object.keys(W.defs)) for (let s = 0; s < 3; s++) for (const flag of [0, 1]) {
  const mine = new Uint8Array(65536);
  W.install(mine, new Uint8Array(2048), name, s, flag);
  const m = BASE.slice();
  m.set(W.defs[name].chars, 0x8C00); m[at.wallSet] = s; m[FLAGS + s] = flag;
  new CPU(m).call(at.install, {}, { maxSteps: 1e6, hooks: { [at.unpack]: () => true } });
  n++;
  for (let i = 0; i < 780; i++) if (m[0xED50 + 780 * s + i] !== mine[0xED50 + 780 * s + i]) { fail('WALLDEF', name, 'set', s, 'flag', flag, 'byte', i); break; }
}

// the walk: colours, the view, doors and steps
const dxdy = BASE.slice(at.dxdy, at.dxdy + 8), s8 = (v) => v > 127 ? v - 256 : v;
let views = 0;
for (const m of D.walls.maps) {
  const A = W.area(m), G = BASE.slice();
  G.set(A.mem.subarray(0x0400, 0x0800), 0x0400);
  G.set(A.mem.subarray(0xED50, 0xFF98), 0xED50);
  G.set(A.mem.subarray(0xC058, 0xC061), 0xC058);
  G[0xC050] = 0; G[COLOURS + 1] = m.c1; G[LAST] = 0xFF;
  const squares = [m.start.slice(0, 2)];
  for (let k = 0; k < 8; k++) squares.push([(k * 5 + 3) & 15, (k * 11 + 6) & 15]);
  squares.forEach(([x, y], k) => {
    const night = k % 2 === 1;
    G[COLOURS] = m.c0[night ? 1 : 0];
    for (let f = 0; f < 4; f++) {
      const v = W.draw(A, x, y, f, night);
      G[at.x] = x; G[at.y] = y; G[at.f] = f;
      new CPU(G).call(at.colour, {}, { maxSteps: 1e6 });
      new CPU(G).call(at.draw, {}, { maxSteps: 1e6 });
      views++;
      const where = `${m.name} (${x},${y}) facing ${f}${night ? ' by night' : ''}`;
      if (G[0xC05B] !== A.mem[0xC05B] || G[0xC05C] !== A.mem[0xC05C]) fail(where, 'band colours', G[0xC05B], A.mem[0xC05B]);
      for (let a = 0xF674; a < 0xF674 + 2340; a++) if (G[a] !== A.mem[a]) { fail(where, 'wall colour at', a.toString(16)); break; }
      for (let i = 0; i < 121; i++) if (G[0xEC00 + i] !== v.chars[i] || G[0xEC80 + i] !== v.colours[i]) { fail(where, 'view cell', i); break; }
      if ((G[0xC058] & 15) !== v.bg || (G[0xC059] & 15) !== v.mc1 || (G[0xC05A] & 15) !== v.mc2) fail(where, 'view colours');
      const a = W.ahead(A, x, y, f);
      if (G[at.ahead] !== a.wall) fail(where, 'wall ahead', G[at.ahead], a.wall);
      const door = new CPU(G); door.call(at.door, {}, { maxSteps: 1e4 });
      if (door.a !== a.door) fail(where, 'door bits', door.a, a.door);
      const executed = new Uint8Array(65536);
      new CPU(G).call(at.leave, {}, { maxSteps: 1e4, executed });
      const goes = executed[at.leave + 0x11] === 1;          // $10FD, past the wall and door test
      const p = { x, y, f };
      if (W.move(A, p) !== goes) fail(where, 'step', goes);
      else if (goes && (p.x !== ((x + s8(dxdy[f])) & 15) || p.y !== ((y + s8(dxdy[f + 4])) & 15))) fail(where, 'step to', p.x, p.y);
    }
  });
}

// the ending
const F = g.listing('parts/final/listing.json'), E = D.ending, R = porEnding(E, porPic);
const same = (a, b) => JSON.stringify(Array.from(a)) === JSON.stringify(Array.from(b));
const fsym = (name) => F.sym(name);
if (!same(E.sprite_x, F.bytes(fsym('sprite_x'), 6)) || !same(E.sprite_y, F.bytes(fsym('sprite_y'), 6))) fail('sprite places');
if (!same(E.flash, F.bytes(fsym('flash_colours'), 4))) fail('flash colours');
const sets = F.bytes(fsym('image_sets'), 13);
if (!same(E.image_sets[0], sets.slice(0, 5)) || !same(E.image_sets[1], sets.slice(8, 13))) fail('image sets');
const M = BASE.slice();
for (let a = 0; a < 65536; a++) if (F.has[a]) M[a] = F.ram[a];
const vic = new Uint8Array(0x30);
const io = { read: (a) => a < 0xD030 ? vic[a - 0xD000] : 0, write: (a, v) => { if (a < 0xD030) vic[a - 0xD000] = v; } };
const seen = [];
const stand = (rec) => (cpu) => { rec(cpu); cpu.rts(); };
const hooks = {
  [L.resident.sym('animate_frame')]: stand(() => seen.push({ at: 'frame', mc1: vic[0x22], smc1: vic[0x26], images: Array.from(M.subarray(0xCFF9, 0xCFFE)) })),
  [L.resident.sym('j_2E23')]: stand((cpu) => seen.push({ at: 'wait', x: cpu.x, colours: Array.from(vic.subarray(0x27, 0x2D)), mc0: vic[0x25], mc1: vic[0x26], y0: vic[1] })),
  [L.resident.sym('delay')]: stand((cpu) => seen.push({ at: 'delay', a: cpu.a })),
  [L.resident.sym('set_place_entry')]: stand(() => {}),
};
const run = (name) => { seen.length = 0; new CPU(M, { port: 0x35, io }).call(fsym(name), {}, { maxSteps: 1e6, hooks }); return seen.slice(); };
const steps = (k) => R.steps.filter((s) => s.k === k);
run('setup_sprites');
const sp = steps('scene_spirit')[0].s.sprites;
for (let i = 0; i < 6; i++) {
  if (vic[2 * i] !== E.sprite_x[i] || vic[2 * i + 1] !== E.sprite_y[i]) fail('sprite', i, 'place');
  if (vic[0x27 + i] !== sp.colours[i] || M[0xCFF8 + i] !== sp.images[i]) fail('sprite', i, 'colour or image');
  if ((vic[0x1C] >> i & 1) !== (i > 0 ? 1 : 0)) fail('sprite', i, 'multicolour');
}
if (vic[0x25] !== sp.mc0 || vic[0x26] !== sp.mc1 || sp.y0 !== E.sprite_y[0]) fail('sprite shared colours');
const flash = run('flash_spirit').filter((e) => e.at === 'frame'), mine = steps('flash_spirit');
if (flash.length !== mine.length) fail('flash frames', flash.length, mine.length);
flash.forEach((e, i) => { const s = mine[i] && mine[i].s; if (!s || e.mc1 !== s.shared[1] || e.smc1 !== s.sprites.mc1 || !same(e.images, s.sprites.images.slice(1))) fail('flash frame', i); });
const pool = run('dim_pool');
if (pool.filter((e) => e.at === 'frame').length !== steps('dim_pool').length || pool.some((e) => e.at === 'wait' && e.x !== 100)) fail('dim_pool');
const fade = run('fade_sprites'), fadeMine = steps('fade_sprites');
if (fade.length !== fadeMine.length) fail('fade steps', fade.length, fadeMine.length);
fade.forEach((e, i) => { const s = fadeMine[i] && fadeMine[i].s.sprites; if (!s || e.x !== 100 || !same(e.colours.slice(1), s.colours.slice(1)) || e.mc0 !== s.mc0 || e.mc1 !== s.mc1) fail('fade step', i); });
vic[1] = E.sprite_y[0]; vic[0x27] = 7;
const fall = run('sprite_falls'), fallMine = steps('sprite_falls'), waits = fall.filter((e) => e.at === 'wait');
if (waits.length !== fallMine.length) fail('fall steps', waits.length, fallMine.length);
waits.forEach((e, i) => { const s = fallMine[i] && fallMine[i].s.sprites; if (!s || e.y0 !== s.y0 || e.colours[0] !== s.colours[0]) fail('fall step', i, e.y0, e.colours[0], s && s.y0, s && s.colours[0]); });
if (vic[0x15] !== 0 || !fall.some((e) => e.at === 'delay' && e.a === 11)) fail('sprites off and delay 11');
// scene_spirit: dim_pool, fade_sprites, then LDA #$03 and the call to delay
const ss = fsym('scene_spirit'), lo = (a) => [a & 255, a >> 8];
const want = [0x20, ...lo(fsym('dim_pool')), 0x20, ...lo(fsym('fade_sprites')), 0xA9, 0x03, 0x20, ...lo(L.resident.sym('delay'))];
if (!Array.from(F.bytes(ss, 0x81)).some((_, i, b) => want.every((v, j) => b[i + j] === v))) fail('scene_spirit delay 3');
// the portraits: the lists choose_portrait (gen, $12B6) steps through, and every head and body a
// single frame, a head 11 characters by 5 and a body 11 by 11, decoded to its last byte
const gen = g.listing('parts/gen/listing.json'), PT = D.portraits;
if (!same(PT.creation.bodies, gen.bytes(gen.sym('portrait_bodies'), 12)) || !same(PT.creation.heads, gen.bytes(gen.sym('portrait_heads'), 14))) fail('the portraits a character is made with');
for (const [kind, set, h] of [['HEAD', PT.heads, 5], ['BODY', PT.bodies, 11]]) for (const [k, v] of Object.entries(set)) {
  const b = b64(v.b64), p = porPic(b);
  if (p.w !== 11 || p.h !== h || p.frames.length !== 1 || p.end !== b.length) fail(kind + k, p.w, p.h, p.frames.length, p.end, b.length);
}
// the waits in cycles, at 985,248 a second
const cycles = (entry, regs) => { const m = BASE.slice(); m[0xB1] = 0; const c = new CPU(m); c.call(entry, regs, { maxSteps: 1e7 }); return c.cycles; };   // $B1 = 0, as the callers of $2E23 set it
const ms = (c) => c * 1000 / 985248, near = (a, b) => Math.abs(a - b) <= b * 0.002;
const w100 = ms(cycles(L.resident.sym('j_2E23'), { x: 100 }));
if (!near(fade.length ? fadeMine[0].ms : 0, w100)) fail('wait of 100', fadeMine[0].ms, w100);
if (!near(fallMine[0].ms, w100)) fail('first fall wait', fallMine[0].ms, w100);
if (!near(steps('delay')[0].ms, ms(cycles(L.resident.sym('delay'), { a: 3 })))) fail('delay 3', steps('delay')[0].ms);
if (!near(steps('sprites_off')[0].ms, ms(cycles(L.resident.sym('delay'), { a: 11 })))) fail('delay 11', steps('sprites_off')[0].ms);
console.log(`graphics: ${Object.keys(W.defs).length} WALLDEF files installed in every set, ${views} views on ${D.walls.maps.length} maps drawn and stepped as the game does, ${Object.keys(PT.heads).length} heads and ${Object.keys(PT.bodies).length} bodies, the ending's ${R.steps.length} steps` + (bad ? `; ${bad} differences` : ''));
process.exit(bad ? 1 : 0);
