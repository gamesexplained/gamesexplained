/* mom-play */
// The Play tab's C64: the port (mom-port.js) on a clock and chips of its own, with the sprite
// collisions of the site's model (site/lib/collide.js), for play.html and for test_play.js, which
// runs it beside the kit's machine and compares the two.
//
// MoMPlay.create({ M, Port, Collide, keep, IMG }) gives the machine. M is the game's 64 KB as it
// starts (MoMPort.memory); Port is MoMPort and Collide C64Collide; IMG the page's MOM_PLAY, for the
// random numbers; keep is the object the page gives C64.drawFrame, whose record of the bytes the
// video chip reads narrows the memory compared (C64.videoMemory). Its costs are COST below, which
// test_play.js --cost measures and writes.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   keys      the C64's keys held, a Set of the KERNAL's numbers (row x 8 + column, kit/c64/machine.js)
//   joy       joystick port 2: five bits, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   frameAt(t)  the whole frame to show when the clock is due at t: the one before shown, when the
//             last stretch run carried the clock past the end of the frame t falls in. On the title
//             the timer's interrupt holds the main program back until line $EE, so a stretch can end
//             most of a frame past t, and showing the newest frame would skip one now and then
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of the
//             frame they came in, until the page takes them
//   clock, frames, passes, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code: the port is JavaScript, so each piece of work it does
// moves the clock on by what the game's own code takes for it (COST, by the names the port gives its
// work as it does it, MoMPort's P.tally), and the code between two of the port's checkpoints that
// no piece accounts for by what the game took over that stretch (@yield, by the two checkpoints).
// The delay loop at $0F35 says its own cycles. The cost is charged at the port's next yield, where
// the clock runs on to it, taking on the way what falls due:
// - the interrupt, through the vector at $0314, whenever its line is held and the game has not set
//   the interrupt mask (SEI, P.I): by the raster, on the line in $D012 and $D011's bit 7 while
//   $D01A enables it, until the handler acknowledges it in $D019; and by CIA 1's timer A, which the
//   KERNAL leaves counting from $4025 and which underflows every 16,422 cycles, until a read of
//   $DC0D. The title's handler leaves the timer's interrupt unread, and so is taken again as soon as
//   it returns, until the scroller's half reads $DC0D in the KERNAL's work: the game's main program
//   waits all that while, as on a C64. A handler costs what the game's took for the same kind of
//   interrupt (@irq, by bandOf);
// - each bad line, where the video chip holds the processor for 43 cycles, on the lines 48-247 whose
//   low three bits are $D011's vertical scroll in a frame whose line 48 had the display on, and each
//   line a sprite is fetched on, five cycles for sprite n from cycle 55 + 2n, holds that overlap
//   counting once (kit/skills/c64/c64-reference): the costs are the processor's own cycles, so the
//   page takes the video chip's from them as the machine does;
// - the collisions, worked out as the beam goes (site/lib/collide.js), which the handler reads in
//   $D01F where the game's does;
// - the start of each frame, which closes the one before for the screen and the sound.
// A turn of a polling loop (the port's bare yield) moves the clock to the start of the next line.
//
// The screen. Each write to the video chip and to CIA 2's bank bits is kept with the line and cycle
// it came on, at the clock, and memory and colour RAM as each frame began with every change after it
// where the game made it (site/lib/c64.js, videoMemory), for C64.drawFrame.
globalThis.MoMPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12;
  const TIMER = 0x4026;                      // CIA 1's timer A: its latch $4025, an underflow every $4026 cycles
  // the cycles the sprites' fetches hold the processor on a line, for each set of sprites fetched:
  // sprite n from cycle 55 + 2n to 59 + 2n, the holds that meet or overlap taken as one
  const STEAL = new Uint8Array(256);
  for (let mask = 1; mask < 256; mask++) {
    let total = 0, first = -1, last = -1;
    for (let n = 0; n < 8; n++) {
      if (!(mask >> n & 1)) continue;
      const a = 55 + 2 * n, b = a + 4;
      if (first >= 0 && a <= last) last = b;
      else { if (first >= 0) total += last - first + 1; first = a; last = b; }
    }
    STEAL[mask] = total + last - first + 1;
  }
  // The interrupt's kind, as its cost is measured: which handler the vector at $0314 names, whether
  // the raster's flag is up (raster) or only the timer's, the play interrupt's band ($03B7) and
  // whether band 1 plays the music ($03D1, with the driver playing a tune or stopped at its end, bit
  // 7 of $C41D) or a footstep ($03CF), whether the title's picture half
  // will copy the story's next row (its fine scroll $5E4B at 0 or 1, two steps a frame), and whether
  // the KERNAL's keyboard scan finds a key held (keys).
  function bandOf(M, raster, keys) {
    const h = M[0x314] | M[0x315] << 8, k = keys ? ':keys' : '';
    if (h === 0x2653) {
      if (!raster) return 'play:timer';
      const b = M[0x3B7];
      if (b === 0) return 'play:0' + k;
      if (b === 1) return M[0x3D1] ? (M[0xC41D] & 0x80 ? 'play:1:ended' : 'play:1:music') : M[0x3CF] ? 'play:1:step' : 'play:1';
      return 'play:2';
    }
    if (h === 0x5D08) {
      if (!raster) return 'title:timer';
      if (M[0x5E4A] === 0) return 'title:picture' + (M[0x5E4B] < 2 ? ':row' : '');
      return 'title:scroller' + k;
    }
    return 'kernal' + k;
  }
  // the stretch between two checkpoints, as @yield keys it
  const stretch = (from, to) => from.toString(16) + '>' + to.toString(16);
  // Measured by test_play.js --cost: each piece of work's cycles, @yield and each interrupt's (@irq).
  const COST = {"rom_chrout":0.8,"copy_block":39.9,"title_leave":3,"music_stop":99,"view_clear_cells":2923.3,"view_refresh":2978.5,"view_record_cell":72.2,"view_cast_ray.step":149.4,"view_draw_cells":144245.9,"view_find_visible.lo":10.5,"draw_entity_sprites":23.5,"play_irq_install":113568.1,"print_message":61.6,"print_message.word":91.9,"print_message.measure":37.5,"print_message.char":56.7,"message_new_line":12600.6,"pictures_clear_all":953.6,"picture_slot_clear":3249.9,"pictures_update":5061.5,"main_menu_conditions":48,"menu_clear":2147.6,"menu_add_entry":42.1,"menu_add_entry.char":36.2,"menu_choose":2264.9,"demo_replay":88.1,"delay":3.3,"menu_colour_slot":30.8,"menu_colour_slot.cell":15.8,"menu_choose_leave":21.5,"creatures_tick.creature":22.5,"creatures_tick.alive":18,"creature_step":144.9,"creature_decide":162.1,"direction_towards":18.8,"creature_choose_move":206.1,"creature_choose_move.try":46.3,"draw_mind_body_bars":223.3,"spell_upkeep":8.7,"read_input_demo":12,"direction_from_delta.divide":20.2,"player_cross":5033.7,"door_open":79.2,"draw_entity_sprites.sprite":674.3,"door_close":1180.3,"view_find_visible.seen":42,"verb_examine":1835.8,"menu_add_entity":11.9,"picture_show":179.4,"picture_show.rows":409.2,"passages_all":77.5,"creature_attack_player":717.5,"random_byte":88.4,"player_protection":0.1,"menu_choose.move":101.8,"choose_creature_in_sight":2397.4,"spell_hit_creature":274.3,"drop_possessions":649.4,"verb_pick_up":947.4,"sum_held_weight":892.4,"verb_open":897.6,"verb_close":1360.7,"wait_fire_press":6,"verb_inventory":326.2,"verb_swap":159.5,"verb_take_off":425.2,"verb_take_out":500.7,"verb_look_in":451.2,"verb_attack":404.7,"demo_rec":35.2,"demo_rec_new_run":21.5,"@yield":{"81e>5bba":47300.6,"5be4>5bf1":7,"c94>cea":58,"cff>5bba":43,"821>824":41.4,"82c>132f":1498.4,"cff>1373":100.4,"cff>146c":48.6,"cff>846":2476.5,"849>8cc":6,"8d1>8d4":51,"8e1>8e4":27,"8ed>8f0":23.4,"8f8>ac4":14,"ae9>af1":108,"8fe>901":2114.8,"8cc>8d1":6,"8d4>8d1":12.5,"8d4>8e1":29.8,"8e4>8ed":312.2,"8f0>8f8":18.4,"ac4>c94":29,"cea>cff":14,"824>82c":317.1,"cff>849":2446.7,"8f0>8fe":23.4,"901>8cc":1739.8,"cff>132f":20.2,"901>824":1755.9,"cff>ae9":49.1,"8fb>8fe":138.7,"901>914":1729.5,"ac4>ae9":72.7,"86c>876":154,"cff>5bfe":51.7,"cff>5c19":36.7,"cff>5e36":43,"cff>81e":73.4,"5bba>5be4":15,"5c19>5c7f":24781.9,"cff>5c7f":51,"cff>5e29":50,"cff>821":63.7,"8e4>86c":289.7,"876>88b":29.7,"cff>88b":51,"cff>8aa":43,"5bba>5bc1":8,"5c19>821":122,"17ad>1373":121.8,"cff>17ad":36,"17ad>146c":41.4,"17ad>846":2485.7,"17ad>849":2345.3,"17ad>ae9":79,"876>81e":18},"@irq":{"kernal":458,"kernal:keys":1458,"play:0":785,"play:0:keys":1785,"play:1":132,"play:1:ended":167,"play:1:music":897,"play:1:step":179,"play:2":366,"play:timer":74,"title:picture":231,"title:picture:row":1833,"title:scroller":1325,"title:scroller:keys":2205,"title:timer":70}};

  function create(o) {
    const M = o.M, Port = o.Port, cost = o.cost || COST, IRQ = cost['@irq'] || {}, YIELD = cost['@yield'] || {};
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    // the registers as the KERNAL leaves them after a load: the game sets the rest
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15; vic[0x20] = 0x0E; vic[0x21] = 0x06;
    const cia = { pra: 0x7F, ddra: 0xFF, ddrb: 0, pra2: 0x97, ddra2: 0x3F, icr: 0, mask: 1, next: TIMER };
    const keys = new Set();
    const S = { clock: 0, frames: 0, passes: 0, shown: null, sound: [], keys, joy: 0x1F, vic, colour, sid, M };
    const bank = () => (3 - ((cia.pra2 | ~cia.ddra2) & 3)) << 14;
    const C = o.Collide.create(vic, (a) => M[bank() | a], (i) => colour[i]);
    let latch = 0, inIrq = false, owed = 0, irqEnd = -1, badFrame = false, done = -1;
    // the memory the video chip reads, as each frame began and changed after (the node tests that
    // draw nothing load no C64, and their frames carry no memory)
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep, frames: 3 }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: [cia.pra2, cia.ddra2], writes: [], mem: m.mem, colour: m.colour };
    };
    // The handler runs at once, as it is taken, and its cycles are spent after it, until irqEnd; the
    // memory it changes is logged where they end, not where they begin.
    const moved = () => { if (vm && irqEnd < 0) vm.at(S.clock, cur.writes, bank() >> 14); };
    const irqEnded = () => {
      if (!vm) return;
      const n = cur.writes.length, w = [line(), S.clock % LINE + 1];
      vm.at(S.clock, cur.writes, bank() >> 14);
      for (let i = n; i < cur.writes.length; i++) { cur.writes[i][0] = w[0]; cur.writes[i][1] = w[1]; }
    };
    const slices = () => Array.from({ length: SLICES }, () => []);
    let cur = begin(0), curSound = slices();

    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const cmp = () => vic[0x12] | (vic[0x11] & 0x80) << 1;
    const record = (a, v) => cur.writes.push([line(), S.clock % LINE + 1, a, v]);
    const io = {
      vicRead(r) {
        r &= 0x3F;
        if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
        if (r === 0x12) return line() & 255;
        if (r === 0x19) return latch | 0x70 | (latch & vic[0x1A] & 15 ? 0x80 : 0);
        if (r === 0x1A) return vic[0x1A] | 0xF0;
        if (r === 0x1E || r === 0x1F) return C.read(r, S.clock);
        return vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x19) { latch &= ~v & 15; return; }
        C.to(S.clock);
        vic[r] = v;
        if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
      },
      sidRead: () => 0,
      sidWrite(r, v) { r &= 0x1F; sid[r] = v; curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v); },
      colourRead: (i) => colour[i & 0x3FF],
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      // CIA 1: the keyboard's rows out on port A, its columns in on port B; joystick 2 on port A;
      // timer A's interrupt in $DC0D, which a read empties
      ciaRead(r) {
        r &= 15;
        if (r === 0) return (cia.ddra ? (cia.pra | ~cia.ddra) & 0xFF : 0xE0 | S.joy) & (0xE0 | S.joy);
        if (r === 1) {
          let v = 0xFF;
          const rows = cia.ddra ? cia.pra & cia.ddra : 0xFF;
          for (const k of keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
          return v;
        }
        if (r === 2) return cia.ddra;
        if (r === 3) return cia.ddrb;
        if (r === 13) { const v = cia.icr | (cia.icr & cia.mask ? 0x80 : 0); cia.icr = 0; return v; }
        return 0;
      },
      ciaWrite(r, v) {
        r &= 15;
        if (r === 0) cia.pra = v; else if (r === 2) cia.ddra = v; else if (r === 3) cia.ddrb = v;
        else if (r === 13) { if (v & 0x80) cia.mask |= v & 0x1F; else cia.mask &= ~v & 0x1F; }
      },
      // CIA 2: the video bank
      cia2Read(r) { r &= 15; return r === 0 ? (cia.pra2 | ~cia.ddra2) & 0xFF : r === 2 ? cia.ddra2 : 0; },
      cia2Write(r, v) {
        r &= 15;
        if (r === 0) { C.to(S.clock); cia.pra2 = v; record(0xDD00, v); } else if (r === 2) { C.to(S.clock); cia.ddra2 = v; record(0xDD02, v); }
      },
      irqByte: (a) => M[a],
      read(a) {
        if (a < 0xD400) return io.vicRead(a);
        if (a < 0xD800) return 0;
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
    const P = Port.create(M, io, o.IMG);
    S.P = P;
    // the main program's work, charged as the port does it; an interrupt's is in its own cost
    P.tally = (k, n) => { if (!inIrq) owed += (cost[k] || 0) * n; };

    function newFrame(n) {
      S.before = S.shown; S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    const held = () => (latch & vic[0x1A] & 15) !== 0 || (cia.icr & cia.mask) !== 0;
    // the interrupt, taken now: its handler through the vector at $0314, its cycles spent from here
    function irq() {
      const at = M[0x0314] | M[0x0315] << 8;
      const f = at === 0x2653 ? P.play_irq : at === 0x5D08 ? P.title_irq : at === 0xEA31 ? P.kernal_irq : null;
      if (!f) throw new Error('no handler for the interrupt at $' + at.toString(16));
      const band = bandOf(M, latch & 1, keys.size > 0);
      inIrq = true;
      try { f.call(P); } finally { inIrq = false; }
      irqEnd = S.clock + (IRQ[band] || 0);
    }
    const take = () => { if (irqEnd < 0 && !P.I && held()) irq(); };
    // Run the clock on until the main program has had `work` cycles, or (a poll) to the cycle
    // `until`, taking the frames, the interrupts, the bad lines and the sprites' fetches on the way.
    // While an interrupt's cycles are spent the main program waits; the video chip's holds are the
    // interrupt's while it runs, and the main program's while it has work to do.
    function spend(work, until) {
      take();
      for (;;) {
        const f0 = Math.floor(done / FRAME) * FRAME, ls = (Math.floor(done / LINE) + 1) * LINE;
        // the next bad line's cycle 12 in this frame, or the next line's start
        const ys = vic[0x11] & 7, ln = Math.floor((done - f0) / LINE);
        let b = Infinity;
        if (o.dma !== false) {
          let bl = done - f0 - ln * LINE < 11 ? ln : ln + 1;
          if (bl < 48) bl = 48;
          if (bl > 48) bl += (ys - bl) & 7;
          if (bl <= 247) b = f0 + bl * LINE + 11;
        }
        const busy = irqEnd >= 0, end = busy ? Infinity : until !== undefined ? until : S.clock + work;
        const e = Math.min(ls, b, cia.next, busy ? irqEnd : Infinity);
        if (e > end) {
          S.clock = end; done = end; C.to(S.clock); moved();
          return;
        }
        if (e > S.clock) { if (!busy && until === undefined) work -= e - S.clock; S.clock = e; }
        done = e;
        if (busy && e === irqEnd) { irqEnd = -1; irqEnded(); take(); }
        if (e === cia.next) { cia.icr |= 1; cia.next += TIMER; take(); }
        if (e === b) {
          const l = (e - f0 - 11) / LINE;
          if (l === 48) badFrame = (vic[0x11] & 0x10) !== 0;
          if (badFrame && (l & 7) === ys) {
            if (irqEnd >= 0) irqEnd += 43; else if (until === undefined && work > 0) work += 43;
          }
        }
        if (e === ls) {
          // a line begins: the one before worked out, its sprites' fetches, then the frame and the raster
          C.to(e);
          if (o.dma !== false) { const s = STEAL[C.mask]; if (irqEnd >= 0) irqEnd += s; else if (until === undefined && work > 0) work += s; }
          moved();
          const l = (e % FRAME) / LINE;
          if (l === 0) newFrame(e / FRAME);
          if (l === cmp()) { latch |= 1; take(); }
        }
        if (until !== undefined ? S.clock >= until && irqEnd < 0 : work <= 0 && irqEnd < 0) return;
      }
    }

    const gen = P.program();
    let last = -1;
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      if (y && y.cp !== undefined) {
        if (last >= 0) owed += YIELD[stretch(last, y.cp)] || 0;
        last = y.cp;
        if (y.cp === 0x08CC) S.passes++;
      } else if (y && y.cycles !== undefined) owed += y.cycles;
      const work = Math.max(0, owed);
      owed -= work;
      spend(work);
      if (!(y && (y.cp !== undefined || y.cycles !== undefined))) spend(0, (Math.floor(S.clock / LINE) + 1) * LINE);
      if (o.onCheckpoint && y && y.cp !== undefined) o.onCheckpoint(y.cp, S.clock);
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 400000) throw new Error('the port ran 400,000 yields without the clock reaching its target');
        step();
      }
    };
    S.frameAt = (t) => (S.before && S.before.frame === Math.floor(t / FRAME) - 1 ? S.before : S.shown);
    S.step = step;
    S.collide = C;
    S.cia = cia;
    spend(0);
    return S;
  }
  return { create, COST, bandOf, stretch, STEAL, LINE, LINES, FRAME, SLICES, TIMER };
})();
