'use strict';
// Chiller on the kit's C64: kit/c64/machine.js with what the game uses of the KERNAL. The game
// keeps the KERNAL banked in and its interrupt is the KERNAL's: CIA 1's timer A, set by the
// KERNAL at start-up to $4025 (a PAL machine: an underflow every 16,422 cycles, 60 a second),
// entered at $FF48 and through ($0314) to music_irq, which leaves by $EA31.
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const { Machine, KEY, loadListing, LINE, LINES, FRAME } = require(path.join(REPO, 'kit/c64/machine.js'));
require('./src/kernal.js');
const K = globalThis.ChillerKernal;
const TIMER = 0x4025 + 1;
// the video chip as the KERNAL's start-up table ($ECB9) leaves it, character set $1000 in
const VIC0 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0x1B,0x37,0,0,0,0x08,0,0x15,0x0F,0,0,0,0,0,0,
  0x0E,0x06,0x01,0x02,0x03,0x04,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07];

// the KERNAL routines' cost, roughly, so that time moves on the machine as they run
const COST = { irqTail: 1100, chrout: 120, clear: 22000, plot: 90 };

class ChillerMachine extends Machine {
  constructor(opts = {}) {
    super(Object.assign({ ram: opts.ram || loadListing(path.join(REPO, 'games/c64/chiller/listing.json')), passAt: 0xCA00 }, opts));
    this.pra = 0x7F; this.ddra = 0xFF;             // as SCNKEY leaves the keyboard port
    this.timerAt = TIMER; this.timerDue = false;
    this.coll = [0, 0];                            // $D01E and $D01F, latched until read
    const self = this;
    this.k = {
      M: this.ram,
      colourRead: i => self.colour[i & 0x3FF], colourWrite: (i, v) => { self.colour[i & 0x3FF] = v & 15; },
      vicRead: r => self.ioRead(0xD000 | r), vicWrite: (r, v) => self.ioWrite(0xD000 | r, v),
      ciaRead: r => self.ioRead(0xDC00 | r), ciaWrite: (r, v) => self.ioWrite(0xDC00 | r, v),
    };
    Object.assign(this.hooks, {
      0xFFD2: c => { K.chrout(self.k, c.a); c.cycles += c.a === 0x93 ? COST.clear : COST.chrout; c.c = 0; c.rts(); },
      0xFFF0: c => { if (!c.c) K.plot(self.k, c.x, c.y); c.cycles += COST.plot; c.rts(); },
      // $EA31 inside an interrupt; the kernal option's own exit follows (PLA TAY PLA TAX PLA RTI)
      0xEA31: c => { K.irqTail(self.k); c.cycles += COST.irqTail; c.y = c.pull(); c.x = c.pull(); c.a = c.pull(); c.rti(); c.cycles += 22; },
    });
  }
  ioRead(a) {
    if (a >= 0xD000 && a < 0xD400 && ((a & 0x3F) === 0x1E || (a & 0x3F) === 0x1F)) {
      const i = (a & 0x3F) - 0x1E, v = this.coll[i];
      this.coll[i] = 0;
      return v;
    }
    return super.ioRead(a);
  }
  get kernalIn() { return this.cpu.rk[0xFF] !== this.cpu.rk[0x02]; }
  tick() {
    const cpu = this.cpu, ln = Math.floor(cpu.cycles / LINE);
    for (let l = this.lastLine + 1; l <= ln; l++) {
      const c = K.collideLine(this.ram, this.vic, this.colour, l % LINES);
      this.coll[0] |= c[0]; this.coll[1] |= c[1];
    }
    super.tick();
    while (cpu.cycles >= this.timerAt) { this.timerDue = true; this.timerAt += TIMER; }
    if (this.timerDue && !cpu.i) {
      this.timerDue = false;
      if (this.kernalIn) cpu.irq(this.ram[0x0314] | (this.ram[0x0315] << 8), { kernal: true, hooks: this.hooks });
      else cpu.irq(null, { hooks: this.hooks });
    }
  }
  save() { return Object.assign(super.save(), { timerAt: this.timerAt, timerDue: this.timerDue, coll: this.coll.slice() }); }
  static restore(s, opts = {}) {
    const b = Machine.restore(s, opts), m = new ChillerMachine({ ram: b.ram, passAt: b.passAt });
    for (const k of Object.keys(b)) if (!['cpu', 'hooks', 'k', 'ram'].includes(k)) m[k] = b[k];
    const c = m.cpu, d = b.cpu;
    for (const k of ['a', 'x', 'y', 'sp', 'pc', 'cycles', 'pdir', 'pdata', 'pout']) c[k] = d[k];
    c.p = d.p; c.mapPort();
    m.timerAt = s.timerAt; m.timerDue = !!s.timerDue; m.coll = s.coll ? s.coll.slice() : [0, 0];
    return m;
  }
}

// A machine at the game's hand-over, as the loader leaves it: KERNAL in, interrupts off.
function boot() {
  const m = new ChillerMachine({ pc: 0x2DFA, port: { dir: 0x2F, data: 0x37 } });
  K.boot(m.ram);
  m.vic.set(VIC0);
  m.cpu.sp = 0xF6;
  return m;
}

module.exports = { ChillerMachine, boot, KEY, LINE, LINES, FRAME, K, REPO };
