#!/usr/bin/env node
'use strict';
// The Play tab's Chase cam (play.html's block port/page/chase.js), in node on the memory the page
// carries, from the loader's hand-over, attached to the page's machine as the page attaches it:
// - only read: with Chase cam's hook on DRAW_VIEW, through the menus, a practice race and a league
//   race with the opponent in it, the machine is the same, byte for byte and cycle for cycle, as
//   one without, every 25 frames; and the hook saw the opponent's car;
// - the chains: each time the game draws the crane's chains (CHAIN), the snapshot DRAW_VIEW left
//   earlier in the pass said so and from which row, and each time the game drew none it said so;
// - the game's own picture: from the driver's seat, with the game's own lens (cam.lens 'game'),
//   Chase cam draws the road and the opponent's car where the game draws them: of the game's line
//   pixels between the horizon and the bonnet, 85 % or more have one of Chase cam's of the same
//   colour within a fat pixel across and two lines up or down, in three pictures of a practice race
//   on Little Ramp and three of a league race with the opponent in sight, each a picture the game
//   has not turned by the car's roll (Chase cam draws more of the track than the game, so its own
//   lines are not counted);
// - the time a picture takes, printed;
// - the boost: in a practice race, each picture's snapshot says the boost is on exactly when the
//   game's flag for its flame is set, and both cameras then draw sparks in the flame's yellow,
//   thrown afresh the next frame, and none while it is off;
// - Heli cam, at each picture of a league race as the page calls it: never under the ground or
//   inside the track; the player's car in the picture in 97 % of them or more and the track not in
//   its way in 95 % or more, and the road ahead of it in the picture in 90 % or more; the opponent
//   in the picture with it in 90 % or more of those where it is ahead and near, and not followed
//   while it is behind; and with a wall of track between it and the car, it flies round to the
//   other side;
// - the dust: the specks the game draws over its view put back where it draws them (below);
// - the tilt: the player's car leans the way the game's own horizon tilts, and its nose follows its
//   climb (below).
//   node games/c64/stunt-car-racer/test_chase.js [part: off, chains, cockpit, tilt, dust, boost, heli]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/chase.js')) { console.log('FAIL: play.html has no port/page/chase.js'); process.exit(1); }
if (!page.includes('data-cam="chase"') || !page.includes('data-cam="heli"')) { console.log('FAIL: play.html has no Chase cam or Heli cam button'); process.exit(1); }
if (!page.includes('SCRChase.attach(rt,')) { console.log('FAIL: play.html does not attach Chase cam to its machine'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SCRPort');
const { SCRPage, SCRChase: C, C64 } = globalThis;
const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hash = rt => crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t;

// the menus as test_play.js plays them: a name, Practise, Little Ramp; or the league and its first race
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
const TO_RACE = {
  practice: [...MENUS, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }],
  season: [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }],
};
const DRIVE = [{ frames: 180, joy: J.fire }, { frames: 500, joy: J.up }, { frames: 60, joy: J.up & J.left }, { frames: 300, joy: J.up },
  { frames: 60, joy: J.up & J.right }, { frames: 100, joy: J.down }, { frames: 400, joy: J.up }, { frames: 100, joy: J.up & J.fire }, { frames: 300, joy: J.up }, { frames: 1000, joy: J.up }];
const flat = s => s.reduce((L, x) => (L.push(...Array(x.frames).fill(x)), L), []);

// the page's machine from the hand-over, with Chase cam attached as the page attaches it, unless bare
function machine(bare) {
  const rt = SCRPage.create({ data, cost });
  const view = bare ? null : C.attach(rt, () => SCRPage.create({ data, cost }));
  const set = s => { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; };
  return { rt, view, set };
}

// --- only read ---------------------------------------------------------------------------------
if (part('off')) {
  for (const [name, script] of [['practice', flat([...TO_RACE.practice, ...DRIVE])], ['league', flat([...TO_RACE.season, ...DRIVE])]]) {
    const a = machine(true), b = machine(false);
    let differ = 0, opp = 0, seen = 0, last = null;
    for (let f = 0; f < script.length; f++) {
      a.set(script[f]); b.set(script[f]);
      a.rt.runFrame(); b.rt.runFrame();
      if (b.view.seen && b.view.seen !== last) { last = b.view.seen; seen++; if (last.s.opp) opp++; }
      if (f % 25 === 24 && hash(a.rt) !== hash(b.rt)) { if (!differ++) fail(name + ': with Chase cam attached, the machine differs from one without at frame', f + 1); }
    }
    if (!differ) console.log('ok   ' + name + ': with Chase cam attached, the same machine at every 25th of ' + script.length + ' frames; ' + seen + ' pictures seen');
    if (name === 'league') { if (!opp) fail('league: Chase cam never saw the opponent\'s car'); else console.log('ok   league: the opponent\'s car seen in ' + opp + ' of them'); }
  }
}

