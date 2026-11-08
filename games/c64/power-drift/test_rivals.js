#!/usr/bin/env node
// Hold the Rivals section of index.html against the game's own code, and the numbers its copy
// gives. The page's pd-race block (createRace) runs a whole race on the site's 6502: stage_loop to
// the first race frame, then race_frame_loop once a race frame, stopped where the loop jumps back
// to its start and set going again from there. Here the game runs its own path on the kit's
// simulator over the whole listing, without stopping: stage_loop, then race_frame_loop round and
// round through its own JMPs, to stage_won or game_over. The stand-ins are the page's, written
// again from the listing's labels: wait_frame returns at once, the beam is at line 0 for the start
// lights' waits, $E5 goes up 3 a race frame, and move_player finds the kart where the page holds
// it across the road ($2F; $E0 is the middle) and the stick as the page sets it (up, and fire to
// change into low gear below speed level 14 and into high gear from 14). A spin is the game's own code, place_rivals from $3AE1, run
// between two race frames where the page calls spin(). After every race frame the two must agree
// on all 64 KB but the stack page, and on colour RAM. That is checked for a perfect race on each
// of the 25 stages, for races with one to six spins, and for the kart held in either lane.
// Then the copy's claims: grid place k goes to driver (you + 1 + k) mod 12, for every driver; the
// rivals' top speeds fall with their grid place and the grid starts them in that order, the four
// fastest ahead of the player; a rival's lane never changes, nor does one rival pass another; a
// perfect race finishes on race frame 1616, 2'14 on the race clock, on every stage and for every
// driver, and the three fastest rivals on 1711, 1831 and 1970, with no one driving or six spins; a spin
// at full speed costs 66 race frames; one spin still wins, two or three give second, four or five
// third, and six end the game; held in the left lane the kart hits the sixth fastest rival ten
// times, 176 race frames apart, and loses, and in the right lane it goes through the seventh
// fastest untouched and hits the fourth fastest every 264; after the finish rival 10 drives away at up to speed level 62; and
// place_rivals finds a rival at distance 1 inside its spin window for exactly the values of $2F
// that the page's PD_RACE.SOLID gives for its lane, which leave the 18 in the middle clear.
// discoveries.html's pdRivals is held against the rivals of a race with no one driving, race
// frame by race frame, and its PD_ROAD against PD_RACE, setup_stage and draw_scenery: at every
// slot met at distance 0 on the 25 stages, the game's own tests for the objects at the sides spin
// a kart on the road only at PD_ROAD.SCENERY, $C0. It exits 1 on any difference.
//   node games/c64/power-drift/test_rivals.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createRace, raceFrame, PD_RACE } = g.run('index.html', 'pd-race', 'createRace', 'raceFrame', 'PD_RACE');
const { pdRivals, PD_ROAD } = g.run('discoveries.html', 'pd-rivals', 'pdRivals', 'PD_ROAD');
g.lib('c64');
const { C64 } = globalThis;
const L = g.listing(), S = (n) => L.sym(n);
let bad = 0, compared = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const check = (ok, ...w) => { if (!ok) fail(...w); };

const SPIN_CODE = 0x3AE1, SPIN_END = 0x3AF5;          // place_rivals: a slower rival at distance 1, in the window
const LAPS = 4, LAP = 50 * 256;
const where = (m, x) => x < 11 ? m[0x53B8 + x] * LAP + 256 * m[0x5382 + x] + m[0x538E + x] : m[0x53A7] * LAP + 256 * m[0x5380] + m[0x5381];   // 11: the player

