/* az-play */
// The Play tab's C64: the port (az-core.js and its groups, az-g*.js) on a clock and chips of its own,
// for play.html and for test_play.js, which runs it beside the kit's machine and compares the pace.
//
// AztecPlay.create({ M, groups, cost, keep }) gives the machine. M is the game's 64 KB as the listing
// holds it; groups the port's installers (window.AZ_GROUPS); cost the measured costs (COST, below, by
// default); keep the object the page gives C64.drawFrame (C64.videoMemory).
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy       joystick port 2: five bits, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   keys      the C64's keys held, a Set of the KERNAL's numbers (F1 4, F3 5, RUN/STOP 63)
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of the
//             frame they came in, until the page takes them
//   clock, frames, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code. The game paces itself with delay loops, and the port names
// each delay's cycles exactly as it reaches it ({ cycles }, P.clocked). The rest of the game's work is
// fitted by test_play.js --cost to the cycles the game took on the kit's machine, its delays, polls
// and interrupts taken out: a base for each pair of checkpoints (@yield, from the stretch's first to
// its last) and a cost for each call of one of P's routines (@fn, charged as the call is made, so that
// a stretch holding more of the Gauntlet's steps costs more). A pair no session met takes the cost of
// the stretches that end at the same checkpoint (@to), and with none of those either, a line, so that
// a wait along it still moves the clock. A turn of a polling loop is a line; a raster wait
// ({ wait: line }) runs the clock to the start of that line, the work before it not counted, since
// the line comes at the same moment however long the work took.
// The interrupt is CIA 1's timer A, which the KERNAL left counting down from $4025 and the game never
// changes: one every 16,422 cycles, through the vector at $0314 (the music, $1C00, then the KERNAL's
// exit at $EA31), the game never turning interrupts off. Each costs @irq.all, the average of the
// game's handlers in test_play.js's sessions.
//
// The chips. The timer's low byte ($DC04) is the counter at the clock. CIA 2's timer A ($DD04) stands
// as the tape left it in the game's snapshot (work/entry.vsf: control register $08, stopped, the
// counter at $FFFF), so it reads $FF. The sprite collisions ($D01E) are site/lib/collide.js, given the
// clock at each write to the video chip and each line. Voice 3's oscillator ($D41B) is the SID's noise
// generator as reSID models it (the same model as games/c64/into-the-eagles-nest/reference/en-play.js).
// Each write to the video chip is kept with the line and cycle it came on, and memory and colour RAM as
// each frame began with every change after it where the game made it (site/lib/c64.js, videoMemory),
// for C64.drawFrame. The SID's writes go to the page's sound in twelfths of a frame.
globalThis.AztecPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12, TIMER = 0x4025;
  const COST = {"@yield":{"1000>109c":11396,"109c>10aa":20,"10aa>109c":39,"10aa>1b1d":25312,"121d>121d":371,"121d>61ad":-77,"121d>6cf8":587,"121d>74c2":13574,"121d>7887":10833,"121d>7bd3":7842,"121d>7e9e":191,"1335>109c":11592,"1335>121d":281,"1335>1b1d":-31,"1a78>732d":6,"1a78>73b0":1381,"1b1d>121d":297,"1b1d>1b1d":23,"1b1d>61ad":-602,"1b1d>6364":8747,"1b1d>6cf8":57,"1b1d>74c2":13069,"1b1d>7887":10262,"1b1d>7bd3":7314,"1b1d>7e9e":-339,"1b9c>1b9c":35,"1b9c>1bb0":53,"1b9c>1fd5":57,"1bb0>1b9c":42,"1bb0>1bd2":31,"1bd2>1335":-13902,"1bd2>7e9e":-13355,"1d82>1d82":150,"1d82>1da6":220,"1da6>1da6":87,"1da6>1e9c":125,"1e9c>1e9c":9,"1e9c>7f5e":14,"1eab>1b9c":120026,"1eab>7f5e":15,"1fd5>1bb0":27,"1fd5>1fd5":22,"61ad>1335":-539,"61ad>61ad":20,"61ad>6364":261,"61ad>63d0":4911,"61ad>6470":4071,"6364>6376":14,"6364>638d":16,"6376>63d0":-6426,"638d>63d0":-6851,"63ba>61ad":6123,"63ba>63d0":-445,"63ba>6470":29,"63d0>63ba":107,"63d0>63f3":58,"63f3>63ba":30,"6470>64f7":86660,"64f7>650b":27,"650b>1335":87,"650b>61ad":-14616,"650b>6364":-5817,"6648>109c":17698,"6648>1335":1160,"6648>670e":6148,"6648>6be3":6304,"670e>6724":11,"670e>67ad":41,"6724>673a":9,"6724>67cd":41,"673a>6750":9,"673a>67f2":47,"6750>6766":9,"6750>680c":47,"6766>677c":9,"6766>6827":41,"677c>6847":41,"677c>6be3":382,"67ad>6724":146,"67cd>673a":227,"67f2>6750":289,"680c>6766":356,"6827>677c":326,"6847>6be3":486,"6be3>1335":3886,"6be3>670e":-54,"6be3>6be3":157,"6cf8>6dc1":5870,"6dc1>6dc9":12,"6dc9>1335":-4628,"6dc9>7064":428,"6dc9>7085":425,"6dc9>70b0":427,"6dc9>70e3":73,"6e97>6dc9":766,"6f17>6dc9":165,"6f87>6dc9":163,"7064>70e3":61,"7085>708f":12,"7085>70e3":54,"708f>70e3":52,"70b0>70e3":45,"70e3>1335":13288,"70e3>6dc9":57,"70e3>7189":8827,"7189>6cf8":-13959,"732d>1a78":19,"732d>732d":-4,"732d>73b0":1422,"73b0>1335":3237,"73b0>732d":31,"73b0>73b0":11,"73b0>7523":64,"74c2>74cf":16,"74cf>732d":-283,"74cf>74cf":82,"7523>7523":48,"7523>756e":96,"756e>756e":48,"756e>75a7":72,"75a7>1335":5514,"75a7>732d":4867,"75a7>75a7":27,"75fc>783d":13,"783d>783d":11,"783d>7887":313,"783d>79f3":207,"7887>79f3":92,"78e3>79f3":85,"79f3>7a05":19,"79f3>7aeb":23625,"7a05>1335":-5298,"7a05>75fc":-5327,"7a05>78e3":-19,"7a05>79f3":4,"7aeb>1335":83,"7aeb>7887":-3833,"7bd3>7bd3":11,"7bd3>7dd3":570,"7cf2>1335":-5066,"7cf2>7cf2":233,"7cf2>7dd3":92,"7dd3>7df5":142,"7dd3>7e1d":86,"7df5>1335":-2878,"7df5>7bd3":11546,"7df5>7cf2":18,"7df5>7dd3":0,"7e1d>7e1d":70,"7e1d>7e85":3070,"7e85>1335":119,"7e85>7dd3":33,"7e9e>7f35":5456,"7f35>1335":-5228,"7f35>1d82":70,"7f35>1e9c":11,"7f35>1eab":-66,"7f35>7f35":35,"7f35>7f5e":-21,"7f35>7fcb":-196,"7f5e>7f35":9,"7fcb>1eab":180},"@to":{"1335":1546,"6364":-3117,"6376":14,"6470":225,"6724":69,"6750":169,"6766":257,"6827":41,"6847":41,"7064":429,"7085":426,"7189":8827,"7523":48,"7887":4534,"109c":90,"10aa":20,"121d":345,"1a78":19,"1b1d":23,"1b9c":37,"1bb0":49,"1bd2":31,"1d82":88,"1da6":189,"1e9c":9,"1eab":-17,"1fd5":25,"61ad":128,"638d":16,"63ba":107,"63d0":8,"63f3":58,"64f7":86660,"650b":27,"670e":1717,"673a":71,"677c":281,"67ad":41,"67cd":41,"67f2":47,"680c":47,"6be3":2798,"6cf8":-5037,"6dc1":5870,"6dc9":99,"708f":12,"70b0":427,"70e3":73,"732d":-3,"73b0":11,"74c2":13390,"74cf":80,"756e":48,"75a7":27,"75fc":-5327,"783d":12,"78e3":-19,"79f3":7,"7a05":19,"7aeb":23625,"7bd3":16,"7cf2":27,"7dd3":3,"7df5":142,"7e1d":70,"7e85":3070,"7e9e":-6309,"7f35":35,"7f5e":14,"7fcb":-196},"@fn":{"add_achievements":190,"bridge_check":14,"bridge_colours":18299,"bridge_planks":307,"colour_white":3049,"delay_long":463,"door_colour":24867,"draw_scorecard":12266,"gauntlet_duck":448,"gauntlet_jump":977,"gauntlet_spears":314,"hop_check_down":122,"hop_check_left":35,"hop_check_right":888,"hop_start":612,"hop_stick":51,"hop_trap":93,"hop_traps":24,"music_reset":14038,"music_stage":5291,"piranha_colours":446,"piranha_fish":8,"piranha_swimmer":272,"show_menu":1416,"spear_move":7096,"stairs_blocks":1,"stairs_hit":2,"stairs_rows":13348,"temple_grow":4037,"temple_runner":386,"temple_trap":29,"temple_wall":13703,"vermin_spawn":274},"@irq":{"all":124}};

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
    // the KERNAL's bytes as the game starts on them: the interrupt's vector at its own handler, the
    // cursor's colour (light blue), and $91 with no STOP key held
    M[0x0314] = 0x31; M[0x0315] = 0xEA; M[0x0286] = 0x03; M[0x91] = 0xFF;
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x14;          // the screen as the KERNAL leaves it
    const cia2 = [0x97, 0x3F];
    const keys = new Set();
    const S = { clock: 0, frames: 0, shown: null, sound: [], keys, joy: 0x1F, vic, colour, sid, M, yields: 0 };
    const bus = globalThis.C64Sid ? globalThis.C64Sid.engine().createBus('6581') : null;
    const osc = noise();
    const coll = globalThis.C64Collide.create(vic, (a) => M[a & 0x3FFF], (i) => colour[i]);
    coll.at(0);
    let done = -1, owed = 0, irqLeft = 0, nextIrq = TIMER + 1;
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: cia2.slice(), writes: [], mem: m.mem, colour: m.colour };
    };
    const slices = () => Array.from({ length: SLICES }, () => []);
    let cur = begin(0), curSound = slices();
    const moved = () => { if (vm) vm.at(S.clock, cur.writes, 0); };
    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const record = (a, v) => cur.writes.push([line(), S.clock % LINE + 1, a, v]);
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
        if (r === 0x1E || r === 0x1F) { coll.to(S.clock + 1); return coll.peek(r, S.clock); }
        if (r === 0x19) return 0x70;
        if (r === 0x1A) return vic[0x1A] | 0xF0;
        return r > 0x2E ? 0xFF : vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x1E || r === 0x1F || r === 0x19) return;
        coll.to(S.clock + 1);
        vic[r] = v;
        if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
      },
      sidWrite(r, v) {
        r &= 0x1F;
        if (r === 0x0E || r === 0x0F || r === 0x12) osc3();
        sid[r] = v; if (bus) bus.write(v, S.clock);
        curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v);
      },
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      ciaRead(r) { r &= 15; return r === 0 ? 0xE0 | S.joy : r === 4 ? timerLo() : 0xFF; },
      keyDown: (k) => keys.has(k),
      // the reads the port takes from the chips: the timers, the collisions, the noise, the input
      live(chip, reg) {
        if (chip === 'cia1') return timerLo();
        if (chip === 'cia2') return 0xFF;
        if (chip === 'collide') { coll.to(S.clock + 1); return coll.read(0x1E, S.clock); }
        if (chip === 'sid') return osc3();
        if (chip === 'joy') return 0xE0 | S.joy;
        if (chip === 'getin') return P.K.getin();
        if (chip === 'd011') return io.vicRead(0x11);
        if (chip === 'd011inc') return (io.vicRead(0x11) + 1) & 255;   // INC $D011, as the register reads now
        throw new Error('no chip ' + chip);
      },
    };
    // CIA 1's timer A: loaded with the latch at cycle 0, an underflow every latch + 1 cycles
    function timerLo() { return (TIMER - (S.clock % (TIMER + 1))) & 255; }
    const P = globalThis.AztecCore.makePort(M, o.groups);
    P.io = io; P.clocked = true;
    S.P = P;
    // each call of one of P's routines from the main program moves the clock on by its cost (@fn)
    let inIrq = false;
    for (const k of Object.keys(P)) {
      const f = P[k];
      if (typeof f !== 'function' || k === 'program') continue;
      P[k] = function (...a) { if (!inIrq) owed += FN[k] || 0; return f.apply(this, a); };
    }

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the interrupt, through the vector at $0314
    function irq() {
      const f = P.irqs[M[0x0314] | M[0x0315] << 8];
      inIrq = true;
      try { if (f) f.call(P); } finally { inIrq = false; }
      const c = IRQ.all || 0;
      irqLeft += c;
      return c;
    }
    // Run the processor through `work` cycles, taking the lines, the frames and the timer's interrupts
    // on the way; an interrupt's cycles while there is work to do are more work.
    function spend(work) {
      for (;;) {
        const ls = (Math.floor(done / LINE) + 1) * LINE;
        const ie = irqLeft > 0 ? S.clock + irqLeft : Infinity;
        const e = Math.min(ls, ie, nextIrq), end = S.clock + work;
        if (e > end) { S.clock = end; done = end; moved(); return; }
        if (e > S.clock) {
          work = Math.max(0, work - (e - S.clock));
          if (irqLeft > 0 && (irqLeft -= e - S.clock) <= 0) irqLeft = 0;
          S.clock = e;
        }
        done = e;
        if (e === nextIrq) { nextIrq += TIMER + 1; work += irq(); }
        if (e !== ls) continue;
        moved();
        coll.to(e);
        if ((e % FRAME) === 0) newFrame(e / FRAME);
      }
    }
    // to the start of raster line l (at once when the beam is on it)
    function toLine(l) {
      if (line() === l) return;
      const f = S.clock - (S.clock % FRAME);
      let t = f + l * LINE;
      if (t <= S.clock) t += FRAME;
      spend(t - S.clock);
    }

    let gen = P.program(), last = 0x1000;                        // the stretch from the start is $1000's
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      S.yields++;
      if (o.onYield) o.onYield(y, S.clock);
      if (y && y.wait !== undefined) {                          // a raster wait: its line, from where the work stands
        spend(Math.max(0, owed)); owed = 0;
        toLine(y.wait);
        if (y.at !== undefined) last = y.at;
        return;
      }
      if (y && y.cycles !== undefined) owed += y.cycles;
      else if (y && y.cp !== undefined) {
        const c = YIELD[stretch(last, y.cp)], e = TO[y.cp.toString(16)];
        owed += c !== undefined ? c : e !== undefined ? e : LINE;
        last = y.cp;
      } else owed += LINE;                                       // a turn of a polling loop: a line
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
  return { create, COST, stretch, LINE, LINES, FRAME, SLICES, TIMER };
})();
if (typeof module !== 'undefined') module.exports = globalThis.AztecPlay;
