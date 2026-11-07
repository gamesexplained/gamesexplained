'use strict';
// The Opponents tab's data (opponents.html, its block op-data), from the Play tab's machine
// (page-machine.js):
// - each track as BUILD_TRACK ($EA34) leaves it before a practice race: its pieces' kinds and flags
//   ($0400), their squares on the map ($044E), each one's distance round the track ($0670/$06BE),
//   and the pieces the description gives a speed of their own (the pairs at $075E/$0769, $C778 of
//   them). The page builds each track's speed limits from these with the port's own PIECE_TABLE;
// - the first race of a season on Little Ramp, pass by pass, as OPPONENT_MOVE ($1E85) leaves it:
//   the computer's piece and place round the track, its speed ($D6/$D7), the limit it drove to
//   ($E3), whether a wheel was on the road ($C9), its place across ($B0) and its aim ($2C), the
//   swerve's count ($C30F), the player's place across ($2B) and the gap between the cars
//   ($39/$3A, with $C36A's sign). The player holds the stick forward from the drop.
// - the same race's computer's car over Little Ramp's banked bend (pieces 23 to 28, and the 15
//   passes after, two seconds of the game, back on the flat) and its jump
//   (from piece 32), pass by pass, as the Play tab's outside views place it (watchCar); and the
//   jump again with the run-up's limit (pieces 30 to 33, $0710) set to other speeds; with the
//   stretch of track the views draw (SCRChase's pairs, their heights in the game's units).
//   node opponents-data.js [out.json]      (default: print the sizes; with a file, write it)
// make(SCRPage, data, cost) is what build-opponents.js puts in the page and test_opponents.js
// holds it to; its second result, the race's machine states, is for the test only.
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const { TRACKS } = require('./track-previews.js');
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
// the menus to a track's preview in Practise (track-previews.js)
function practice(div, place) {
  const tap = (joy, hold = 8, after = 30) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
  const s = [{ frames: 400 }, ...tap(J.fire, 8, 40), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire, 8, 40), { frames: 100 },
    ...tap(J.fire, 8, 40), { frames: 100 }];
  for (let i = div; i < 4; i++) s.push(...tap(J.up));
  s.push(...tap(J.fire, 8, 40), { frames: 100 });
  for (let i = 1; i < place; i++) s.push(...tap(J.down));
  s.push(...tap(J.fire, 8, 40), { frames: 300 });
  return s;
}
// Start the Racing Season and its first race (race-frame.js), then the stick forward
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
const SEASON = [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire),
  { frames: 300 }, ...tap(J.fire), { frames: 300 }];
const RACE_FRAMES = 4200;
// the stretch of Little Ramp the views of the computer's car show: its banked bend and its jump,
// and the run-up limits the jump is tried at besides the game's own (70, which insists)
const BEND = [23, 28], JUMP = [32, 41], LIMITS = [45, 55, 60, 75, 90];
const RUN_UP = [30, 33], AFTER_BEND = 15;