// The game's own path. drive false leaves the stick alone and the kart standing on the grid.
function theGame(driver, course, stage, { drive = true, road = 0xE0, extra = {} } = {}) {
  const m = L.ram.slice(), colour = new Uint8Array(1024);
  let stick = 0xFF, pressed = false, state = 'racing', passes = 0, mid = null;
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
      if (a === 0xDC00) return stick;
      if (a === 0xDC01) return 0xFF;
      if (a === 0xD012 || a === 0xD011 || a === 0xD018) return 0;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15; },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const hooks = {
    [S('wait_frame')]: (c) => { c.rts(); },
    [S('move_player')]: () => {
      if (!drive) return;
      m[0x2F] = road; stick = 0xFE;
      if (pressed) pressed = false;
      else if ((m[0x53D9] === 1) !== (m[0x536F] >= 14)) { stick &= 0xEF; pressed = true; }
    },
    [S('race_frame_loop')]: () => passes++ > 0,      // the first pass goes on: it is the start of the race
    [S('stage_won')]: () => { state = 'won'; return true; },
    [S('game_over')]: () => { state = 'over'; return true; },
  };
  for (const [a, fn] of Object.entries(extra)) hooks[a] = (c) => fn(c, m);
  m[0x2E] = 0; m[0x53B7] = driver; m[0x53E4] = course; m[0x53E5] = stage;
  cpu.call(S('clear_text_screen'), {}, { maxSteps: 200000 });
  cpu.call(S('random'));
  m[0x53CE] = m[S('kart_colour_choices') + (cpu.a & 3)];
  cpu.sp = 0xFF; cpu.pc = S('stage_loop');
  cpu.run({ until: S('race_frame_loop'), maxSteps: 5000000, hooks: { [S('wait_frame')]: hooks[S('wait_frame')] } });
  return {
    m, colour, get state() { return state; },
    frame() {                                         // on from where the last pass stopped, to the next
      if (state !== 'racing') return state;
      passes = 0;
      cpu.run({ maxSteps: 2000000, hooks });
      m[0xE5] = (m[0xE5] + 3) & 255;
      return state;
    },
    spin() {
      if (state !== 'racing' || m[0x53CF]) return false;
      const was = m[0x53D0], keep = { a: cpu.a, x: cpu.x, y: cpu.y, p: cpu.p, pc: cpu.pc, sp: cpu.sp };
      cpu.pc = SPIN_CODE; cpu.run({ until: SPIN_END, maxSteps: 100 });
      Object.assign(cpu, keep);
      return !was;
    },
  };
}