// --- the chains --------------------------------------------------------------------------------
if (part('chains')) {
  for (const [name, to] of [['practice', TO_RACE.practice], ['league', TO_RACE.season]]) {
    const b = machine(false), P = b.rt.P, M = b.rt.M;
    let drew = null, wrong = 0, drawn = 0, none = 0;
    const chain = P.CHAIN, crane = P.CRANE_CHAINS;
    P.CHAIN = r => { if (drew === null) drew = M[0xC36B]; return chain(r); };
    P.CRANE_CHAINS = r => {
      drew = null;
      const q = crane(r), said = b.view.seen ? b.view.seen.s.chain : undefined;
      if (drew === null) none++; else drawn++;
      if (said !== drew && !wrong++) fail(name + ': the game drew the chains ' + (drew === null ? 'not at all' : 'from row ' + drew) + ', Chase cam said ' + said);
      return q;
    };
    const script = flat([...to, ...DRIVE.slice(0, 3)]);
    for (const s of script) { b.set(s); b.rt.runFrame(); }
    if (!drawn || !none) fail(name + ': the chains drawn in ' + drawn + ' passes and not in ' + none);
    else if (!wrong) console.log('ok   ' + name + ': the chains as the game drew them, in ' + drawn + ' passes, and none in ' + none);
  }
}

// --- the game's own picture --------------------------------------------------------------------
if (part('cockpit')) {
  const V = C.VIEW, isLine = c => c === 0 || c === 1;
  const near = (px, x, y, colour) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || yy >= V.h || xx < 0 || xx >= V.w) continue;
      if (px[(V.y + yy) * 384 + V.x + 2 * xx] === colour) return true;
    }
    return false;
  };
  let ms = 0, n = 0;
  for (const [name, to, want] of [['practice', TO_RACE.practice, 3], ['league', TO_RACE.season, 3]]) {
    const b = machine(false), M = b.rt.M, P = b.rt.P;
    // the eye as the game's CAMERA puts it, at the start of DRAW_VIEW: the car's place ($0100-$0108),
    // the eye's height ($37/$38), and the roll the game turns its picture by ($0126, with the top
    // two bits of $0123), the car's wreck ($6B) and the crane's count ($2F)
    let eye = null, flips = 0;
    const done = P.FLIP_DONE, camera = P.CAMERA;
    P.FLIP_DONE = r => { flips++; return done(r); };
    P.CAMERA = r => {
      const q = camera(r), s24 = v => (v << 8) >> 8;
      eye = { a: s24(M[0x106] << 16 | M[0x103] << 8 | M[0x100]) / 16, b: s24(M[0x108] << 16 | M[0x105] << 8 | M[0x102]) / 16,
        h: ((M[0x38] << 8 | M[0x37]) << 16) >> 16, roll: ((M[0x126] << 24 >> 24) << 2) | M[0x123] >> 6, wreck: M[0x6B] & 0x80, crane: M[0x2F] };
      return q;
    };
    const script = flat([...to, { frames: 180, joy: J.fire }, { frames: 4000, joy: J.up }]);
    const start = flat(to).length + 180;
    let f = 0, F = null, got = 0;
    const step = () => { b.set(script[f]); F = b.rt.runFrame(); f++; };
    for (let at = 300; got < want && start + at < script.length - 100; at += 100) {
      // run on until the game has drawn a picture (DRAW_VIEW) and the interrupt has put it on show
      // (FLIP_DONE), then draw the same from its eye on the next frame
      while (f < start + at) step();
      let seen = b.view.seen, e = null;
      for (;;) {
        while (b.view.seen === seen) step();
        seen = b.view.seen; e = eye;
        const n0 = flips;
        while (flips === n0 && b.view.seen === seen) step();
        step();
        if (b.view.seen === seen) break;
      }
      // a picture the game has not turned by a roll, of the car on the road
      if (Math.abs(e.roll) > 2 || e.wreck || e.crane) continue;
      const game = C64.renderFrame(F).px;
      // the game's horizon: the row where the ground starts most often across the view
      const rows = new Map();
      for (let x = V.x; x < V.x + 2 * V.w; x += 8) for (let y = V.y + 1; y < V.y + V.h; y++)
        if (game[y * 384 + x] === 8 && game[(y - 1) * 384 + x] === 14) { rows.set(y, (rows.get(y) || 0) + 1); break; }
      const hz = [...rows].sort((p, q) => q[1] - p[1])[0][0];
      const hd = seen.s.car.heading;
      const cam = C.lookAt([e.a, e.h * C.HS, e.b], [e.a + Math.sin(hd), e.h * C.HS, e.b + Math.cos(hd)]);
      cam.cy = hz - V.y; cam.lens = 'game'; cam.inside = true;
      const mine = Uint8Array.from(game);
      const t0 = process.hrtime.bigint();
      C.draw(b.view, seen.s, cam, mine);
      ms += Number(process.hrtime.bigint() - t0) / 1e6; n++;
      // the view from the horizon down to above the car's own bonnet, inside the windscreen's pillars:
      // each of the game's line pixels, and whether Chase cam drew one of its colour beside it
      let lines = 0, met = 0;
      for (let y = Math.max(0, hz - V.y - 30); y < Math.min(V.h, hz - V.y + 20); y++) for (let x = 20; x < 140; x++) {
        const o = (V.y + y) * 384 + V.x + 2 * x;
        if (isLine(game[o])) { lines++; if (near(mine, x, y, game[o])) met++; }
      }
      got++;
      const line = name + ', ' + (at / 50).toFixed(0) + ' s into the race: ' + (100 * met / lines).toFixed(0) + ' % of the game\'s ' + lines + ' line pixels drawn by Chase cam' + (seen.s.opp && seen.s.opp.shown ? ', the opponent in sight' : '');
      if (!(lines > 50 && met / lines >= 0.85)) fail(line); else console.log('ok   ' + line);
    }
    if (got < want) fail(name + ': only ' + got + ' pictures of the car on the road, not turned by a roll');
  }
  console.log('     a picture took ' + (ms / n).toFixed(1) + ' ms on average');
}

