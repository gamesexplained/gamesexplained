'use strict';
// An NES around the kit's 6502 simulator (kit/cpu/cpu6502.js), for checking a port of a whole game
// against the game's own code, frame by frame: the game runs here from its own memory while the
// port runs beside it, and the two are compared (kit/skills/core/70-minisite, "Play";
// kit/nes/lockstep.js runs the pair). What is modelled is what an NROM game touches
// (kit/skills/nes/nes-reference):
// - the 2 KB of RAM and its three mirrors, and the cartridge's PRG ROM at $8000-$FFFF, which a
//   store never changes (mapper 0 has no registers); a 16 KB ROM at $C000 is seen at $8000 too;
// - the PPU's registers at $2000-$2007 and their mirrors to $3FFF, the sprite DMA at $4014, the
//   sprite table and the PPU's memory with the cartridge's mirroring, as site/lib/nes.js's
//   NES.ppu models them (the same model a page runs its port on);
// - the beam: 262 lines of 341 dots, three dots a CPU cycle; the vertical blank flag set at line
//   241 dot 1 and cleared at line 261 dot 1, and the NMI through the vector at $FFFA when PPUCTRL's
//   bit 7 is set, taken after the instruction that was running, or after the store when the game
//   sets bit 7 while the flag is up (and still taken if it clears bit 7 again before: the
//   processor latches the edge); the odd frame a dot short while rendering is on. The sprite DMA
//   holds the processor 513 cycles, 514 from an odd cycle. What the PPU draws is not modelled
//   (a page draws with NES.frame): the sprite 0 hit and the overflow flag read as 0;
// - the two controllers at $4016 and $4017: the strobe, eight reads of bit 0 in the order A, B,
//   Select, Start, Up, Down, Left, Right, then 1s, with $40 in the open bits as the data bus
//   leaves it;
// - the APU as a record: the last value written to each of $4000-$4017 (apuw) and, when apuLog is
//   an array, every write as [cycle, register, value]. The channels are not modelled, and $4015
//   reads 0. An unmapped address reads its high byte (open bus).
// Not modelled: the IRQ (the APU's frame interrupt and the DMC are never enabled here), the PPU's
// start-up ignoring its registers, the exact dot of a read of $2002 against the flag.
//
// const { Machine, BUTTON, loadListing } = require('kit/nes/machine.js');
// const m = new Machine({ ram: loadListing('games/nes/<slug>/listing.json'), chr, pc: 0xC000, passAt: 0xF46F });
// const m = Machine.fromSnapshot('games/nes/<slug>/work/<state>.json.gz');   // the kit's jsnes snapshot
// - ram: the 64 KB (a Uint8Array(65536), used in place): the game's RAM at $0000-$07FF and its ROM
//   at $8000-$FFFF. loadListing rebuilds it from a listing.json's records.
// - chr: the 8 KB of CHR ROM (the PPU's pattern tables), or none: the game's code rarely reads
//   them through $2007; mirroring: 'horizontal' (the default), 'vertical', 'four'.
// - pc: where to start (the reset vector, usually). The interrupt flag starts set.
// - passAt: an address the main loop reaches once a pass (a wait for the frame's exit). Each time
//   the processor reaches it, passes counts one and onPass(machine) runs, the place to set the
//   next pass's input; onPass returning true stops the run with the program counter there, before
//   the pass (runUntilPass).
// - Machine.fromSnapshot(file, opts): the machine as the kit's server saved it (tool-jsnes,
//   "Snapshots"): the RAM, the ROM as mapped, the registers, the PPU's memory, registers and
//   sprite table, and the buttons held. The server stops a run of frames after the instruction in
//   which the vertical blank began, so the machine starts at line 241 with the flag up and the
//   NMI due, which is where runFrames stops too.
// - runCycles(n), runFrames(n), runPasses(n), runUntilPass(f): run with the NMI. frames counts
//   each vertical blank's start, and runFrames(n) stops after the instruction in which the n-th
//   began, as the server's frames does, so the two machines can be compared there.
// - pads, the two controllers' buttons as bit masks (BUTTON: a 1, b 2, select 4, start 8, up 16,
//   down 32, left 64, right 128); press(name, controller), release(name, controller),
//   releaseAll(): read whenever the game strobes.
// - line, the beam's line (0 to 261), and dot, its dot in the frame; now, the processor's cycle.
// - save() and Machine.restore(state): the whole machine as JSON, for tests that start from a
//   moment of play. A state holds the game's memory: it stays in the game's gitignored work/.
// - ioRead and ioWrite may be wrapped by a test to watch the chips (kit/nes/lockstep.js does):
//   they see every access in order, with cpu.cycles as the time. The lockstep also calls them on a
//   second Machine that never runs, as a port's chips, so they use nothing but the chip state.
// Checked by kit/nes/test_machine.js on a program of its own, and against jsnes by
// kit/nes/check_machine.js, which needs the kit's server and a game.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { CPU } = require('../cpu/cpu6502.js');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'nes.js'));
const NES = globalThis.NES;

