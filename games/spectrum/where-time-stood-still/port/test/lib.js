'use strict';
// The game's side of the port's tests: the 128K machine (kit/spectrum/machine.js, model 128) booted
// from the listings where the loader hands over ($8521), as test_maps.js and the others build the
// game's memory, with a Kempston joystick on port $1F; the moments of play the sessions saved in
// work/states; and the input they give.
//   const lib = require('./lib.js');
//   const m = lib.boot();              // a machine at $8521, passAt the main loop ($86A2)
//   lib.toPlay(m, 'kempston');         // through the control selection into play
//   const m2 = lib.restore(lib.readState(lib.states()[0]));
const path = require('path'), fs = require('fs');
const GAME = path.join(__dirname, '..', '..');
const ROOT = path.join(GAME, '..', '..', '..');
const { Machine, KEY } = require(path.join(ROOT, 'kit', 'spectrum', 'machine.js'));
const STATES = path.join(GAME, 'work', 'states');

// The ROM's bytes the game reads: area 14's packed grid runs on past $FFFF into ROM 0
// (rom-excerpt.json). The machine holds those and stops on a read of any other byte of the ROM.
const EXCERPT = JSON.parse(fs.readFileSync(path.join(GAME, 'rom-excerpt.json'), 'utf8'));
const ROM0 = Uint8Array.from(Buffer.from(EXCERPT.hex, 'hex'));
const ROM_RANGES = [[EXCERPT.from, EXCERPT.from + ROM0.length]];
const romImage = () => { const r = new Uint8Array(0x8000); r.set(ROM0, EXCERPT.from); return r; };

// The Kempston interface: port $1F (A5 low) reads the stick, right, left, down, up and fire in
// bits 0 to 4, set when held.
const JOY = { RIGHT: 1, LEFT: 2, DOWN: 4, UP: 8, FIRE: 16 };
class WMachine extends Machine {
  constructor(o) { super(o); this.joy = 0; }
  portIn(port) { return (port & 0x20) === 0 && (port & 1) ? this.joy : super.portIn(port); }
  save() { return Object.assign(super.save(), { joy: this.joy }); }
  static restore(s, o) { const m = super.restore(s, o); m.joy = s.joy || 0; return m; }
}

const PARTS = { 1: 'bank-01', 3: 'bank-03', 4: 'bank-04', 6: 'bank-06', 7: 'bank-07' };
let cache = null;
function memory() {
  if (cache) return cache;
  const read = p => {
    const L = JSON.parse(fs.readFileSync(path.join(GAME, 'parts', p, 'listing.json'), 'utf8'));
    const m = new Uint8Array(65536);
    for (const r of L.records) if (r.b) m.set(r.b, r.a);
    return m;
  };
  const ram = read('main');
  const banks = [];
  for (let n = 0; n < 8; n++) banks.push(new Uint8Array(0x4000));
  banks[0].set(ram.subarray(0xC000)); banks[5].set(ram.subarray(0x4000, 0x8000)); banks[2].set(ram.subarray(0x8000, 0xC000));
  for (const [n, p] of Object.entries(PARTS)) banks[n].set(read(p).subarray(0xC000));
  return (cache = { ram, banks });
}
// The machine as the loader leaves it: bank 0 paged in with the 48K ROM ($7FFD = $10), the
// interrupts on in IM 1, the stack at $5FFF (work/entry.sna's registers; the game sets its own
// before it enables the interrupts again).
function boot(opts = {}) {
  const { ram, banks } = memory();
  return new WMachine(Object.assign({ ram: ram.slice(), banks, model: 128, paging: 0x10, rom: romImage(), romRanges: ROM_RANGES,
    regs: { pc: 0x8521, sp: 0x5FFF, i: 0x3F, im: 1, iff1: 1, iff2: 1 }, passAt: 0x86A2 }, opts));
}

// The control selection's keys for each input routine: the option's key, then 0 to pick it and Y
// to confirm. Option 1, the keyboard, also asks for five keys (title.keys). Each is a list of
// [key or null, frames held].
const TITLE = {
  kempston: [['2', 4], [null, 4], ['0', 4], [null, 4], ['Y', 4], [null, 2]],
  sinclair: [['3', 4], [null, 4], ['0', 4], [null, 4], ['Y', 4], [null, 2]],
  cursor: [['4', 4], [null, 4], ['0', 4], [null, 4], ['Y', 4], [null, 2]],
  keys: [['1', 4], [null, 4], ['0', 4], [null, 4], ['Y', 4], [null, 8], ['O', 4], [null, 8], ['P', 4], [null, 8], ['Q', 4],
    [null, 8], ['A', 4], [null, 8], ['M', 4], [null, 40], ['Y', 4], [null, 2]],
};
// The title's input as a function of the frame, for a lockstep's onFrame: from frame `from` on
// (the title is up by frame 30).
function titleInput(choice = 'kempston', from = 30) {
  const seq = TITLE[choice];
  return (f, m) => {
    let t = from;
    for (const [k, n] of seq) {
      if (f < t + n) { m.releaseAll(); if (k) m.press(k); return; }
      t += n;
    }
    if (f === t) m.releaseAll();
  };
}
// Run a machine from boot into play: the title's keys, until the main loop's first pass is about to
// begin (the program counter at passAt).
function toPlay(m, choice = 'kempston') {
  const input = titleInput(choice), prev = m.onPass;
  let hit = false;
  m.onPass = () => (hit = true);
  try { for (let i = 0; i < 600 && !hit; i++) { input(m.frames, m); m.runFrames(1); } } finally { m.onPass = prev; }
  if (!hit) throw new Error('toPlay: the main loop was not reached');
  m.releaseAll();
  return m;
}

function states(filter = '') {
  if (!fs.existsSync(STATES)) return [];
  return fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort();
}
const readState = f => JSON.parse(fs.readFileSync(path.join(STATES, f), 'utf8'));
function writeState(name, m, extra = {}) {
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(Object.assign(m.save(), extra)));
}
const restore = (s, o = {}) => WMachine.restore(s, Object.assign({ passAt: 0x86A2, rom: romImage(), romRanges: ROM_RANGES }, o));

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
}

module.exports = { boot, memory, EXCERPT, ROM0, toPlay, titleInput, TITLE, JOY, WMachine, Machine, KEY, ROOT, GAME, STATES,
  states, readState, writeState, restore, hex, makeRnd };
