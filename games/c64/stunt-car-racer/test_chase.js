#!/usr/bin/env node
'use strict';
// The Play tab's Chase View (play.html's block port/page/chase.js), in node on the memory the page
// carries, from the loader's hand-over, attached to the page's machine as the page attaches it:
// - only read: with Chase View's hook on DRAW_VIEW, through the menus, a practice race and a league
//   race with the opponent in it, the machine is the same, byte for byte and cycle for cycle, as
//   one without, every 25 frames; and the hook saw the opponent's car;
// - the chains: each time the game draws the crane's chains (CHAIN), the snapshot DRAW_VIEW left
//   earlier in the pass said so and from which row, and each time the game drew none it said so;
// - the game's own picture: from the driver's seat, with the game's own lens (cam.lens 'game'),
//   Chase View draws the road and the opponent's car where the game draws them: of the game's line
//   pixels between the horizon and the bonnet, 85 % or more have one of Chase View's of the same
//   colour within a fat pixel across and two lines up or down, in three pictures of a practice race
//   on Little Ramp and three of a league race with the opponent in sight, each a picture the game
//   has not turned by the car's roll (Chase View draws more of the track than the game, so its own
//   lines are not counted);
// - the time a picture takes, printed;
// - Heli Replay's recording: one snapshot for each DRAW_VIEW since the race's CLEAR_RACE, in the
//   order of the C64's frames; the replay at a recorded frame is that snapshot (the later of two
//   drawn in one frame), and halfway between
//   two it puts the cars halfway; from the helicopter, over every frame of the recording, the camera
//   is above the ground and the player's car inside the view in 95 % of them or more.
//   node games/c64/stunt-car-racer/test_chase.js [part: off, chains, cockpit, heli]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/chase.js')) { console.log('FAIL: play.html has no port/page/chase.js'); process.exit(1); }
if (!page.includes('data-mod="chase"')) { console.log('FAIL: play.html has no Chase View button'); process.exit(1); }
if (!page.includes('SCRChase.attach(rt,')) { console.log('FAIL: play.html does not attach Chase View to its machine'); process.exit(1); }
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

// the page's machine from the hand-over, with Chase View attached as the page attaches it, unless bare
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
      if (f % 25 === 24 && hash(a.rt) !== hash(b.rt)) { if (!differ++) fail(name + ': with Chase View attached, the machine differs from one without at frame', f + 1); }
    }
    if (!differ) console.log('ok   ' + name + ': with Chase View attached, the same machine at every 25th of ' + script.length + ' frames; ' + seen + ' pictures seen');
    if (name === 'league') { if (!opp) fail('league: Chase View never saw the opponent\'s car'); else console.log('ok   league: the opponent\'s car seen in ' + opp + ' of them'); }
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
      if (said !== drew && !wrong++) fail(name + ': the game drew the chains ' + (drew === null ? 'not at all' : 'from row ' + drew) + ', Chase View said ' + said);
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
      // each of the game's line pixels, and whether Chase View drew one of its colour beside it
      let lines = 0, met = 0;
      for (let y = Math.max(0, hz - V.y - 30); y < Math.min(V.h, hz - V.y + 20); y++) for (let x = 20; x < 140; x++) {
        const o = (V.y + y) * 384 + V.x + 2 * x;
        if (isLine(game[o])) { lines++; if (near(mine, x, y, game[o])) met++; }
      }
      got++;
      const line = name + ', ' + (at / 50).toFixed(0) + ' s into the race: ' + (100 * met / lines).toFixed(0) + ' % of the game\'s ' + lines + ' line pixels drawn by Chase View' + (seen.s.opp ? ', the opponent in sight' : '');
      if (!(lines > 50 && met / lines >= 0.85)) fail(line); else console.log('ok   ' + line);
    }
    if (got < want) fail(name + ': only ' + got + ' pictures of the car on the road, not turned by a roll');
  }
  console.log('     a picture took ' + (ms / n).toFixed(1) + ' ms on average');
}

// --- Heli Replay -------------------------------------------------------------------------------
if (part('heli')) {
  const b = machine(false), P = b.rt.P;
  let views = 0, clears = 0;
  const dv = P.DRAW_VIEW, cr = P.CLEAR_RACE;
  P.DRAW_VIEW = r => { views++; return dv(r); };
  P.CLEAR_RACE = r => { clears++; views = 0; return cr(r); };
  for (const s of flat([...TO_RACE.season, ...DRIVE.slice(0, 4)])) { b.set(s); b.rt.runFrame(); }
  const rec = b.view.rec;
  if (!clears || rec.length !== views) fail('heli: ' + rec.length + ' snapshots kept, ' + views + ' pictures drawn since CLEAR_RACE');
  else if (rec.some((r, i) => i && r.frame < rec[i - 1].frame)) fail('heli: the recording is out of order');
  else console.log('ok   heli: ' + rec.length + ' snapshots kept, one for each picture drawn since the race was cleared');
  let off = 0;
  for (let i = 0; i + 1 < rec.length; i++) {
    const a = rec[i], z = rec[i + 1];
    if (z.frame === a.frame) continue;                 // two pictures in a frame, as a race starts: the later is shown
    if (C.replayAt(rec, a.frame, 0).s !== a.s) { if (!off++) fail('heli: the replay at frame ' + a.frame + ' is not its snapshot'); continue; }
    const m = C.replayAt(rec, (a.frame + z.frame) / 2, i).s, A = a.s.car, Z = z.s.car;
    if (Math.hypot(Z.x - A.x, Z.z - A.z) < 1500 && Math.abs(m.car.x - (A.x + Z.x) / 2) > 1e-6) { if (!off++) fail('heli: halfway between frames ' + a.frame + ' and ' + z.frame + ' the car is not halfway'); }
  }
  if (!off) console.log('ok   heli: the replay is each snapshot at its frame, and the car halfway between two');
  let cam = null, seen = 0, frames = 0, low = 0, i = 0;
  for (let f = rec[0].frame; f <= rec[rec.length - 1].frame; f++) {
    const at = C.replayAt(rec, f, i); i = at.i;
    const c = C.heli(b.view, at.s, cam, f); cam = c.state;
    if (c.pos[1] <= 0x200 * C.HS) low++;
    // the car's middle through the camera's flat lens
    const d = [at.s.car.x - c.pos[0], at.s.car.front * C.HS - c.pos[1], at.s.car.z - c.pos[2]];
    const x = d[0] * c.r[0] + d[1] * c.r[1] + d[2] * c.r[2], y = d[0] * c.u[0] + d[1] * c.u[1] + d[2] * c.u[2], z = d[0] * c.f[0] + d[1] * c.f[1] + d[2] * c.f[2];
    const sx = C.FX * c.zoom * x / z, sy = C.FY * c.zoom * y / z;
    frames++;
    if (z > 0 && Math.abs(sx) < C.VIEW.w / 2 && Math.abs(sy) < C.VIEW.h / 2) seen++;
  }
  const line = 'heli: from the helicopter the car is in the view in ' + seen + ' of ' + frames + ' frames, the camera below the ground in ' + low;
  if (low || seen < 0.95 * frames) fail(line); else console.log('ok   ' + line);
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
