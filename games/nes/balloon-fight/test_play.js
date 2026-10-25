#!/usr/bin/env node
'use strict';
// Hold the Play tab's port of the whole game (reference/bf-port.js) against the game's own code,
// frame by frame, in the kit's lockstep (kit/nes/lockstep.js). The game runs on the kit's NES from
// the cartridge's bytes in the committed listing, started at its reset vector ($C000); the port
// runs beside it from the same start. Each pass is one frame: the exit of the game's wait for the
// frame ($F46D). At the start of every pass the 2 KB of RAM is compared (the stack page aside), and
// so are the nametables, the palette, the sprite table and the PPU's and the APU's registers as
// written. The sound driver is the one routine the port runs as the game's own bytes, on the
// kit's 6502, as the minisite skill allows a music driver.
//
// The controllers, set at the start of a pass as a player's would be: a pilot that waits on the
// title, picks one player, two players or Balloon Trip in turn (and lets the demonstration run
// every fourth title), and in play taps A in bursts, holds left or right, holds B for a while and
// pauses now and then; between games it moves the game on to another of the sixteen layouts as
// clearing phases would, so a run of short games covers every phase and both bonus rounds.
// Two bytes the NMI handler writes and the main loop reads, frame_counter ($19) and
// stars_to_twinkle ($4C), the port reads through the lockstep (irqBytes).
//   node games/nes/balloon-fight/test_play.js [passes] [seed]
// With --cost <file> it also writes the median cycles of each stretch between two of the port's
// checkpoints, and of the NMI handler, which the Play tab paces itself by (work/pages/play.html).
// It exits 1 on any difference.
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { Machine } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/nes/lockstep.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { BalloonFight } = g.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');

// --- the pilot ------------------------------------------------------------------------------------
const BUTTON = { a: 1, b: 2, select: 4, start: 8, up: 16, down: 32, left: 64, right: 128 };
const TITLE_LOOP = 0xDAC1, GAME_OVER = 0xF366, PHASE_START = 0xF213;
class Pilot {
  constructor(seed = 1, opts = {}) {
    this.seed = seed >>> 0 || 1;
    this.stage = 'title'; this.since = 0; this.games = 0; this.titles = 0;
    this.modes = opts.modes || [0, 1, 2, 0, 2, 1];
    this.demoEvery = opts.demoEvery || 4;
    this.jump = opts.jump || null; this.jumpNow = -1; this.port = null;
    this.plan = null; this.hold = [0, 0]; this.holdFor = [0, 0]; this.burst = [0, 0]; this.pauseAt = -1;
  }
  rnd() { this.seed = (Math.imul(this.seed, 1103515245) + 12345) >>> 0; return this.seed >>> 8; }
  chance(n) { return this.rnd() % n === 0; }
  // The stages read from the game: hooks on the machine at the title loop, a phase's start and game over.
  attach(m) {
    const self = this;
    const hook = (a, f) => { const prev = m.hooks[a]; m.hooks[a] = c => { f(c); return prev ? prev(c) : false; }; };
    hook(TITLE_LOOP, () => { self.stage = 'title'; self.since = 0; self.plan = null; self.titles++; });
    hook(GAME_OVER, () => { self.stage = 'over'; self.since = 0; });
    hook(PHASE_START, () => {
      if (self.stage !== 'title') return;
      self.plan = null;
      if (m.ram[0x3A]) { self.stage = 'demo'; return; }
      self.stage = 'play'; self.since = 0;
      if (self.jump) self.jumpNow = self.jump[self.games % self.jump.length];
      self.games++;
    });
    return this;
  }
  beside(P) { this.port = P; return this; }
  pass(m) {
    this.since++;
    const pads = [0, 0];
    if (this.jumpNow >= 0) {                                  // the first pass after phase_start began, before it reads the index
      m.ram[0x3B] = this.jumpNow; if (this.port) this.port.M[0x3B] = this.jumpNow;
      this.jumpNow = -1;
    }
    if (this.stage === 'title') {
      if (!this.plan) {
        const demo = this.titles % this.demoEvery === 0 && this.titles > 1;
        this.plan = { wait: demo ? 2400 + this.rnd() % 600 : 40 + this.rnd() % 120, mode: this.modes[this.games % this.modes.length], next: 0, start: -1 };
        this.plan.next = this.plan.wait;
      }
      const p = this.plan;
      if (this.since >= p.next) {
        if (p.start < 0 && m.ram[0x3F] !== p.mode) { pads[0] = BUTTON.select; p.next = this.since + 12; }
        else { if (p.start < 0) p.start = this.since; if (this.since < p.start + 2) pads[0] = BUTTON.start; }
      }
    } else if (this.stage === 'play' || this.stage === 'over') {
      for (let n = 0; n < 2; n++) {
        if (n === 1 && m.ram[0x40] === 0) break;
        if (this.holdFor[n] <= 0) {
          const r = this.rnd() % 8;
          this.hold[n] = r < 3 ? BUTTON.left : r < 6 ? BUTTON.right : 0;
          if (this.chance(5)) this.hold[n] |= BUTTON.b;
          this.holdFor[n] = 10 + this.rnd() % 80;
        }
        this.holdFor[n]--;
        let b = this.hold[n];
        if (this.burst[n] > 0) { this.burst[n]--; if (this.chance(2)) b |= BUTTON.a; }
        else if (this.chance(6)) this.burst[n] = 6 + this.rnd() % 30;
        pads[n] = b;
      }
      if (this.stage === 'play' && this.pauseAt < 0 && this.chance(3000)) this.pauseAt = this.since;
      if (this.pauseAt >= 0) {
        const t = this.since - this.pauseAt;
        pads[0] = t < 2 || (t >= 90 && t < 92) ? BUTTON.start : 0;
        if (t >= 92) this.pauseAt = -1;
      }
      if (this.stage === 'over' && this.since > 60 && this.chance(40)) pads[0] = BUTTON.start;
    }
    m.pads[0] = pads[0]; m.pads[1] = pads[1];
    return pads;
  }
}
const JUMPS = [0, 3, 8, 12, 15, 5, 11, 7, 13, 9, 2, 14, 1, 6, 10, 4];