function loadListing(file) {
  const L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ram = new Uint8Array(65536);
  for (const r of L.records) if (r.b) for (let i = 0; i < r.b.length; i++) ram[r.a + i] = r.b[i];
  return ram;
}

const BUTTON = { a: 1, b: 2, select: 4, start: 8, up: 16, down: 32, left: 64, right: 128 };
const DOTS = 341, LINES = 262, FRAME_DOTS = DOTS * LINES;          // 89,342 dots, 29,780.67 cycles
const LINE = DOTS / 3;                                              // 113.67 cycles
const VBL_SET = 241 * DOTS + 1, VBL_CLEAR = 261 * DOTS + 1;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const MAP = { ioPages: [...range(0x08, 0x3F), 0x40], romPages: range(0x80, 0xFF) };

class Machine {
  constructor(opts = {}) {
    if (!opts.ram) throw new Error('Machine: no ram (loadListing gives it from a listing.json)');
    this.ram = opts.ram;
    if (opts.mirrorPrg !== false) {                   // a 16 KB ROM at $C000 is seen at $8000 too
      let any = false;
      for (let a = 0x8000; a < 0xC000 && !any; a++) any = this.ram[a] !== 0;
      if (!any) this.ram.copyWithin(0x8000, 0xC000, 0x10000);
    }
    this.passAt = opts.passAt === undefined ? null : opts.passAt;
    this.ppu = NES.ppu({ chr: opts.chr, mirroring: opts.mirroring || 'horizontal' });
    this.apuw = new Uint8Array(0x18);
    this.apuLog = null;
    this.pads = [0, 0];
    this.strobe = 0; this.shift = [0, 0];
    this.frames = 0; this.nmis = 0; this.passes = 0;
    this.onPass = null;
    this.hooks = {};
    this.nmiDue = false;
    this.skipOnce = false;
    const self = this;
    this.cpu = new CPU(this.ram, { io: { read: a => self.ioRead(a), write: (a, v) => self.ioWrite(a, v) }, ...MAP });
    this.cpu.pc = opts.pc === undefined ? (this.ram[0xFFFC] | (this.ram[0xFFFD] << 8)) : opts.pc;
    this.cpu.i = 1;
    // the beam: the dot the frame began at (the processor's cycles are three dots each, less the
    // dots odd frames skip), whether this frame is odd, and the events still to come in it
    this.dot0 = 0; this.skipped = 0; this.odd = false; this.phase = 0;   // phase: 0 before the flag's set, 1 before its clear, 2 before the frame's end
    if (this.passAt !== null) this.hooks[this.passAt] = () => {
      if (self.skipOnce) { self.skipOnce = false; return false; }
      self.passes++;
      if (self.onPass && self.onPass(self) === true) { self.skipOnce = true; self.stopFlag = true; return true; }
      return false;
    };
  }
  static fromSnapshot(file, opts = {}) {
    let raw = fs.readFileSync(file);
    if (raw[0] === 0x1F && raw[1] === 0x8B) raw = zlib.gunzipSync(raw);
    const snap = JSON.parse(raw.toString('utf8'));
    if (snap.format !== 'kit-nes-snapshot') throw new Error(file + ': not a kit NES snapshot (the server\'s save)');
    const st = snap.state, c = st.cpu, p = st.ppu, kit = snap.kit || {};
    const ram = Uint8Array.from(c.mem);
    ram.fill(0, 0x0800, 0x8000);
    const cart = kit.cartridge || {};
    const mirroring = cart.mirroring === 'vertical' ? 'vertical' : cart.mirroring === 'four' ? 'four' : 'horizontal';
    const m = new Machine(Object.assign({}, opts, { ram, chr: Uint8Array.from(p.vramMem.slice(0, 0x2000)), mirroring, pc: (c.REG_PC + 1) & 0xFFFF }));
    const cpu = m.cpu;
    cpu.a = c.REG_ACC; cpu.x = c.REG_X; cpu.y = c.REG_Y; cpu.sp = c.REG_SP & 0xFF;
    cpu.p = (c.F_CARRY | ((c.F_ZERO === 0 ? 1 : 0) << 1) | (c.F_INTERRUPT << 2) | (c.F_DECIMAL << 3) | (c.F_OVERFLOW << 6) | (c.F_SIGN << 7)) & 0xFF;
    cpu.cycles = c._cpuCycleBase || 0;
    const q = m.ppu, vram = p.vramMem, table = p.vramMirrorTable;
    for (let a = 0x2000; a < 0x3000; a++) q.poke(a, vram[table[a]] & 0xFF);
    for (let a = 0x3F00; a < 0x3F20; a++) q.poke(a, vram[table[a]] & 0xFF);
    q.oam.set(p.spriteMem);
    q.ctrl = (p.f_nmiOnVblank << 7) | (p.f_spriteSize << 5) | (p.f_bgPatternTable << 4) | (p.f_spPatternTable << 3) | (p.f_addrInc << 2) | (p.regV << 1) | p.regH;
    q.mask = (p.f_color << 5) | (p.f_spVisibility << 4) | (p.f_bgVisibility << 3) | (p.f_spClipping << 2) | (p.f_bgClipping << 1) | p.f_dispType;
    q.t = p.regHT | (p.regVT << 5) | (p.regH << 10) | (p.regV << 11) | (p.regFV << 12);
    q.x = p.regFH; q.v = p.vramAddress & 0x7FFF; q.w = p.firstWrite ? 0 : 1; q.buffer = p.vramBufferedReadValue & 0xFF; q.oamAddr = p.sramAddress & 0xFF;
    const status = c.mem[0x2002] & 0xFF;
    q.vblank = (status >> 7) & 1; q.hit = (status >> 6) & 1; q.overflow = (status >> 5) & 1;
    // the server stops after the instruction in which the vertical blank began: line 241, the
    // flag up, the NMI due
    m.dot0 = cpu.cycles * 3 - VBL_SET; m.skipped = 0; m.phase = 1; m.odd = !!((kit.frames || 0) & 1);
    m.frames = kit.frames || 0;
    m.nmiDue = !!q.nmi();
    if (kit.held) for (const n of ['1', '2']) for (const b of kit.held[n] || []) m.press(b, +n - 1);
    return m;
  }
  get dot() { return this.cpu.cycles * 3 - this.skipped - this.dot0; }
  get line() { return Math.min(LINES - 1, Math.floor(this.dot / DOTS)); }
  get now() { return this.cpu.cycles; }
  rendering() { return (this.ppu.mask & 0x18) !== 0; }
  frameLength() { return FRAME_DOTS - (this.odd && this.rendering() ? 1 : 0); }

