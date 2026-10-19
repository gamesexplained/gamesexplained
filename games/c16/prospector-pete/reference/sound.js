/* sound.js */
// Prospector Pete's sound effects for the Sound section, from the game's own code: each effect started
// by the code in the listing that starts it in the game, then sound ($3689) once a frame, as irq_play
// calls it, all on the kit's 6502 (C64Cpu, bare) over the listing's memory, every write to TED's sound
// registers kept in the log that site/lib/ted-sound.js plays (kit-c16-sound: cycles from the log's
// start). index.html loads it after ../../lib/cpu6502.js and reference/pete.js; test_pete.js holds the
// logs to what the game wrote in plus4emu (facts.md, "Live tests").
//
//   PeteSound.EFFECTS              the seven, in the order sound plays them: { name, ... }
//   PeteSound.log(L, k, rnd, opts) effect k's log. opts.meant: the level's end as its store to $FF10
//                                  was meant ($18BD has LDA where STA was meant, so voice 2 keeps the
//                                  high bits the last effect left, 1 after Pete's moves; meant, 3).
//                                  opts.whole: the level's end through main_loop's pause and the bonus
//                                  to $1912. opts.sticks: the sticks left for the bonus (default 3)
//
// rnd(address, pc), as in pete.js, gives the byte that the instruction at pc reads from TED's timer
// ($FF00) or the beam's position ($FF1E), which sound mixes into a voice's value as noise in its
// pitch; it gives the carry sound starts with, too, as rnd(0, $3689). The default is Math.random's.
globalThis.PeteSound = (function () {
  const FRAME = 35568, CLOCK = 1773447;
  // sound's first instruction, in cycles from the frame's start (irq_play's interrupt at line 0, the
  // KERNAL's entry and irq_play's work before it calls sound at $19EA): plus4emu's writes from sound
  // fall within 41 cycles of the 6502's count from here, as TED takes some of the processor's cycles
  const AT = 727;
  const SOUND = 0x3689;
  const READS = { 0x36CA: 0xFF00, 0x36CD: 0xFF1E, 0x370C: 0xFF00, 0x370F: 0xFF1E, 0x3753: 0xFF00, 0x3756: 0xFF1E,
    0x379E: 0xFF00, 0x37A1: 0xFF1E, 0x37BB: 0xFF00, 0x37BE: 0xFF1E };
  // main_loop's waits for the interrupt: for the level's end to finish ($18C5), 45 frames ($18CD),
  // a stick's tone to finish ($1901), and two frames ($190A)
  const WAITS = [0x18C5, 0x18CD, 0x1901, 0x190A];
  // The effects' flags, which sound clears when an effect ends ($37D8), and $4A, a move under way
  const FLAGS = [0xBD, 0xC5, 0xBE, 0xBF, 0xC1, 0xC3, 0x4A];
  const EFFECTS = [
    // main_loop's bonus at a level's end, from its test of the sticks left ($9F, opts.sticks) to the
    // next level ($1912): for each stick 50 points (add_score), the sticks on the status line
    // (print_sticks) and the tone ($18EE), then two frames
    { name: 'bonus', main: [0x18D1, 0x1912] },
    // the level's end: main_loop's test for it ($1892) with no goodies left ($B5), the stick held up
    // ($0A) and Pete at column 44, row 4, standing ($4A), up to its wait for the jingle to finish
    { name: 'level end', main: [0x1892, 0x18C9], set: { 0xB5: 0, 0x0A: 0xFF, 0x06: 0x2C, 0x07: 4 } },
    // a goodie collected, in pete_touches ($2E25)
    { name: 'goodie', main: [0x2E25, 0x2E38] },
    // a stick exploding, in dynamite ($2BE8)
    { name: 'explosion', main: [0x2BE8, 0x2BFF] },
    // Pete's death, in death ($2A22)
    { name: 'death', main: [0x2A22, 0x2A43] },
    // a stick burning: dynamite sets $C3 for every frame of level 1's fuse (120 frames, $1F69), then
    // the stick explodes
    { name: 'fuse', fuse: 120, main: [0x2BE8, 0x2BFF] },
    // Pete moving: five cells left into the earth from the top of the shaft on level 1, with the
    // big charge put out so that its fuse does not cover the sound (Pete.Mine)
    { name: 'moving', moves: 5 },
  ];
  const byte = () => Math.random() * 256 | 0;

  function log(L, k, rnd = byte, o = {}) {
    const E = EFFECTS[k], m = L.ram.slice();
    const out = { format: 'kit-c16-sound', clock: CLOCK, frame: FRAME, start: 0, end: 0, writes: [] };
    let now = 0;                                       // cycles from the log's start
    // A CPU over m whose writes to $FF0E-$FF12 go into the log at the cycle it makes them
    const cpu = () => {
      const c = new C64Cpu.CPU(m), wr = c.wr;
      c.sp = 0xFF;
      c.wr = (a, v) => { wr.call(c, a, v); if (a >= 0xFF0E && a <= 0xFF12) out.writes.push([now + c.cycles - c.from, a, v]); };
      return c;
    };
    const put = (a, v) => { m[a] = v; out.writes.push([now, a, v]); };
    const hooks = more => {
      const h = Object.assign({}, more);
      for (const pc in READS) h[pc] = () => { m[READS[pc]] = rnd(READS[pc], +pc) & 255; };
      return h;
    };
    // The game's sound as start_level leaves it ($1C80-$1CAE): every effect off, $C4 at $40; and TED's
    // registers as play leaves them: voice 2's high bits 1 from Pete's moves, $FF12 as start ($1834)
    // sets it, voice 1's high bits 0
    for (const a of FLAGS) m[a] = 0;
    m[0xC4] = 0x40; m[0xC0] = 0;
    put(0xFF0E, 0); put(0xFF0F, 0); put(0xFF10, 1); put(0xFF12, 0x08); put(0xFF11, 0);
    m[0x9F] = o.sticks === undefined ? 3 : o.sticks;
    for (const a in E.set || {}) m[a] = E.set[a];
    const irq = cpu(), main = cpu(), sh = hooks();
    let frame = 0;
    // The next frame's interrupt: the frame count, then sound
    function tick(count = true) {
      frame++;
      now = frame * FRAME + AT;
      if (count) m[0x64] = (m[0x64] + 1) & 255;
      irq.from = irq.cycles;
      irq.call(SOUND, { c: rnd(0, SOUND) & 1 }, { hooks: sh });
      now += irq.cycles - irq.from;
    }
    const going = () => FLAGS.some(a => m[a]);
    // main_loop's code from a to b, its writes after the frame's interrupt, each wait a frame
    function run(a, b) {
      const h = {};
      for (const w of WAITS) h[w] = () => { now += main.cycles - main.from; tick(); main.from = main.cycles; };
      if (o.meant) h[0x18BD] = c => { c.wr(0xFF10, c.a); c.pc = 0x18C0; };
      main.from = main.cycles; main.pc = a;
      main.run({ until: b, hooks: h, maxSteps: 1e7 });
      now += main.cycles - main.from;
    }
    if (E.fuse) {
      m[0xC3] = 0x6F;
      for (let f = 0; f < E.fuse; f++) tick();
      m[0xC3] = 0;
    }
    if (E.moves) {
      // Pete.Mine runs the frame from main_loop's pass to Pete's step; sound runs first in a frame, as
      // irq_play calls it at line 0, and the frame count is Mine's. The mine is rolled the same way
      // each time (a fixed sequence of random numbers): Pete's steps sound the same through earth as
      // through tunnel, but a goodie in his way would stop him
      m.set(Pete.fresh(L));
      let seed = 4310;
      Pete.startLevel(m, 0, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed & 255; });
      m[0x0702] = 0; m[0xC3] = 0;                  // the big charge's frames left, and its fuse's sound
      const mine = Pete.Mine(m, rnd);
      mine.step({ x: -1 });
      while (frame < 8 * E.moves || m[0x4A]) { tick(false); mine.step({ x: frame < 8 * E.moves ? -1 : 0 }); }
    }
    if (E.main) {
      now = Math.max(now, frame * FRAME + AT + 1000);
      run(E.main[0], o.whole && E.main[0] === 0x1892 ? 0x1912 : E.main[1]);
    }
    while (going() && frame < 2000) tick();
    tick();
    out.end = (frame + 15) * FRAME;
    return out;
  }

  return { EFFECTS, READS, AT, log };
})();
