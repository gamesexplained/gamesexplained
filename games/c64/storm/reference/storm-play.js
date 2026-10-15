/* storm-play */
// The Play tab's C64: the port (storm-port.js) on a clock and chips of its own, for play.html and
// for test_pace.js, which runs it beside the kit's machine and compares the pace.
//
// StormPlay.create({ M, Port }) gives the machine. M is the game's 64 KB, as the listing holds it;
// Port is StormPort. Its costs are COST below, which test_play.js --cost measures and writes.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy       [port 1, port 2]: five bits each, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   shown     the last whole frame, for C64.drawFrame: { vic, writes } (frame is its number)
//   sound     each frame's SID writes, [register, value, ...], until the page takes them
//   clock, frames, passes, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code but the title tune's (in storm-port.js): the port is
// JavaScript, so each of its routines moves the clock on by what the game's own routine costs, the
// game's mean over test_play.js's run (for a few, the mean for what they are given: KEY), and the
// main program's own code by @yield for each stretch between two checkpoints. The cost is charged at the port's next yield, where the clock then
// runs to it, taking on the way what falls due:
// - the raster interrupt on its line (the compare line in $D012 and $D011's bit 7, when $D01A
//   enables it), whose handler costs its band's own cycles (@irq) and the routines it calls;
// - each bad line, where the video chip holds the processor for cycles 12-54 (43 cycles) on the
//   lines 48-247 whose low three bits are $D011's vertical scroll, in a frame whose line 48 had
//   the display on (kit/skills/c64/c64-reference): the costs are the processor's own cycles, so
//   the page takes the video chip's from them as the machine does;
// - the start of each frame, which closes the one before for the screen and the sound.
// A raster wait ({ wait: line }) runs the clock to that line; a bare yield, one turn of a polling
// loop, to the next line. A routine whose own code waits (@after: restore_bg, clear_screen,
// wait_frame) is charged when it returns, since its work comes after the wait.
//
// The screen. Each write to the video chip is kept with the line and cycle it came on: the main
// program's at the clock, the interrupt handler's where VICE showed them in a frame of play
// (index.html's ST_FRAME), so the colour and font changes fall where the game puts them.
globalThis.StormPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES;
  // The bands' writes to the video chip, [line, cycle], in the order each band makes them:
  // message_band ($7DC0) sets $D021, $D016 and $D018, play_band ($7DE7) $D016, $D018 and $D021,
  // panel_band ($7E1C) $D018 and $D021. message_band's $D018, which writes the value it holds and
  // so is not in the recording, comes 20 cycles after its $D016 by the instructions between them.
  const BAND_AT = { 0x7DC0: [[89, 59], [90, 13], [90, 33]], 0x7DE7: [[98, 36], [98, 62], [99, 5]], 0x7E1C: [[256, 54], [256, 60]] };
  const BAND = { 0x7DC0: 'message_band', 0x7DE7: 'play_band', 0x7E16: 'frame_mark', 0x7E1C: 'panel_band' };
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  // The routines whose cost follows from what they are given: the cost is the one measured for
  // the key their memory gives as they are called (name#key), else their mean. A block's width
  // and height ($8111, $8113) for the routines that walk a block cell by cell.
  const KEY = {
    put_block: (M) => M[0x8111] << 4 | M[0x8113],
    compose: (M) => M[0x8111] << 4 | M[0x8113],
    restore_bg: (M) => M[0x8111] << 4 | M[0x8113],
  };
  // The interrupt's band, as its own cost is measured: panel_band moves the message line on one
  // frame in four, when the fine scroll comes round to 7, and counts it at $8136.
  const bandOf = (M, at, step) => (BAND[at] || '?') + (at === 0x7E1C && step ? '+scroll' : '');
  // Measured by test_play.js --cost: each routine's own cycles, @yield, @after and each band's (@irq).
  const COST = {"copy_rom_font":6434,"reset_walls":22101,"reset_objects":20075,"start_places":42,"sfx_reset":259,"clear_message":855,"clear_panel":4550,"clear_screen":6411,"col_address":38,"cell_address":18,"put_block":332,"put_block#66":430,"floor_run":138,"draw_floor":481,"door_record":15,"put_block#33":137,"wall_run":345,"draw_walls":774,"sfx_update":119,"music_play":1221,"open_exits":140,"draw_border":158,"chars_address":70,"compose":2909,"compose#50":2243,"put_block#50":336,"put_actor":30,"draw_saved":24,"draw_actor":6,"draw_generators":852,"draw_object":87,"compose#34":1530,"put_block#34":242,"draw_objects":732,"load_a":288,"compose#66":2954,"put_player":252,"save_a":272,"load_b":288,"save_b":272,"draw_players":67,"enter_room":320,"game_init":376,"music_init":1204,"wait_frame":6,"music_stop":255,"print_bcd":45,"print_score":49,"shot_move":16,"shots_update":49,"delay":12865,"next_monster":29,"move_monster":99,"spawn":37,"edge_check":27,"room_exits":58,"print_energies":60,"restore_bg":212,"restore_bg#66":214,"redraw_player":40,"joystick":52,"sfx_start":459,"compose_one":272,"shot_step":145,"control":46,"players_update":67,"shot_unplot":55,"random":46,"shot_end":12,"column_test":77,"walk":50,"trap_wall":110,"obj_width":41,"restore_bg#50":170,"trap_object":121,"trap_fire":695,"touch_object":207,"obj_effect":78,"row_test":75,"lose_energy":69,"sfx_stop":36,"gen_cell":26,"spawn_up":44,"spawn_right":57,"blocked_flag":15,"spawn_down":67,"spawn_left":55,"mon_cell":26,"distance":61,"touch_damage":13,"redraw_monster":108,"draw_kind2":57,"step_monster":162,"shot_hit":64,"mon_damage":30,"draw_kind6":66,"erase_generator":116,"draw_kind1":54,"erase_monster":79,"draw_kind4":57,"draw_kind3":54,"draw_kind5":72,"restore_bg#34":126,"warn":43,"player_dies":1459,"ins_clear":6844,"show_pages":9308,"instructions":970,"@yield":16,"@after":["clear_screen","restore_bg","wait_frame"],"@irq":{"message_band":183,"play_band":224,"frame_mark":127,"panel_band":160,"panel_band+scroll":835}};

  function create(o) {
    const M = o.M, Port = o.Port, cost = o.cost || COST, AFTER = new Set(cost['@after'] || []), IRQ = cost['@irq'] || {};
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    // the registers as the KERNAL leaves them after a load: the game sets the rest
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15; vic[0x20] = 0x0E; vic[0x21] = 0x06;
    const joy = [0x1F, 0x1F];
    const S = { clock: 0, frames: 0, passes: 0, shown: null, sound: [], joy, vic, colour, sid, M };
    let done = -1, latch = 0, inIrq = false, bandK = 0, owed = 0, irqOwed = 0, badFrame = false;
    let cur = { frame: 0, vic: Array.from(vic.subarray(0, 47)), writes: [] }, curSound = [];

    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const cmp = () => vic[0x12] | (vic[0x11] & 0x80) << 1;
    function record(r, v) {
      if (r === 0x12 || r === 0x19 || r === 0x1A) return;
      const at = inIrq && BAND_AT[M[0x7DAB] | M[0x7DAC] << 8];
      const w = at && bandK < at.length ? at[bandK++] : [line(), S.clock % LINE + 1];
      cur.writes.push([w[0], w[1], 0xD000 + r, v]);
    }
    const io = {
      vicRead(r) {
        r &= 0x3F;
        if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
        if (r === 0x12) return line() & 255;
        if (r === 0x19) return latch | 0x70 | (latch & vic[0x1A] & 15 ? 0x80 : 0);
        return vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x19) { latch &= ~v & 15; return; }
        vic[r] = v; record(r, v);
      },
      sidWrite(r, v) { r &= 0x1F; sid[r] = v; curSound.push(r, v); },
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      ciaRead(r) { r &= 15; return r === 0 ? 0xE0 | joy[1] : r === 1 ? 0xE0 | joy[0] : 0; },   // $DC00 port 2, $DC01 port 1
      ciaWrite() {},
      cia2Read(r) { return (r & 15) === 0 ? 0xC7 : 0; },
      cia2Write() {},
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
      if (typeof f !== 'function' || name === 'irq') continue;
      const c = key ? () => { const k = cost[name + '#' + key(M)]; return k === undefined ? base : k; } : () => base;
      const charge = (n) => { if (inIrq) irqOwed += n; else owed += n; };
      if (f instanceof GENERATOR) {
        P[name] = AFTER.has(name)
          ? function* (...a) { const n = c(), r = yield* f.apply(this, a); charge(n); return r; }
          : function* (...a) { charge(c()); return yield* f.apply(this, a); };
      } else P[name] = function (...a) { charge(c()); return f.apply(this, a); };
    }

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = { frame: n, vic: Array.from(vic.subarray(0, 47)), writes: [] };
      S.sound.push(curSound); curSound = [];
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the interrupt's cycles: its band's own, and the routines it called
    function irq() {
      latch |= 1;
      if (!(vic[0x1A] & 1)) return 0;
      const step = M[0x8136];
      inIrq = true; bandK = 0; irqOwed = 0;
      try { P.irq(); } finally { inIrq = false; }
      return (IRQ[bandOf(M, M[0x7DAB] | M[0x7DAC] << 8, M[0x8136] !== step)] || 0) + irqOwed;
    }
    // The next cycle 12 after done of line 48, where the frame's display bit is read, or of a line
    // whose low bits are the vertical scroll as it stands, up to line 247.
    function nextBad() {
      const f0 = Math.floor(done / FRAME) * FRAME, ys = vic[0x11] & 7;
      let ln = Math.max(48, Math.floor((done - f0 - 11) / LINE) + 1);
      if (ln > 48) ln += (ys - ln) & 7;
      return ln <= 247 ? f0 + ln * LINE + 11 : f0 + FRAME + 48 * LINE + 11;
    }
    // Run the processor through `work` cycles, and on to cycle `until` if that is later (a wait),
    // taking the frames, the interrupts and the bad lines on the way; an interrupt's cycles and a
    // bad line's while there is work to do are more work.
    function spend(work, until) {
      for (;;) {
        const f0 = Math.floor(done / FRAME) * FRAME, f = f0 + FRAME, c = cmp();
        let i = Infinity;
        if (c < LINES) { i = f0 + c * LINE; if (i <= done) i += FRAME; }
        const b = o.dma === false ? Infinity : nextBad(), e = Math.min(f, i, b), end = Math.max(S.clock + work, until);
        if (e > end) { S.clock = end; done = end; return; }
        if (e > S.clock) { work = Math.max(0, work - (e - S.clock)); S.clock = e; }
        done = e;
        if (f === e) newFrame(e / FRAME);
        if (b === e) {
          const ln = (e % FRAME - 11) / LINE;
          if (ln === 48) badFrame = (vic[0x11] & 0x10) !== 0;
          if (badFrame && (ln & 7) === (vic[0x11] & 7) && work > 0) work += 43;   // a wait's polls lose the cycles, not the wait
        }
        if (i === e) work += irq();
      }
    }

    const gen = P.program();
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      if (y && (y.cp !== undefined || y.wait !== undefined)) owed += cost['@yield'] || 0;
      const work = owed;
      owed = 0;
      if (y && y.wait !== undefined) {
        spend(work, -1);
        if (line() !== y.wait) {
          let t = Math.floor(S.clock / FRAME) * FRAME + y.wait * LINE;
          if (t <= S.clock) t += FRAME;
          spend(0, t);
        }
        if (o.onWait) o.onWait(S.clock);
      } else if (y && y.cp !== undefined) {
        spend(work, -1);
        if (y.cp === 0x78D7) S.passes++;
        if (o.onCheckpoint) o.onCheckpoint(y.cp, S.clock);
      } else {
        spend(work, -1);
        spend(0, (Math.floor(S.clock / LINE) + 1) * LINE);
      }
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 200000) throw new Error('the port ran 200,000 yields without the clock reaching its target');
        step();
      }
    };
    S.step = step;
    spend(0, 0);
    return S;
  }
  return { create, COST, KEY, bandOf, LINE, LINES, FRAME };
})();