// A race, the page beside the game. spins: the race frames before which Spin out is pressed;
// one that cannot spin yet (a spin still on) is pressed again on the next frame. road: the $2F the
// kart is held at. drive false: no one drives, and the page is left out. onFrame(n, memory) is
// called at the start and after each race frame.
function race(driver, course, stage, { spins = [], drive = true, road = 0xE0, extra = {}, onFrame = () => {} } = {}) {
  const name = 'driver ' + driver + ', ' + 'ABCDE'[course] + (stage + 1) + (spins.length ? ', spins ' + spins : '') + (road !== 0xE0 ? ', $2F $' + road.toString(16) : '');
  const page = drive ? createRace(L.ram, kit) : null, gm = theGame(driver, course, stage, { drive, road, extra });
  if (page) { page.road = road; page.start(driver, course, stage); }
  const out = { finish: null, place: null, clock: null, rivals: [], state: null, top10: 0, hits: [], through: [] };
  const lanes = Array.from(gm.m.subarray(0x539A, 0x53A5)), todo = spins.slice();
  let n = 0;
  const agree = () => {
    if (!page || bad >= 12) return;
    const a = differ(page.m, gm.m, [[0, 0xFF], [0x200, 0xFFFF]]);
    if (a >= 0) return fail(name, 'frame ' + n, 'memory $' + a.toString(16), page.m[a], gm.m[a]);
    const c = differ(page.colour, gm.colour);
    if (c >= 0) return fail(name, 'frame ' + n, 'colour RAM cell ' + c, page.colour[c], gm.colour[c]);
    compared++;
  };
  agree(); onFrame(0, gm.m);
  while (gm.state === 'racing' && n < 3000) {
    if (todo.length && n + 1 >= todo[0]) {
      const p = page ? page.spin() : null, q = gm.spin();
      if (page) check(p === q, name, 'spin before frame ' + (n + 1), p, q);
      if (q) todo.shift();
    }
    const before = Array.from({ length: 11 }, (_, x) => gm.m[0x53B8 + x]), ahead = Array.from({ length: 11 }, (_, x) => where(gm.m, x) - where(gm.m, 11));
    const spinning = gm.m[0x53D0];
    if (page) page.frame();
    gm.frame(); n++;
    agree(); onFrame(n, gm.m);
    const m = gm.m;
    const gap = (x) => where(m, x) - where(m, 11);
    if (!spinning && m[0x53D0]) out.hits.push([n, [...Array(11).keys()].findIndex((x) => gap(x) >= 8 && gap(x) < 16)]);   // distance 1
    else if (!spinning && !m[0x53CF]) for (let x = 0; x < 11; x++) if (ahead[x] > 0 && gap(x) <= 0 && m[0xE7 + x] < m[0x536F]) out.through.push([n, x]);
    if (m[0x53CF] && out.finish === null) {
      out.finish = n; out.place = m[0x53D7];
      out.clock = m[0x53DF] + "'" + m[0x53E0].toString(16).padStart(2, '0');
    }
    for (let x = 0; x < 11; x++) if (before[x] === LAPS - 1 && m[0x53B8 + x] === LAPS) out.rivals[x] = n;
    if (out.finish === null) for (let x = 0; x < 11; x++) {         // until rival 10 takes over the player's kart
      check(m[0x539A + x] === lanes[x], name, 'frame ' + n, 'rival ' + x + ' changed lane');
      if (x < 10) check(where(m, x) > where(m, x + 1), name, 'frame ' + n, 'rival ' + (x + 1) + ' passed rival ' + x);
    }
    out.top10 = Math.max(out.top10, m[0xE7 + 10]);
  }
  out.state = gm.state;
  if (page) check(page.state === gm.state, name, 'ended', page.state, gm.state);
  return out;
}

// The grid: who sits where, how fast each place is, and where each starts
const top = Array.from(L.bytes(S('rival_top_speeds'), 11));
const start = (k) => 256 * L.ram[S('rival_start_coarse') + k] + L.ram[S('rival_start_fine') + k];
for (let k = 0; k < 10; k++) {
  check(top[k] > top[k + 1], 'rival_top_speeds', k, top[k], top[k + 1]);
  check(start(k) > start(k + 1), 'start of rival', k + 1, 'is not behind rival', k);
}
for (let driver = 0; driver < 12; driver++) {
  const page = createRace(L.ram, kit);
  page.start(driver, 0, 0);
  const behind = start(3) > 512 && start(4) < 512;
  check(256 * page.m[0x5380] + page.m[0x5381] === 512 && behind, 'the player does not start between rivals 3 and 4');
  for (let k = 0; k < 11; k++) check(page.m[0x53AC + k] === (driver + 1 + k) % 12, 'driver', driver, 'grid place', k, 'holds driver', page.m[0x53AC + k]);
}
check(top.every((t) => t < 32), 'a rival as fast as the player');

// place_rivals' window: every value of $2F, for every rival met at distance 1 in the races below
const [loB, hiB] = [PD_RACE.SOLID[0x28][1] + 1, PD_RACE.SOLID[0x08][0] - 1];
check(hiB - loB + 1 === 18 && PD_RACE.MIDDLE >= loB && PD_RACE.MIDDLE <= hiB, 'the clear middle is not $D8-$E9');
let windows = 0;
const probe = new Uint8Array(65536), pc = new CPU(probe, { port: 0x35, io: { read(a) { throw new Error('read $' + a.toString(16)); }, write() {} } });
function windowAt(c, m) {                             // at $3A64, place_rivals working out rival X's place across
  if (m[0x45] !== 1) return;                          // distance 1, in eighths of a fine step
  probe.set(m);
  const lane = m[0x539A + c.x], [lo, hi] = PD_RACE.SOLID[lane] || [];
  if (lo === undefined) return fail('rival', c.x, 'in lane', lane);
  for (let v = 0xA8; v < 0x11C; v++) {                // the values move_player keeps $2F to, $A8 to $1B
    probe[0x2F] = v & 255; pc.x = c.x; pc.pc = 0x3A64;
    pc.run({ until: 0x3AC3, maxSteps: 400 });
    const hit = pc.a >= 0x3C && pc.a < 0x5A;
    if (hit !== (v >= lo && v <= hi)) return fail('place_rivals window, lane $' + lane.toString(16) + ', $2F = $' + (v & 255).toString(16), hit);
  }
  windows++;
}