function session(opts) {
  const m = new Machine({ ram: g.listing().ram, pc: 0xC000, passAt: BalloonFight.PASS });
  const P = BalloonFight.create(new Uint8Array(65536), {}, { CPU });
  const pilot = new Pilot(opts.seed, { jump: JUMPS }).attach(m).beside(P);
  const costs = new Map(), nmiCycles = [];
  const ls = new Lockstep({ machine: m, port: P, program: p => p.program(), checkpoints: BalloonFight.CHECKPOINTS, nmis: { 0xC094: 'nmi' },
    maxFrames: 4000, irqBytes: [0x19, 0x4C], chips: ['ppu', 'apu'],
    timing: opts.costs ? s => {
      const k = s.from.toString(16) + '-' + s.to.toString(16);
      if (!costs.has(k)) costs.set(k, []);
      costs.get(k).push(s.cycles);
      if (s.nmis === 1) nmiCycles.push(s.nmiCycles);
    } : null });
  const r = ls.run({ passes: opts.passes, onPass: (n, mm) => { pilot.pass(mm); } });
  return { r, m, pilot, costs, nmiCycles };
}

module.exports = { Pilot, JUMPS, BUTTON, session };

if (require.main === module) {
  const args = process.argv.slice(2);
  const costAt = args.indexOf('--cost'), costFile = costAt >= 0 ? args.splice(costAt, 2)[1] : null;
  const PASSES = +args[0] || 30000, SEED = +args[1] || 1;
  const t0 = Date.now();
  const { r, m, pilot, costs, nmiCycles } = session({ seed: SEED, passes: PASSES, costs: !!costFile });
  console.log(describe(r));
  console.log(r.passes + ' frames in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s: ' + pilot.games + ' games started, ' + pilot.titles + ' titles, now ' + pilot.stage +
    (m.ram[0x16] ? ' in Balloon Trip' : ', phase ' + m.ram[0x3C] + (m.ram[0x40] ? ', two players' : '')));
  if (costFile) {
    const out = {};
    for (const [k, v] of costs) { v.sort((a, b) => a - b); out[k] = { median: v[v.length >> 1], max: v[v.length - 1], n: v.length }; }
    nmiCycles.sort((a, b) => a - b);
    out.nmi = { median: nmiCycles[nmiCycles.length >> 1], min: nmiCycles[0], max: nmiCycles[nmiCycles.length - 1], n: nmiCycles.length };
    fs.writeFileSync(costFile, JSON.stringify(out));
    console.log('costs: ' + (Object.keys(out).length - 1) + ' stretches, the NMI handler ' + out.nmi.median + ' cycles');
  }
  process.exit(r.ok ? 0 : 1);
}
