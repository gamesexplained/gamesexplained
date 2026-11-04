#!/usr/bin/env node
'use strict';
// Hold graphics.html's cards (the block bf-gfx) against the game's own code, and check that they
// draw every picture the game draws its moving things with.
// - The page's image of the cartridge (bf-gfx-data) is play.html's, which test_play.js holds the
//   port against.
// - Every card, for every choice of player, bird colour or bonus round, is run twice: once on the
//   port (reference/bf-port.js) over the page's image, and once with each routine the card calls
//   (actor_animate, actor_think, actor_physics, draw_actor, fish_update, draw_splash,
//   sparks_update, balloon_draw, propellers_update, show_popup) run as the game's own bytes, from
//   the committed listing, on the kit's 6502. Every frame of the two runs must be the same.
// - Every picture draw_actor ($E3A4) makes for a state the game can be in (a player with two
//   balloons, one or none, in each action and animation step, bursting, flashing; a bird flying,
//   on its parachute or pumping, and falling; the fish's six) is on a card, as are the splash's
//   four, every step of the bolt and every tile of the spark, every picture of the bonus balloon,
//   the propeller's four and the six scores.
// - The timings the page states: a flap every 9 frames with B held, gliding and standing a step
//   every 24 frames, running every 3, the bubble's and the balloon's cycle of 128 frames, the
//   propeller's step every other frame, and the bird's take-off 280 frames into phase 3 (147 in
//   phases 1 and 2).
// It exits 1 on any difference.
//   node games/nes/balloon-fight/test_graphics.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
const { BalloonFight } = g.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');
globalThis.BalloonFight = BalloonFight;
const G = g.run('graphics.html', 'bf-gfx', 'bfMem', 'bfPort', 'bfHide', 'bfSprites', 'bfCards', 'BF_FRAME_MS');
const V = BalloonFight.V;
const json = (page, id) => JSON.parse(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(g.read(page))[1]);
const D = json('graphics.html', 'bf-gfx-data'), PD = json('play.html', 'bf-play-data');
let bad = 0, checked = 0;
const fail = (...m) => { bad++; console.log('FAIL', ...m); };
const ok = () => { checked++; };
for (const k of ['game_rom', 'chr_sp', 'chr_bg']) if (D[k] !== PD[k]) fail('data', k, 'is not play.html\'s'); else ok();
const rom = Uint8Array.from(Buffer.from(D.game_rom, 'base64'));
const full = g.listing().ram.slice(0xC000);

// The game's own code, behind the port's names: each routine a card calls is run at its address.
const SHIM = {
  V,
  create(M, io) {
    const cpu = new CPU(M, Object.assign({ io }, BalloonFight.MAP));
    return new Proxy({}, { get: (_, name) => (r = {}) => {
      const at = BalloonFight.ROUTINES[name];
      if (!at) throw new Error('no address for ' + name);
      cpu.call(at, { a: r.a || 0, x: r.x || 0, y: r.y || 0, c: r.c || 0 }, { maxSteps: 200000 });
      return {};
    } });
  },
};
const C = G.bfCards();
const OPTS = { players2: [0, 1], burst: [0, 1], players1: [0, 1], players0: [0, 1], birds: [0, 1, 2], water: [0], sky: [0], balloons: [0], popups: [0, 1] };
const runs = {};
for (const [sec, list] of Object.entries(C)) {
  if (!OPTS[sec]) { fail('section', sec, 'has no choices listed'); continue; }
  for (const c of list) for (const v of OPTS[sec]) {
    globalThis.BalloonFight = BalloonFight; const a = c.run(rom, v);
    globalThis.BalloonFight = SHIM; const b = c.run(full, v);
    globalThis.BalloonFight = BalloonFight;
    if (JSON.stringify(a) !== JSON.stringify(b)) fail(sec, c.id, v, 'differs from the game\'s own code'); else ok();
    if (!a.length || !a.some((f) => f.sprites.length || f.tiles)) fail(sec, c.id, v, 'draws nothing'); else ok();
    runs[c.id + ':' + v] = a;
  }
}

