'use strict';
// The game's side of the port's tests: the 48K Spectrum (kit/spectrum/machine.js) started from the
// listing's memory where the loader hands over ($97A4), with a Kempston joystick on port $1F; the
// moments of play the sessions saved in work/states; and the input that gets the game from the
// hand-over into play (the security question's answer, read from the game's own table, and the
// control options).
//   const lib = require('./lib.js');
//   const m = lib.boot();              // a machine at $97A4, passAt the main loop ($9807)
//   lib.toPlay(m);                     // the question answered, keyboard chosen, into play
//   const m2 = lib.restore(lib.readState(lib.states()[0]));
const path = require('path'), fs = require('fs');
const GAME = path.join(__dirname, '..', '..');
const ROOT = path.join(GAME, '..', '..', '..');
const { Machine, KEY, loadSna } = require(path.join(ROOT, 'kit', 'spectrum', 'machine.js'));
const STATES = path.join(GAME, 'work', 'states');
const PASS_AT = 0x9807;

// The ROM's bytes the game reads (rom-excerpt.json): the machine holds those and stops on a read of
// any other byte of the ROM.
const EXCERPT = JSON.parse(fs.readFileSync(path.join(GAME, 'rom-excerpt.json'), 'utf8'));
const ROM = Uint8Array.from(Buffer.from(EXCERPT.hex, 'hex'));
const ROM_RANGES = [[EXCERPT.from, EXCERPT.from + ROM.length]];
const romImage = () => { const r = new Uint8Array(0x4000); r.set(ROM, EXCERPT.from); return r; };

// The Kempston interface: port $1F (A5 low) reads the stick, right, left, down, up and fire in
// bits 0 to 4, set when held.
const JOY = { RIGHT: 1, LEFT: 2, DOWN: 4, UP: 8, FIRE: 16 };
class DMachine extends Machine {
  constructor(o) { super(o); this.joy = 0; }
  portIn(port) { return (port & 0x20) === 0 && (port & 1) ? this.joy : super.portIn(port); }
  save() { return Object.assign(super.save(), { joy: this.joy }); }
  static restore(s, o) { const m = super.restore(s, o); m.joy = s.joy || 0; return m; }
}

// The game's memory as the loader leaves it: the listing's bytes, or, before there is a listing,
// the hand-over snapshot in work/.
let cache = null;
function memory() {
  if (cache) return cache;
  const L = path.join(GAME, 'listing.json');
  const m = new Uint8Array(65536);
  if (fs.existsSync(L)) {
    for (const r of JSON.parse(fs.readFileSync(L, 'utf8')).records) if (r.b) m.set(r.b, r.a);
  } else {
    m.set(loadSna(path.join(GAME, 'work', 'entry.sna')).ram.subarray(0x4000), 0x4000);
  }
  return (cache = m);
}
// The machine at the hand-over: the program counter at $97A4, the stack at $5DAE, the interrupts
// off in IM 1 (work/entry.sna's registers; the game sets its own stack and IM 2 at once).
function boot(opts = {}) {
  return new DMachine(Object.assign({ ram: memory().slice(), regs: { pc: 0x97A4, sp: 0x5DAE, i: 0x3F, im: 1, iff1: 0, iff2: 0, iy: 0x5C3A },
    passAt: PASS_AT, rom: romImage(), romRanges: ROM_RANGES }, opts));
}

// The security question's answer: the page, line and word the question shows (the digits at
// $CB38, $CB52 and $CB6C) looked up in the game's table at $ABC1. Each record is a length, the page
// + $40, the line, the word + $20, then the letters, each stored as (letter x 2) with bit 7 clear
// and bit 6 as it comes, which ((b AND $BF) OR $80) / 2 undoes; a length of 0 ends the table.
function answer(M) {
  const num = a => +String.fromCharCode(M[a], M[a + 1]).trim();
  const [page, line, word] = [num(0xCB38), num(0xCB52), num(0xCB6C)];
  for (let a = 0xABC1; M[a]; a += M[a] + 4) {
    if (M[a + 1] - 0x40 !== page || M[a + 2] !== line || M[a + 3] - 0x20 !== word) continue;
    let w = '';
    for (let i = 0; i < M[a]; i++) w += String.fromCharCode(((M[a + 4 + i] & 0xBF) | 0x80) >> 1);
    return w;
  }
  throw new Error('answer: no word for page ' + page + ', line ' + line + ', word ' + word);
}

// Run a machine from the hand-over into play: wait for the question's prompt (the program counter
// at $CC7E, the loop that reads a key), type the answer in capitals, each letter held 6 frames and
// released 6, then Enter; at the control options, Enter (the keyboard); until the main loop's first
// pass is about to begin.
function toPlay(m, o = {}) {
  let prompt = false;
  const hooks = m.hooks || (m.hooks = {});
  const prev = hooks[0xCC7E];
  hooks[0xCC7E] = () => { prompt = true; };
  try {
    for (let i = 0; i < 2000 && !prompt; i++) m.runFrames(1);
    if (!prompt) throw new Error('toPlay: no security question');
  } finally { if (prev) hooks[0xCC7E] = prev; else delete hooks[0xCC7E]; }
  const word = o.word || answer(m.ram);
  const seq = [];
  for (const ch of word) seq.push([ch, 6], [null, 6]);
  seq.push(['ENTER', 6], [null, 60], ['ENTER', 10], [null, 2]);
  let hit = false;
  const prevPass = m.onPass;
  m.onPass = () => (hit = true);
  try {
    for (const [k, n] of seq) {
      m.releaseAll(); if (k) m.press(k);
      for (let i = 0; i < n && !hit; i++) m.runFrames(1);
      if (hit) break;
    }
    m.releaseAll();
    for (let i = 0; i < 600 && !hit; i++) m.runFrames(1);
  } finally { m.onPass = prevPass; }
  if (!hit) throw new Error('toPlay: the main loop was not reached');
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
const restore = (s, o = {}) => DMachine.restore(s, Object.assign({ passAt: PASS_AT, rom: romImage(), romRanges: ROM_RANGES }, o));

// The commands the page's pace is checked with (test/t-page.js) and fitted on as well
// (scripts/time-stretches.js, "plan:"), set as each pass begins: each held for four passes, walks,
// turns, looks up and down, the crosshair's moves and its keys. Held, a look up or down fills the
// view with faces, which random keys seldom do.
const PACE_PLAN = [['O'], ['W'], ['O'], ['P'], ['L'], ['Q'], ['K'], ['N'], ['M'], ['O']];
const pacePlan = n => PACE_PLAN[Math.floor(n / 4) % PACE_PLAN.length];

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
}

module.exports = { EXCERPT, ROM, ROM_RANGES, boot, memory, answer, toPlay, JOY, DMachine, Machine, KEY, ROOT, GAME, STATES, PASS_AT,
  states, readState, writeState, restore, hex, makeRnd, pacePlan };
