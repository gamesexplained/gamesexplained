'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js, with its
// timers and serial port, and the video chip's stolen cycles), started at the start-up the depacker
// jumps to ($4000) on the listing's memory, or from a moment of play saved in work/states
// (port/scripts/gen-states.js, never committed); and scripted play to reach a moment.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine, KEY, FRAME, LINE, LINES, loadListing } = require(path.join(REPO, 'kit/c64/machine.js'));

// A pass of the main program starts at main_loop ($06E0), its call of frame_wait.
const PASS = 0x06E0;
// The start-up the depacker jumps to: it starts CIA 2's serial port, copies cia2_serial_check to
// $0100 and goes to cold_start. The processor port is $35, as the depacker leaves it.
const START = 0x4000;

// The game from the start-up, on the listing's memory.
function boot(opts = {}) {
  const ram = loadListing(path.join(GAME, 'listing.json'));
  return new Machine(Object.assign({ ram, pc: START, port: { dir: 0x2F, data: 0x35 }, passAt: PASS, cia: true, dma: true }, opts));
}

// A moment as it stands: the machine's state, saved where a pass starts.
function save(m, name, extra = {}) {
  const s = Object.assign(m.save(), extra);
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function restore(name, opts = {}) {
  const s = typeof name === 'string' ? readState(name) : name;
  const m = Machine.restore(s, opts);
  m.meta = s;
  return m;
}
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// Run until the processor is at a, outside the interrupt (which runs whole: the game's handler
// never clears I).
function stopAt(m, a, maxFrames = 3000) {
  const prev = m.hooks[a];
  let hit = false;
  m.hooks[a] = c => { if (c.i && m.inIrq) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
  try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
  finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
  if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
}

// A player for the moments of play and the lockstep's sessions: a seeded random stick, mostly
// right and stabbing, with a jump or a climb now and then, held 6 to 20 frames at a time; in an
// end-of-stage fight (boss_on, $024C) it stays about the middle of the screen. SPACE, the special
// weapon, two frames in a hundred. bot(seed) gives f(machine) to call once a frame, which sets the
// machine's joy and keys and returns the joystick's bits (1 up, 2 down, 4 left, 8 right, 16 fire).
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const pool = list => list.flatMap(([a, w]) => Array(w).fill(a));
const PLAY = pool([[RIGHT, 70], [RIGHT | UP, 8], [UP, 6], [DOWN, 8], [LEFT, 6], [0, 4], [DOWN | RIGHT, 4], [LEFT | UP, 2]]);
const FIGHT = pool([[LEFT, 25], [RIGHT, 25], [0, 20], [DOWN, 15], [UP, 5]]);
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return n === undefined ? s / 4294967296 : Math.floor(s / 4294967296 * n); };
}
function bot(seed) {
  const r = rng(seed);
  let left = 0, stick = 0, fire = false, space = 0;
  return m => {
    if (left-- <= 0) {
      const p = m.ram[0x024C] ? FIGHT : PLAY;
      stick = p[r(p.length)];
      fire = !fire && r() < 0.7;
      left = 6 + r(15);
      if (r() < 0.02) space = 3;
    }
    if (space > 0) { space--; m.keys.add(KEY.SPACE); } else m.keys.delete(KEY.SPACE);
    const j = stick | (fire ? FIRE : 0);
    m.joy = 0x1F & ~j;
    return j;
  };
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { GAME, REPO, WORK, STATES, PASS, START, KEY, FRAME, LINE, LINES, Machine, boot, save, readState, restore, states, stopAt, bot, rng, hex };
