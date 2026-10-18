// A C64 that runs a disk game's own code from the moment its boot program hands over, through
// every load, for checking a port of a game that loads from disk as it plays: kit/c64/machine.js
// (on kit/cpu/cpu6502.js) with a disk drive, a stand-in for the KERNAL routines a game calls, and
// each frame kept for C64.renderFrame (site/lib/c64.js) and the SID's writes a frame at a time.
// A Play tab never runs this: the page is a port (kit/skills/core/70-minisite, "Play"); this is the
// game the port is checked against. Node only. Checked by kit/c64/test_c64run.js.
//
// The KERNAL. The kit holds no ROM. The routines a game calls through the jump table are hooks
// here, run when the processor reaches their address with the KERNAL banked in, and the interrupt's
// paths are a few instructions of this file's own at the KERNAL's addresses, so a game that points
// $0314 or $0318 at its own handler runs it as the machine would:
// - $FF48, the IRQ's entry: PHA TXA PHA TYA PHA, then BRK's vector $0316 or the IRQ's $0314;
//   $EA31 adds 1 to the jiffy clock ($A0-$A2) and reads $DC0D, which acknowledges CIA 1, then
//   $EA81 pulls Y, X and A and returns (the KERNAL's keyboard scan and cursor are not done);
//   $FE43, the NMI's entry: SEI, then $0318; $FE47, its default handler, and its exit $FEBC.
// - SETLFS, SETNAM, SETMSG and READST keep and give what the KERNAL keeps, at its addresses.
// - LOAD ($FFD5) reads the named file from the drive and writes it through the processor's map,
//   to X/Y with secondary address 0 and to the file's own address otherwise, as the KERNAL's own
//   STA does; it leaves the end in X/Y and $AE/$AF, the start in $C3/$C4, the status $40 (end of
//   file) and the carry clear. A name the drive has no file for gives carry set, A = 4 (FILE NOT
//   FOUND) and status $42, as the KERNAL does after the drive's error. It takes no time: no frame
//   passes during a load.
// - SAVE ($FFD8) keeps the bytes from the address in the zero-page pair A names up to X/Y (not
//   included) as a file with its two-byte address, under the name without "@0:", and calls the
//   drive's onSave.
// - OPEN, CLOSE, CLALL, CHKIN, CLRCHN and CHRIN serve the drive's channels: a direct-access
//   buffer opened as "#", and the command channel (secondary address 15) opened with a block-read
//   command, "U1 channel drive track sector" (or "U1:", "B-R"), which reads the sector into that
//   channel's buffer for CHRIN to give a byte at a time.
// - Any other routine of the jump table stops the run with an error that names it: a test that
//   needs one more passes a hook of its own (hooks, below), which wins over these.
//
// The drive. C64Run.drive({ files, sectors, onSave }) holds a disk's files, { NAME: Uint8Array },
// each with its two-byte load address first as on the disk, and the sectors a game reads directly,
// { 'track,sector': Uint8Array(256) }. A name is matched as the drive's DOS matches it: a leading
// "0:" or "@0:" is dropped, * matches the rest and ? any one character. Several sides can share one
// drive (their names differ), so a game that asks for the other side finds its file at once.
// C64Run.read(file) gives the files and sectors kit/c64/disk.py pack wrote from the game's images.
//
// The screen and the sound. Each write to the video chip's registers and to CIA 2's $DD00 and
// $DD02 is kept with the line and cycle it came on, and memory and colour RAM as each frame began,
// with every later change where the game made it (C64.videoMemory, compared at each line). The
// SID's writes to its 25 registers are kept a frame at a time, [register, value, ...], for a
// C64Sid.host driver that plays a queue of frames.
//
//   const R = C64Run.create({ drive, keep, hooks, rasterFix, state })
//     drive      C64Run.drive(...)
//     keep       renderFrame's F.keep for the frames kept (C64.videoMemory's keep)
//     hooks      { address: fn(cpu) } run before the instruction there, as cpu6502.js's hooks
//     rasterFix  f(info): when the game moves the raster interrupt to a line past the frame's last
//                (312 on PAL) while the interrupt is enabled, the interrupt can never come again; with
//                rasterFix the compare line's bit 8 is cleared at once, as clearing bit 7 of $D011 from
//                a monitor does, and f is told { line, pc, frame }. Without it the machine does what
//                the C64 does
//     state      R.save()'s, to go on from there instead of booting (JSON keeps it as it is)
//   R.boot({ file, to, pc })   the machine as a BASIC loader leaves it after LOAD "file",8 to `to`
//                and a jump to pc: the KERNAL's vectors and registers, CIA 1's timer interrupt on
//   R.run(t)     runs the game until the clock reaches cycle t (a PAL frame is 19,656 cycles); the
//                caller moves t on a frame or more at a time
//   R.shown      the last whole frame, for C64.renderFrame: { frame, vic, cia2, writes, mem, colour }
//   R.sound      the SID's writes of each frame since the caller last took them
//   R.m, R.cpu, R.ram    the machine, its processor and its memory; R.m.keys, R.m.joy, R.m.joy1 the
//                input (c64machine.js)
//   R.loads      ['LOAD name' or 'SAVE name' or 'READ track,sector', address, frame], in order
const fs = require('fs'), path = require('path');
const { Machine } = require('./machine.js');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'c64.js'));