// --- the tilt ----------------------------------------------------------------------------------
// The player's car leans and tips as the game's own view does. In a practice race on Little Ramp,
// on each picture the game turned by a roll of 12 or more (its $0126 and the top bits of $0123,
// four to a degree) with the horizon across the view: where the horizon is lower on the right
// than on the left (sky 14 over ground 8 at frame columns 90 and 294), the car's right side is up
// (its frame's across axis rises), and the other way, in 95 % of them or more. And as the car
// drives on, its nose is up where its middle climbs and down where it drops: the climb over the
// way it moves against its frame's along axis, correlated by 0.5 or more.
if (part('tilt')) {
  const b = machine(false), M = b.rt.M, P = b.rt.P;
  let eye = null, flips = 0;
  const done = P.FLIP_DONE, camera = P.CAMERA;
  P.FLIP_DONE = r => { flips++; return done(r); };
  P.CAMERA = r => { const q = camera(r); eye = { roll: ((M[0x126] << 24 >> 24) << 2) | M[0x123] >> 6, wreck: M[0x6B] & 0x80, crane: M[0x2F] }; return q; };
  const script = flat([...TO_RACE.practice, ...DRIVE]);
  let f = 0, F = null;
  const step = () => { b.set(script[Math.min(f, script.length - 1)]); F = b.rt.runFrame(); f++; };
  while (f < flat(TO_RACE.practice).length) step();
  const V = C.VIEW, passes = [];
  let rolled = 0, agree = 0;
  while (f < script.length) {
    let seen = b.view.seen;
    while (b.view.seen === seen && f < script.length) step();
    seen = b.view.seen;
    const e = eye, n0 = flips;
    while (flips === n0 && b.view.seen === seen) step();
    step();
    if (!seen || e.wreck || e.crane) continue;
    passes.push(seen.s.car);
    if (b.view.seen !== seen || Math.abs(e.roll) < 12) continue;
    const px = C64.renderFrame(F).px;
    const rowAt = x => { for (let y = V.y + 4; y < V.y + V.h; y++) if (px[y * 384 + x] === 8 && [1, 2, 3, 4].some(d => px[(y - d) * 384 + x] === 14)) return y; return -1; };
    const L = rowAt(90), R = rowAt(294);
    if (L < 0 || R < 0 || L === R) continue;
    rolled++;
    if ((R > L) === (C.playerFrame(seen.s.car).r[1] > 0)) agree++;
  }
  const line = 'tilt: the car leans the way the game\'s horizon tilts in ' + agree + ' of ' + rolled + ' rolled pictures';
  if (rolled < 10 || agree < 0.95 * rolled) fail(line); else console.log('ok   ' + line);
  const climb = [], nose = [];
  for (let i = 1; i < passes.length; i++) {
    const p = passes[i - 1], c = passes[i], d = [Math.sin(c.heading), Math.cos(c.heading)];
    const ds = (c.x - p.x) * d[0] + (c.z - p.z) * d[1];
    if (ds < 20 || ds > 600) continue;
    climb.push((C.carHeight(c) - C.carHeight(p)) / ds); nose.push(C.playerFrame(c).f[1]);
  }
  const mean = a => a.reduce((t, x) => t + x, 0) / a.length, ma = mean(climb), mb = mean(nose);
  const r = climb.reduce((t, x, i) => t + (x - ma) * (nose[i] - mb), 0) / Math.sqrt(climb.reduce((t, x) => t + (x - ma) ** 2, 0) * nose.reduce((t, x) => t + (x - mb) ** 2, 0));
  const line2 = 'tilt: over ' + climb.length + ' passes the car\'s nose follows its climb, correlated by ' + r.toFixed(2);
  if (climb.length < 50 || !(r >= 0.5)) fail(line2); else console.log('ok   ' + line2);
}