// draw_scenery's tests at distance 0: for every slot met at distance 0 in the races below, its
// objects on the left and on the right are run through the game's own sums from $3C7C for every
// value of $2F on the road, $C0 to $FF. A left object spins the kart at $3D11, a right one at
// $3DDA; an object over the road has no test. Only PD_ROAD.SCENERY may spin it.
let meetings = 0, edgeHits = 0;
const SCENERY_STOPS = { left: [0x3D11, 0x3D22, 0x3D25], right: [0x3DDA, 0x3DEB, 0x3DEE] };
const stopAt = (list) => Object.fromEntries(list.map((a) => [a, () => true]));
function sceneryAt(c, m) {                            // at $3C7C, draw_scenery starting slot X
  if (m[0x31 + c.x] !== 0) return;
  probe.set(m);
  meetings++;
  for (let v = PD_ROAD.ROAD[0]; v <= PD_ROAD.ROAD[1]; v++) {
    probe[0x2F] = v;
    pc.x = c.x; pc.sp = 0xFF; pc.pc = 0x3C7C;
    pc.run({ until: 0x3CBD, maxSteps: 400 });         // the slot's place across, from $2F
    const keep = probe.slice(0x00, 0x100), x = pc.x;
    pc.run({ maxSteps: 400, hooks: stopAt(SCENERY_STOPS.left) });
    const left = pc.pc === 0x3D11;
    probe.set(keep, 0); pc.x = x; pc.pc = 0x3D80;
    pc.run({ maxSteps: 400, hooks: stopAt(SCENERY_STOPS.right) });
    const right = pc.pc === 0x3DDA;
    if (left || right) {
      if (v !== PD_ROAD.SCENERY || left) return fail('draw_scenery spins the kart at $2F = $' + v.toString(16), left ? 'on the left' : 'on the right');
      edgeHits++;
    }
  }
}

// Every stage, driven perfectly, the page beside the game, with place_rivals and draw_scenery
// probed on the way
for (let c = 0; c < 5; c++) for (let s = 0; s < 5; s++) {
  const r = race(1, c, s, { extra: { 0x3A64: windowAt, 0x3C7C: sceneryAt } }), name = 'ABCDE'[c] + (s + 1);
  check(r.finish === 1616 && r.clock === "2'14" && r.place === 0 && r.state === 'won', name, 'perfect race', r.finish, r.clock, r.place, r.state);
  check(r.top10 === 62, name, 'rival 10 reached speed level', r.top10);
  check(r.hits.length === 0, name, 'the kart in the middle hit', r.hits);
}
check(windows > 100, 'only', windows, 'rivals met at distance 1');
check(meetings > 1000 && edgeHits > 0, 'scenery met at distance 0', meetings, 'times, at the edge', edgeHits);
for (const lane of [0x08, 0x28]) check(String(PD_ROAD.SOLID[lane]) === String(PD_RACE.SOLID[lane]), 'discoveries.html and index.html differ on lane', lane);
{
  const page = createRace(L.ram, kit);
  page.start(1, 0, 0);
  check(page.m[0x2F] === PD_ROAD.START, 'setup_stage starts the kart at $2F = $' + page.m[0x2F].toString(16));
}

