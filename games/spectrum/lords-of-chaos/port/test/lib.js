'use strict';
// The game's side of the port's tests: the 48K Spectrum (kit/spectrum/machine.js) started where the
// loader hands over ($E1ED), with the ROM read at run time from SkoolKit's own copy (never
// committed), a Kempston joystick on port $1F, and a cassette in place of the ROM's tape routines
// (LD-BYTES entered at $0562, SA-BYTES at $04C6) holding the game's own files from the second half
// of side one: DESIGNER., 1.GAM, 2.GAM and 3.GAM, each a header and a block, rebuilt from the
// listings. The moments of play the sessions saved are in work/states.
//   const lib = require('./lib.js');
//   const m = lib.boot();              // a machine at $E1ED with the tape in
//   lib.toScenario(m, 1);              // SELECT CONTROLS, LOAD SCENARIO 1, at its file panel
//   lib.toPlay(m, { players: 1 });     // PLAY GAME, into the first human turn
//   const m2 = lib.restore(lib.readState(lib.states()[0]));
const path = require('path'), fs = require('fs'), cp = require('child_process');
const GAME = path.join(__dirname, '..', '..');
const ROOT = path.join(GAME, '..', '..', '..');
const { Machine, KEY, loadSna } = require(path.join(ROOT, 'kit', 'spectrum', 'machine.js'));
const STATES = path.join(GAME, 'work', 'states');
// read_controls: every read of the controls is a checkpoint, and a pass starts at each
const PASS_AT = 0x622B;

