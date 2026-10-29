/* en-play */
// The Play tab's C64: the port (en-core.js and its groups, en-g*.js) on a clock and chips of its own,
// for play.html and for test_play.js, which runs it beside the kit's machine and compares the pace.
//
// EaglePlay.create({ M, groups, cost, keep, lib }) gives the machine. M is the game's 64 KB as the
// listing holds it; groups the port's installers (window.EN_GROUPS); cost the measured costs (COST,
// below, by default); keep the object the page gives C64.drawFrame, whose record of the bytes the
// video chip reads narrows the memory compared (C64.videoMemory); lib, in node only, the game's own
// code standing in for what no group has ported.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy       joystick port 2: five bits, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   keys      the C64's keys held, a Set of the KERNAL's numbers (row x 8 + column; SPACE is 60)
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   restore() the RESTORE key: at the port's next yield the main program is dropped and the game's
//             warm start runs (P.warm_start, $8031, as the KERNAL's NMI handler reaches it), then the
//             program from where that leaves it. Only while the KERNAL is banked in: with it out
//             the vector at $FFFA is RAM, which holds 0, and the C64 would run into zero page
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of the
//             frame they came in, until the page takes them
//   clock, frames, passes, vic, colour, sid, P
//
// EaglePlay.cheats(S, on) puts the Play tab's cheats round the port's own routines of machine S,
// each looking its switch up in on ({ word, hits, ammo, key }) when it is called, so they can be
// switched at any moment and, all off, leave the game as it is. word keeps the game's own flag $603F
// set, as a name of %MAGGOTS!& sets it when a floor is built ($6F3B); the other three each do one of
// the three things the game does with the flag set: hits, hit_the_player ($639F) adds nothing; ammo,
// the rounds ($02BD) put back to 99 at the end of $5B1B; key, a door key ($02AC) in hand in play,
// written in $5BBA. set(name, value) switches one, setting the flag at once or, for word off,
// running the game's own check of the last name typed.
//
// The clock. Nothing here runs 6502 code: the port is JavaScript, so its main program moves the clock
// on by the cycles a yield names ({ cycles } or { cp, cycles }, a delay loop's turn) and, at each
// checkpoint, by what the game took between it and the one before beyond the cycles the port named
// on the way (@yield, the average over test_play.js's runs: a delay's turn names its own cycles,
// and the work before its first turn is the game's measured remainder; a stretch no run measured
// costs nothing beyond the cycles its yield names, and a line when it names none, so that a wait
// along it moves the clock on, where at no cost it would stand still), and each interrupt by a base
// for the state it began in (@irq, keyed by irqKey) and a cost for each call of one of P's routines
// it made (@fn, by name; countCalls). The two are fitted together,
// non-negative, to the cycles the game's handlers took in test_play.js's runs: what a handler does
// in one state depends on the play (the figures it steps, the shots it follows), and a cost per
// state alone runs the page at the pace of the play it was measured on. The
// main program's cost is charged at its next yield, and the clock then runs to it, taking on the
// way the raster interrupt on its line (the compare line in $D012 and $D011's bit 7, while $D01A
// enables it), which waits while the game has interrupts off (P.I). Bad lines and the sprites'
// fetches are not taken out: the costs are measured on the kit's machine, which does not take
// them either, so the page runs at that machine's pace.
//
// The chips. Each write to the video chip is kept with the line and cycle it came on, and memory
// and colour RAM as each frame began with every change after it where the game made it
// (site/lib/c64.js, videoMemory), for C64.drawFrame. The SID's writes go to the page's sound as they
// come; a read of one of its write-only registers gives the data bus as it fades (site/lib/sid.js,
// createBus). Voice 3's oscillator ($D41B) is the SID's noise generator as reSID models it: a
// 23-bit shift register stepped each time bit 19 of the voice's phase accumulator rises, eight of
// its bits read out. The game reads it 256 times in a loop of 14 cycles to build its dice ($67CA),
// which the port runs at one moment of the clock, so the oscillator is stepped 14 cycles a read for
// reads that come at the same moment: the table then has the game's pattern, neighbours alike
// (facts.md, "Jewels come up more often than explosives").
globalThis.EaglePlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  const COST = {"@yield":{"1017>10af":110361,"10af>10af":0,"10af>10bd":0,"10af>1566":12,"10bd>1262":49907,"1262>1262":0,"1262>13e5":34439,"1262>1566":41,"13e5>13e5":0,"13e5>154f":29804,"154f>1017":48,"154f>154f":0,"154f>1566":41,"1566>15d7":7534,"15d7>15d7":0,"15d7>1d99":14449,"1c6c>1c6c":0,"1c6c>1c8a":909,"1c6c>4092":568286,"1c8a>1c6c":6718,"1c8a>1c8a":0,"1d99>1da7":0,"1d99>1f05":22399,"1da7>1d99":0,"1da7>1dd9":498,"1dd9>1da7":0,"1dd9>1dd9":0,"1f05>1f05":0,"1f05>1f14":0,"1f14>4092":568198,"1feb>1feb":0,"1feb>1ffa":0,"1ffa>1017":1614,"1ffa>cdc":58359,"4092>4095":70,"4095>4095":9,"4095>4241":39808,"4241>4241":9,"4241>4871":1699,"4871>4871":38,"4871>489e":42,"4871>48dd":28,"4871>48f8":421,"4871>49f5":39,"4871>4a77":176,"489e>489e":6,"489e>48a2":5,"48a2>48a2":27,"48a2>48c8":15,"48c8>4871":14,"48c8>48c8":6,"48dd>48dd":11,"48dd>6a42":14989,"48f8>48f8":12,"48f8>5fdc":16,"49f5>49f5":11,"49f5>5fdc":66,"4a77>4a77":11,"4a77>5fdc":16,"5fdc>5fdc":0,"5fdc>5feb":0,"5feb>1017":1625,"5feb>5fdc":12,"5feb>6a42":15045,"5feb>cdc":58311,"6a42>6a42":0,"6a42>6a4a":0,"6a4a>1c6c":38794,"6a4a>1f05":22456,"6a4a>1feb":21969,"6a4a>5fdc":11353,"6a4a>6a42":14496,"cdc>cdc":9,"cdc>d36":1619,"d36>d3e":8,"d3e>d3e":0,"d3e>d4d":0,"d4d>1017":629},"@irq":{"4c22":131,"85a":117,"e6a":198,"f95":147,"play:sprites":333,"play:sprites:paused":290,"play:work:1":14881,"play:work:2":3545,"play:work:3":3872,"play:work:paused":303,"play:work:room":14874},"@fn":{"band_picture":869,"band_strip_scroll":1,"band_text":35,"byte_to_digits":68,"continue_sound_effect":66,"face_player":1100,"figure_drawing":599,"figure_turn_to_player":75,"figures_turn":2,"fire_second_shot":752,"footstep":65,"found_door_key":3406,"kernal_irq":27,"map_address":383,"mission_done_check":18,"mission_state":7,"move_shot_1":15,"music_driver":31,"name_entry_fire":39,"paint_four_bands":5345,"player_and_rooms":15,"player_move_down":87,"player_move_left":106,"player_move_right":116,"player_move_up":76,"player_turn":441,"prisoner_turn":15,"scroll_message_in":840,"scroll_room_down":77,"scroll_room_right":77,"scroll_room_up":60,"set_plaque_bitmap":96,"shot_hit_figure":3496,"shot_hit_tile":639,"start_sound_effect":109,"step_onto_lift":513,"tiles_round_player":22,"wipe_band_closed":50}};

  // the interrupt's state as its cost is measured: the handler (by $0314) and, for the play
  // interrupt, the band it will serve and what that band will do
  function irqKey(M) {
    const v = M[0x0314] | M[0x0315] << 8;
    if (v !== 0x4AA7) return v.toString(16);
    if (M[0x4AA6]) return 'play:sprites' + (M[0x02C9] ? ':paused' : '');
    if (M[0x02C9]) return 'play:work:paused';
    if (M[0x02AA] & 7) return 'play:work:room';
    const phase = (M[0x02EF] + 1) & 255;
    return 'play:work:' + (phase > 2 ? 3 : phase);
  }
  const stretch = (from, to) => from.toString(16) + '>' + to.toString(16);
  // every routine of P, wrapped to tell onCall its name each time it is called; the handlers in
  // P.irqs are the routines as their groups made them, so only the calls they make are told
  function countCalls(P, onCall) {
    for (const k of Object.keys(P)) {
      const f = P[k];
      if (typeof f !== 'function' || k === 'program' || k === 'sei' || k === 'cli') continue;
      P[k] = function (...a) { onCall(k); return f.apply(this, a); };
    }
  }

  // voice 3's noise, as reSID keeps it (oscillator 3's output: bits 20, 18, 14, 11, 9, 5, 2, 0)
  function noise() {
    let sr = 0x7FFFF8, acc = 0, at = 0;
    return {
      // n cycles at frequency freq: bit 19 rises once each time the accumulator passes 2^19 on
      // from a multiple of 2^20, and the register steps each time
      step(n, freq, test) {
        if (test) { sr = 0x7FFFF8; acc = 0; return; }
        const to = acc + freq * n;
        const edges = Math.floor((to + 0x80000) / 0x100000) - Math.floor((acc + 0x80000) / 0x100000);
        for (let k = 0; k < edges; k++) sr = ((sr << 1) | (((sr >> 22) ^ (sr >> 17)) & 1)) & 0x7FFFFF;
        acc = to % 0x1000000;
      },
      out() {
        return ((sr >> 13) & 0x80) | ((sr >> 12) & 0x40) | ((sr >> 9) & 0x20) | ((sr >> 7) & 0x10) |
          ((sr >> 6) & 0x08) | ((sr >> 3) & 0x04) | ((sr >> 1) & 0x02) | (sr & 0x01);
      },
      get at() { return at; }, set at(v) { at = v; },
    };
  }

  function create(o) {
    const M = o.M, cost = o.cost || COST, IRQ = cost['@irq'] || {}, YIELD = cost['@yield'] || {}, FN = cost['@fn'] || {};
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    // the chips as the tape leaves them at the hand-over (orientation.md, "The loader")
    vic[0x11] = 0x3B; vic[0x16] = 0xD8; vic[0x18] = 0x38;
    const cia = { pra: 0x7F, ddra: 0xFF, ddrb: 0, pra2: 0x95, ddra2: 0x3F };
    const keys = new Set();
    const S = { clock: 0, frames: 0, passes: 0, shown: null, sound: [], keys, joy: 0x1F, vic, colour, sid, M };
    const bus = globalThis.C64Sid ? globalThis.C64Sid.engine().createBus('8580') : null;
    const osc = noise();
    let done = -1, latch = 0, inIrq = false, owed = 0, irqOwed = 0, pending = false, irqLeft = 0;
    const bank = () => (3 - ((cia.pra2 | ~cia.ddra2) & 3)) << 14;
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: [cia.pra2, cia.ddra2], writes: [], mem: m.mem, colour: m.colour };
    };
    const slices = () => Array.from({ length: SLICES }, () => []);
    let cur = begin(0), curSound = slices();
    const moved = () => { if (vm && irqLeft <= 0) vm.at(S.clock, cur.writes, bank() >> 14); };
    const irqEnded = () => {
      if (!vm) return;
      const n = cur.writes.length, w = [line(), S.clock % LINE + 1];
      vm.at(S.clock, cur.writes, bank() >> 14);
      for (let i = n; i < cur.writes.length; i++) { cur.writes[i][0] = w[0]; cur.writes[i][1] = w[1]; }
    };
    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const cmp = () => vic[0x12] | (vic[0x11] & 0x80) << 1;
    const record = (a, v) => cur.writes.push([line(), S.clock % LINE + 1, a, v]);
    // voice 3's oscillator, stepped to the clock, or 14 cycles on for a read at the same moment
    const osc3 = () => {
      const t = Math.max(S.clock, osc.at + 14);
      osc.step(t - osc.at, sid[0x0E] | sid[0x0F] << 8, sid[0x12] & 8);
      osc.at = t;
      return sid[0x12] & 0x80 ? osc.out() : 0;
    };
    const io = {
      vicRead(r) {
        r &= 0x3F;
        if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
        if (r === 0x12) return line() & 255;
        if (r === 0x19) return latch | 0x70 | (latch & vic[0x1A] & 15 ? 0x80 : 0);
        if (r === 0x1A) return vic[0x1A] | 0xF0;
        if (r === 0x1E || r === 0x1F) return 0;
        return r > 0x2E ? 0xFF : vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x19) { latch &= ~v & 15; return; }
        vic[r] = v;
        if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
      },
      sidRead(r) {
        r &= 0x1F;
        if (r === 0x1B) return osc3();
        if (r === 0x19 || r === 0x1A) return 0xFF;
        return bus ? bus.read(r, S.clock, 0) : 0;
      },
      sidWrite(r, v) {
        r &= 0x1F;
        if (r === 0x0E || r === 0x0F || r === 0x12) osc3();          // the oscillator up to now, then the change
        sid[r] = v; if (bus) bus.write(v, S.clock);
        curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v);
      },
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      // CIA 1: the keyboard's rows out on port A, its columns in on port B; joystick 2 on port A
      ciaRead(r) {
        r &= 15;
        if (r === 0) return ((cia.pra | ~cia.ddra) & 0xFF) & (0xE0 | S.joy);
        if (r === 1) {
          let v = 0xFF;
          const rows = (cia.pra | ~cia.ddra) & 0xFF;
          for (const k of keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
          return v;
        }
        if (r === 2) return cia.ddra;
        if (r === 3) return cia.ddrb;
        return 0;
      },
      ciaWrite(r, v) { r &= 15; if (r === 0) cia.pra = v; else if (r === 2) cia.ddra = v; else if (r === 3) cia.ddrb = v; },
      // CIA 2: the video bank
      cia2Read(r) { r &= 15; return r === 0 ? (cia.pra2 | ~cia.ddra2) & 0xFF : r === 2 ? cia.ddra2 : 0; },
      cia2Write(r, v) {
        r &= 15;
        if (r === 0) { cia.pra2 = v; record(0xDD00, v); } else if (r === 2) { cia.ddra2 = v; record(0xDD02, v); }
      },
      irqByte: (a) => M[a],
      read(a) {
        if (a < 0xD400) return io.vicRead(a);
        if (a < 0xD800) return io.sidRead(a);
        if (a < 0xDC00) return colour[a - 0xD800] | 0xF0;
        if (a < 0xDD00) return io.ciaRead(a);
        return io.cia2Read(a);
      },
      write(a, v) {
        if (a < 0xD400) io.vicWrite(a, v);
        else if (a < 0xD800) io.sidWrite(a, v);
        else if (a < 0xDC00) io.colourWrite(a - 0xD800, v);
        else if (a < 0xDD00) io.ciaWrite(a & 15, v);
        else io.cia2Write(a & 15, v);
      },
    };
    const P = globalThis.EagleCore.makePort(M, o.groups, o.lib);
    P.io = io;
    countCalls(P, (k) => { if (inIrq) irqOwed += FN[k] || 0; });
    S.P = P;

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the interrupt, through the vector at $0314: what the game's handler took in that state
    function irq() {
      pending = false;
      const at = M[0x0314] | M[0x0315] << 8, f = P.irqs[at];
      if (!f) return 0;
      const key = irqKey(M);
      inIrq = true; irqOwed = 0;
      try { f.call(P); } finally { inIrq = false; }
      const c = (IRQ[key] || 0) + irqOwed;
      irqLeft += c;
      return c;
    }
    // Run the processor through `work` cycles, taking the frames and the interrupts on the way; an
    // interrupt's cycles while there is work to do are more work.
    function spend(work) {
      if (pending && !P.I) work += irq();
      for (;;) {
        const ls = (Math.floor(done / LINE) + 1) * LINE;
        const ie = irqLeft > 0 ? S.clock + irqLeft : Infinity;
        const e = Math.min(ls, ie), end = S.clock + work;
        if (e > end) { S.clock = end; done = end; moved(); return; }
        if (e > S.clock) {
          work = Math.max(0, work - (e - S.clock));
          if (irqLeft > 0 && (irqLeft -= e - S.clock) <= 0) { irqLeft = 0; S.clock = e; irqEnded(); }
          S.clock = e;
        }
        done = e;
        if (e !== ls) continue;
        moved();
        const l = (e % FRAME) / LINE;
        if (l === 0) newFrame(e / FRAME);
        if (l === cmp()) {
          latch |= 1;
          if (vic[0x1A] & 1) { if (P.I) pending = true; else work += irq(); }
        }
      }
    }

    let gen = P.program(), last = -1, restoreDue = false;
    S.restore = () => { if (P.cpuPort & 2) restoreDue = true; };
    function step() {
      if (restoreDue) { restoreDue = false; P.warm_start(); gen = P.program(); last = -1; }
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      if (y && y.cycles !== undefined) owed += y.cycles;
      if (y && y.cp !== undefined && last >= 0) {
        const c = YIELD[stretch(last, y.cp)];
        owed += c !== undefined ? c : y.cycles === undefined ? LINE : 0;
      }
      else if (y === undefined) owed += LINE;                   // a turn of a raster wait: a line
      if (o.onYield) o.onYield(y, S.clock + owed);
      if (y && y.cp !== undefined) { last = y.cp; if (y.cp === 0x4871) S.passes++; }
      const work = Math.max(0, owed);
      owed -= work;
      spend(work);
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 400000) throw new Error('the port ran 400,000 yields without the clock reaching its target');
        step();
      }
    };
    S.step = step;
    spend(0);
    return S;
  }
  function cheats(S, on) {
    const P = S.P, M = S.M;
    const check = P.check_cheat_word, hit = P.hit_the_player, stamp = P.stamp_player_in_map, state = P.mission_state;
    P.check_cheat_word = function (r) { const v = check.call(this, r); if (on.word) M[0x603F] = 1; return v; };
    P.hit_the_player = function (r) { if (on.hits) return; return hit.call(this, r); };
    P.stamp_player_in_map = function (r) { const v = stamp.call(this, r); if (on.ammo) M[0x02BD] = 0x99; return v; };
    P.mission_state = function (r) {
      const v = state.call(this, r);
      if (on.key && M[0x02D3] === 0 && M[0x02C6] < 0x50) M[0x02AC] = 1;
      return v;
    };
    if (on.word) M[0x603F] = 1;
    return {
      set(k, v) {
        on[k] = !!v;
        if (k === 'word') { if (on.word) M[0x603F] = 1; else check.call(P, {}); }
      },
    };
  }
  return { create, cheats, COST, irqKey, stretch, countCalls, LINE, LINES, FRAME, SLICES };
})();
if (typeof module !== 'undefined') module.exports = globalThis.EaglePlay;
