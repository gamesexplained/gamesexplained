'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js) with
// what the kit's C64 leaves out and Alter Ego reaches: the KERNAL routines it calls and the
// KERNAL's interrupt (port/src/kernal.js, the same model the port runs on), the KERNAL's interrupt
// entry at $FF48 that the game's own bridge at $414A jumps to, and a disk drive holding the six
// disks' files (work/files, written there by kit/c64/disk.py extract). The snapshots are the
// contributor's, in work/ and parts/*/work/, and are never committed.
//
// The game's fast loader runs as itself up to the transfer: the command that asks the drive for a
// record (M-E $0300 with the record's number) goes over the bus model, and the 256 bytes the drive
// code then clocks over CIA 2 ($5DEE-$5E36) come from AEKernal.fastRecord, put in the buffer at
// once. That loop is the drive's other half and its timing, which the kit's C64 does not model.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const FILES = path.join(GAME, 'work/files');
const { Machine, KEY, FRAME, LINE, LINES } = require(path.join(REPO, 'kit/c64/machine.js'));
require(path.join(GAME, 'port/src/kernal.js'));
const AEKernal = globalThis.AEKernal;

// The disks' files by name, as the drive holds them: work/files/s<side>-<NAME>
let FILESET = null;
function files() {
  if (!FILESET) {
    FILESET = {};
    for (const f of fs.readdirSync(FILES)) {
      const m = /^s\d-(.+)$/.exec(f);
      if (m) FILESET[m[1]] = new Uint8Array(fs.readFileSync(path.join(FILES, f)));
    }
  }
  return FILESET;
}
const newDrive = () => AEKernal.drive({ files: files() });

// The KERNAL banked in at $E000 (the processor port's HIRAM, as the CPU maps it)
const kernalIn = c => c.rk[0xFF] !== c.rk[0x02];
// k for the KERNAL model: memory through the processor's map, and the drive
const kOf = c => ({ rd: a => c.rd(a & 0xFFFF), wr: (a, v) => c.wr(a & 0xFFFF, v & 255), drive: c.drive });

// The hooks a processor running the game needs: the KERNAL's routines, and the fast transfer.
// Each acts on the cpu it is given and the drive on it (c.drive), so that a copy of a machine
// runs on its own.
function cpuHooks() {
  const h = {};
  for (const [a, name] of Object.entries(AEKernal.ENTRY)) {
    h[a] = c => {
      if (!kernalIn(c)) return false;
      const r = AEKernal.K[name](kOf(c), { a: c.a, x: c.x, y: c.y, c: c.c });
      c.a = r.a & 255; c.x = r.x & 255; c.y = r.y & 255; c.c = r.c ? 1 : 0;
      c.z = c.a === 0 ? 1 : 0; c.n = c.a >> 7;
      c.rts();
      return false;
    };
  }
  // the transfer loop: Y counts 256 bytes into $8045, X holds $17 at the end
  h[0x5DEE] = c => {
    c.m.set(AEKernal.fastRecord(c.drive, c.m[0x7E93]), 0x8045);
    c.x = 0x17; c.y = 0; c.z = 1; c.pc = 0x5E37;
    return false;
  };
  return h;
}

