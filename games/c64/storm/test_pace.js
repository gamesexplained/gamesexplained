#!/usr/bin/env node
// The Play tab's pace against the game's. The kit's C64 runs the game from the loader's hand-over
// ($75AC) with the video chip taking its cycles (machine.js, dma), and the page's own machine
// (reference/storm-play.js) runs the port from the same start on its clock. Both get the same
// joystick: on the title fire, then one player or two, no instructions; in play, at the start of
// each pass, a pilot for each player on the way to the brooches. Each side steers by its own
// memory. The frame each pass of the main loop ($78D7) begins in is kept, on both sides.
//
// The two play the same game for as long as their passes take the same frames: the stick is read
// once a pass. Where a pass's work ends within a raster line or so of a line the game waits for
// ($F0 in restore_bg, $FF in wait_frame), the page, which charges each routine its mean, can take
// a frame more or a frame less than the game; from then on the interrupts the two have taken
// differ, sfx_update draws on random once a frame, and the two games part, alike but not the same.
// So what is held is the pace over the whole run: the frames a pass takes on average in play, in
// each session, within 1 %. The title is left out: it waits for the stick, which is answered by
// the frame, so a side that reaches it a frame later can wait two seconds more for its answer.
//   node games/c64/storm/test_pace.js [frames a session]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
g.lib('cpu6502');                   // the 6502 the port's title music runs on, as play.html loads it
const { StormPort } = g.run('reference/storm-port.js', 'storm-port', 'StormPort');
const { StormPlay } = g.run('reference/storm-play.js', 'storm-play', 'StormPlay');
const { StormGuide } = g.run('reference/storm-guide.js', 'storm-guide', 'StormGuide');
const FRAMES = +process.argv[2] || 8000;

// The stick. On the title and its questions, by frame, in turn: fire, left (one player) or right
// (two), and down (no instructions). In play, once a pass: the guide's way (reference/storm-guide.js)
// to the nearest brooch the player can reach, a turn at a time, shooting now and then, casting a
// mask or a spell every so often; with no way, to a doorway.
const G = StormGuide.create(StormPort);
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const EXIT = { 8: [8, 0], 4: [8, 0x10], 2: [0, 8], 1: [0x10, 8] };
const title = (f, two) => { const t = f % 120; return t < 5 ? FIRE : t >= 40 && t < 45 ? (two ? RIGHT : LEFT) : t >= 80 && t < 85 ? DOWN : 0; };
function pilot(who) {
  const base = who ? 0x861E : 0x8629, dead = who ? 0x8619 : 0x8618;
  let room = -1, plan = null, age = 0, seed = 0x5EED + who;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };
  return (R) => {
    if (R[base] & 0x80 || R[dead]) return 0;                                      // not walking
    const x = R[base], y = R[base + 1], d = R[base + 2], r = rnd(100);
    if (r < 2) return DOWN | (rnd(2) ? FIRE : 0);
    if (room !== R[0x8118] || ++age > 60) { room = R[0x8118]; age = 0; plan = G.plan(R, who); }
    let want = -1;
    const path = plan && plan.path, i = path ? path.findIndex(([px, py]) => px === x && py === y) : -1;
    if (i >= 0 && i + 1 < path.length) { const [nx, ny] = path[i + 1]; want = nx < x ? 3 : nx > x ? 1 : ny < y ? 0 : 2; }
    else if (path && i < 0) age = 1000;
    if (want < 0) {
      const e = [8, 4, 2, 1].filter((b) => R[0x8119] & b), [gx, gy] = EXIT[e[(room + age) % e.length]] || [8, 8];
      want = Math.abs(gx - x) > Math.abs(gy - y) || gy === y ? (gx > x ? 1 : 3) : (gy > y ? 2 : 0);
    }
    return (want === d ? UP : ((want - d) & 3) === 1 ? RIGHT : LEFT) | (r < 30 ? FIRE : 0);
  };
}

const char = new Uint8Array(4096);
char.set(StormPort.FONT);
function session(two) {
  const m = new Machine({ ram: g.listing().ram, pc: 0x75AC, passAt: 0x78D7, port: { dir: 0x2F, data: 0x37 }, rom: { char }, dma: true });
  m.hooks[0xFFD2] = (c) => { c.cycles += 40; c.rts(); };          // CHROUT: nothing kept of it
  const ran = [], page = [], onGame = [pilot(0), pilot(1)], onPage = [pilot(0), pilot(1)];
  m.onPass = (mm) => { ran.push(mm.frames); mm.joy1 = 0x1F & ~onGame[0](mm.ram); mm.joy = 0x1F & ~onGame[1](mm.ram); };
  const play = StormPlay.create({ M: g.listing().ram, Port: StormPort, onCheckpoint: (a) => {
    if (a === 0x78D7) { play.joy[0] = 0x1F & ~onPage[0](play.M); play.joy[1] = 0x1F & ~onPage[1](play.M); }
  } });
  let passes = 0;
  const titled = [new Set(), new Set()];
  for (let f = 0; f < FRAMES; f++) {
    if (m.ram[0x8106]) { m.joy1 = 0x1F & ~title(f, two); m.joy = 0x1F; }
    m.runFrames(1);
    if (m.ram[0x8106]) titled[0].add(f);
    if (play.M[0x8106]) { play.joy[0] = 0x1F & ~title(f, two); play.joy[1] = 0x1F; }
    play.run((f + 1) * StormPlay.FRAME);
    if (play.M[0x8106]) titled[1].add(f);
    while (passes < play.passes) { passes++; page.push(f); }
  }
  // The frames a pass takes in play: the passes of each side, leaving out the one that spans the
  // title (and the game over before it), which waits for the stick, answered by the frame.
  const rate = (list, t) => {
    let frames = 0, n = 0;
    for (let k = 1; k < list.length; k++) {
      let title = false;
      for (let f = list[k - 1]; f < list[k] && !title; f++) title = t.has(f);
      if (!title) { frames += list[k] - list[k - 1]; n++; }
    }
    return { per: frames / n, n };
  };
  const a = rate(ran, titled[0]), b = rate(page, titled[1]);
  let same = Math.min(ran.length, page.length) - 1;
  for (let k = 1; k <= same; k++) if (ran[k] - ran[k - 1] !== page[k] - page[k - 1]) { same = k - 1; break; }
  const off = 100 * (b.per - a.per) / a.per;
  console.log(`${two ? 'two players' : 'one player'}, ${FRAMES} frames: the game played ${a.n} passes and spent ${titled[0].size} frames on the title, ` +
    `the page ${b.n} and ${titled[1].size}; a pass took ${a.per.toFixed(3)} frames on the game and ${b.per.toFixed(3)} on the page ` +
    `(${off >= 0 ? '+' : ''}${off.toFixed(2)} %); the first ${same} passes in the same frames`);
  return Math.min(a.n, b.n) > 100 && Math.abs(off) <= 1;
}

const ok = [session(false), session(true)].every(Boolean);
console.log(ok ? 'the page keeps the game\'s pace' : 'the page does not keep the game\'s pace (1 %)');
process.exit(ok ? 0 : 1);