// Every picture is on a card: some frame of some card has all its sprites, at the same places
// relative to one another, with the same tiles, flips and palettes (whether a sprite is behind the
// background is left out). A frame may hold more: the fish's card draws the player too.
const allFrames = Object.values(runs).flat();
const same = (s, t) => s.tile === t.tile && (s.attr & 0xC3) === (t.attr & 0xC3);
const holds = (frame, want) => frame.sprites.some((s) => same(s, want[0]) &&
  want.every((w) => frame.sprites.some((t) => same(t, w) && t.x - w.x === s.x - want[0].x && t.y - w.y === s.y - want[0].y)));
const drawn = (x, set) => { const M = G.bfMem(rom); set(M); const P = G.bfPort(M); G.bfHide(M); P.draw_actor({ x }); return G.bfSprites(M); };
const actor = (x, type, bl, action, frame, inv = 0) => drawn(x, (M) => {
  for (let k = 0; k < 8; k++) M[V.actor_balloons + k] = 0xFF;
  Object.assign(M, { [V.actor_type + x]: type, [V.actor_balloons + x]: bl, [V.actor_action + x]: action, [V.actor_frame + x]: frame, [V.actor_x + x]: 0x60, [V.actor_y + x]: 0x60 });
  if (x < 2) M[V.invulnerable + x] = inv;
});
const want = (what, sprites) => { if (!sprites.length || !allFrames.some((f) => holds(f, sprites))) fail('missing', what); else ok(); };
for (const p of [0, 1]) {
  for (const [bl, type, acts] of [[2, 3, [0, 1, 2, 3, 4, 5]], [1, 7, [0, 1, 2, 3, 4, 5]], [0, 11, [0, 1]]])
    for (const a of acts) for (let f = 0; f < 4; f++) want(`player ${p + 1}, ${bl} balloons, action ${a}, step ${f}`, actor(p, type, bl, a, f));
  for (let a = 6; a <= 10; a++) want(`player ${p + 1} bursting, action ${a}`, actor(p, 3, 2, a, 0));
  for (let f = 0; f < 4; f++) want(`player ${p + 1} flashing, step ${f}`, actor(p, 3, 2, 1, f, 1));
  for (let k = 0; k < 6; k++) { const M = G.bfMem(rom); const P = G.bfPort(M); M[V.actor_x + p] = 0x60; M[V.actor_y + p] = 0x60; M[V.scoring_player] = p; M[V.popup_kind] = M[V.popup_kind + 1] = 0xFF; G.bfHide(M); P.show_popup({ a: k, x: p, y: 0 }); want(`score ${k} for player ${p + 1}`, G.bfSprites(M)); }
}
for (const c of [0, 1, 2])
  for (const [bl, type, acts] of [[2, c, [0, 1]], [1, c + 4, [0, 1, 2, 3, 4, 5, 6]], [0, c + 8, [0]]])
    for (const a of acts) for (let f = 0; f < 4; f++) want(`bird of colour ${c}, ${bl} balloons, action ${a}, step ${f}`, actor(2, type, bl, a, f));
for (let s = 1; s <= 6; s++) want(`the fish, state ${s}`, drawn(8, (M) => { M[V.fish_state] = s; M[V.fish_x] = 0x60; M[V.fish_y] = 0xC8; }));
for (let s = 0; s < 5; s++) { const M = G.bfMem(rom); M[V.splash_frame] = s; M[V.splash_x] = 0x60; G.bfHide(M); G.bfPort(M).draw_splash(); const sp = G.bfSprites(M); if (sp.length) want(`the splash, step ${s}`, sp); }
const tilesShown = new Set(Object.values(runs).flatMap((fs) => fs.flatMap((f) => f.sprites.map((s) => s.tile))));
for (let i = 0; i < 8; i++) { const t = rom[V.spark_tiles - 0xC000 + i]; if (!tilesShown.has(t)) fail('missing spark tile', t.toString(16)); else ok(); }
for (let i = 0; i < 10; i++) for (const tab of ['bolt_tiles1', 'bolt_tiles2', 'bolt_tiles3']) {
  const t = rom[V[tab] - 0xC000 + i]; if (t !== 0xFC && !tilesShown.has(t)) fail('missing bolt tile', tab, i, t.toString(16)); else ok();
}
for (let i = 0; i < 8; i++) {
  const bottom = rom[V.balloon_bottom_tiles - 0xC000 + i], flip = rom[V.balloon_bottom_flips - 0xC000 + i];
  if (!runs['balloon:0'].some((f) => f.sprites.some((s) => s.tile === bottom && (s.attr & 0x40) === flip))) fail('missing balloon string', i); else ok();
}
const prop = runs['propeller:0'];
if (prop.length !== 4 || new Set(prop.map((f) => f.tiles.join())).size !== 4) fail('propeller', 'four pictures', prop.length); else ok();
for (let ph = 0; ph < 4; ph++) {
  const row = (n) => [n, n + 1, n + 2].map((k) => rom[V['propeller_tiles' + (k ? '_' + (k + 1) : '')] - 0xC000 + ph]);
  const nine = [0, 3, 6].flatMap(row).join();
  if (!prop.some((f) => f.tiles.join() === nine)) fail('propeller phase', ph); else ok();
}