// the computer's car each pass from piece lo to hi, as OPP_CORNERS leaves it: its corners as the
// outside views place them (SCRChase.snap; their heights follow from the wheels', see the page),
// its wheels' heights, the road's under each, the springs' pushes, their pull down as OPP_WHEELS
// set it ($52: $28, or $7C on a piece with $B2 bit 7), whether a wheel is on the road, its speed,
// its piece and its place across
const CAR_FIELDS = ['corners: x, z of each of 4', 'wheels\' heights x 3', 'road\'s heights x 3', 'pushes x 3', 'pull', 'on the road', 'speed', 'piece', 'across'];
function watchCar(P, M, v, lo, hi, out) {
  const corners = P.OPP_CORNERS, wheels = P.OPP_WHEELS, s16 = (a, b) => (M[a] | M[b] << 8) << 16 >> 16;
  let pull = 0;
  P.OPP_WHEELS = r => { pull = M[0xB2] & 0x80 ? 0x7C : 0x28; return wheels(r); };
  P.OPP_CORNERS = r => {
    const o = corners(r), x = M[0xC375];
    if (!M[0xC37C] || x < lo || x > hi) return o;
    const s = SCRChase.snap(v, M), w = [0, 1, 2];
    out.push([...s.opp.corners.flat(), ...w.map(k => s16(0x07CC + k, 0x07D0 + k)), ...w.map(k => s16(0x07EC + k, 0x07F0 + k)),
      ...w.map(k => s16(0x07C4 + k, 0x07C8 + k)), pull, M[0xC9] ? 1 : 0, M[0xD7], x, M[0xB0]]);
    return o;
  };
}
// a run of passes as the page carries it: 16-bit numbers, little-endian, in base 64
const pack16 = ps => Buffer.from(Int16Array.from(ps.flat()).buffer).toString('base64');
// the jump's passes from the run-up's last two pieces to 12 after the last in the air
function jumpOnly(ps) {
  const i0 = ps.findIndex(p => p[20] >= RUN_UP[1] - 1);
  let last = -1;
  ps.forEach((p, i) => { if (!p[18]) last = i; });
  return ps.slice(i0, Math.min(ps.length, last + 13));
}
function make(SCRPage, data, cost) {
  const drive = (rt, steps) => {
    for (const s of steps) {
      rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy;
      for (let i = 0; i < s.frames; i++) rt.runFrame();
    }
  };
  const tracks = TRACKS.map(([div, place, number, name]) => {
    const rt = SCRPage.create({ data, cost }), M = rt.M;
    drive(rt, practice(div, place));
    if (M[0xC77D] !== number) throw new Error(name + ': the menus built track ' + M[0xC77D]);
    const n = M[0xC764], at = (a, k) => Array.from(M.subarray(a, a + k));
    return { number, name, kinds: at(0x0400, n), squares: at(0x044E, n),
      dist: at(0x0670, n).map((v, i) => v | M[0x06BE + i] << 8), length: M[0xC768] | M[0xC769] << 8,
      specials: at(0x075E, M[0xC778]).map((p, i) => [p, M[0x0769 + i]]) };
  });
  // the race: OPPONENT_MOVE watched, each pass's state after it
  const rt = SCRPage.create({ data, cost }), M = rt.M, P = rt.P;
  drive(rt, SEASON);
  const passes = [], states = [];
  const move = P.OPPONENT_MOVE, line = P.OPPONENT_LINE;
  // what OPPONENT_LINE reads, as it starts, for the test (test_opponents.js)
  P.OPPONENT_LINE = r => {
    states.push({ line: { driver: M[0xC773], gap: M[0x39] | M[0x3A] << 8, behind: M[0xC36A] >> 7, opp: M[0xB0], you: M[0x2B],
      road: M[0xB7] | M[0xB8] << 8, wheels: M[0xC9], steer: M[0xC357], piece: M[0xC375],
      ahead: [0, 1].map(k => M[0x0400 + (M[0xC375] + k) % M[0xC764]] & 0x0F) } });
    const o = line(r);
    Object.assign(states[states.length - 1].line, { aim: M[0x2C], after: M[0xB0] });
    return o;
  };
  P.OPPONENT_MOVE = r => {
    const o = move(r);
    if (!M[0xC37C]) return o;
    const x = M[0xC375];
    const place = ((M[0xC4] << 8 | M[0x23]) >> 3) + (M[0x0670 + x] | M[0x06BE + x] << 8);
    const gap = (M[0x39] | M[0x3A] << 8) * (M[0xC36A] & 0x80 ? -1 : 1);
    passes.push([x, place, M[0xD7] << 8 | M[0xD6], M[0xE3], M[0xC9] ? 1 : 0, M[0xB0], M[0x2C], M[0xC30F], M[0x2B], gap]);
    return o;
  };
  const v = SCRChase.create(() => SCRPage.create({ data, cost })), game = [];
  watchCar(P, M, v, BEND[0], JUMP[1], game);
  for (let f = 0; f < RACE_FRAMES; f++) { rt.input.keys = new Set(); rt.input.joy = J.up; rt.runFrame(); }
  const race = { track: M[0xC77D], driver: M[0xC773], top: M[0x2099], corner: M[0x209A],
    fields: ['piece', 'place', 'speed', 'limit', 'road', 'across', 'aim', 'swerve', 'you', 'gap'], passes };
  // the jump again, the run-up held to another limit; each race run from the menus, until the car
  // is past the stretch
  const lap = game.findIndex((p, i) => i && p[20] < game[i - 1][22]), first = lap < 0 ? game : game.slice(0, lap);
  const runs = [{ limit: 0, passes: pack16(jumpOnly(first.filter(p => p[20] >= JUMP[0]))) }];
  for (const limit of LIMITS) {
    const r2 = SCRPage.create({ data, cost }), M2 = r2.M, P2 = r2.P, out = [];
    drive(r2, SEASON);
    const grip = P2.OPP_GRIP;
    P2.OPP_GRIP = r => {
      const x = M2[0xC375];
      if (x < RUN_UP[0] || x > RUN_UP[1]) return grip(r);
      const keep = M2[0x0710 + x];
      M2[0x0710 + x] = 0x80 | limit;
      try { return grip(r); } finally { M2[0x0710 + x] = keep; }
    };
    watchCar(P2, M2, SCRChase.create(() => SCRPage.create({ data, cost })), JUMP[0], JUMP[1], out);
    for (let f = 0; f < RACE_FRAMES && !(out.length && M2[0xC375] > JUMP[1]); f++) { r2.input.keys = new Set(); r2.input.joy = J.up; r2.runFrame(); }
    runs.push({ limit, passes: pack16(jumpOnly(out)) });
  }
  const HS = SCRChase.HS, pt = q => [q[0], Math.round(q[1] / HS), q[2]];
  const pieces = v.pieces.slice(BEND[0], JUMP[1] + 1).map(ps => ps.map(p => [...pt(p.L), ...pt(p.R), p.cross, p.colour]));
  const off = first.findIndex(p => p[20] > BEND[1]), bend = first.slice(0, off < 0 ? first.length : off + AFTER_BEND);
  const moves = { from: BEND[0], pieces, fields: CAR_FIELDS, bend: pack16(bend), jump: runs };
  return { data: { tracks, race, moves }, states };
}

function opponents(dir) {
  const { SCRPage, data, cost } = require('./page-machine.js').load(dir);
  return make(SCRPage, data, cost);
}

if (require.main === module) {
  const path = require('path'), fs = require('fs');
  const out = opponents(path.resolve(__dirname, '../..')).data;
  const text = JSON.stringify(out);
  console.log(out.tracks.map(t => t.name + ' ' + t.kinds.length).join(', ') + '; the race: ' + out.race.passes.length + ' passes, driver ' + out.race.driver +
    ', top speed ' + out.race.top + '; ' + text.length + ' bytes');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], text);
}
module.exports = { make, opponents };