module.exports = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES;

  function drive(o = {}) {
    const files = new Map(Object.entries(o.files || {}));
    const sectors = new Map(Object.entries(o.sectors || {}));
    const bare = (name) => name.replace(/^@?\d?:/, '');
    function find(name) {
      const n = bare(name);
      if (files.has(n)) return n;
      const re = new RegExp('^' + n.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*.*$/, '.*').replace(/\?/g, '.') + '$');
      for (const k of files.keys()) if (re.test(k)) return k;
      return null;
    }
    return { files, sectors, find, bare, onSave: o.onSave || null };
  }

  // The KERNAL's addresses this file puts code at, and the code: its own, not Commodore's.
  const ROM_CODE = {
    0xFF48: [0x48, 0x8A, 0x48, 0x98, 0x48, 0xBA, 0xBD, 0x04, 0x01, 0x29, 0x10, 0xF0, 0x03, 0x6C, 0x16, 0x03,
      0x6C, 0x14, 0x03],                                     // the IRQ's entry
    0xEA31: [0x4C, 0x81, 0xEA],                              // (the hook does the clock) JMP $EA81
    0xEA81: [0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40],            // PLA TAY PLA TAX PLA RTI
    0xFE43: [0x78, 0x6C, 0x18, 0x03],                        // the NMI's entry: SEI JMP ($0318)
    0xFE47: [0x48, 0x8A, 0x48, 0x98, 0x48, 0x4C, 0xBC, 0xFE],
    0xFE66: [0x4C, 0x81, 0xEA],                              // BRK's default: leave as the IRQ does
    0xFEBC: [0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40],
    0xFFFA: [0x43, 0xFE, 0xE2, 0xFC, 0x48, 0xFF],            // the vectors
  };
  const NAMES = { 0xFF81: 'CINT', 0xFF84: 'IOINIT', 0xFF87: 'RAMTAS', 0xFF8A: 'RESTOR', 0xFF8D: 'VECTOR',
    0xFF90: 'SETMSG', 0xFF93: 'SECOND', 0xFF96: 'TKSA', 0xFF99: 'MEMTOP', 0xFF9C: 'MEMBOT', 0xFF9F: 'SCNKEY',
    0xFFA2: 'SETTMO', 0xFFA5: 'ACPTR', 0xFFA8: 'CIOUT', 0xFFAB: 'UNTLK', 0xFFAE: 'UNLSN', 0xFFB1: 'LISTEN',
    0xFFB4: 'TALK', 0xFFB7: 'READST', 0xFFBA: 'SETLFS', 0xFFBD: 'SETNAM', 0xFFC0: 'OPEN', 0xFFC3: 'CLOSE',
    0xFFC6: 'CHKIN', 0xFFC9: 'CHKOUT', 0xFFCC: 'CLRCHN', 0xFFCF: 'CHRIN', 0xFFD2: 'CHROUT', 0xFFD5: 'LOAD',
    0xFFD8: 'SAVE', 0xFFDB: 'SETTIM', 0xFFDE: 'RDTIM', 0xFFE1: 'STOP', 0xFFE4: 'GETIN', 0xFFE7: 'CLALL',
    0xFFEA: 'UDTIM', 0xFFED: 'SCREEN', 0xFFF0: 'PLOT', 0xFFF3: 'IOBASE' };

  function create(o = {}) {
    const D = o.drive || drive();
    const rom = new Uint8Array(0x2000).fill(0x60);
    for (const [a, code] of Object.entries(ROM_CODE)) rom.set(code, a - 0xE000);
    const m = o.state ? Machine.restore(o.state.machine, { rom: { kernal: rom } })
      : new Machine({ ram: new Uint8Array(0x10000), cia: true, dma: true, rom: { kernal: rom }, sid: o.sid });
    const ram = m.ram;
    const cpu = m.cpu;
    const R = { m, cpu, ram, drive: D, shown: null, sound: [], loads: [], frame: o.state ? o.state.frame : 0 };

    // ---- the KERNAL's routines
    const chans = new Map();      // logical file -> { sa, buf, pos }
    let input = 0;
    const st = (v) => { ram[0x90] = v; };
    const nameOf = () => {
      let s = '';
      const a = ram[0xBB] | ram[0xBC] << 8;
      for (let i = 0; i < ram[0xB7]; i++) s += String.fromCharCode(cpu.rd((a + i) & 0xFFFF));
      return s;
    };
    function command(text) {                   // the command channel: a block read into a buffer
      const c = /^(?:U1|UA|B-R)[: ]?\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(text.trim());
      if (!c) return;
      R.loads.push(['READ ' + +c[3] + ',' + +c[4], 0, R.frame]);
      for (const ch of chans.values()) if (ch.sa === +c[1] && ch.buf) {
        ch.buf.set(D.sectors.get(+c[3] + ',' + +c[4]) || new Uint8Array(256)); ch.pos = 0;
      }
    }
    const K = {
      0xFF90: (c) => { ram[0x9D] = c.a; },
      0xFFB7: (c) => { c.a = c.nz(ram[0x90]); },
      0xFFBA: (c) => { ram[0xB8] = c.a; ram[0xBA] = c.x; ram[0xB9] = c.y; },
      0xFFBD: (c) => { ram[0xB7] = c.a; ram[0xBB] = c.x; ram[0xBC] = c.y; },
      0xFFD5: (c) => {
        const name = nameOf(), f = ram[0xBA] === 8 ? D.find(name) : null;
        R.loads.push(['LOAD ' + name, c.x | c.y << 8, R.frame]);
        if (!f) { c.c = 1; c.a = 4; st(0x42); return; }
        const b = D.files.get(f), start = ram[0xB9] ? b[0] | b[1] << 8 : c.x | c.y << 8;
        for (let i = 2; i < b.length; i++) c.wr((start + i - 2) & 0xFFFF, b[i]);
        const end = (start + b.length - 2) & 0xFFFF;
        ram[0xC3] = start & 255; ram[0xC4] = start >> 8; ram[0xAE] = end & 255; ram[0xAF] = end >> 8;
        c.x = end & 255; c.y = end >> 8; c.c = 0; st(0x40);
      },
      0xFFD8: (c) => {
        const name = nameOf(), start = ram[c.a] | ram[(c.a + 1) & 255] << 8, end = c.x | c.y << 8;
        const out = new Uint8Array(Math.max(0, end - start) + 2);
        out[0] = start & 255; out[1] = start >> 8;
        for (let a = start; a < end; a++) out[a - start + 2] = c.rd(a);
        R.loads.push(['SAVE ' + name, start, R.frame]);
        D.files.set(D.bare(name), out);
        if (D.onSave) D.onSave(D.bare(name), out);
        c.c = 0; st(0);
      },
      0xFFC0: (c) => {
        const la = ram[0xB8], sa = ram[0xB9], name = nameOf();
        chans.set(la, { sa, buf: name.startsWith('#') ? new Uint8Array(256) : null, pos: 0 });
        if (sa === 15) command(name);
        c.c = 0; st(0);
      },
      0xFFC3: (c) => { chans.delete(c.a); c.c = 0; },
      0xFFC6: (c) => { input = c.x; c.c = 0; },
      0xFFCC: () => { input = 0; },
      0xFFE7: () => { chans.clear(); input = 0; },
      0xFFCF: (c) => {
        const ch = chans.get(input);
        if (!ch || !ch.buf) { c.a = 13; c.c = 0; return; }
        c.a = ch.buf[ch.pos & 255]; ch.pos++; st(ch.pos >= 256 ? 0x40 : 0); c.c = 0;
      },
    };
    const kernalIn = () => (cpu.pdata | ~cpu.pdir) & 2;
    for (let a = 0xFF81; a <= 0xFFF3; a += 3) {
      const f = K[a];
      m.hooks[a] = (c) => {
        if (!kernalIn()) return false;
        if (!f) throw Object.assign(new Error('the game called the KERNAL\'s ' + NAMES[a] + ' ($' + a.toString(16).toUpperCase() +
          '), which kit/c64/c64run.js does not stand in for'), { pc: c.opc, address: a });
        f(c); c.rts(); return false;
      };
    }
    m.hooks[0xEA31] = (c) => {
      if (!kernalIn()) return false;
      if (++ram[0xA2] === 0 && ++ram[0xA1] === 0) ram[0xA0]++;
      m.ioRead(0xDC0D);
      return false;
    };
    for (const [a, f] of Object.entries(o.hooks || {})) {
      const k = m.hooks[a];
      m.hooks[a] = k ? (c) => f(c) === true || (c.pc === +a && k(c)) : f;
    }

    // ---- the frames: the chip's writes where they came, and memory as each frame began
    const vm = globalThis.C64.videoMemory(ram, m.colour, { keep: o.keep });
    let cur = null, sound = [];
    const bank = () => 3 - ((m.pra2 | ~m.ddra2) & 3);
    function begin() {
      const f = vm.begin();
      cur = { frame: R.frame, vic: Array.from(m.vic.subarray(0, 47)), cia2: [m.pra2, m.ddra2], writes: [], mem: f.mem, colour: f.colour };
    }
    const write = m.ioWrite.bind(m);
    m.ioWrite = (a, v) => {
      write(a, v);
      const t = cpu.cycles - 1, line = Math.floor(t / LINE) % LINES, cyc = t % LINE + 1;
      if (a < 0xD400) {
        const r = a & 0x3F;
        if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([line, cyc, 0xD000 + r, v]);
        if ((r === 0x11 || r === 0x12 || r === 0x1A) && o.rasterFix && m.cmp >= LINES && (m.enable & 1)) {
          const line = m.cmp;
          m.cmp &= 0xFF;
          o.rasterFix({ line, pc: cpu.opc, frame: R.frame });
        }
      } else if (a < 0xD800) { if ((a & 0x1F) < 25) sound.push(a & 0x1F, v); }
      else if (a === 0xDD00 || a === 0xDD02) cur.writes.push([line, cyc, a, v]);
    };
    vm.at(cpu.cycles, [], bank());
    begin();

    // The machine as it stands, for create({ state }): between instructions, with no file open.
    R.save = function () {
      if (chans.size) throw new Error('C64Run.save: a file is open on the drive');
      return { machine: m.save(), frame: R.frame };
    };

    R.run = function (t) {
      while (cpu.cycles < t) {
        m.runCycles(LINE - cpu.cycles % LINE);
        vm.at(cpu.cycles, cur.writes, bank());
        const f = Math.floor(cpu.cycles / FRAME);
        if (f !== R.frame) {
          R.frame = f; R.shown = cur; begin();
          R.sound.push(sound); sound = [];
          if (R.sound.length > 100) R.sound.splice(0, R.sound.length - 100);
        }
      }
    };

    // The machine as BASIC leaves it after LOAD "file",8 and a jump: the KERNAL's vectors and the
    // registers it set at power-on, CIA 1's timer interrupting 60 times a second, the screen blank.
    R.boot = function (b) {
      ram.set([0x31, 0xEA, 0x66, 0xFE, 0x47, 0xFE], 0x0314);
      ram.fill(0x20, 0x0400, 0x07E8);
      m.colour.fill(14);
      Object.assign(m.vic, { 0x11: 0x1B, 0x16: 0xC8, 0x18: 0x15, 0x20: 0x0E, 0x21: 0x06 });
      m.pra2 = 0x97; m.ddra2 = 0x3F;
      const c = m.cia[0];
      c.lat[0] = c.cnt[0] = 0x4025; c.cr[0] = 0x01; c.mask = 0x01;
      const f = D.files.get(D.find(b.file)), to = b.to === undefined ? f[0] | f[1] << 8 : b.to;
      ram.set(f.subarray(2), to);
      const end = to + f.length - 2;
      ram[0xB7] = b.file.length; ram[0xB8] = 1; ram[0xB9] = 0; ram[0xBA] = 8; ram[0x90] = 0x40;
      ram[0xAE] = end & 255; ram[0xAF] = end >> 8; ram[0xC3] = to & 255; ram[0xC4] = to >> 8;
      cpu.pc = b.pc === undefined ? to : b.pc; cpu.sp = 0xF6; cpu.i = 0;
      R.loads.push(['LOAD ' + b.file, to, 0]);
      vm.at(0, [], 0);
      begin();
    };
    return R;
  }

  // The files and sectors kit/c64/disk.py pack wrote ({ files: { name: base64 }, sectors:
  // { 'track,sector': base64 } }), as the { files, sectors } C64Run.drive takes.
  function read(file) {
    const o = JSON.parse(fs.readFileSync(file, 'utf8')), files = {}, sectors = {};
    for (const [k, v] of Object.entries(o.files)) files[k] = new Uint8Array(Buffer.from(v, 'base64'));
    for (const [k, v] of Object.entries(o.sectors)) sectors[k] = new Uint8Array(Buffer.from(v, 'base64'));
    return { files, sectors };
  }
  return { create, drive, read, LINE, LINES, FRAME };
})();
