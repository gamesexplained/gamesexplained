'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js),
// started from the contributor's snapshots in work/ with the chips Machine.fromSnapshot leaves out
// (CIA 1, whose timer A runs the game's clock, CIA 2's port and colour RAM, read here from the
// snapshot's own modules); scripted play to reach a moment; and the moments saved in work/states
// (port/scripts/gen-states.js). Neither the snapshots nor the moments are ever committed.
//
// The snapshots are those orientation.md makes: work/entry.vsf (the loader's jump to $473B),
// work/menu.vsf (the language menu) and work/play.vsf (the first view of the Wilderness).
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine, KEY, FRAME, LINE, LINES } = require(path.join(REPO, 'kit/c64/machine.js'));

// The main loop's pass starts here: UPDATE_FRAME_INPUT_EVENTS's call ($47F0), which every pass
// reaches, the first after a new session through the JMP at $47EA and every later one after the
// redraw at $47ED.
const PASS = 0x47F0;

// The modules of an x64sc snapshot, by name: { at, size } of each body in buf.
function modules(buf) {
  let off = buf.toString('latin1', 37, 50) === 'VICE Version\x1a' ? 58 : 37;
  const mods = {};
  while (off + 22 <= buf.length) {
    const name = buf.toString('latin1', off, off + 16).replace(/\0+$/, ''), size = buf.readUInt32LE(off + 18);
    if (size < 22 || off + size > buf.length) break;
    mods[name] = { at: off + 22, size: size - 22 };
    off += size;
  }
  return mods;
}
// A CIA's state as VICE's ciacore saves it: the ports and directions, the timers' counts, the
// time of day, the serial register, the interrupt mask, the two control registers, the latches
// and the interrupt flags, in that order.
function readCia(buf, m) {
  const b = m.at, w = o => buf.readUInt16LE(b + o);
  return { pra: buf[b], prb: buf[b + 1], ddra: buf[b + 2], ddrb: buf[b + 3], cnt: [w(4), w(6)], mask: buf[b + 13],
    cr: [buf[b + 14] & 0xEF, buf[b + 15] & 0xEF], lat: [w(16), w(18)], icr: buf[b + 20] & 0x1F };
}
// The chips of a snapshot that Machine.fromSnapshot does not read. Colour RAM is the 1024 bytes at
// 761 into the VIC-IISC module, low nibbles (checked against kit/c64/frame.py's capture of
// play.vsf, work/frame.json).
function readChips(file) {
  const buf = fs.readFileSync(file), mods = modules(buf);
  const vic = mods['VIC-IISC'];
  return { cia1: readCia(buf, mods.CIA1), cia2: readCia(buf, mods.CIA2),
    colour: Uint8Array.from(buf.subarray(vic.at + 761, vic.at + 761 + 1024), v => v & 15) };
}

// The game's machine from a snapshot (entry, menu or play), its CIAs and colour RAM as the
// snapshot holds them, the video chip's fetches on, the passes counted at PASS.
function machine(name = 'play', opts = {}) {
  const file = path.join(WORK, name + '.vsf');
  const m = Machine.fromSnapshot(file, Object.assign({ cia: true, dma: true, passAt: PASS }, opts));
  const s = readChips(file);
  m.colour.set(s.colour);
  m.pra = s.cia1.pra; m.ddra = s.cia1.ddra; m.ddrb = s.cia1.ddrb;
  m.pra2 = s.cia2.pra; m.ddra2 = s.cia2.ddra;
  for (const [n, c] of [[0, s.cia1], [1, s.cia2]]) m.cia[n] = { lat: c.lat.slice(), cnt: c.cnt.slice(), cr: c.cr.slice(), mask: c.mask, icr: c.icr };
  m.lastCycles = m.cpu.cycles;
  m.hooks[0xFF90] = kernalSetmsg(m);
  return m;
}
// SETMSG, the one KERNAL routine the game calls outside a save or a load (ENGINE_INITIALIZE,
// $4742): the snapshots hold no ROMs, so it is served here as the KERNAL does it, A to $9D.
function kernalSetmsg(m) {
  return c => {
    if (!((c.pdata | ~c.pdir) & 2)) return false;
    m.ram[0x9D] = c.a; c.rts();
    return false;
  };
}

// A moment as it stands: the machine's state with the address its passes start at.
function save(m, name) {
  const s = m.save();
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function restore(name, opts = {}) {
  const s = typeof name === 'string' ? readState(name) : name;
  const m = Machine.restore(s, opts);
  m.hooks[0xFF90] = kernalSetmsg(m);
  return m;
}
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// Scripted play on a machine: frames, keys held for a while, a stop at an address.
function player(m) {
  const S = { m };
  S.run = (frames) => m.runFrames(frames);
  S.key = (k, hold = 60, after = 30) => { for (const x of [].concat(k)) m.press(x); m.runFrames(hold); for (const x of [].concat(k)) m.release(x); m.runFrames(after); };
  // run until the processor is at a outside an interrupt, and stop there
  S.stopAt = (a, maxFrames = 3000) => {
    const prev = m.hooks[a];
    let hit = false;
    m.hooks[a] = c => { if (m.depth) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
    try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
    finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
    if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
  };
  // a routine of the game's run where the processor stands (a pass's start), on the stack below
  // it, as the game's own code would call it; no interrupt comes while it runs
  S.call = (entry, regs = {}) => {
    const c = m.cpu, pc = c.pc, sp = c.sp;
    c.call(entry, Object.assign({ sp }, regs), { hooks: m.hooks, maxSteps: 5e7 });
    c.pc = pc; c.sp = sp;
    return { a: c.a, x: c.x, y: c.y, c: c.c };
  };
  return S;
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { GAME, REPO, WORK, STATES, PASS, KEY, FRAME, LINE, LINES, Machine, machine, readChips, save, readState, restore, states, player, hex };
