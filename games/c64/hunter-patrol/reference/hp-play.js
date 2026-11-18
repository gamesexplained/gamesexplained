/* hp-play.js */
// The Play tab's C64: the port (hp-port.js) on a clock and chips of its own, for play.html and for
// test_play.js, which runs it beside the kit's machine and compares the pace.
//
// HunterPlay.create({ M, cost, keep, CPU, saveScores }) gives the machine. M is the game's 64 KB as
// the listing holds it; cost the measured costs (COST, below, by default); keep the object the page
// gives C64.drawFrame (C64.videoMemory); CPU the kit's 6502 (C64Cpu.CPU on the page), for the title's
// music, which is the game's own player run as the Music tab runs it; saveScores(table) keeps the
// highscore table the cracker's saver would have written to the disk.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy       the joystick in port 1, which the game reads at $DC01: five bits, 0 for pressed (up 1,
//             down 2, left 4, right 8, fire 16)
//   keys      more bits of $DC01 held low by the keyboard (the trainer's key, $20)
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of the
//             frame they came in, until the page takes them
//   clock, frames, vic, colour, sid, P
//
// The clock. Nothing here runs the game's code, but for the music player. The game paces itself by
// the raster and by delay loops: the port names each delay's cycles as it reaches it ({ cycles }),
// and a turn of a loop that polls the raster moves the clock to the start of the next line. The rest
// of the game's work is fitted by test_play.js --cost to the cycles the game took on the kit's
// machine, its delays, polls and interrupts taken out: a base for each pair of checkpoints (@yield,
// from the stretch's first to its last) and a cost for each call of one of P's routines (@fn,
// charged as the call is made, so that a pass that sorts more objects costs more). A pair no session
// met takes the cost of the stretches that end at the same checkpoint (@to), and with none of those
// either, a line, so that a loop along it still moves the clock.
//
// The interrupts. On the title, CIA 1's timer A, latched at $4800 by the music's start ($ADD0), runs
// the music ($AE03) every 18,433 cycles. In play the video chip interrupts on the raster lines the
// game's bands name ($13AB: the sky's sprites, the ground's, the score row) and on a sprite meeting a
// sprite ($D019 bit 2), which collide.js raises as the beam draws them. Each handler costs its
// measured cycles (@irq, by the handler's address). The game turns interrupts off while it sets the
// raster up ($1370) and while the cracker's saver runs; one that comes meanwhile waits for P.I to
// clear.
//
// The chips. CIA 1's timer A counts the clock down from its latch; its low and high bytes are the
// game's random numbers, with voice 3's noise ($D41B, the SID's shift register as reSID keeps it) and
// the raster line. The sprite collisions ($D01E, $D01F) are site/lib/collide.js, given the clock at
// each write to the video chip and each line. Each write to the video chip is kept with the line and
// cycle it came on, and memory and colour RAM as each frame began with every change after it where
// the game made it (site/lib/c64.js, videoMemory), for C64.drawFrame. The SID's writes go to the
// page's sound in twelfths of a frame.
globalThis.HunterPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12;
  const COST = {"@yield":{"11b1>11b1":202,"11b1>11c2":201,"11c2>11c2":9,"11c2>1460":14,"12eb>1310":238,"1310>12eb":24,"1310>135f":419,"135f>135f":16,"135f>1456":12,"1450>1456":0,"1456>145d":12,"145d>11b1":10,"145d>12eb":547,"1460>24d9":5090,"1463>1466":85,"1466>193c":6,"146a>1471":82,"1471>1478":11,"1471>147b":12,"1478>147b":926,"1478>2a58":1614,"147b>1928":17,"147e>1481":7,"1481>1488":-113,"1481>148b":-274,"1488>148b":839,"1488>2a58":1666,"148b>1492":-79,"148b>1495":-83,"1492>1495":550,"1495>1498":19,"1498>149b":288,"1498>2a58":1332,"149b>149e":29,"149b>24d9":3630,"149e>14a1":7,"14a1>1466":135,"14a1>14a9":115,"14a1>26da":100,"14a9>1456":3,"1928>192d":7,"192d>1932":7,"1932>147e":18,"1932>2a6b":18,"193c>146a":24,"193c>2a5e":23,"24d9>1463":-27345,"24d9>147b":-23185,"24d9>148b":-23059,"24d9>149b":-24300,"24d9>149e":66,"24d9>2a8e":74,"26da>26e4":13,"26e4>1466":190,"26e4>2a5b":198,"2a58>2b83":34550,"2a5b>193c":6,"2a5e>2a65":541,"2a65>2a68":6,"2a68>1928":17,"2a6b>2a6e":3,"2a6e>2a75":-7,"2a6e>2a7b":-145,"2a75>2a78":423,"2a78>2a7b":151,"2a7b>2a82":-80,"2a7b>2a88":-96,"2a82>2a85":217,"2a85>2a88":67,"2a88>2a8b":19,"2a8b>24d9":3635,"2a8b>2a8e":26,"2a8e>2a91":7,"2a91>26da":100,"2a91>2a58":145,"2a91>2a5b":141,"2a91>2aa7":215,"2aa7>2e80":1470,"2b83>2b83":9,"2b83>2b8a":8,"2b8a>2b8a":9,"2b8a>2b9b":405,"2b9b>2b9b":9,"2b9b>2ba5":12,"2ba5>2a5b":229,"2e80>2e80":9,"2e80>2e87":8,"2e87>2e87":9,"2e87>2e98":405,"2e98>24d9":4666,"2e98>2e98":9},"@to":{"1310":238,"1456":6,"1460":14,"1463":-27345,"1466":135,"1471":82,"1478":11,"1481":7,"1488":-113,"1492":-79,"1495":127,"1498":19,"1928":17,"1932":7,"11b1":202,"11c2":9,"12eb":97,"135f":16,"145d":12,"146a":24,"147b":336,"147e":18,"148b":318,"149b":287,"149e":29,"14a1":7,"14a9":115,"192d":7,"193c":6,"24d9":3864,"26da":100,"26e4":13,"2a58":503,"2a5b":141,"2a5e":23,"2a65":541,"2a68":6,"2a6b":18,"2a6e":3,"2a75":-7,"2a78":423,"2a7b":5,"2a82":-80,"2a85":217,"2a88":-44,"2a8b":19,"2a8e":26,"2a91":7,"2aa7":215,"2b83":18,"2b8a":9,"2b9b":9,"2ba5":12,"2e80":9,"2e87":9,"2e98":9},"@fn":{"add_score":403,"bar_fill_bits":43,"colour_play":16647,"colour_title":16653,"colour_title_rows":5036,"engine_sound":34,"fire_shot":40,"free_aircraft":199,"free_ground":114,"free_shots":84,"hill_column_left":1089,"hill_column_right":1150,"hit_sound":18,"init_noise":36,"init_video":754,"insert_row":1733,"insert_score":115,"move_aircraft":16,"move_by_scroll":64,"move_flak_record":11,"move_left":78,"move_plane":38,"move_right":95,"move_shot_records":71,"move_shots":87,"move_stripes":25,"music_start":184,"place_flak":131,"plane_shadow":66,"point_aircraft":75,"point_aircraft_template":67,"point_flak":28,"point_flak_template":82,"point_ground":63,"point_ground_template":83,"point_shot":45,"point_shot_template":158,"point_stripe":177,"point_stripe_template":153,"read_joystick":10,"reload_video":795,"save_highscores":1326,"scroll_left":1580,"scroll_right":1502,"set_fine_scroll":16,"set_hits_needed":29,"shot_sound":24,"show_score_row":131,"show_target_hits":176,"sort_aircraft":672,"sort_ground":716,"sort_shot":369,"spawn_aircraft":327,"spawn_flak":30,"start_engine_sound":369,"start_music":21,"target_hit":17},"@irq":{"13ab":553,"ae03":1101}};
  const stretch = (from, to) => from.toString(16) + '>' + to.toString(16);

  // voice 3's noise, as reSID keeps it (oscillator 3's output: bits 20, 18, 14, 11, 9, 5, 2, 0)
  function noise() {
    let sr = 0x7FFFF8, acc = 0, at = 0;
    return {
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
    const M = o.M, cost = o.cost || COST, YIELD = cost['@yield'] || {}, IRQ = cost['@irq'] || {}, FN = cost['@fn'] || {}, TO = cost['@to'] || {};
    // The listing has no bytes for $4400-$453F (the play screen's sky rows, filled before the
    // snapshot's entry point); the reference shot shows them blank, so the page fills them with spaces.
    // The lockstep test drives the port directly, on the listing's bytes alone.
    if (o.fillSky !== false) {
      for (let a = 0x4400; a < 0x4540; a++) if (!M[a]) M[a] = 0x20;
      // Row 23 likewise: the game writes "DISTANCE TO TARGET" there only after a strafing run ($2E30).
      for (let i = 0; i < 0x20; i++) if (!M[0x479C + i]) M[0x479C + i] = M[0x8B60 + i];
    }
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    const cia2 = [0x97, 0x3F];
    const S = { clock: 0, frames: 0, shown: null, sound: [], joy: 0x1F, keys: 0, vic, colour, sid, M, yields: 0 };
    const bus = globalThis.C64Sid ? globalThis.C64Sid.engine().createBus('6581') : null;
    const osc = noise();
    const bank = () => (3 - (cia2[0] & 3)) << 14;
    const coll = globalThis.C64Collide.create(vic, (a) => M[bank() | (a & 0x3FFF)], (i) => colour[i]);
    coll.at(0);
    // CIA 1's timer A as the machine starts: latch $FFFF, stopped, its interrupt masked
    const ta = { lat: 0xFFFF, cnt: 0xFFFF, run: false, at: 0, mask: 0, icr: 0, cr: 0, next: Infinity };
    let latch = 0, done = -1, owed = 0, irqLeft = 0, pending = false;
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: cia2.slice(), writes: [], mem: m.mem, colour: m.colour };
    };
    const slices = () => Array.from({ length: SLICES }, () => []);
    let cur = begin(0), curSound = slices();
    const moved = () => { if (vm) vm.at(S.clock, cur.writes, 0); };
    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const cmp = () => vic[0x12] | (vic[0x11] & 0x80) << 1;
    const record = (a, v) => cur.writes.push([line(), S.clock % LINE + 1, a, v]);
    const osc3 = () => {
      const t = Math.max(S.clock, osc.at + 14);
      osc.step(t - osc.at, sid[0x0E] | sid[0x0F] << 8, sid[0x12] & 8);
      osc.at = t;
      return sid[0x12] & 0x80 ? osc.out() : 0;
    };
    // the timer's counter at the clock, and the cycle of its next underflow
    function timer() {
      if (ta.run) {
        const dt = S.clock - ta.at;
        if (dt > 0) {
          if (ta.cnt >= dt) ta.cnt -= dt;
          else { const left = dt - ta.cnt - 1; ta.cnt = ta.lat - (left % (ta.lat + 1)); ta.icr |= 1; }
          ta.at = S.clock;
        }
        ta.next = S.clock + ta.cnt + 1;
      } else { ta.at = S.clock; ta.next = Infinity; }
      return ta.cnt;
    }
    const io = {
      read(a) {
        if (a >= 0xD000 && a < 0xD400) {
          const r = a & 0x3F;
          if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
          if (r === 0x12) return line() & 255;
          if (r === 0x1E || r === 0x1F) { coll.to(S.clock + 1); latch |= coll.irq(S.clock + 1); return coll.read(r, S.clock); }
          if (r === 0x19) return latch | 0x70 | (latch & vic[0x1A] & 15 ? 0x80 : 0);
          if (r === 0x1A) return vic[0x1A] | 0xF0;
          return r > 0x2E ? 0xFF : vic[r];
        }
        if (a >= 0xD400 && a < 0xD800) return (a & 0x1F) === 0x1B ? osc3() : 0;
        if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
        if (a >= 0xDC00 && a < 0xDD00) {
          const r = a & 15;
          if (r === 0) return 0xE0 | 0x1F;
          if (r === 1) return 0xE0 | S.joy & ~S.keys & 0xFF;
          if (r === 4) return timer() & 255;
          if (r === 5) return timer() >> 8;
          if (r === 13) { timer(); const v = ta.icr | (ta.icr & ta.mask ? 0x80 : 0); ta.icr = 0; return v; }
          if (r === 14) return ta.cr;
          return 0;
        }
        const r = a & 15;
        return r === 0 ? cia2[0] : r === 2 ? cia2[1] : 0;
      },
      write(a, v) {
        if (a >= 0xD000 && a < 0xD400) {
          const r = a & 0x3F;
          if (r === 0x1E || r === 0x1F) return;
          if (r === 0x19) { latch &= ~v & 15; return; }
          coll.to(S.clock + 1);
          vic[r] = v;
          if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
          return;
        }
        if (a >= 0xD400 && a < 0xD800) {
          const r = a & 0x1F;
          if (r === 0x0E || r === 0x0F || r === 0x12) osc3();
          sid[r] = v; if (bus) bus.write(v, S.clock);
          curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v);
          return;
        }
        if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
        if (a >= 0xDC00 && a < 0xDD00) {
          const r = a & 15;
          timer();
          if (r === 4) ta.lat = (ta.lat & 0xFF00) | v;
          else if (r === 5) { ta.lat = (ta.lat & 0xFF) | v << 8; if (!ta.run) ta.cnt = ta.lat; }
          else if (r === 13) { if (v & 0x80) ta.mask |= v & 0x1F; else ta.mask &= ~v & 0x1F; }
          else if (r === 14) { if (v & 0x10) ta.cnt = ta.lat; ta.cr = v & 0xEF; ta.run = (v & 1) !== 0; }
          timer();
          return;
        }
        const r = a & 15;
        if (r === 0) cia2[0] = v; else if (r === 2) cia2[1] = v;
      },
      irqByte: (a) => M[a],
    };
    const P = globalThis.HunterPort.create(M, io, { CPU: o.CPU, saveScores: o.saveScores });
    S.P = P;
    // each call of one of P's routines from the main program moves the clock on by its cost (@fn),
    // counted by the port in P.ticks
    const charge = () => {
      const t = P.ticks;
      for (const k in t) { owed += (FN[k] || 0) * t[k]; delete t[k]; }
    };
    let inIrq = false;

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    const asserted = () => (latch & vic[0x1A] & 15) !== 0 || (ta.icr & ta.mask & 0x1F) !== 0;
    // the interrupt, through the vector at $0314
    function irq() {
      pending = false;
      const at = M[0x0314] | M[0x0315] << 8, f = P.irqs[at];
      charge();
      inIrq = true;
      try { if (f) f.call(P); } finally { inIrq = false; }
      for (const k in P.ticks) delete P.ticks[k];
      const c = IRQ[at.toString(16)] || 0;
      irqLeft += c;
      return c;
    }
    // Run the processor through `work` cycles, and on to cycle `until` if that is later (a wait),
    // taking the lines, the frames, the raster's line and the timer's underflows on the way; an
    // interrupt's cycles while there is work to do are more work.
    function spend(work, until = -1) {
      for (;;) {
        if (pending && !P.I && irqLeft <= 0) work += irq();
        const ls = (Math.floor(done / LINE) + 1) * LINE;
        const f0 = Math.floor(done / FRAME) * FRAME, c = cmp();
        let ri = Infinity;
        if (c < LINES) { ri = f0 + c * LINE; if (ri <= done) ri += FRAME; }
        timer();
        const ti = ta.next, ie = irqLeft > 0 ? S.clock + irqLeft : Infinity;
        const e = Math.min(ls, ri, ti, ie), end = Math.max(S.clock + work, until);
        if (e > end) { S.clock = end; done = end; moved(); return; }
        if (e > S.clock) {
          work = Math.max(0, work - (e - S.clock));
          if (irqLeft > 0 && (irqLeft -= e - S.clock) <= 0) irqLeft = 0;
          S.clock = e;
        }
        done = e;
        if (e === ti) { timer(); if (ta.icr & ta.mask & 1) pending = true; }
        if (e === ri) { latch |= 1; if (vic[0x1A] & 1) pending = true; }
        if (e === ls) {
          moved();
          coll.to(e);
          const b = coll.irq(e);
          if (b) { latch |= b; if (b & vic[0x1A]) pending = true; }
          if ((e % FRAME) === 0) newFrame(e / FRAME);
        }
        if (pending && !asserted()) pending = false;
      }
    }

    let gen = P.program(), last = 0x1450;                        // the stretch from the start is $1450's
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      S.yields++;
      charge();
      if (o.onYield) o.onYield(y, S.clock);
      if (y && y.cycles !== undefined) {
        owed += y.cycles;
        if (y.at !== undefined) last = y.at;
      } else if (y && y.cp !== undefined) {
        const c = YIELD[stretch(last, y.cp)], e = TO[y.cp.toString(16)];
        let k = c !== undefined ? c : e !== undefined ? e : LINE;
        // a turn of a loop that names its head costs at least its own three instructions (LDA, AND,
        // branch), so that a loop no session measured still moves the clock
        if (y.cp === last && k < 9) k = 9;
        owed += k;
        last = y.cp;
      } else {                                                   // a turn of a polling loop: to the next line
        spend(Math.max(0, owed)); owed = 0;
        spend(0, (Math.floor(S.clock / LINE) + 1) * LINE);
        return;
      }
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
  return { create, COST, stretch, LINE, LINES, FRAME, SLICES };
})();
if (typeof module !== 'undefined') module.exports = globalThis.HunterPlay;