// Every driver finishes the same perfect race
for (let driver = 0; driver < 12; driver++) {
  const page = createRace(L.ram, kit);
  page.start(driver, 2, 3);
  let n = 0, finish = null;
  while (page.frame() === 'racing') { n++; if (page.m[0x53CF] && finish === null) finish = n; }
  check(finish === 1616 && page.state === 'won', 'driver', driver, 'finished on', finish, page.state);
}

// The rivals, with no one driving: the three fastest finish and the third ends the game, and
// discoveries.html's pdRivals has every rival where the game has it on every race frame
{
  const lines = pdRivals(L.ram, 2000);
  const r = race(1, 0, 0, { drive: false, onFrame: (n, m) => {
    for (let x = 0; x < 11; x++) if (where(m, x) !== lines[n][x]) fail('pdRivals: rival', x, 'race frame', n, lines[n][x], where(m, x));
  } });
  check(r.rivals[0] === 1711 && r.rivals[1] === 1831 && r.rivals[2] === 1970 && r.state === 'over', 'rivals finish on', r.rivals.slice(0, 3), r.state);
}

// Spins at full speed: what one costs, and where one to six of them leave the player
{
  const one = race(1, 0, 0, { spins: [400] });
  check(one.finish - 1616 === 66, 'a spin at full speed cost', one.finish - 1616, 'race frames');
  const want = ['1st', '2nd', '2nd', '3rd', '3rd', 'over'];
  for (let k = 1; k <= 6; k++) {
    const spins = Array.from({ length: k }, (_, i) => 200 + 200 * i);
    const r = race(1, 0, 0, { spins });
    const got = r.state === 'over' ? 'over' : ['1st', '2nd', '3rd'][r.place];
    check(got === want[k - 1], k, 'spins:', got, 'finish', r.finish);
    if (k === 6) check(r.rivals[0] === 1711 && r.rivals[1] === 1831 && r.rivals[2] === 1970, 'with six spins the rivals finish on', r.rivals.slice(0, 3));
  }
}

// Held in a lane. In the left lane the kart hits the third fastest rival (grid place 2) on race
// frame 80, then the sixth fastest (grid place 5) ten times, 176 race frames apart, and the game is
// lost. In the right lane it goes through the seventh fastest (grid place 6) without a spin, and
// hits the fourth fastest (grid place 3), which it closes on by exactly 8 a frame, every 264.
{
  const left = race(1, 0, 0, { road: 0xF0 }), five = left.hits.filter(([, x]) => x === 5).map(([n]) => n);
  check(left.hits[0] && left.hits[0][0] === 80 && left.hits[0][1] === 2, 'left lane: first hit', left.hits[0]);
  check(left.state === 'over' && five.length === 10 && five.every((n, i) => !i || n - five[i - 1] === 176), 'left lane: hits on rival 5 at', five, left.state);
  const right = race(1, 0, 0, { road: 0xD0 }), three = right.hits.filter(([, x]) => x === 3).map(([n]) => n).slice(1);
  check(right.state === 'over' && right.through.some(([, x]) => x === 6), 'right lane: did not go through rival 6', right.through);
  check(three.length >= 5 && three.every((n, i) => !i || n - three[i - 1] === 264), 'right lane: hits on rival 3 at', three);
}

// The page's picture: one frame of the race through the video chip's model, and the player's kart in it
{
  const page = createRace(L.ram, kit);
  page.start(1, 0, 0);
  for (let i = 0; i < 300; i++) page.frame();
  const r = C64.renderFrame(raceFrame(page.m, page.colour));
  check(r && r.px && r.px.length === r.w * r.h, 'raceFrame did not render');
}

console.log(`${compared} race frames the same in the page and the game, the window checked at ${windows} rivals and the roadside at ${meetings} slots (${edgeHits} spins at the edge): ` + (bad ? bad + ' differences' : 'the grid, the finishes, the spins, the window and the road as the pages say'));
process.exit(bad ? 1 : 0);
