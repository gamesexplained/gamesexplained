'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js), started
// at the game's first instruction ($4000) with the memory listing.json records, or from a moment of
// play saved in work/states (port/scripts/gen-states.js, never committed); scripted play to reach a
// moment; and the recorded games that drive it (the Solution tab's, solution-input.json).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine, KEY, FRAME, LINE, LINES } = require(path.join(REPO, 'kit/c64/machine.js'));

// A pass of the main program starts where the command loop tests the cursor against the icons:
// icon_poll ($4B6C), reached once a round of the current screen's icons, from icon_loop ($4B64)
// and from the two-step choices that wait for their second icon inside it.
const PASS = 0x4B6C;

// The game's memory as the listing records it.
function listingRam() {
  const L = JSON.parse(fs.readFileSync(path.join(GAME, 'listing.json'), 'utf8'));
  const ram = new Uint8Array(65536);
  for (const r of L.records) if (r.b) ram.set(r.b, r.a);
  return ram;
}
// The start copies the KERNAL's vectors from $FD30 into page 3 ($400F-$4016). The kit holds no ROM,
// and only the KERNAL's own routines use them, which the game calls only to load or save: the copy
// is stepped over, here as in the port.
const HOOKS = { 0x400F: c => { c.pc = 0x4018; return true; } };
function hook(m) { Object.assign(m.hooks, HOOKS); return m; }

// The game from its first instruction, as the tape's stub leaves it.
function boot(opts = {}) {
  return hook(new Machine(Object.assign({ ram: listingRam(), pc: 0x4000, passAt: PASS, dma: true }, opts)));
}

// A moment as it stands: the machine's state, saved where a pass starts.
function save(m, name) {
  const s = m.save();
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function restore(name, opts = {}) {
  const s = typeof name === 'string' ? readState(name) : name;
  return hook(Machine.restore(s, opts));
}
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// The Solution tab's game: its joystick a byte a frame (bits as the port's, 1 up, 2 down, 4 left,
// 8 right, 16 fire), F3 held over two frames to pick the joystick on the control menu.
function solution() {
  const rec = JSON.parse(fs.readFileSync(path.join(GAME, 'solution-input.json'), 'utf8'));
  return { joy: zlib.inflateRawSync(Buffer.from(rec.joy, 'base64')), f3: rec.f3, dma: rec.dma, frames: rec.frames };
}

// Scripted play on a machine: a stop at an address, and a routine called where the processor stands.
function player(m) {
  const S = { m };
  // run until the processor is at a outside an interrupt, and stop there
  S.stopAt = (a, maxFrames = 3000) => {
    const prev = m.hooks[a];
    let hit = false;
    m.hooks[a] = c => { if (m.depth) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
    try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
    finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
    if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
  };
  return S;
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { GAME, REPO, WORK, STATES, PASS, HOOKS, KEY, FRAME, LINE, LINES, Machine, listingRam, boot, hook, save, readState, restore, states, solution, player, hex };