  ioRead(a) {
    if (a < 0x2000) return this.ram[a & 0x7FF];
    if (a < 0x4000) return this.ppu.read(a & 7);
    if (a === 0x4016 || a === 0x4017) {
      const n = a & 1;
      let bit;
      if (this.strobe) bit = this.pads[n] & 1;
      else if (this.shift[n] < 8) bit = (this.pads[n] >> this.shift[n]++) & 1;
      else bit = 1;
      return 0x40 | bit;
    }
    if (a === 0x4015) return 0;
    return (a >> 8) & 0xFF;
  }
  ioWrite(a, v) {
    if (a < 0x2000) { this.ram[a & 0x7FF] = v; return; }
    if (a < 0x4000) {
      const r = a & 7;
      if (r === 0) {
        const was = this.ppu.ctrl;
        this.ppu.write(0, v, this.cpu.cycles);
        if ((v & 0x80) && !(was & 0x80) && this.ppu.vblank) this.armNmi();        // the edge, with the flag up
      } else this.ppu.write(r, v, this.cpu.cycles);
      return;
    }
    if (a === 0x4014) {
      const page = (v & 0xFF) << 8;
      this.ppu.dma(page < 0x2000 ? this.ram.subarray(page & 0x7FF, (page & 0x7FF) + 256) : this.ram.subarray(page, page + 256));
      this.cpu.cycles += 513 + (this.cpu.cycles & 1);
      return;
    }
    if (a === 0x4016) {
      const was = this.strobe;
      this.strobe = v & 1;
      if (was && !this.strobe) this.shift = [0, 0];
      return;
    }
    if (a < 0x4018) { this.apuw[a & 0x1F] = v; if (this.apuLog) this.apuLog.push([this.cpu.cycles, a, v]); }
    // $4018-$5FFF and the ROM: nothing to write
  }