// The machine: Machine with those hooks, the KERNAL's interrupt entry and exits, and a drive
// that save() and restore() carry.
class AEMachine extends Machine {
  install() {
    Object.assign(this.hooks, cpuHooks());
    const m = this;
    // $FF48: PHA TXA PHA TYA PHA TSX LDA $0104,X AND #$10 BEQ, then JMP ($0316) for a BRK or
    // ($0314), reached from the game's bridge at $414A with the KERNAL banked in
    this.hooks[0xFF48] = c => {
      if (!kernalIn(c)) return false;
      c.push(c.a); c.push(c.x); c.push(c.y);
      c.x = c.sp;
      const brk = c.m[0x0104 + c.x] & 0x10;
      c.a = brk; c.z = brk ? 0 : 1; c.n = 0;
      c.cycles += 29;
      c.pc = c.word(brk ? 0x0316 : 0x0314);
      return false;
    };
    // $FE43: SEI, JMP ($0318)
    this.hooks[0xFE43] = c => { if (!kernalIn(c)) return false; c.i = 1; c.cycles += 7; c.pc = c.word(0x0318); return false; };
    // $EA31, the KERNAL's interrupt: the model's clock, cassette switch and keyboard scan, then
    // its exit; $EA81 and $FEBC, the exit alone
    this.hooks[0xEA31] = c => { if (!kernalIn(c)) return false; AEKernal.irq(kOf(c)); m.leave(); return false; };
    this.hooks[0xEA81] = c => { if (!kernalIn(c)) return false; m.leave(); return false; };
    this.hooks[0xFEBC] = c => { if (!kernalIn(c)) return false; m.leave(); return false; };
    return this;
  }
  save() { const s = super.save(); s.drive = AEKernal.copyDrive(this.cpu.drive); return s; }
  static restore(s, opts = {}) {
    const m = Machine.restore(s, opts);
    Object.setPrototypeOf(m, AEMachine.prototype);
    m.cpu.drive = s.drive.files ? AEKernal.copyDrive(s.drive) : AEKernal.driveFromState(s.drive, files());
    return m.install();
  }
  static fromSnapshot(file, opts = {}) {
    const m = Machine.fromSnapshot(file, Object.assign({ cia: true, dma: true }, opts));
    Object.setPrototypeOf(m, AEMachine.prototype);
    const s = readChips(file);
    m.colour.set(s.colour);
    m.pra = s.cia1.pra; m.ddra = s.cia1.ddra; m.ddrb = s.cia1.ddrb;
    m.pra2 = s.cia2.pra; m.ddra2 = s.cia2.ddra;
    for (const [n, c] of [[0, s.cia1], [1, s.cia2]]) m.cia[n] = { lat: c.lat.slice(), cnt: c.cnt.slice(), cr: c.cr.slice(), mask: c.mask, icr: c.icr };
    m.lastCycles = m.cpu.cycles;
    m.cpu.drive = opts.drive || newDrive();
    return m.install();
  }
}

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
// A CIA's state as VICE's ciacore saves it: ports and directions, the timers' counts, the time of
// day, the serial register, the mask, the control registers, the latches and the flags.
function readCia(buf, m) {
  const b = m.at, w = o => buf.readUInt16LE(b + o);
  return { pra: buf[b], prb: buf[b + 1], ddra: buf[b + 2], ddrb: buf[b + 3], cnt: [w(4), w(6)], mask: buf[b + 13],
    cr: [buf[b + 14] & 0xEF, buf[b + 15] & 0xEF], lat: [w(16), w(18)], icr: buf[b + 20] & 0x1F };
}
// The chips of a snapshot that Machine.fromSnapshot does not read: the CIAs, and colour RAM (the
// 1024 bytes at 761 into the VIC-IISC module, low nibbles).
function readChips(file) {
  const buf = fs.readFileSync(file), mods = modules(buf);
  const vic = mods['VIC-IISC'];
  return { cia1: readCia(buf, mods.CIA1), cia2: readCia(buf, mods.CIA2),
    colour: Uint8Array.from(buf.subarray(vic.at + 761, vic.at + 761 + 1024), v => v & 15) };
}

// The character ROM (901225-01), from the kit's emulator folder: the game copies glyphs from it
// ($46A1, $475D). Never committed; the page carries the glyphs the game reads (port/src/glyphs.js).
const CHARGEN = path.join(REPO, 'tools/vice-mcp/share/vice/C64/chargen-901225-01.bin');
const charRom = () => (fs.existsSync(CHARGEN) ? new Uint8Array(fs.readFileSync(CHARGEN)) : null);

// A machine from a snapshot under the game's folder (parts/main/work/entry.vsf, work/ae-menu.vsf)
function machine(name, opts = {}) {
  const file = path.isAbsolute(name) ? name : path.join(GAME, name);
  const rom = charRom();
  return AEMachine.fromSnapshot(file, Object.assign(rom ? { rom: { char: rom } } : {}, opts));
}

// A moment saved as JSON in work/states, the drive with it
const STATES = path.join(GAME, 'work/states');
function save(m, name) {
  const s = super_save(m);
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function super_save(m) {
  const s = Machine.prototype.save.call(m);
  s.drive = AEKernal.driveState(m.cpu.drive);
  return s;
}
function restore(name, opts = {}) {
  const s = typeof name === 'string' ? JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')) : name;
  return AEMachine.restore(s, opts);
}
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// Scripted play: frames, keys held a while, a stop at an address outside the interrupts
function player(m) {
  const S = { m };
  S.run = frames => m.runFrames(frames);
  S.key = (k, hold = 6, after = 20) => { for (const x of [].concat(k)) m.press(x); m.runFrames(hold); for (const x of [].concat(k)) m.release(x); m.runFrames(after); };
  S.type = (text, hold = 4, after = 8) => {
    for (const ch of text) {
      const up = ch.toUpperCase();
      const k = ch === ' ' ? KEY.SPACE : ch === '\r' ? KEY.RETURN : KEY[up];
      if (k === undefined) throw new Error('type: no key for ' + JSON.stringify(ch));
      S.key(k, hold, after);
    }
  };
  S.stopAt = (a, maxFrames = 3000) => {
    const prev = m.hooks[a];
    let hit = false;
    m.hooks[a] = c => { if (m.depth) return prev ? prev(c) : false; if (prev && prev(c)) return true; hit = true; m.stopFlag = true; return true; };
    try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
    finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
    if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
  };
  return S;
}

module.exports = { GAME, REPO, charRom, AEMachine, machine, files, newDrive, cpuHooks, kernalIn, kOf, readChips, save, restore, states, player, KEY, FRAME, LINE, LINES };
