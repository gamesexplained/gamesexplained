'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js, with the
// video chip's stolen cycles), started where the loader hands over (game_start, $4E96) on the
// listing's memory, or from a moment of play saved in work/states (port/scripts/gen-states.js, never
// committed); and a player that drives the game's menus.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine, KEY, FRAME, LINE, LINES, loadListing } = require(path.join(REPO, 'kit/c64/machine.js'));

// A pass of the main program starts at main_loop ($7CD3), its call of game_clock: once each time
// the player comes back to the main screen's icons.
const PASS = 0x7CD3;
// Where the loader hands over, with $01 = $14 (all RAM).
const START = 0x4E96;

function boot(opts = {}) {
  const ram = loadListing(path.join(GAME, 'listing.json'));
  return new Machine(Object.assign({ ram, pc: START, port: { dir: 0x2F, data: 0x14 }, passAt: PASS, dma: true }, opts));
}
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

// Run until the processor is at a, outside the interrupt.
function stopAt(m, a, maxFrames = 3000) {
  const prev = m.hooks[a];
  let hit = false;
  m.hooks[a] = c => { if (m.depth) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
  try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
  finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
  if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
}
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return n === undefined ? s / 4294967296 : Math.floor(s / 4294967296 * n); };
}
// A player for the moments of play and the lockstep's sessions, on the joystick: it picks a place
// on the screen and steers the cursor there, then presses fire. On the main screen the place is
// one of the six icons (main_icons, $7EE8); in a window with a menu, one of its rows; in any other
// window, a cell inside it, or three times in ten anywhere on the screen (which leaves the radio). Now and then it presses fire where the cursor stands. bot(seed) gives
// f(machine) to call once a frame, which sets the machine's joy and returns the stick's bits (1 up,
// 2 down, 4 left, 8 right, 16 fire). weights: how often each icon is picked, last first (the
// radio, OUT, IN, Force, Information, satellites).
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
function target(M, r, weights) {
  const t = M[0x7E] | M[0x7F] << 8;
  if (t === 0x8C67) {
    let sum = 0;
    for (const v of weights) sum += v;
    let k = r() * sum, i = 0;
    while (k >= weights[i]) k -= weights[i++];
    const p = 0x7EE8 + (5 - i) * 6;
    return [(M[p] + r(M[p + 2])) * 8 + 2 + r(4), (M[p + 1] + r(M[p + 3])) * 8 + 2 + r(4)];
  }
  const col = M[t], row = M[t + 1], wd = M[t + 2], ht = M[t + 3];
  if (M[t + 7] & 1) return [col * 8 + r(Math.max(1, wd * 8)), (row + r(Math.max(1, ht))) * 8 + 3];
  if (r() < 0.3) return [8 + r(240), 6 + r(170)];
  return [(col + r(Math.max(1, wd))) * 8 + r(8), (row + r(Math.max(1, ht))) * 8 + r(8)];
}
function bot(seed, o = {}) {
  const r = rng(seed);
  const weights = o.weights || [3, 2, 3, 2, 2, 2];
  let goal = null, hold = 0, rest = 0, lastTop = -1;
  return m => {
    const M = m.ram, t = M[0x7E] | M[0x7F] << 8;
    if (t !== lastTop) { goal = null; lastTop = t; rest = 4 + r(10); }
    let j = 0;
    if (hold > 0) { hold--; j = FIRE; }
    else if (rest > 0) rest--;
    else {
      if (!goal) goal = target(M, r, weights);
      const x = M[(t + 12) & 0xFFFF], y = M[(t + 13) & 0xFFFF];
      const dx = goal[0] - x, dy = goal[1] - y;
      if (dx > 2) j |= RIGHT; else if (dx < -2) j |= LEFT;
      if (dy > 1) j |= DOWN; else if (dy < -1) j |= UP;
      if (!j || r() < 0.002) { hold = 2 + r(3); rest = 6 + r(20); goal = null; j = FIRE; }
      else if (r() < 0.01) goal = null;
    }
    m.joy = 0x1F & ~j;
    return j;
  };
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { bot, target, UP, DOWN, LEFT, RIGHT, FIRE, GAME, REPO, WORK, STATES, PASS, START, KEY, FRAME, LINE, LINES, Machine, boot, save, readState, restore, states, stopAt, rng, hex };
