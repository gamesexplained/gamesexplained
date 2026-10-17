/* jsw-play */
// The Play tab's C64: the port (jsw-port.js) on a clock and chips of its own, with the sprite
// collisions of the site's model (site/lib/collide.js), for play.html and for test_pace.js, which runs it beside the kit's
// machine and compares the pace.
//
// JSWPlay.create({ M, Port, Collide, keep }) gives the machine. M is the game's 64 KB, as the listing
// holds it; Port is JSWPort and Collide C64Collide; keep is the object the page gives C64.drawFrame,
// whose record of the bytes the video chip reads narrows the memory compared (C64.videoMemory). Its
// costs are COST below, which test_play.js --cost measures and writes.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   keys      the C64's keys held, a Set of the KERNAL's numbers (row x 8 + column, kit/c64/machine.js)
//   joy       joystick port 2: five bits, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of the
//             frame they came in, until the page takes them
//   clock, frames, passes, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code: the port is JavaScript, so each of its routines moves the
// clock on by what the game's own routine costs, its mean over test_play.js's run (for a few, the mean
// for what they are given: KEY), and the code between two of the port's checkpoints that no routine
// of its own accounts for by the mean the game took over that stretch (@yield, by the two checkpoints
// and, after the player update's, by Willy's state as it began), which is less than nothing where a
// routine's cost is charged in the stretch it begins in and its work runs on past it. The long sound
// sweeps say their own cycles. The cost is charged at the port's next yield, where the clock then runs
// to it, taking on the way what falls due:
// - the raster interrupt on its line (the compare line in $D012 and $D011's bit 7, when $D01A
//   enables it), whose handler costs its half's own cycles (@irq) and the routines it calls; while
//   the game has interrupts off (SEI, P.I) it waits until they are on again;
// - each bad line, where the video chip holds the processor for 43 cycles, on the lines 48-247 whose
//   low three bits are $D011's vertical scroll in a frame whose line 48 had the display on, and each
//   line a sprite is fetched on, five cycles for sprite n from cycle 55 + 2n, holds that overlap
//   counting once (kit/skills/c64/c64-reference): the costs are the processor's own cycles, so the
//   page takes the video chip's from them as the machine does;
// - the collisions, worked out as the beam goes (site/lib/collide.js), and read by the port
//   where the game reads them;
// - the start of each frame, which closes the one before for the screen and the sound.
//
// The screen. Each write to the video chip is kept with the line and cycle it came on, at the clock,
// and memory and colour RAM as each frame began with every change after it where the game made it
// (site/lib/c64.js, videoMemory), for C64.drawFrame.
globalThis.JSWPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
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
  // The routines whose cost follows from what they are given: the cost measured for the key their
  // memory gives as they are called (name#key), else their mean.
  const arrows = (M) => { let k = 0; for (let p = 0x2403; p < 0x243F; p += 4) if ((M[p] & 0x7F) === M[0x0E]) k++; return k; };
  const items = (M) => { let k = 0; for (let p = 0x22C3; p < 0x2403; p += 4) if (M[p] === M[0x0E] && !M[p + 3]) k++; return k; };
  const KEY = {
    render_room_items: (M) => (M[0x55] === 1 ? items(M) : 'wait'),
    schedule_guardian_updates: (M) => (M[0x3E] === 1 ? M[0x2D] : 'wait'),
    update_arrows: arrows,
    draw_spare_life_icons: (M) => M[0x41],
    collect_item_if_present: items,
    produce_rope_sprite_staging: (M) => (!M[0x0402] ? 'none' : M[0x1018] === 1 ? 'copy' : 'wait'),
  };
  // the interrupt's half, as its own cost is measured: the title's at line 0 or $EA, the play
  // interrupt's at line 0 or $FB, or paused; the play interrupt's lower half by the work it will do,
  // the rope's staged sprites copied, the spare life's glyphs every 15 frames, and with the tune off
  const bandOf = (M, line) => {
    const half = line & 0x80 ? ':low' : ':top';
    if (M[0x0315] === 0xA8) return 'title' + half;
    if (M[0x36]) return 'paused' + half;
    if (half === ':top') return 'play:top';
    return 'play:low' + (M[0x0402] && !M[0x0407] ? ':rope' : '') + (!M[0x35] ? ':quiet' : M[0x3F] === 1 ? ':glyphs' : '');
  };
  // the stretch between two checkpoints, as @yield keys it
  const stretch = (from, to, M, state) => from.toString(16) + '>' + to.toString(16) + (from === 0x3349 ? '#' + state : '');
  // Measured by test_play.js --cost: each routine's own cycles, @yield and each half's (@irq).
  const COST = {"clear_and_copy_title_screen":13211,"clear_sid_registers":309,"initialize_title_music":142,"fill_title_color_rows":5142,"scan_title_keyboard":1103,"read_title_music_voice1":74,"read_title_music_voice2":70,"read_title_music_voice3":70,"tick_title_music":30,"initialize_game_music":401,"scan_gameplay_input":1164,"expand_packed_room_cell":91,"silence_sid_voice_by_offset":13,"read_game_music_voice1":75,"read_game_music_voice2":71,"tick_game_music":23,"lookup_tile_at_cell":65,"short_busy_wait":3861,"render_room_items":237,"render_room_items#wait":13,"toggle_music_on_return":13,"render_room_items#1":4042,"attach_player_to_rope_if_colliding":16,"room_select_cheat":12,"produce_rope_sprite_staging":578,"produce_rope_sprite_staging#none":18,"initialize_tile_location":25,"handle_grounded_tile":18,"handle_ground_support_tile":52,"grounded_move_right":50,"update_player_grounded":32,"dispatch_state_from_table":28,"update_horizontal_guardian":96,"reset_stack_and_enter_player_tick":16,"draw_spare_life_icons":487,"draw_spare_life_icons#8":610,"schedule_guardian_updates":16,"schedule_guardian_updates#1":67,"animate_bathroom_toilet":28,"update_arrows":690,"update_arrows#0":688,"game_main_loop":75,"schedule_guardian_updates#wait":9,"continue_after_player_update":0,"grounded_move_left":58,"collect_item_if_present":3704,"collect_item_if_present#1":3691,"handle_horizontal_jump_collision":27,"advance_jump_right_position":69,"advance_jump_right":23,"update_player_jumping":28,"render_room_items#0":3956,"handle_upward_jump_collision":20,"probe_jump_ceiling":68,"handle_landing_tile":32,"probe_jump_landing":80,"update_player_falling":41,"advance_jump_left_position":76,"advance_jump_left":22,"enter_or_reconcile_conveyor":71,"update_player_on_conveyor":17,"animate_maria":14,"apply_room32_conveyor_fix":8,"settle_collision_latches":2305,"initialize_room_rope":34,"load_room_guardians":796,"draw_room_ramp":246,"draw_room_conveyor":117,"build_room_visuals":10813,"capture_room_entry_checkpoint":48,"copy_room_record":3876,"initialize_room_vic_state":98,"prepare_room_entry":28,"produce_rope_sprite_staging#wait":21,"produce_rope_sprite_staging#copy":3589,"draw_spare_life_icons#7":540,"run_death_sequence":0,"draw_spare_life_icons#6":470,"draw_spare_life_icons#5":397,"draw_spare_life_icons#4":326,"draw_spare_life_icons#3":254,"draw_spare_life_icons#2":182,"draw_spare_life_icons#1":109,"draw_spare_life_icons#0":38,"game_over_delay_inner":234,"game_over_delay_outer":284,"initialize_game":17254,"game":3,"title_main_loop":17867,"initialize_title":651,"game_over_or_abort_to_title":26307,"update_vertical_guardian":107,"schedule_guardian_updates#5":247,"schedule_guardian_updates#0":22,"schedule_guardian_updates#4":201,"schedule_guardian_updates#2":112,"schedule_guardian_updates#3":157,"render_room_items#12":5032,"align_ramp_animation_phase":19,"update_player_on_ramp":46,"render_room_items#4":4312,"compute_rope_trajectory_pointer":71,"update_player_attached_to_rope":132,"render_room_items#3":4230,"update_arrows#1":726,"schedule_guardian_updates#7":341,"collect_item_if_present#4":3832,"position_arrow_sprite":55,"@yield":{"a7d3>a7d3":15,"a7d3>a7e0":18,"a7e0>2000":14,"2000>2dc6":3,"2dc6>2e07":0,"2e07>2e20":-66,"2e20>2e23":4,"2e23>2e26":4,"2e26>2e29":4,"2e29>2e45":34,"2e45>2e4a":6,"2e4a>2e4f":6,"2e4f>2e52":4,"2e52>2e55":4,"2e55>2e7c":0,"2e7c>2e9c":0,"2e9c>2f28":145,"2f28>2f5a":-38,"2f5a>2fcd":-30,"2fcd>306c":-248,"306c>3072":8,"3072>30a8":194,"30a8>30d9":3,"30d9>30e1":0,"30e1>30ff":-75,"30ff>313f":26,"313f>3270":36,"3270>3275":6,"3275>3392":-2,"3392>30ff":25,"3275>3349":-14,"3349>334f#0":26,"334f>3392":15,"3275>3712":1,"3712>3718":8,"3718>3349":43,"3349>3349#0":35,"3349>334f#1":25,"3349>334f#2":24,"3349>3349#5":40,"3349>3349#4":31,"3349>2dc6#2":18,"313f>3392":-27,"313f>3349":-37,"3349>1c52#2":7,"1c52>334f":30,"1c52>16c0":-3532,"16c0>16c5":6,"16c5>334f":3554,"313f>3712":-34,"1c52>38ef":16,"38ef>2e07":634,"16c5>38ef":3531,"38ef>383b":633,"383b>386d":-25614,"386d>38e7":-223,"38e7>38e7":9,"38e7>386d":702,"38e7>38c1":123,"38c1>38c1":29,"38c1>38d1":22,"38d1>38e7":-496,"38e7>a7d3":-17840,"3349>2dc6#1":17,"3072>306c":118,"2fcd>30a8":-784,"3392>38ef":28,"3392>383b":31,"313f>370a":-16,"370a>3718":11,"30ff>310c":19,"310c>310f":5,"310f>30ff":9,"30ff>30ff":133,"310f>313f":158,"3349>334f#5":45,"3349>334f#4":31,"3349>38ef#2":48,"3349>1c52#6":7,"16c5>1b37":3503,"1b37>334f":100,"16c5>2dc6":3456,"3349>1c52#1":7,"3072>3064":119,"3064>3072":11,"3718>3712":84,"313f>3227":-218,"3227>322c":6,"322c>3349":220,"322c>3392":224,"313f>3231":-230,"3231>3236":6,"3236>3349":218,"3236>3392":222},"@irq":{"title:low":216,"title:top":134,"play:low":2106,"play:top":111,"play:low:glyphs":2745,"play:low:rope":5272,"play:low:rope:glyphs":5911,"paused:low":79,"paused:top":79,"play:low:quiet":2121,"play:low:rope:quiet":5286}};

  function create(o) {
    const M = o.M, Port = o.Port, cost = o.cost || COST, IRQ = cost['@irq'] || {}, YIELD = cost['@yield'] || {};
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    // the registers as the KERNAL leaves them after a load: the game sets the rest
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15; vic[0x20] = 0x0E; vic[0x21] = 0x06;
    const cia = { pra: 0x7F, ddra: 0xFF, ddrb: 0, pra2: 0x97, ddra2: 0x3F };
    const keys = new Set();
    const S = { clock: 0, frames: 0, passes: 0, shown: null, sound: [], keys, joy: 0x1F, vic, colour, sid, M };
    const bank = () => (3 - ((cia.pra2 | ~cia.ddra2) & 3)) << 14;
    const C = o.Collide.create(vic, (a) => M[bank() | a], (i) => colour[i]);
    let done = -1, latch = 0, inIrq = false, owed = 0, irqOwed = 0, badFrame = false, pending = false, irqLeft = 0;
    // the memory the video chip reads, as each frame began and changed after (the node tests that
    // draw nothing load no C64, and their frames carry no memory)
    const vm = globalThis.C64 ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: [cia.pra2, cia.ddra2], writes: [], mem: m.mem, colour: m.colour };
    };
    // The interrupt's handler runs at once, as it is taken, and its cycles are spent after it, while
    // irqLeft counts them down; the memory it changes is logged where they end, not where they
    // begin. The title's half at line $EA copies the ticker's row a character on after the video
    // chip has fetched the row on line $EB, so the moved row shows from the next frame; logged at
    // line $EA, it showed in this one, under the fine scroll for the row before it, and the text
    // jumped left 9 pixels and back 7 every eighth frame.
    const moved = () => { if (vm && irqLeft <= 0) vm.at(S.clock, cur.writes, bank() >> 14); };
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
        return vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x19) { latch &= ~v & 15; return; }
        C.to(S.clock);
        vic[r] = v;
        if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
      },
      collide: (r) => C.read(r, S.clock),
      sidWrite(r, v) { r &= 0x1F; sid[r] = v; curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v); },
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      // CIA 1: the keyboard's rows out on port A, its columns in on port B; joystick 2 on port A
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
        return 0;
      },
      ciaWrite(r, v) { r &= 15; if (r === 0) cia.pra = v; else if (r === 2) cia.ddra = v; else if (r === 3) cia.ddrb = v; },
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
    const P = Port.create(M, io);
    S.P = P;
    // each routine's cost, charged as the port calls it: in the interrupt, to the interrupt's
    for (const name of Object.keys(P)) {
      const f = P[name], base = cost[name] || 0, key = KEY[name];
      if (typeof f !== 'function' || name === 'title_irq' || name === 'game_irq') continue;
      const c = key ? () => { const k = cost[name + '#' + key(M)]; return k === undefined ? base : k; } : () => base;
      const charge = (n) => { if (inIrq) irqOwed += n; else owed += n; };
      if (f instanceof GENERATOR) P[name] = function* (...a) { charge(c()); return yield* f.apply(this, a); };
      else P[name] = function (...a) { charge(c()); return f.apply(this, a); };
    }

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the interrupt, through the vector at $0314: its half's own cycles, and the routines it called
    function irq() {
      pending = false;
      const at = M[0x0314] | M[0x0315] << 8, f = at === 0xA801 ? P.title_irq : at === 0x33E1 ? P.game_irq : null;
      if (!f) return 0;
      const band = bandOf(M, line());
      inIrq = true; irqOwed = 0;
      try { f.call(P); } finally { inIrq = false; }
      const c = (IRQ[band] || 0) + irqOwed;
      irqLeft += c;
      return c;
    }
    // Run the processor through `work` cycles, taking the frames, the interrupts, the bad lines and
    // the sprites' fetches on the way; an interrupt's cycles and the video chip's while there is
    // work to do are more work.
    function spend(work) {
      if (pending && !P.I) work += irq();
      for (;;) {
        const ls = (Math.floor(done / LINE) + 1) * LINE, f0 = Math.floor(done / FRAME) * FRAME;
        // the next bad line's cycle 12 in this frame, or the next line's start
        const ys = vic[0x11] & 7, ln = Math.floor((done - f0) / LINE);
        let b = Infinity;
        if (o.dma !== false) {
          let bl = done - f0 - ln * LINE < 11 ? ln : ln + 1;
          if (bl < 48) bl = 48;
          if (bl > 48) bl += (ys - bl) & 7;
          if (bl <= 247) b = f0 + bl * LINE + 11;
        }
        const ie = irqLeft > 0 ? S.clock + irqLeft : Infinity;
        const e = Math.min(ls, b, ie), end = S.clock + work;
        if (e > end) { S.clock = end; done = end; C.to(S.clock); moved(); return; }
        if (e > S.clock) {
          work = Math.max(0, work - (e - S.clock));
          if (irqLeft > 0 && (irqLeft -= e - S.clock) <= 0) { irqLeft = 0; S.clock = e; irqEnded(); }
          S.clock = e;
        }
        done = e;
        if (e === b) {
          const l = (e - f0 - 11) / LINE;
          if (l === 48) badFrame = (vic[0x11] & 0x10) !== 0;
          if (badFrame && (l & 7) === ys && work > 0) { work += 43; if (irqLeft > 0) irqLeft += 43; }
          continue;
        }
        if (e !== ls) continue;
        // a line begins: the one before worked out, its sprites' fetches, then the frame and the raster
        C.to(e);
        if (o.dma !== false && work > 0) { work += STEAL[C.mask]; if (irqLeft > 0) irqLeft += STEAL[C.mask]; }
        moved();
        const l = (e % FRAME) / LINE;
        if (l === 0) newFrame(e / FRAME);
        if (l === cmp()) {
          latch |= 1;
          if (vic[0x1A] & 1) { if (P.I) pending = true; else work += irq(); }
        }
      }
    }

    const gen = P.program();
    let last = -1, state = 0;
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      if (y && y.cp !== undefined) {
        if (last >= 0) owed += YIELD[stretch(last, y.cp, M, state)] || 0;
        last = y.cp; state = M[0x33];
        if (y.cp === 0x30FF) S.passes++;
      } else if (y && y.cycles !== undefined) owed += y.cycles;
      const work = Math.max(0, owed);
      owed -= work;
      spend(work);
      if (o.onCheckpoint && y && y.cp !== undefined) o.onCheckpoint(y.cp, S.clock);
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 200000) throw new Error('the port ran 200,000 yields without the clock reaching its target');
        step();
      }
    };
    S.step = step;
    S.collide = C;
    spend(0);
    return S;
  }
  return { create, COST, KEY, bandOf, stretch, STEAL, LINE, LINES, FRAME, SLICES };
})();