// --- the dust ----------------------------------------------------------------------------------
// The specks the game throws up over its view (DUST) and the eye they are put back from. In a
// practice race on Little Ramp, from the driver's seat with the game's own lens and the horizon's
// line the snapshot gives (from $33/$69): on pictures the game has not turned by a roll, the
// horizon is where the game's picture has it, within a line, in 90 % of them or more; and each
// speck the game drew that is still white in its picture, Chase cam draws white within two
// pixels, in 95 % of them or more. And in a wreck the puffs of dust are in the snapshot.
if (part('dust')) {
  const b = machine(false), M = b.rt.M, P = b.rt.P;
  let flips = 0;
  const done = P.FLIP_DONE;
  P.FLIP_DONE = r => { flips++; return done(r); };
  const script = flat([...TO_RACE.practice, ...DRIVE]);
  let f = 0, F = null;
  const step = () => { b.set(script[Math.min(f, script.length - 1)]); F = b.rt.runFrame(); f++; };
  while (f < flat(TO_RACE.practice).length) step();
  const V = C.VIEW;
  let level = 0, onLine = 0, specks = 0, met = 0, puffs = 0;
  while (f < script.length) {
    let seen = b.view.seen;
    while (b.view.seen === seen && f < script.length) step();
    seen = b.view.seen;
    const n0 = flips;
    while (flips === n0 && b.view.seen === seen) step();
    step();
    if (!seen || b.view.seen !== seen) continue;
    const s = seen.s, px = C64.renderFrame(F).px;
    puffs += s.dust.filter(d => d.puff !== undefined).length;
    const roll = ((M[0x126] << 24 >> 24) << 2) | M[0x123] >> 6;
    if (Math.abs(roll) <= 2 && !(M[0x6B] & 0x80) && !M[0x2F]) {
      const rows = new Map();
      for (let x = V.x; x < V.x + 2 * V.w; x += 8) for (let y = V.y + 1; y < V.y + V.h; y++)
        if (px[y * 384 + x] === 8 && px[(y - 1) * 384 + x] === 14) { rows.set(y, (rows.get(y) || 0) + 1); break; }
      if (rows.size) { level++; if (Math.abs([...rows].sort((p, q) => q[1] - p[1])[0][0] - V.y - s.eye.hz) <= 1) onLine++; }
    }
    const sp = s.dust.filter(d => d.puff === undefined);
    if (!sp.length) continue;
    const e = s.eye, cam = C.lookAt([e.x, e.y, e.z], [e.x + Math.sin(e.heading), e.y, e.z + Math.cos(e.heading)]);
    cam.cy = e.hz; cam.lens = 'game'; cam.inside = true;
    const mine = new Uint8Array(384 * 272).fill(255);
    C.draw(b.view, Object.assign({}, s, { pieces: [], opp: null, chain: null }), cam, mine);
    for (const d of sp) {
      const x = V.x + 2 * (d.col + 16), y = V.y + d.row - 48;
      if (px[y * 384 + x] !== 1) continue;
      specks++;
      let ok = false;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (mine[(y + dy) * 384 + x + dx] === 1) ok = true;
      if (ok) met++;
    }
  }
  const l1 = 'dust: the eye\'s horizon is the game\'s, within a line, in ' + onLine + ' of ' + level + ' level pictures';
  if (level < 20 || onLine < 0.9 * level) fail(l1); else console.log('ok   ' + l1);
  const l2 = 'dust: ' + met + ' of the ' + specks + ' specks the game drew drawn by Chase cam where it drew them';
  if (specks < 30 || met < 0.95 * specks) fail(l2); else console.log('ok   ' + l2);
  const l3 = 'dust: ' + puffs + ' puffs of a wreck\'s dust in the snapshots';
  if (!puffs) fail(l3); else console.log('ok   ' + l3);
}