// The 48K ROM: SkoolKit's copy, under tools/ or wherever pip put it (CI installs it so).
let ROMBYTES = null;
function rom() {
  if (ROMBYTES) return ROMBYTES;
  const tries = [];
  const lib = path.join(ROOT, 'tools', 'skoolkit', 'lib');
  if (fs.existsSync(lib)) for (const d of fs.readdirSync(lib)) tries.push(path.join(lib, d, 'site-packages', 'skoolkit', 'resources', '48.rom'));
  try {
    const dir = cp.execFileSync('python3', ['-c', 'import skoolkit, os; print(os.path.dirname(skoolkit.__file__))'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (dir) tries.push(path.join(dir, 'resources', '48.rom'));
  } catch (e) { /* no skoolkit in this python */ }
  for (const f of tries) if (fs.existsSync(f)) { ROMBYTES = new Uint8Array(fs.readFileSync(f)); break; }
  if (!ROMBYTES || ROMBYTES.length !== 0x4000) throw new Error('no 48K ROM: install SkoolKit (python3 kit/scripts/tools.py --platform spectrum get-skoolkit, or pip install skoolkit)');
  return ROMBYTES;
}

// The parts' bytes, from their listings.
const listingCache = {};
function listing(part) {
  if (!listingCache[part]) {
    const M = new Uint8Array(65536), have = new Uint8Array(65536);
    for (const r of JSON.parse(fs.readFileSync(path.join(GAME, 'parts', part, 'listing.json'), 'utf8')).records) {
      if (r.b) { M.set(r.b, r.a); have.fill(1, r.a, r.a + r.b.length); }
    }
    listingCache[part] = { M, have };
  }
  return listingCache[part];
}
// The memory at the hand-over: the engine and the designer as their listings hold them, with the
// key table at $CDD9 (a copy of the ROM's at $0205, SYMBOL SHIFT and ENTER made 0), which the
// listing leaves out as the ROM's.
function memory() {
  const M = new Uint8Array(65536);
  M.set(listing('engine').M.subarray(0x4000, 0xD003), 0x4000);
  M.set(listing('designer').M.subarray(0xD003, 0xE221), 0xD003);
  keyTable(M, rom());
  return M;
}
function keyTable(M, R) {
  M.set(R.subarray(0x0205, 0x022C), 0xCDD9);
  M[0xCDD9 + 24] = 0; M[0xCDD9 + 33] = 0;
}

// The cassette: blocks of { flag, bytes } and the place the tape has reached. load(flag, n) plays
// the next block: the ROM's LD-BYTES loads its bytes when its flag is the one asked for (as many as
// it has, up to n) and reports success when there were exactly n; a block with another flag fails
// at once. At the end of the tape there is nothing to load: null, and the ROM waits for an edge
// until SPACE breaks in. save(flag, bytes) records a block where the tape stands.
class Tape {
  constructor(blocks) { this.blocks = blocks.map(b => ({ flag: b.flag, bytes: Uint8Array.from(b.bytes) })); this.pos = 0; }
  load(flag, n) { return this.pos < this.blocks.length ? this.blocks[this.pos++] : null; }
  save(flag, bytes) { this.blocks.splice(this.pos++, 1, { flag, bytes: Uint8Array.from(bytes) }); return true; }
  rewind() { this.pos = 0; }
  save_() { return { pos: this.pos, blocks: this.blocks.map(b => ({ flag: b.flag, bytes: Buffer.from(b.bytes).toString('base64') })) }; }
  static from(s) { const t = new Tape(s.blocks.map(b => ({ flag: b.flag, bytes: Buffer.from(b.bytes, 'base64') }))); t.pos = s.pos; return t; }
}
const header = name => ({ flag: 0x64, bytes: Buffer.from(name.padEnd(12).slice(0, 12), 'latin1') });
// The game's files as side one holds them after the program: the designer's 3,653 bytes at $D3DC
// and each scenario's 12,285 at $D003.
function gameTape() {
  const blocks = [header('DESIGNER.'), { flag: 0xC8, bytes: listing('designer').M.slice(0xD3DC, 0xE221) }];
  for (const n of [1, 2, 3]) blocks.push(header(n + '       .GAM'), { flag: 0xC8, bytes: listing('scenario-' + n).M.slice(0xD003, 0x10000) });
  return new Tape(blocks);
}

// LD-BYTES and SA-BYTES as the game calls them (call_ld_bytes, call_sa_bytes: entered past their
// own set-up, the game's tape_check pushed as the return): IX the address, DE the length, the flag
// in A' (LD) or A (SA); carry set when it worked. A load at the end of the tape runs the ROM's own
// loop, which finds no edge and returns when SPACE is pressed. SPACE held breaks both off as the
// ROM does: SA-BYTES writes its leader and the flag byte and stops at its first look at the
// keyboard, leaving a block that holds only the flag; LD-BYTES returns at its first, having loaded
// nothing (the ROM's own code runs), and the tape stays where it stands.
const spaceHeld = m => !(m.portIn(0x7FFE) & 1);
function tapeHook(m, at) {
  const cpu = m.cpu, tape = m.tape;
  const ix = cpu.ix, de = cpu.d << 8 | cpu.e;
  let ok;
  if (at === 0x04C6) {
    if (spaceHeld(m)) { tape.save(cpu.a, new Uint8Array(0)); ok = false; }
    else {
      ok = tape.save(cpu.a, m.ram.slice(ix, ix + de));
      cpu.ix = (ix + de) & 0xFFFF; cpu.d = cpu.e = 0;
    }
  } else {
    if (spaceHeld(m)) return false;                             // the ROM breaks off
    if (tape.pos >= tape.blocks.length) return false;           // the ROM waits, for SPACE
    const flag = cpu.af_ >> 8, b = tape.load(flag, de);
    if (b.flag !== flag) ok = false;
    else {
      const k = Math.min(de, b.bytes.length);
      for (let i = 0; i < k; i++) m.ram[(ix + i) & 0xFFFF] = b.bytes[i];
      ok = b.bytes.length === de;
      cpu.ix = (ix + k) & 0xFFFF; const left = de - k; cpu.d = left >> 8; cpu.e = left & 255;
    }
  }
  cpu.f = ok ? cpu.f | 1 : cpu.f & ~1;
  m.ret();
}

// The Kempston interface: port $1F (A5 low) reads the stick, right, left, down, up and fire in
// bits 0 to 4, set when held.
const JOY = { RIGHT: 1, LEFT: 2, DOWN: 4, UP: 8, FIRE: 16 };
class LMachine extends Machine {
  constructor(o) {
    super(o);
    this.joy = 0;
    this.tape = o.tape || gameTape();
    for (const at of [0x0562, 0x04C6]) {
      const prev = this.hooks[at];
      if (prev && prev.tape) continue;              // a copy of a machine, with its hooks
      const h = m => { if (prev && prev(m) === true) return true; return tapeHook(m, at); };
      h.tape = true;
      this.hooks[at] = h;
    }
  }
  portIn(port) { return (port & 0x20) === 0 && (port & 1) ? this.joy : super.portIn(port); }
  save() { return Object.assign(super.save(), { joy: this.joy, tape: this.tape.save_() }); }
  static restore(s, o = {}) {
    const m = super.restore(s, Object.assign({}, o, { tape: s.tape ? Tape.from(s.tape) : undefined }));
    m.joy = s.joy || 0;
    return m;
  }
}
// Machine.restore passes only some options to the constructor: the tape is set after
const baseRestore = Machine.restore;
LMachine.restore = function (s, o = {}) {
  const m = baseRestore.call(this, s, o);
  if (s.tape) m.tape = Tape.from(s.tape);
  m.joy = s.joy || 0;
  return m;
};

// The machine at the hand-over: $E1ED, the stack at $5DA8, the interrupts off in IM 1
// (work/entry.sna's registers, which the game's first instructions do not read but for these).
function boot(opts = {}) {
  return new LMachine(Object.assign({ ram: memory(), regs: { pc: 0xE1ED, sp: 0x5DA8, i: 0x3F, im: 1, iff1: 0, iff2: 0, iy: 0x5C3A },
    passAt: PASS_AT, rom: rom() }, opts));
}
const restore = (s, o = {}) => LMachine.restore(s, Object.assign({ passAt: PASS_AT, rom: rom() }, o));

// Which part's code is at $D003 up: the designer (0) or scenario 1 to 3, by its first instruction
// ($D3DC is the designer's DI) and the scenario's table of things ($D032), which is in a place of
// its own in each. Not by the scenario's number ($D03F): ABANDON clears it and leaves the code.
let tables = null;
function partOf(M) {
  if (M[0xD3DC] === 0xF3 && M[0xE1ED] === 0xF3) return 0;
  if (!tables) {
    tables = new Map();
    for (const n of [1, 2, 3]) { const S = listing('scenario-' + n).M; tables.set(S[0xD032] | S[0xD033] << 8, n); }
  }
  return tables.get(M[0xD032] | M[0xD033] << 8) || M[0xD03F];
}

// Keys held for frames, then released for frames: [[keys, held, released], ...]
function keys(m, seq) {
  for (const [k, held, gap] of seq) {
    m.releaseAll();
    for (const x of [].concat(k)) m.press(x);
    m.runFrames(held || 10);
    m.releaseAll();
    m.runFrames(gap === undefined ? 20 : gap);
  }
}
// Into a scenario's file panel from the hand-over: SPACE at SELECT CONTROLS (the keyboard), A four
// times to LOAD SCENARIO, SPACE, the scenario's number and ENTER at FILE NAME:, then until the panel
// reads the controls.
function toScenario(m, n) {
  m.runFrames(120);
  keys(m, [['SPACE'], ['A'], ['A'], ['A'], ['A'], ['SPACE', 10, 40], [String(n)], ['ENTER', 10, 200]]);
  if (partOf(m.ram) !== n) throw new Error('toScenario: scenario ' + n + ' did not load');
  return m;
}
// PLAY GAME from the scenario's panel: SPACE, the number of players, then SPACE at the turn panel
// until the first human turn reads the controls at $61E6.
function toPlay(m, o = {}) {
  keys(m, [['SPACE', 10, 60]]);
  if (!m.ram[0xD048]) keys(m, [[String(o.players || 1), 10, 60]]);
  let at = false;
  const prev = m.hooks[0x61E6];
  m.hooks[0x61E6] = q => { at = true; return prev ? prev(q) : false; };
  try {
    for (let i = 0; i < 3000 && !at; i++) {
      m.releaseAll();
      if (i % 40 > 30) m.press('SPACE');
      m.runFrames(1);
    }
  } finally { if (prev) m.hooks[0x61E6] = prev; else delete m.hooks[0x61E6]; }
  m.releaseAll();
  if (!at) throw new Error('toPlay: no human turn');
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

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
}

module.exports = { rom, listing, memory, keyTable, Tape, gameTape, header, boot, restore, partOf, keys, toScenario, toPlay, JOY, LMachine,
  Machine, KEY, loadSna, ROOT, GAME, STATES, PASS_AT, states, readState, writeState, hex, makeRnd };
