/* bf-play.js */
// The Play tab's machine around the port (bf-port.js): the game's clock, the PPU and the APU as
// chips of the page's own, the controllers, and the picture. Nothing here runs the game's program:
// the port's routines run, and the clock charges each stretch between two of its checkpoints what
// the game's own code cost on the kit's NES, measured while test_play.js ran the two in lockstep
// (the medians in COSTS, from test_play.js --cost). The NMI comes every 29,780.5 cycles of that
// clock, as the console's does, with the handler's own median cost; a frame the game's loop
// cannot finish in time lags here as it lags there. A port's wait for the frame is not charged:
// its bare yields move the clock a beam line at a time until the NMI has set the flag.
//
//   const g = BalloonFightPlay.create({ data, costs, CPU, NES, NESApu })
//     data     the page's data: game_rom (the data-only image of $C000-$FFFF, base64), chr_sp and
//              chr_bg (the pattern tables, base64)
//     costs    the stretch costs, { 'from-to': { median }, nmi: { median } }
//     CPU      the kit's 6502 (C64Cpu.CPU), for the sound driver; NES, the site's PPU model and
//              renderer; NESApu, the APU model (only its CLOCK is read here)
//   g.boot()                 the game from the reset vector, as the console's power-on
//   g.run(cycles)            the port on for that many cycles of game time: the page calls it with
//                            the real time passed, in cycles; returns the frames completed
//   g.pads(p1, p2)           the two controllers' buttons (A 1, B 2, Select 4, Start 8, Up 16,
//                            Down 32, Left 64, Right 128), read whenever the game strobes
//   g.picture()              the last frame as 256 by 240 colour numbers (Uint8Array), drawn in
//                            two bands when Balloon Trip's split scroll was written
//   g.apuFrames()            the writes to the APU since the last call, one list a frame, each
//                            [cycle in the frame, address, value], for NESApu.host
//   g.startAt(where)         a new game taken to a phase: where is { mode: 0 one player, 1 two,
//                            2 Balloon Trip, index: the layout index 0-15, counter: the phases
//                            cleared before it, bonus: the bonus rounds passed } (see the page)
//   g.save()                 the state at the top of the phase or Balloon Trip loop, or null when the
//                            game is elsewhere: the RAM, the PPU, the clock and the picture
//   g.restore(s)             the game put back to a saved state, and the port resumed from that loop
//   g.loop                   { kind: 'phase' or 'trip', frame } when a game, not the demonstration,
//                            last reached the top of one of those loops, else null
//   g.frames, g.passes, g.P, g.M, g.ppu, g.onFrame (called after each NMI), g.onBoot (after each
//   boot, before the port runs), g.onLoop (at the top of the phase or Balloon Trip loop, where
//   g.save() works)
const BalloonFightPlay = (function () {
  'use strict';
  const FRAME = 29780.5, LINE = 341 / 3, VBLANK = 2273;
  // the checkpoints at the top of phase_loop ($F2B9) and trip_loop ($C209), where the game waits for
  // the next frame with nothing of its own on the port's stack but start_game's loop
  const LOOPS = { 0xF2B9: 'phase', 0xC209: 'trip' };
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function create(o) {
    const NES = o.NES, data = o.data, costs = o.costs || {};
    const chr = new Uint8Array(0x2000); chr.set(b64(data.chr_sp), 0); chr.set(b64(data.chr_bg), 0x1000);
    const rom = b64(data.game_rom);
    const nmiCost = costs.nmi ? costs.nmi.median : 1283;
    const g = { frames: 0, passes: 0, onFrame: null, onBoot: null, onLoop: null, lag: 0, loop: null };
    let M, P, gen, ppu, apuw, apuFrame, frameList, pads, strobe, shift, fpos, nmiDue, last, pixels, top, split, script, jump;

    const io = {
      read(a) {
        a &= 0xFFFF;
        if (a < 0x2000) return M[a & 0x7FF];
        if (a < 0x4000) return ppu.read(a & 7);
        if (a === 0x4016 || a === 0x4017) {
          const n = a & 1;
          let bit;
          if (strobe) bit = pads[n] & 1; else if (shift[n] < 8) bit = (pads[n] >> shift[n]++) & 1; else bit = 1;
          return 0x40 | bit;
        }
        return a === 0x4015 ? 0 : (a >> 8) & 0xFF;
      },
      write(a, v) {
        a &= 0xFFFF; v &= 0xFF;
        if (a < 0x2000) { M[a & 0x7FF] = v; return; }
        if (a < 0x4000) { ppu.write(a & 7, v); return; }
        if (a === 0x4014) { ppu.dma(M.subarray((v << 8) & 0x7FF, ((v << 8) & 0x7FF) + 256)); return; }
        if (a === 0x4016) { const was = strobe; strobe = v & 1; if (was && !strobe) shift = [0, 0]; return; }
        if (a < 0x4018) { apuw[a & 0x1F] = v; apuFrame.push([Math.round(fpos), a, v]); }
      },
      irqByte: (a) => M[a],
    };
    function boot() {
      M = new Uint8Array(65536); M.set(rom, 0xC000); M.set(rom, 0x8000);
      ppu = NES.ppu({ chr, mirroring: 'horizontal' });
      apuw = new Uint8Array(0x18); apuFrame = []; frameList = [];
      pads = [0, 0]; strobe = 0; shift = [0, 0];
      fpos = 0; nmiDue = false; last = -1; top = null; split = false; script = null; jump = null;
      pixels = new Uint8Array(256 * 240);
      g.frames = 0; g.passes = 0; g.lag = 0; g.loop = null;
      P = BalloonFight.create(M, io, { CPU: o.CPU });
      P.onSplit = () => { top = ppu.scroll(); split = true; };
      P.onPhaseStart = () => { if (jump) { M[P.V.phase_index] = jump.index; M[P.V.phase_counter] = jump.counter; M[P.V.bonus_round] = jump.bonus; jump = null; } };
      g.P = P; g.M = M; g.ppu = ppu;
      gen = P.program();
      if (g.onBoot) g.onBoot(g);
    }
    // The port picked up at the top of a loop, as P.program would carry on from there: phase_loop
    // inside start_game's loop ($F1F2), or trip_loop, which ends the game; then main again.
    function* resume(kind) {
      let r = kind === 'trip' ? yield* P.trip_loop() : yield* P.phase_loop();
      while (kind === 'phase' && r === 'cleared') {
        const where = yield* P.phase_start();
        if (where === 'trip') { yield* P.trip_start(); break; }
        r = where === 'bonus' ? yield* P.bonus_round_play() : yield* P.phase_loop();
      }
      for (;;) yield* P.main();
    }
    let atLoop = null;                                      // the loop whose top the port has just yielded at
    function save() {
      if (!atLoop || M[P.V.demo_flag]) return null;      // the demonstration's loop returns to the title, not to main
      return { kind: atLoop, ram: M.slice(0, 0x800), ppu: ppu.save(), apuw: apuw.slice(), fpos, nmiDue, last, frames: g.frames,
        passes: g.passes, lag: g.lag, strobe, shift: shift.slice(), top, split, jump, pixels: pixels.slice() };
    }
    function restore(s) {
      M.set(s.ram, 0); ppu.load(s.ppu); apuw.set(s.apuw);
      fpos = s.fpos; nmiDue = s.nmiDue; last = s.last; g.frames = s.frames; g.passes = s.passes; g.lag = s.lag;
      strobe = s.strobe; shift = s.shift.slice(); top = s.top; split = s.split; jump = s.jump; script = null;
      pixels.set(s.pixels); apuFrame = []; frameList = [];
      gen = resume(s.kind);
      gen.next();                                           // the loop's first checkpoint, charged before the save
      atLoop = s.kind; g.loop = { kind: s.kind, frame: s.frames };
    }
    // The clock moves on by n cycles: the beam's frame events, and the NMI when it falls due.
    function advance(n) {
      fpos += n;
      if (fpos >= VBLANK && ppu.vblank && fpos - n < VBLANK) ppu.vblank = 0;
      if (fpos >= FRAME) {
        fpos -= FRAME;
        g.frames++;
        ppu.vblank = 1;
        if (ppu.ctrl & 0x80) nmiDue = true;
        if (script) script();
      }
    }
    function takeNmi() {
      nmiDue = false;
      split = false; top = null;
      const before = fpos;
      P.nmi();
      fpos = before; advance(nmiCost);
      draw();
      frameList.push(apuFrame); apuFrame = [];
      if (g.onFrame) g.onFrame(g);
      return nmiCost;
    }
    function draw() {
      const image = ppu.image(), bottom = ppu.scroll();
      if (split && top) {
        NES.frame(image, ppu.oam, Object.assign({ top: 0, bottom: 31, into: pixels }, top));
        NES.frame(image, ppu.oam, Object.assign({ top: 32, bottom: 239, into: pixels }, bottom));
      } else NES.frame(image, ppu.oam, Object.assign({ into: pixels }, bottom));
    }
    function cost(y) {
      if (y && y.cp !== undefined) {
        const to = y.cp;
        if (to === P.PASS) { const c = 0; last = to; return c; }
        const k = last.toString(16) + '-' + to.toString(16), e = costs[k];
        last = to;
        return e ? e.median : 300;
      }
      if (y && y.cycles !== undefined) return y.cycles;
      return LINE;
    }
    function run(budget) {
      const f0 = g.frames;
      let n = 0;
      while (budget > 0 && n++ < 200000) {
        if (nmiDue) budget -= takeNmi();
        const r = gen.next();
        if (r.done) { boot(); continue; }
        const y = r.value;
        if (y && y.cp === P.PASS) g.passes++;
        const c = cost(y);
        advance(c);
        budget -= c;
        atLoop = y && y.cp !== undefined ? LOOPS[y.cp] || null : atLoop;
        if (atLoop && y && y.cp !== undefined && !M[P.V.demo_flag]) { g.loop = { kind: atLoop, frame: g.frames }; if (g.onLoop) g.onLoop(g); }
      }
      return g.frames - f0;
    }
    // A new game at a phase: the title played through by a script of the controller, the layout
    // set as a game that cleared the phases before it would have it.
    function startAt(where) {
      boot();
      // Select until the cursor is on the mode, then Start held for two frames 20 frames later
      let t = 0, at = -1;
      script = () => {
        t++;
        if (t < 20) return;
        if (at < 0) {
          if (M[0x3F] !== where.mode) { pads[0] = (t & 8) ? 4 : 0; return; }
          at = t;
        }
        pads[0] = t < at + 20 ? 0 : 8;
        if (t >= at + 22) { pads[0] = 0; script = null; }
      };
      jump = where.index === undefined ? null : { index: where.index, counter: where.counter || 0, bonus: where.bonus || 0 };
      if (!jump && where.mode !== 2) jump = null;
    }
    g.boot = boot;
    g.run = run;
    g.pads = (p1, p2) => { pads[0] = p1 & 0xFF; pads[1] = (p2 || 0) & 0xFF; };
    g.picture = () => pixels;
    g.apuFrames = () => { const l = frameList; frameList = []; return l; };
    g.startAt = startAt;
    g.save = save;
    g.restore = restore;
    g.scripted = () => script !== null;
    boot();
    return g;
  }
  return { create, FRAME, LINE };
})();
if (typeof module === 'object' && module.exports) module.exports = { BalloonFightPlay };
// end of bf-play.js