  // An NMI raised by a store: taken after the instruction now running, as the processor's edge
  // detector takes it, whatever the game writes to PPUCTRL after. The store has fetched its
  // operands, so cpu.pc is the next instruction: a hook there stops the run, and tick takes it.
  armNmi() {
    const cpu = this.cpu, pc = cpu.pc, hooks = this.hooks, prev = hooks[pc];
    this.nmiDue = true;
    hooks[pc] = c => { if (prev) hooks[pc] = prev; else delete hooks[pc]; if (prev) prev(c); return true; };
  }
  // Run for n cycles, the NMI included. False when onPass stopped the run.
  runCycles(n) {
    const cpu = this.cpu, end = cpu.cycles + n;
    while (cpu.cycles < end) {
      this.takeNmi();                                 // one left due by a stop at the vertical blank's start
      const d = this.dot, next = this.phase === 0 ? VBL_SET : this.phase === 1 ? VBL_CLEAR : this.frameLength();
      const lineEnd = (Math.floor(d / DOTS) + 1) * DOTS;
      const to = Math.min(next, lineEnd);
      const step = Math.max(1, Math.ceil((to - d) / 3));
      cpu.run({ cycles: step, hooks: this.hooks });
      if (this.stopFlag) { this.stopFlag = false; return false; }
      this.tick();
    }
    return true;
  }
  // The beam's events the processor has passed, in order, and then the NMI they raise.
  tick() { this.events(); this.takeNmi(); }
  takeNmi() { if (this.nmiDue) { this.nmiDue = false; this.nmis++; this.cpu.nmi(null, { hooks: this.hooks }); } }
  events() {
    for (;;) {
      const d = this.dot;
      if (this.phase === 0) {
        if (d < VBL_SET) break;
        this.phase = 1; this.ppu.vblank = 1; this.frames++;
        if (this.ppu.ctrl & 0x80) this.nmiDue = true;
      } else if (this.phase === 1) {
        if (d < VBL_CLEAR) break;
        this.phase = 2; this.ppu.vblank = 0; this.ppu.hit = 0; this.ppu.overflow = 0;
      } else {
        const len = this.frameLength();
        if (d < len) break;
        this.phase = 0; this.dot0 += len; this.skipped += FRAME_DOTS - len; this.odd = !this.odd;
      }
    }
  }
  // Run until f(machine) is true at a main-loop pass: stops with the program counter at passAt,
  // before the pass (its input already set by any onPass). False at the frame limit.
  runUntilPass(f, maxFrames = 100000) {
    if (this.passAt === null) throw new Error('Machine: runUntilPass needs passAt');
    let hit = false;
    const prev = this.onPass;
    this.onPass = m => { if (prev) prev(m); if (f(m)) { hit = true; return true; } return false; };
    const end = this.frames + maxFrames;
    while (!hit && this.frames < end) this.runCycles(Math.round(LINE));
    this.onPass = prev;
    return hit;
  }
  runPasses(n, maxFrames = 100000) { const target = this.passes + n; return this.runUntilPass(m => m.passes >= target, maxFrames); }
  // Run until the n-th vertical blank from now has begun, stopping after the instruction it began
  // in, with the NMI still to take: where the server's frames stops.
  runFrames(n) {
    const target = this.frames + n, cpu = this.cpu;
    while (this.frames < target) {
      this.takeNmi();
      const d = this.dot, next = this.phase === 0 ? VBL_SET : this.phase === 1 ? VBL_CLEAR : this.frameLength();
      cpu.run({ cycles: Math.max(1, Math.ceil((next - d) / 3)), hooks: this.hooks });
      if (this.stopFlag) { this.stopFlag = false; return false; }
      this.events();
    }
    return true;
  }
  press(k, n = 0) { this.pads[n] |= typeof k === 'string' ? BUTTON[k] : k; }
  release(k, n = 0) { this.pads[n] &= ~(typeof k === 'string' ? BUTTON[k] : k); }
  releaseAll() { this.pads = [0, 0]; }
  save() {
    const c = this.cpu;
    return { ram: Buffer.from(this.ram).toString('base64'), chr: Buffer.from(this.ppu.chr).toString('base64'), mirroring: this.ppu.mirroring,
      ppu: this.ppu.save(), apuw: Array.from(this.apuw), pads: this.pads.slice(), strobe: this.strobe, shift: this.shift.slice(),
      cpu: { a: c.a, x: c.x, y: c.y, sp: c.sp, pc: c.pc, p: c.p, cycles: c.cycles },
      dot0: this.dot0, skipped: this.skipped, odd: this.odd, phase: this.phase, nmiDue: this.nmiDue,
      frames: this.frames, nmis: this.nmis, passes: this.passes, passAt: this.passAt, skipOnce: this.skipOnce };
  }
  static restore(s, opts = {}) {
    const m = new Machine({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), chr: new Uint8Array(Buffer.from(s.chr, 'base64')), mirroring: s.mirroring,
      passAt: opts.passAt !== undefined ? opts.passAt : s.passAt, mirrorPrg: false });
    const c = m.cpu;
    Object.assign(c, { a: s.cpu.a, x: s.cpu.x, y: s.cpu.y, sp: s.cpu.sp, pc: s.cpu.pc, cycles: s.cpu.cycles });
    c.p = s.cpu.p;
    m.ppu.load(s.ppu); m.apuw.set(s.apuw); m.pads = s.pads.slice(); m.strobe = s.strobe; m.shift = s.shift.slice();
    Object.assign(m, { dot0: s.dot0, skipped: s.skipped, odd: s.odd, phase: s.phase, nmiDue: s.nmiDue, frames: s.frames, nmis: s.nmis, passes: s.passes, skipOnce: !!s.skipOnce });
    return m;
  }
}

module.exports = { Machine, BUTTON, loadListing, LINE, LINES, DOTS, FRAME_DOTS, MAP };