// --- the boost's sparks -------------------------------------------------------------------------
if (part('boost')) {
  // a practice race driven forward, then with the boost: each picture from both cameras, its
  // yellow pixels counted (nothing else in these views is yellow)
  const b = machine(false);
  for (const s of flat([...TO_RACE.practice, { frames: 180, joy: J.fire }, { frames: 300, joy: J.up }])) { b.set(s); b.rt.runFrame(); }
  let last = null, cs = null, hs = null, on = 0, off = 0, lit = 0, dark = 0, agree = 0, n = 0, moved = 0;
  const yellow = (v, s, c) => { const px = new Uint8Array(384 * 272); C.draw(b.view, s, c, px); let k = 0; for (const p of px) if (p === 7) k++; return { k, px }; };
  for (let f = 0; f < 700; f++) {
    b.set({ joy: f < 200 ? J.up : J.up & J.fire }); b.rt.runFrame();
    const v = b.view.seen;
    if (!v || v === last) continue;
    last = v; n++;
    if (v.s.boost === !!(b.rt.M[0x72] & 0x80)) agree++;
    const c = C.chase(b.view, v.s, cs, v.frame), h = C.heli(b.view, v.s, hs, v.frame); cs = c.state; hs = h.state;
    c.tick = h.tick = v.frame;
    const yc = yellow(b.view, v.s, c), yh = yellow(b.view, v.s, h);
    if (v.s.boost) { on++; if (yc.k >= 20 && yh.k >= 8) lit++; c.tick++; if (yellow(b.view, v.s, c).px.some((p, i) => p !== yc.px[i])) moved++; }
    else { off++; if (!yc.k && !yh.k) dark++; }
  }
  const l1 = 'boost: the snapshot\'s boost the game\'s flag ($72 bit 7) in ' + agree + ' of ' + n + ' pictures; the boost on in ' + on + ', off in ' + off;
  if (agree !== n || on < 20 || off < 10) fail(l1); else console.log('ok   ' + l1);
  const l2 = 'boost: sparks in the flame\'s yellow from both cameras in ' + lit + ' of ' + on + ' pictures with the boost on, thrown afresh the next frame in ' + moved + ', and none in ' + dark + ' of ' + off + ' without it';
  if (lit < on || moved < on || dark < off) fail(l2); else console.log('ok   ' + l2);
}

