'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js, with its
// timers, the video chip's stolen cycles, the sprite collisions and interrupts taken inside a
// handler), started at the game's first instruction ($8009) as test_route.js starts it, or from a
// moment of play saved in work/states (port/scripts/gen-states.js, never committed); the Maps
// page's route, which drives it; and scripted play to reach a moment.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine, KEY, FRAME, LINE, LINES } = require(path.join(REPO, 'kit/c64/machine.js'));
const route = require(path.join(GAME, 'test_route.js'));

// A pass of the main program starts at main_loop ($8053), its call of room_change.
const PASS = 0x8053;

// The game from its first instruction, as test_route.js starts it (its START bytes).
function boot(opts = {}) {
  const m = route.boot();
  m.passAt = PASS;
  return m;
}

// The route's joystick, a byte a frame (bits 1 up, 2 down, 4 left, 8 right, 16 fire).
function joystick() {
  const R = JSON.parse(fs.readFileSync(path.join(GAME, 'route.json'), 'utf8'));
  return zlib.inflateRawSync(Buffer.from(R.joystick, 'base64'));
}

// A moment as it stands: the machine's state, saved where a pass starts; with the frame of the
// route it was saved at, for the route's joystick from there.
function save(m, name, frame) {
  const s = m.save();
  s.routeFrame = frame;
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function restore(name, opts = {}) {
  const s = typeof name === 'string' ? readState(name) : name;
  const m = Machine.restore(s, opts);
  m.routeFrame = s.routeFrame;
  return m;
}
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// Scripted play on a machine: run until the processor is at a, outside every interrupt (with nest,
// an interrupt runs from the machine's take to the RTI that restores the stack it found).
function player(m) {
  const S = { m };
  S.stopAt = (a, maxFrames = 3000) => {
    const prev = m.hooks[a], sps = [], take = m.take;
    let hit = false;
    m.take = function (v) { take.call(this, v); sps.push(this.cpu.sp); };
    const run = m.cpu.run;
    const executed = new Proxy({}, { set(t, k) {
      const cpu = m.cpu;
      while (sps.length && cpu.sp > sps[sps.length - 1]) sps.pop();
      if (sps.length && cpu.m[+k] === 0x40 && cpu.sp === sps[sps.length - 1]) sps.pop();
      return true;
    } });
    m.cpu.run = function (o) { return run.call(this, sps.length ? Object.assign({}, o, { executed }) : o); };
    m.hooks[a] = c => { if (sps.length) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
    try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
    finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; delete m.take; delete m.cpu.run; }
    if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
  };
  return S;
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { GAME, REPO, WORK, STATES, PASS, KEY, FRAME, LINE, LINES, Machine, boot, joystick, save, readState, restore, states, player, hex };