// The timings the page states.
const frames = (id) => runs[id].reduce((n, f) => n + f.ms, 0) / G.BF_FRAME_MS;
const each = (id) => runs[id].map((f) => Math.round(f.ms / G.BF_FRAME_MS));
const near = (a, b) => Math.abs(a - b) < 0.01;
const expect = (what, got, exp) => { if (!near(got, exp)) fail(what, got, 'not', exp); else ok(); };
for (const p of ['p2', 'p1']) {
  expect(p + ' flap cycle', frames(p + '-flap:0'), 9);
  for (const id of ['glide', 'stand']) { expect(p + ' ' + id + ' cycle', frames(`${p}-${id}:0`), 96); if (each(`${p}-${id}:0`).join() !== '24,24,24,24') fail(p, id, each(`${p}-${id}:0`)); else ok(); }
  if (each(p + '-run:0').join() !== '3,3,3,3') fail(p, 'run', each(p + '-run:0')); else ok();
  for (const id of ['skid', 'turn']) if (runs[`${p}-${id}:0`].length !== 1) fail(p, id, 'is more than one picture'); else ok();
}
if (each('b-flap:0').reduce((a, b) => a + b) !== 9) fail('bird flap', each('b-flap:0')); else ok();
if (each('p0-fall:0').join() !== '3,3,3,3') fail('falling', each('p0-fall:0')); else ok();
if (each('splash:0').slice(0, 4).join() !== '4,4,4,4') fail('splash', each('splash:0')); else ok();
expect('bubble cycle', frames('bubble:0'), 128);
if (each('bubble:0').join() !== '32,32,32,32') fail('bubble', each('bubble:0')); else ok();
expect('balloon cycle', frames('balloon:0'), 128);
if (each('propeller:0').join() !== '2,2,2,2') fail('propeller', each('propeller:0')); else ok();
// The bird's take-off: the frame its balloons become 2, from the start of phase 3 and of phase 1.
for (const [inflate, delay, at] of [[88, 4, 280], [3, 3, 147]]) {
  const M = G.bfMem(rom); for (let k = 0; k < 8; k++) M[V.actor_balloons + k] = 0xFF;
  Object.assign(M, { [V.actor_balloons + 2]: 1, [V.actor_action + 2]: 2, [V.actor_frame + 2]: 3, [V.actor_frame_timer + 2]: inflate, [V.actor_timer + 2]: 1, [V.enemy_launch_delay]: delay, [V.actor_x + 2]: 0x60, [V.actor_y + 2]: 0x60 });
  const P = G.bfPort(M); let f = 0;
  while (M[V.actor_balloons + 2] !== 2 && f < 2000) {
    f++; M[V.frame_counter] = (M[V.frame_counter] + 1) & 0xFF;
    if (--M[V.actor_frame_timer + 2] === 0) { M[V.actor_frame_timer + 2] = 3; P.actor_animate({ x: 2 }); P.actor_think({ x: 2 }); }
  }
  if (f !== at) fail('take-off', inflate, delay, f, 'not', at); else ok();
}
// The phase's numbers: phase 3 reads the first entry of each table, and phases 1 and 2 use 3 and 3.
if (rom[V.enemy_inflate_rates - 0xC000] !== 88 || rom[V.enemy_launch_delays - 0xC000] !== 4) fail('phase 3 numbers'); else ok();
console.log(bad ? `${bad} failure(s)` : `ok: ${checked} checks`);
process.exit(bad ? 1 : 0);