// --- Heli cam ----------------------------------------------------------------------------------
if (part('heli')) {
  // a league race with the opponent, driven so that the car falls behind it and later passes it,
  // and Heli cam at each picture the game draws, as the page calls it
  const b = machine(false), LAP = [{ frames: 180, joy: J.fire }, { frames: 300 }, { frames: 2500, joy: J.up }, { frames: 600 }, { frames: 2000, joy: J.up }];
  let hid = 0, nearBehind = 0;
  let cam = null, last = null, n = 0, low = 0, inBlock = 0, seen = 0, clear = 0, ahead = 0, both = 0, near = 0, follow = 0, behind = 0, swaps = 0, side = null;
  const inView = (c, p) => {
    const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
    const x = d[0] * c.r[0] + d[1] * c.r[1] + d[2] * c.r[2], y = d[0] * c.u[0] + d[1] * c.u[1] + d[2] * c.u[2], z = d[0] * c.f[0] + d[1] * c.f[1] + d[2] * c.f[2];
    return z > 0 && Math.abs(C.FX * c.zoom * x / z) < C.VIEW.w / 2 && Math.abs(C.FY * c.zoom * y / z) < C.VIEW.h / 2;
  };
  for (const s of flat([...TO_RACE.season, ...LAP])) {
    b.set(s); b.rt.runFrame();
    const v = b.view.seen;
    if (!v || v === last) continue;
    last = v;
    const c = C.heli(b.view, v.s, cam, v.frame), st = c.state;
    if (cam && st.side !== side) swaps++;
    cam = st; side = st.side; n++;
    if (c.pos[1] <= 0x200 * C.HS) low++;
    if (c.pos[1] <= C.roadAt(b.view, v.s, c.pos[0], c.pos[2])) inBlock++;
    const car = v.s.car, roof = [car.x, C.carHeight(car) * C.HS + 25, car.z];
    if (inView(c, roof)) seen++;
    if (!C.hidden(b.view, v.s, c.pos, roof)) clear++;
    if (st.hid) hid++;
    // the road ahead: a point 300 ahead of the car, where it is driving
    if (inView(c, [car.x + Math.sin(car.heading) * 300, roof[1], car.z + Math.cos(car.heading) * 300])) ahead++;
    const o = v.s.opp;
    if (o) {
      const om = [0, 1, 2, 3].reduce((t, k) => [t[0] + o.corners[k][0] / 4, t[1] + o.heights[k] * C.HS / 4, t[2] + o.corners[k][1] / 4], [0, 0, 0]);
      const d = Math.hypot(om[0] - car.x, om[2] - car.z);
      if (o.ahead && d < C.HELI.near * 0.8) { near++; if (inView(c, om) && inView(c, roof)) both++; }
      if (!o.ahead) { behind++; if (d < C.HELI.near) nearBehind++; if (st.gap > 1) follow++; }
    }
  }
  const pc = k => (100 * k / Math.max(1, n)).toFixed(0) + ' %';
  const l1 = 'heli: in ' + n + ' pictures, the camera under the ground in ' + low + ' and in the track in ' + inBlock;
  if (n < 200 || low || inBlock) fail(l1); else console.log('ok   ' + l1);
  const l2 = 'heli: the car in the picture in ' + pc(seen) + ' of them, the track not in the way in ' + pc(clear) + ', the road 300 ahead of it in the picture in ' + pc(ahead) + '; ' + swaps + ' flights round to the other side (' + hid + ' pictures with the car hidden for a moment)';
  if (seen < 0.97 * n || clear < 0.95 * n || ahead < 0.9 * n) fail(l2); else console.log('ok   ' + l2);
  const l3 = 'heli: with the opponent ahead and near, both cars in the picture in ' + both + ' of ' + near + '; with it behind, followed in ' + follow + ' of ' + behind + ' (' + nearBehind + ' of them near)';
  if (near < 20 || both < 0.9 * near || nearBehind < 3 || follow > 0.1 * behind) fail(l3); else console.log('ok   ' + l3);
  // the flight round: the car on the flat with a wall of track beside it, on the side the
  // helicopter starts on, between the two: it flies to the other side, behind the car, and the car
  // is hidden only until it has started round
  const wall = [];
  for (let z = -900; z <= 300; z += 100) wall.push({ L: [150, 2000, z], R: [260, 2000, z], cross: -1, colour: 0 });
  const wv = { blocks: null }, ws = { car: { x: 0, z: 0, heading: 0, front: [0x200, 0x200], back: 0x200, steer: 0 }, opp: null, pieces: [wall], dust: [] };
  let wc = null, c = null, hidFor = 0;
  const roof = [0, C.carHeight(ws.car) * C.HS + 25, 0];
  for (let f = 0; f < 300; f++) {
    c = C.heli(wv, ws, wc, f); wc = c.state;
    if (C.hidden(wv, ws, c.pos, roof)) hidFor++;
  }
  const l4 = 'heli: with a wall of track between it and the car, it flew to the ' + (wc.side < 0 ? 'other side' : 'same side') + ', the car hidden in ' + hidFor + ' of 300 frames and ' + (C.hidden(wv, ws, c.pos, roof) ? 'hidden' : 'in sight') + ' at the end';
  if (wc.side > 0 || hidFor > 40 || C.hidden(wv, ws, c.pos, roof)) fail(l4); else console.log('ok   ' + l4);
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
